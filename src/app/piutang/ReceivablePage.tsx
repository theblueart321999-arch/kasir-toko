"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
type Customer = { id: number; name: string; phone?: string | null };
type Item = { id: number; customerName: string; reference?: string | null; amount: number; paidAmount: number; status: string; dueDate?: string | null; note?: string | null; createdAt: string };

export default function ReceivablePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const filteredItems = useMemo(() => items.filter((item) => {
    const text = `${item.customerName} ${item.reference || ""} ${item.note || ""}`.toLowerCase();
    const created = new Date(item.createdAt);
    const now = new Date();
    const start = new Date(now);
    if (timeFilter === "today") start.setHours(0, 0, 0, 0);
    if (timeFilter === "7days") start.setDate(start.getDate() - 6);
    if (timeFilter === "30days") start.setDate(start.getDate() - 29);
    if (timeFilter === "custom") {
      const from = rangeFrom ? new Date(`${rangeFrom}T00:00:00`) : null;
      const to = rangeTo ? new Date(`${rangeTo}T23:59:59.999`) : null;
      return (!from || created >= from) && (!to || created <= to) && (!query.trim() || text.includes(query.trim().toLowerCase()));
    }
    if (timeFilter === "month") return created.getMonth() === Number(selectedMonth) && created.getFullYear() === Number(selectedYear) && (!query.trim() || text.includes(query.trim().toLowerCase()));
    if (timeFilter === "year") return created.getFullYear() === Number(selectedYear) && (!query.trim() || text.includes(query.trim().toLowerCase()));
    return (timeFilter === "all" || created >= start) && (!query.trim() || text.includes(query.trim().toLowerCase()));
  }), [items, query, rangeFrom, rangeTo, selectedMonth, selectedYear, timeFilter]);
  const pagedItems = paginate(filteredItems, page, pageSize);
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
  async function receive(item: Item) {
    const remaining = Math.max(item.amount - item.paidAmount, 0);
    const input = window.prompt(`Terima piutang ${rupiah(remaining)}:`, String(remaining));
    if (input === null) return;
    const amount = Number(input);
    const response = await fetch(`/api/receivables/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) });
    if (!response.ok) { setError((await response.json()).error || "Penerimaan gagal disimpan"); return; }
    setError(""); void load();
  }
  return <main className="balance-page"><header className="report-header"><div><p className="eyebrow">KEUANGAN TOKO</p><h1>Piutang dari Customer</h1><p>Tagihan yang harus diterima toko dari customer terdaftar atau customer baru.</p></div><button className="primary-button" onClick={() => setOpen(true)}>+ Tambah Piutang Customer</button></header>{error && <p className="form-error">{error}</p>}<section className="report-highlight receivable-highlight"><article className="receivable-total-card"><span>Total piutang dari customer</span><strong>{rupiah(items.reduce((sum, item) => sum + Math.max(item.amount - item.paidAmount, 0), 0))}</strong></article><article className="receivable-open-card"><span>Daftar piutang terbuka</span><strong>{items.length}</strong><small>customer belum melunasi</small></article></section><section className="panel-table debt-table"><h2>Daftar Piutang dari Customer</h2><div className="table-filters"><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Cari customer, referensi, atau catatan..." aria-label="Cari piutang customer" />  <select value={timeFilter} onChange={(event) => { setTimeFilter(event.target.value); setPage(1); }} aria-label="Filter waktu piutang"><option value="all">Semua waktu</option><option value="today">Hari ini</option><option value="7days">7 hari terakhir</option><option value="30days">30 hari terakhir</option><option value="month">Bulanan</option><option value="year">Tahunan</option>  <option value="custom">Rentang</option></select>{timeFilter === "month" && <select value={selectedMonth} onChange={(event) => { setSelectedMonth(event.target.value); setPage(1); }} aria-label="Pilih bulan">{["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((month, index) => <option key={month} value={index}>{month}</option>)}</select>}{(timeFilter === "month" || timeFilter === "year") && <select value={selectedYear} onChange={(event) => { setSelectedYear(event.target.value); setPage(1); }} aria-label="Pilih tahun">{Array.from({ length: 12 }, (_, index) => new Date().getFullYear() - index).map((year) => <option key={year} value={year}>{year}</option>)}</select>}{timeFilter === "custom" && <><label className="table-date-filter">Dari<input type="date" value={rangeFrom} onChange={(event) => { setRangeFrom(event.target.value); setPage(1); }} aria-label="Tanggal mulai" /></label><label className="table-date-filter">Sampai<input type="date" value={rangeTo} onChange={(event) => { setRangeTo(event.target.value); setPage(1); }} aria-label="Tanggal akhir" /></label></>}</div><div className="table-scroll"><table><thead><tr><th>Customer</th><th>Referensi</th><th>Jatuh tempo</th><th>Sisa tagihan</th><th>Status</th></tr></thead><tbody>{pagedItems.map((item) => { const remaining = Math.max(item.amount - item.paidAmount, 0); return <tr key={item.id}><td><b>{item.customerName}</b><small>{item.note || "Piutang dari customer"}</small></td><td>{item.reference || "-"}</td><td>{item.dueDate ? new Intl.DateTimeFormat("id-ID").format(new Date(item.dueDate)) : "-"}</td><td>{rupiah(remaining)}</td>  <td><span className="status-badge">{item.status === "OPEN" ? "Belum lunas" : item.status}</span><button className="table-pay-button" type="button" onClick={() => void receive(item)}>Terima</button></td></tr>; })}{!filteredItems.length && <tr><td colSpan={5} className="empty-state">Belum ada piutang dari customer. Tambahkan tagihan baru.</td></tr>}</tbody></table><Pagination page={page} pageSize={pageSize} total={filteredItems.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></div></section>{open && <div className="modal-backdrop"><form className="modal product-form" onSubmit={submit}><h2>Tambah Piutang dari Customer</h2><label>Pilih customer yang memiliki tagihan<select name="customerId" value={selectedCustomer} onChange={(event) => setSelectedCustomer(event.target.value)} required><option value="" disabled>Pilih customer</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}<option value="new">+ Tambah customer baru</option></select></label>{selectedCustomer === "new" && <><label>Nama customer<input name="customerName" required /></label><label>Nomor telepon<input name="phone" /></label></>}<label>Jumlah piutang dari customer<input name="amount" type="number" min="1" required /></label><label>Referensi<input name="reference" placeholder="Contoh: Nota-001" /></label><label>Jatuh tempo<input name="dueDate" type="date" /></label><label>Catatan<textarea name="note" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setOpen(false); setSelectedCustomer(""); }}>Batal</button><button className="primary-button">Simpan Piutang</button></div></form></div>}</main>;
}
