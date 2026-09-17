"use client";

import { FormEvent, useEffect, useState } from "react";

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
type Supplier = { id: number; name: string; phone?: string | null };
type Item = { id: number; supplierName: string; reference?: string | null; amount: number; paidAmount: number; status: string; dueDate?: string | null; note?: string | null };

export default function PayablePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [error, setError] = useState("");
  const load = () => Promise.all([fetch("/api/payables").then((r) => r.json()), fetch("/api/suppliers").then((r) => r.json())]).then(([payables, supplierList]) => { setItems(payables); setSuppliers(supplierList); }).catch(() => setError("Data supplier atau hutang gagal dimuat"));
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const isNewSupplier = selectedSupplier === "new";
    const response = await fetch("/api/payables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId: isNewSupplier ? undefined : Number(selectedSupplier), supplierName: isNewSupplier ? form.get("supplierName") : undefined, createSupplier: isNewSupplier, phone: form.get("phone"), amount: Number(form.get("amount")), reference: form.get("reference"), dueDate: form.get("dueDate"), note: form.get("note") }) });
    if (!response.ok) { setError((await response.json()).error || "Hutang gagal disimpan"); return; }
    setOpen(false); setSelectedSupplier(""); event.currentTarget.reset(); setError(""); void load();
  }
  return <main className="balance-page"><header className="report-header"><div><p className="eyebrow">KEUANGAN TOKO</p><h1>Hutang kepada Supplier</h1><p>Tagihan yang harus dibayar toko kepada supplier terdaftar atau supplier baru.</p></div><button className="primary-button" onClick={() => setOpen(true)}>+ Tambah Hutang Supplier</button></header>{error && <p className="form-error">{error}</p>}<section className="report-highlight"><article><span>Total hutang kepada supplier</span><strong>{rupiah(items.reduce((sum, item) => sum + Math.max(item.amount - item.paidAmount, 0), 0))}</strong></article><article><span>Daftar hutang terbuka</span><strong>{items.length}</strong><small>belum dibayar toko</small></article></section><section className="panel-table debt-table"><h2>Daftar Hutang kepada Supplier</h2><div className="table-scroll"><table><thead><tr><th>Supplier</th><th>Referensi</th><th>Jatuh tempo</th><th>Sisa hutang</th><th>Status</th></tr></thead><tbody>{items.map((item) => { const remaining = Math.max(item.amount - item.paidAmount, 0); return <tr key={item.id}><td><b>{item.supplierName}</b><small>{item.note || "Hutang kepada supplier"}</small></td><td>{item.reference || "-"}</td><td>{item.dueDate ? new Intl.DateTimeFormat("id-ID").format(new Date(item.dueDate)) : "-"}</td><td>{rupiah(remaining)}</td><td><span className="status-badge">{item.status === "OPEN" ? "Belum lunas" : item.status}</span></td></tr>; })}{!items.length && <tr><td colSpan={5} className="empty-state">Belum ada hutang kepada supplier. Tambahkan tagihan baru.</td></tr>}</tbody></table></div></section>{open && <div className="modal-backdrop"><form className="modal product-form" onSubmit={submit}><h2>Tambah Hutang kepada Supplier</h2><label>Pilih supplier yang menjadi kreditur<select name="supplierId" value={selectedSupplier} onChange={(event) => setSelectedSupplier(event.target.value)} required><option value="" disabled>Pilih supplier</option>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}{supplier.phone ? ` · ${supplier.phone}` : ""}</option>)}<option value="new">+ Tambah supplier baru</option></select></label>{selectedSupplier === "new" && <><label>Nama supplier<input name="supplierName" required /></label><label>Nomor telepon<input name="phone" /></label></>}<label>Jumlah hutang kepada supplier<input name="amount" type="number" min="1" required /></label><label>Referensi<input name="reference" placeholder="Contoh: INV-001" /></label><label>Jatuh tempo<input name="dueDate" type="date" /></label><label>Catatan<textarea name="note" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setOpen(false); setSelectedSupplier(""); }}>Batal</button><button className="primary-button">Simpan Hutang</button></div></form></div>}</main>;
}
