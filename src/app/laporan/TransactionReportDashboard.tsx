"use client";

import { useEffect, useMemo, useState } from "react";
import SalesChart, { type Period } from "../dashboard/SalesChart";

type ReportKind = "sales" | "purchases" | "returns";
type PaymentRow = { paymentMethod?: string; paymentStatus?: string; _sum: { total: number | null }; _count: { _all: number } };
type ReportData = {
  sales: { total: number; count: number };
  purchases: { total: number; count: number };
  returns: { sales: number; salesCount: number; purchases: number; purchasesCount: number };
  financial: { estimatedProfit: number };
  salesByDate: { date: string; total: number }[];
  purchasesByDate: { date: string; total: number }[];
  saleReturnsByDate: { date: string; total: number }[];
  purchaseReturnsByDate: { date: string; total: number }[];
  customerRanking: { name: string; total: number }[];
  supplierRanking: { name: string; total: number }[];
  paymentBreakdown: PaymentRow[];
  purchasePaymentBreakdown: PaymentRow[];
};

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const today = new Date().toISOString().slice(0, 10);

export default function TransactionReportDashboard({ kind }: { kind: ReportKind }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("week");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const range = useMemo(() => {
    if (period === "day") return { from: today, to: today };
    if (period === "week") { const date = new Date(); date.setDate(date.getDate() - 6); return { from: date.toISOString().slice(0, 10), to: today }; }
    if (period === "year") return { from: `${selectedYear}-01-01`, to: `${selectedYear}-12-31` };
    if (period === "month") return { from: `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`, to: new Date(selectedYear, selectedMonth, 0).toISOString().slice(0, 10) };
    return { from, to };
  }, [from, period, selectedMonth, selectedYear, to]);

  useEffect(() => {
    if (range.from > range.to) return;
    void fetch(`/api/reports/summary?from=${range.from}&to=${range.to}`, { cache: "no-store" }).then(async (response) => {
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Laporan gagal dimuat");
      setData(json);
      setError("");
    }).catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Laporan gagal dimuat"));
  }, [range]);

  const isSales = kind === "sales";
  const isReturns = kind === "returns";
  const rows = data ? (isSales ? data.salesByDate : isReturns ? [...data.saleReturnsByDate, ...data.purchaseReturnsByDate].sort((a, b) => a.date.localeCompare(b.date)) : data.purchasesByDate) : [];
  const total = data ? (isSales ? data.sales : isReturns ? { total: data.returns.sales + data.returns.purchases, count: data.returns.salesCount + data.returns.purchasesCount } : data.purchases) : { total: 0, count: 0 };
  const points = rows.map((row) => ({ key: row.date, label: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(new Date(`${row.date}T00:00:00`)), dateLabel: row.date, total: row.total }));
  const ranking = data && !isReturns ? (isSales ? data.customerRanking : data.supplierRanking) : [];
  const payments = data && !isReturns ? (isSales ? data.paymentBreakdown : data.purchasePaymentBreakdown) : [];
  const title = isReturns ? "Retur" : isSales ? "Penjualan" : "Pembelian";

  return <main className="report-page">
    <header className="report-header"><div><p className="eyebrow">ANALITIK TOKO</p><h1>Laporan {title}</h1><p>Ringkasan transaksi {title.toLowerCase()} berdasarkan periode.</p></div><a className="secondary-button" href="/laporan">Laporan Kas</a></header>
    <section className="report-period-control"><p>Periode laporan</p><div className="chart-periods">{(["day", "week", "month", "year", "custom"] as Period[]).map((value) => <button className={period === value ? "active" : ""} key={value} onClick={() => setPeriod(value)} type="button">{value === "day" ? "Hari ini" : value === "week" ? "7 Hari" : value === "month" ? "Bulanan" : value === "year" ? "Tahunan" : "Rentang"}</button>)}</div>{(period === "month" || period === "year") && <div className="report-period-selectors"><>{period === "month" && <label>Bulan<select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2020, index, 1))}</option>)}</select></label>}</><label>Tahun<select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={selectedYear - index} value={selectedYear - index}>{selectedYear - index}</option>)}</select></label></div>}{period === "custom" && <div className="chart-custom-range"><label>Dari<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Sampai<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>}</section>
    {error && <p className="form-error">{error}</p>}
    {data && <><section className="report-highlight"><article><span>Total transaksi</span><strong>{rupiah(total.total)}</strong><small>{total.count} transaksi</small></article><article><span>{isReturns ? "Retur Penjualan" : isSales ? "Laba kotor estimasi" : "Total pembelian"}</span><strong>{rupiah(isReturns ? data.returns.sales : isSales ? data.financial.estimatedProfit : total.total)}</strong></article><article><span>{isReturns ? "Retur Pembelian" : "Retur"}</span><strong>{rupiah(isReturns ? data.returns.purchases : isSales ? data.returns.sales : data.returns.purchases)}</strong></article></section><SalesChart initialPoints={points} showControls={false} period={period} customFrom={range.from} customTo={range.to} rangeOverride={{ ...range, group: period === "year" ? "month" : "day" }} onRangeChange={() => undefined} /><section className="report-columns"><div className="panel-table"><h2>Rincian {title}</h2><table><thead><tr><th>Tanggal</th><th>Nilai</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.date}-${index}`}><td>{new Intl.DateTimeFormat("id-ID").format(new Date(`${row.date}T00:00:00`))}</td><td>{rupiah(row.total)}</td></tr>)}<tr className="total-row"><th>Jumlah</th><th>{rupiah(total.total)}</th></tr></tbody></table></div><div className="panel-table"><h2>{isReturns ? "Ringkasan Retur" : isSales ? "Customer Teratas" : "Supplier Teratas"}</h2><table><thead><tr><th>Nama</th><th>Nilai</th></tr></thead><tbody>{isReturns ? <><tr><td>Retur Penjualan</td><td>{rupiah(data.returns.sales)}</td></tr><tr><td>Retur Pembelian</td><td>{rupiah(data.returns.purchases)}</td></tr></> : ranking.map((row) => <tr key={row.name}><td>{row.name}</td><td>{rupiah(row.total)}</td></tr>)}{!isReturns && !ranking.length && <tr><td colSpan={2}>Belum ada data</td></tr>}</tbody></table></div></section>{!isReturns && <div className="panel-table"><h2>{isSales ? "Metode Pembayaran" : "Status Pembayaran"}</h2><table><thead><tr><th>{isSales ? "Metode" : "Status"}</th><th>Transaksi</th><th>Nilai</th></tr></thead><tbody>{payments.map((item) => { const label = isSales ? item.paymentMethod || "Tidak diketahui" : item.paymentStatus || "Tidak diketahui"; return <tr key={label}><td>{label}</td><td>{item._count._all}</td><td>{rupiah(item._sum.total || 0)}</td></tr>; })}</tbody></table></div>}</>}
  </main>;
}
