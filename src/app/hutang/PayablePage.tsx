"use client";

import { FormEvent, useEffect, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
type Supplier = { id: number; name: string; phone?: string | null };
type Item = { id: number; supplierName: string; reference?: string | null; amount: number; paidAmount: number; status: string; dueDate?: string | null; note?: string | null };

export default function PayablePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [error, setError] = useState("");
  const [paymentItem, setPaymentItem] = useState<Item | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAction, setPaymentAction] = useState<"FULL" | "PARTIAL" | "EXTEND">("FULL");
  const [extensionDate, setExtensionDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pagedItems = paginate(items, page, pageSize);
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
  async function pay() {
    if (!paymentItem) return;
    if (paymentAction === "EXTEND") {
      const response = await fetch(`/api/payables/${paymentItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "EXTEND", dueDate: extensionDate }) });
      if (!response.ok) { setError((await response.json()).error || "Jatuh tempo gagal diperpanjang"); return; }
      setError(""); setPaymentItem(null); setExtensionDate(""); void load(); return;
    }
    const amount = Number(paymentAmount);
    const remaining = Math.max(paymentItem.amount - paymentItem.paidAmount, 0);
    if (!Number.isInteger(amount) || amount <= 0 || amount > remaining) {
      setError("Jumlah pembayaran melebihi sisa hutang atau tidak valid");
      return;
    }
    const response = await fetch(`/api/payables/${paymentItem.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: paymentAction, amount }) });
    if (!response.ok) { setError((await response.json()).error || "Pembayaran gagal disimpan"); return; }
    setError(""); setPaymentItem(null); setPaymentAmount(""); void load();
  }
  return <main className="balance-page"><header className="report-header"><div><p className="eyebrow">KEUANGAN TOKO</p><h1>Hutang kepada Supplier</h1><p>Tagihan yang harus dibayar toko kepada supplier terdaftar atau supplier baru.</p></div><button className="primary-button" onClick={() => setOpen(true)}>  + Tambah Hutang</button></header>{error && <p className="form-error">{error}</p>}<section className="report-highlight"><article><span>Total hutang kepada supplier</span><strong>{rupiah(items.reduce((sum, item) => sum + Math.max(item.amount - item.paidAmount, 0), 0))}</strong></article><article><span>Daftar hutang terbuka</span><strong>{items.length}</strong><small>belum dibayar toko</small></article></section><section className="panel-table debt-table"><h2>Daftar Hutang kepada Supplier</h2><div className="table-scroll"><table><thead><tr><th>Supplier</th><th>Referensi</th><th>Jatuh tempo</th><th>Sisa hutang</th><th>Status</th></tr></thead><tbody>{pagedItems.map((item) => { const remaining = Math.max(item.amount - item.paidAmount, 0); return <tr key={item.id}><td><b>{item.supplierName}</b><small>{item.note || "Hutang kepada supplier"}</small></td><td>{item.reference || "-"}</td><td>{item.dueDate ? new Intl.DateTimeFormat("id-ID").format(new Date(item.dueDate)) : "-"}</td><td>{rupiah(remaining)}</td>  <td><span className="status-badge">{item.status === "OPEN" ? "Belum lunas" : item.status}</span>    <button className="table-pay-button" type="button" onClick={() => { setPaymentItem(item); setPaymentAction("FULL"); setPaymentAmount(String(Math.max(item.amount - item.paidAmount, 0))); setExtensionDate(""); setError(""); }}>Bayar</button></td></tr>; })}{!items.length && <tr><td colSpan={5} className="empty-state">Belum ada hutang kepada supplier. Tambahkan tagihan baru.</td></tr>}</tbody></table><Pagination page={page} pageSize={pageSize} total={items.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></div></section>{open && <div className="modal-backdrop"><form className="modal product-form" onSubmit={submit}><h2>Tambah Hutang kepada Supplier</h2><label>Pilih supplier yang menjadi kreditur<select name="supplierId" value={selectedSupplier} onChange={(event) => setSelectedSupplier(event.target.value)} required><option value="" disabled>Pilih supplier</option>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}{supplier.phone ? ` · ${supplier.phone}` : ""}</option>)}<option value="new">+ Tambah supplier baru</option></select></label>{selectedSupplier === "new" && <><label>Nama supplier<input name="supplierName" required /></label><label>Nomor telepon<input name="phone" /></label></>}<label>Jumlah hutang kepada supplier<input name="amount" type="number" min="1" required /></label><label>Referensi<input name="reference" placeholder="Contoh: INV-001" /></label><label>Jatuh tempo<input name="dueDate" type="date" /></label><label>Catatan<textarea name="note" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setOpen(false); setSelectedSupplier(""); }}>Batal</button><button className="primary-button">Simpan Hutang</button></div>  </form></div>}  {paymentItem && <div className="modal-backdrop"><form className="modal product-form debt-payment-modal" onSubmit={(event) => { event.preventDefault(); void pay(); }  }>  <div className="debt-payment-heading"><div><p className="eyebrow">HUTANG SUPPLIER</p><h2>Kelola Hutang</h2></div><button type="button" className="modal-close" onClick={() => setPaymentItem(null)} aria-label="Tutup">×</button></div><div className="debt-payment-summary"><span>Sisa hutang saat ini</span><strong>{rupiah(Math.max(paymentItem.amount - paymentItem.paidAmount, 0))}</strong><small>{paymentItem.supplierName} · {paymentItem.reference || "Tanpa referensi"}</small></div><label>Aksi pembayaran<select value={paymentAction} onChange={(event) => setPaymentAction(event.target.value as "FULL" | "PARTIAL" | "EXTEND")}><option value="FULL">Bayar lunas</option><option value="PARTIAL">Bayar sebagian</option><option value="EXTEND">Perpanjang jatuh tempo</option></select></label>{paymentAction === "PARTIAL" && <label>Jumlah pembayaran<input autoFocus required min="1" max={Math.max(paymentItem.amount - paymentItem.paidAmount, 0)} type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label>}{paymentAction === "EXTEND" && <label>Jatuh tempo baru<input autoFocus required type="date" min={new Date().toISOString().slice(0, 10)} value={extensionDate} onChange={(event) => setExtensionDate(event.target.value)} /></label>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setPaymentItem(null); setPaymentAmount(""); }}>Batal</button><button className="primary-button" type="submit">Simpan Pembayaran</button></div></form></div>}</main>;
}
