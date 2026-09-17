"use client";

import { FormEvent, useEffect, useState } from "react";

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
type Customer = { id: number; name: string; phone?: string | null };
type Item = { id: number; customerName: string; reference?: string | null; amount: number; paidAmount: number; status: string; dueDate?: string | null; note?: string | null };

export default function ReceivablePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [error, setError] = useState("");
  const load = () => Promise.all([fetch("/api/receivables").then((r) => r.json()), fetch("/api/customers").then((r) => r.json())]).then(([receivables, customerList]) => { setItems(receivables); setCustomers(customerList); }).catch(() => setError("Data customer atau piutang gagal dimuat"));
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const isNewCustomer = selectedCustomer === "new";
    const response = await fetch("/api/receivables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: isNewCustomer ? undefined : Number(selectedCustomer), customerName: isNewCustomer ? form.get("customerName") : undefined, createCustomer: isNewCustomer, phone: form.get("phone"), amount: Number(form.get("amount")), reference: form.get("reference"), dueDate: form.get("dueDate"), note: form.get("note") }) });
    if (!response.ok) { setError((await response.json()).error || "Piutang gagal disimpan"); return; }
    setOpen(false); setSelectedCustomer(""); event.currentTarget.reset(); setError(""); void load();
  }
  return <main className="balance-page"><header className="report-header"><div><p className="eyebrow">KEUANGAN TOKO</p><h1>Piutang dari Customer</h1><p>Tagihan yang harus diterima toko dari customer terdaftar atau customer baru.</p></div><button className="primary-button" onClick={() => setOpen(true)}>+ Tambah Piutang Customer</button></header>{error && <p className="form-error">{error}</p>}<section className="report-highlight"><article><span>Total piutang dari customer</span><strong>{rupiah(items.reduce((sum, item) => sum + Math.max(item.amount - item.paidAmount, 0), 0))}</strong></article><article><span>Daftar piutang terbuka</span><strong>{items.length}</strong><small>customer belum melunasi</small></article></section><section className="panel-table debt-table"><h2>Daftar Piutang dari Customer</h2><div className="table-scroll"><table><thead><tr><th>Customer</th><th>Referensi</th><th>Jatuh tempo</th><th>Sisa tagihan</th><th>Status</th></tr></thead><tbody>{items.map((item) => { const remaining = Math.max(item.amount - item.paidAmount, 0); return <tr key={item.id}><td><b>{item.customerName}</b><small>{item.note || "Piutang dari customer"}</small></td><td>{item.reference || "-"}</td><td>{item.dueDate ? new Intl.DateTimeFormat("id-ID").format(new Date(item.dueDate)) : "-"}</td><td>{rupiah(remaining)}</td><td><span className="status-badge">{item.status === "OPEN" ? "Belum lunas" : item.status}</span></td></tr>; })}{!items.length && <tr><td colSpan={5} className="empty-state">Belum ada piutang dari customer. Tambahkan tagihan baru.</td></tr>}</tbody></table></div></section>{open && <div className="modal-backdrop"><form className="modal product-form" onSubmit={submit}><h2>Tambah Piutang dari Customer</h2><label>Pilih customer yang memiliki tagihan<select name="customerId" value={selectedCustomer} onChange={(event) => setSelectedCustomer(event.target.value)} required><option value="" disabled>Pilih customer</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}<option value="new">+ Tambah customer baru</option></select></label>{selectedCustomer === "new" && <><label>Nama customer<input name="customerName" required /></label><label>Nomor telepon<input name="phone" /></label></>}<label>Jumlah piutang dari customer<input name="amount" type="number" min="1" required /></label><label>Referensi<input name="reference" placeholder="Contoh: Nota-001" /></label><label>Jatuh tempo<input name="dueDate" type="date" /></label><label>Catatan<textarea name="note" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setOpen(false); setSelectedCustomer(""); }}>Batal</button><button className="primary-button">Simpan Piutang</button></div></form></div>}</main>;
}
