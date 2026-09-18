"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Contact = { id: number; name: string; phone: string | null; email: string | null; address: string | null; notes: string | null; active: boolean };
type Form = { id?: number; name: string; phone: string; email: string; address: string; notes: string; active: boolean };
const blank: Form = { name: "", phone: "", email: "", address: "", notes: "", active: true };

export default function KontakManager({ operatorName, canManage }: { operatorName: string; canManage: boolean }) {
  const [tab, setTab] = useState<"customers" | "suppliers">("customers");
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const contacts = tab === "customers" ? customers : suppliers;
  const visible = useMemo(() => contacts.filter((item) => `${item.name} ${item.phone || ""} ${item.email || ""}`.toLowerCase().includes(query.toLowerCase())), [contacts, query]);
  useEffect(() => { setPage(1); }, [query, tab]);
  const pagedContacts = useMemo(() => paginate(visible, page, pageSize), [visible, page, pageSize]);

  async function load() {
    setLoading(true);
    const [customerResponse, supplierResponse] = await Promise.all([fetch("/api/customers"), fetch("/api/suppliers")]);
    if (customerResponse.ok) setCustomers(await customerResponse.json());
    if (supplierResponse.ok) setSuppliers(await supplierResponse.json());
    setLoading(false);
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);
  function message(value: string) { setNotice(value); window.setTimeout(() => setNotice(""), 3500); }
  function edit(contact?: Contact) {
    setForm(contact ? { id: contact.id, name: contact.name, phone: contact.phone || "", email: contact.email || "", address: contact.address || "", notes: contact.notes || "", active: contact.active } : { ...blank });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const requiredFields: Array<[keyof Form, string]> = [["name", tab === "suppliers" ? "Nama supplier" : "Nama customer"]];
    const missingField = requiredFields.find(([field]) => !String(form[field]).trim());
    if (missingField) return message(`${missingField[1]} wajib diisi`);
    const response = await fetch(`/api/${tab}`, { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Data gagal disimpan");
    setForm(null); message(`${tab === "customers" ? "Customer" : "Supplier"} berhasil disimpan`); void load();
  }
  async function remove(contact: Contact) {
    const response = await fetch(`/api/${tab}?id=${contact.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Data gagal dihapus");
    setContactToDelete(null); message("Data dihapus"); void load();
  }
  const title = tab === "customers" ? "Customer" : "Supplier";
  return <main className="management-page contacts-page">
    <header className="management-header"><div><p className="eyebrow">KASIR TOKO · RELASI</p><h1>Customer &amp; Supplier</h1><p>Kelola kontak pelanggan dan pemasok toko.</p></div><div className="management-user">Masuk sebagai <b>{operatorName}</b><a href="/dashboard">← Dashboard</a></div></header>
    {notice && <div className="management-notice">{notice}</div>}
    <section className="contact-summary"><article className="contact-summary-customers"><span>Total customer</span><strong>{customers.length}</strong><small>Data pelanggan tersimpan</small></article><article className="contact-summary-suppliers"><span>Total supplier</span><strong>{suppliers.length}</strong><small>Mitra pemasok tersimpan</small></article><article className="contact-summary-active"><span>Kontak aktif</span><strong>{contacts.filter((item) => item.active).length}</strong><small>Di tab {title.toLowerCase()}</small></article></section>
    <section className="contact-card">
      <div className="contact-tabs"><button className={tab === "customers" ? "selected" : ""} onClick={() => { setTab("customers"); setQuery(""); }}>Customer <b>{customers.length}</b></button><button className={tab === "suppliers" ? "selected" : ""} onClick={() => { setTab("suppliers"); setQuery(""); }}>Supplier <b>{suppliers.length}</b></button></div>
      <div className="management-toolbar contact-toolbar"><div className="management-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Cari ${title.toLowerCase()}...`} /></div>{canManage && <button className="management-primary" onClick={() => edit()}>+ {title} baru</button>}</div>
      <div className="card-title"><h2>Daftar {title}</h2><p>{visible.length} data ditampilkan</p></div>
      {loading ? <p className="management-empty">Memuat data...</p> : <div className="product-table-wrap"><table className="product-table contact-table"><thead><tr><th>Nama</th><th>Kontak</th><th>Alamat</th><th>Status</th>{canManage && <th>Aksi</th>}</tr></thead><tbody>{pagedContacts.map((contact) => <tr key={contact.id}><td><b>{contact.name}</b><small>{contact.notes || "Tanpa catatan"}</small></td><td>{contact.phone || "-"}<small>{contact.email || "-"}</small></td><td>{contact.address || "-"}</td><td><span className={contact.active ? "contact-active" : "contact-inactive"}>{contact.active ? "Aktif" : "Nonaktif"}</span></td>{canManage && <td><button className="table-action" onClick={() => edit(contact)}>Edit</button><button className="table-delete" onClick={() => remove(contact)}>Hapus</button></td>}</tr>)}</tbody></table>{!visible.length && <p className="management-empty">Belum ada {title.toLowerCase()} yang cocok.</p>}<Pagination page={page} pageSize={pageSize} total={visible.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></div>}
    </section>
    {form && <div className="modal-backdrop"><form className="product-form contact-form" onSubmit={save}><div className="modal-heading"><div><p className="eyebrow">DATA RELASI</p><h2>{form.id ? `Edit ${title.toLowerCase()}` : `Tambah ${title.toLowerCase()}`}</h2></div><button type="button" className="modal-close" onClick={() => setForm(null)}>×</button></div><p className="supplier-required-note">Hanya field bertanda * yang wajib diisi.</p><label>Nama *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><div className="form-row"><label>Nomor telepon<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label></div><label>Alamat<textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><label>Catatan<textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label><label className="contact-check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Kontak aktif</label><div className="form-actions"><button type="button" className="modal-cancel" onClick={() => setForm(null)}>Batal</button><button className="management-primary">Simpan</button></div></form></div>}
    {contactToDelete && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setContactToDelete(null); }}><section className="receipt-success-modal contact-delete-modal"><div className="modal-heading"><div><p className="eyebrow">KONFIRMASI HAPUS</p><h2>Hapus {title.toLowerCase()}?</h2></div><button type="button" className="modal-close" onClick={() => setContactToDelete(null)}>×</button></div><p>Data <b>{contactToDelete.name}</b> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</p><div className="form-actions"><button type="button" className="modal-cancel" onClick={() => setContactToDelete(null)}>Batal</button><button type="button" className="table-delete" onClick={() => void remove(contactToDelete)}>Hapus</button></div></section></div>}
  </main>;
}
