"use client";

import { useEffect, useMemo, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Period = "day" | "week" | "month" | "year" | "custom";
type ProductRow = { productId: number; _sum: { quantity: number | null; total: number | null }; product?: { name: string; sku: string; unit: string } };
type Report = { topProducts: ProductRow[] };

const today = new Date().toISOString().slice(0, 10);
const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function TopProductsDashboard() {
  const [period, setPeriod] = useState<Period>("week");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const range = useMemo(() => {
    if (period === "day") return { from: today, to: today };
    if (period === "week") { const date = new Date(); date.setDate(date.getDate() - 6); return { from: date.toISOString().slice(0, 10), to: today }; }
    if (period === "month") return { from: `${year}-${String(month).padStart(2, "0")}-01`, to: new Date(year, month, 0).toISOString().slice(0, 10) };
    if (period === "year") return { from: `${year}-01-01`, to: `${year}-12-31` };
    return { from, to };
  }, [from, month, period, to, year]);
  useEffect(() => {
    if (range.from > range.to) return;
    void fetch(`/api/reports/summary?from=${range.from}&to=${range.to}`, { cache: "no-store" }).then(async (response) => {
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Produk terlaris gagal dimuat");
      setReport(json); setError("");
    }).catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Produk terlaris gagal dimuat"));
  }, [range]);
  const rows = useMemo(() => (report?.topProducts || []).filter((row) => {
    const text = `${row.product?.name || ""} ${row.product?.sku || ""}`.toLowerCase();
    return !query.trim() || text.includes(query.trim().toLowerCase());
  }), [query, report]);
  const paged = paginate(rows, page, pageSize);
  return <main className="report-page">
    <header className="report-header"><div><p className="eyebrow">ANALITIK TOKO</p><h1>Produk Terlaris</h1><p>Daftar produk berdasarkan jumlah terjual pada periode yang dipilih.</p></div><a className="secondary-button" href="/laporan">Laporan Kas</a></header>
    <section className="report-period-control"><p>Periode penjualan</p><div className="chart-periods">{(["day", "week", "month", "year", "custom"] as Period[]).map((value) => <button className={period === value ? "active" : ""} key={value} onClick={() => { setPeriod(value); setPage(1); }} type="button">{value === "day" ? "Hari ini" : value === "week" ? "7 Hari" : value === "month" ? "Bulanan" : value === "year" ? "Tahunan" : "Rentang"}</button>)}</div>{(period === "month" || period === "year") && <div className="report-period-selectors">{period === "month" && <label>Bulan<select value={month} onChange={(event) => { setMonth(Number(event.target.value)); setPage(1); }}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2020, index, 1))}</option>)}</select></label>}<label>Tahun<select value={year} onChange={(event) => { setYear(Number(event.target.value)); setPage(1); }}>{Array.from({ length: 12 }, (_, index) => <option key={year - index} value={year - index}>{year - index}</option>)}</select></label></div>}{period === "custom" && <div className="chart-custom-range"><label>Dari<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Sampai<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>}</section>
    {error && <p className="form-error">{error}</p>}
    <section className="panel-table"><h2>Peringkat produk</h2><div className="table-filters"><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Cari nama atau SKU produk..." aria-label="Cari produk terlaris" /></div><div className="table-scroll"><table><thead><tr><th>Peringkat</th><th>Produk</th><th>SKU</th><th>Terjual</th><th>Total penjualan</th></tr></thead><tbody>{paged.map((row, index) => <tr key={row.productId}><td>{(page - 1) * pageSize + index + 1}</td><td>{row.product?.name || "Produk tidak ditemukan"}</td><td>{row.product?.sku || "-"}</td><td>{row._sum.quantity || 0} {row.product?.unit || "unit"}</td><td>{rupiah(row._sum.total || 0)}</td></tr>)}{!paged.length && <tr><td colSpan={5}><p className="empty-state">Belum ada data produk terlaris pada periode ini.</p></td></tr>}</tbody></table><Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></div></section>
  </main>;
}
