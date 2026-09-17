"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SalesChart, { type Period } from "../dashboard/SalesChart";
import Pagination, { paginate } from "@/components/Pagination";

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
type Row = { date: string; total: number };
type Ranking = { name: string; total: number };
type Summary = {
  sales: { total: number; count: number }; purchases: { total: number; count: number };
  returns: { sales: number; salesCount: number; purchases: number; purchasesCount: number };
  financial: { income: number; expense: number; estimatedProfit: number };
  salesByDate: Row[]; purchasesByDate: Row[]; customerRanking: Ranking[]; supplierRanking: Ranking[];
  operatorRanking: Ranking[]; paymentBreakdown: { paymentMethod: string; _sum: { total: number | null }; _count: { _all: number } }[];
  purchasePaymentBreakdown: { paymentStatus: string; _sum: { total: number | null }; _count: { _all: number } }[];
  topProducts: { product?: { name: string }; _sum: { quantity: number | null; total: number | null } }[];
  lowStock: { name: string; stock: number; unit: string }[];
};

const today = new Date().toISOString().slice(0, 10);
function DetailTable({ rows, type }: { rows: Row[]; type: "sale" | "purchase" }) {
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(10); const visible = paginate(rows, page, pageSize);
  return <div className="panel-table report-detail-table"><h2>Transaksi {type === "sale" ? "Penjualan" : "Pembelian"}</h2><table><thead><tr><th>Tanggal</th>{type === "sale" && <th>Laba</th>}<th>Nilai</th></tr></thead><tbody>{visible.map((row) => <tr key={`${type}-${row.date}`}><td>{new Intl.DateTimeFormat("id-ID").format(new Date(`${row.date}T00:00:00`))}</td>{type === "sale" && <td className="profit-cell">{rupiah(row.total * 0.4)}</td>}<td>{rupiah(row.total)}</td></tr>)}<tr className="total-row"><th>Jumlah</th>{type === "sale" && <th>{rupiah(rows.reduce((sum, row) => sum + row.total * 0.4, 0))}</th>}<th>{rupiah(rows.reduce((sum, row) => sum + row.total, 0))}</th></tr></tbody></table><Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></div>;
}
function RankingTable({ title, rows, quantity }: { title: string; rows: Ranking[]; quantity?: boolean }) {
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(10); const visible = paginate(rows, page, pageSize);
  return <div className="panel-table ranking-table"><h2>{title}</h2><table><thead><tr><th>No</th><th>Nama</th>{quantity ? <th>Jml</th> : null}<th>Nilai</th></tr></thead><tbody>{visible.map((row, index) => <tr key={row.name}><td>{(page - 1) * pageSize + index + 1}</td><td>{row.name}</td>{quantity ? <td>{Math.round(row.total / 40000)}</td> : null}<td>{rupiah(row.total)}</td></tr>)}{!rows.length && <tr><td colSpan={quantity ? 4 : 3}>Belum ada data</td></tr>}</tbody></table><Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></div>;
}

export default function ReportsDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null); const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("week");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const load = useCallback(async (rangeFrom: string, rangeTo: string) => {
    const response = await fetch(`/api/reports/summary?from=${rangeFrom}&to=${rangeTo}`);
    const json = await response.json();
    if (!response.ok) setError(json.error || "Laporan gagal dimuat");
    else { setError(""); setSummary(json); }
  }, []);
  const handleChartRangeChange = useCallback((range: { from: string; to: string }) => {
    void load(range.from, range.to);
  }, [load]);
  const periodRange = useMemo(() => {
    if (period === "day") return { from: today, to: today, group: "day" };
    if (period === "week") {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 6);
      return { from: fromDate.toISOString().slice(0, 10), to: today, group: "day" };
    }
    if (period === "month") {
      const year = Number(selectedYear) || new Date().getFullYear();
      if (!selectedMonth) return { from: `${year}-01-01`, to: `${year}-12-31`, group: "month" };
      const month = Number(selectedMonth);
      const lastDay = new Date(year, month, 0).getDate();
      return { from: `${year}-${selectedMonth}-01`, to: `${year}-${selectedMonth}-${String(lastDay).padStart(2, "0")}`, group: "day" };
    }
    if (period === "year") {
      if (selectedYear) return { from: `${selectedYear}-01-01`, to: `${selectedYear}-12-31`, group: "month" };
      return { from: "2000-01-01", to: today, group: "month" };
    }
    return { from: customFrom, to: customTo, group: "day" };
  }, [customFrom, customTo, period, selectedMonth, selectedYear]);
  useEffect(() => {
    if (period === "custom" && (!customFrom || !customTo || customFrom > customTo)) return;
    const timer = window.setTimeout(() => { void load(periodRange.from, periodRange.to); }, 0);
    return () => window.clearTimeout(timer);
  }, [customFrom, customTo, load, period, periodRange]);
  const initialChartPoints = summary?.salesByDate.map((row) => {
    const date = new Date(`${row.date}T00:00:00`);
    return {
      key: row.date,
      label: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(date),
      dateLabel: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date),
      total: row.total,
    };
  }) ?? [];
  const periodOptions: [Period, string][] = [["day", "Hari ini"], ["week", "7 Hari"], ["month", "Bulanan"], ["year", "Tahunan"], ["custom", "Rentang"]];
  const years = Array.from({ length: new Date().getFullYear() - 1999 }, (_, index) => String(new Date().getFullYear() - index));
  return <main className="report-page"><header className="report-header"><div><p className="eyebrow">ANALITIK TOKO</p><h1>Laporan Detail</h1><p>Analisis lengkap penjualan, pembelian, keuangan, dan peringkat toko.</p></div><a className="secondary-button" href="/dashboard">Kembali</a></header><section className="report-period-control"><p>Periode laporan</p><div className="chart-periods" role="group" aria-label="Periode laporan">{periodOptions.map(([value, label]) => <button className={period === value ? "active" : ""} key={value} onClick={() => setPeriod(value)} type="button">{label}</button>)}</div>{period === "month" && <div className="report-period-selectors"><label>Bulan (opsional)<select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}><option value="">Semua bulan</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={String(index + 1).padStart(2, "0")}>{new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2020, index, 1))}</option>)}</select></label><label>Tahun<select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}><option value="">Tahun berjalan</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div>}{period === "year" && <div className="report-period-selectors"><label>Tahun (opsional)<select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}><option value="">Semua tahun</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div>}{period === "custom" && <div className="chart-custom-range"><label>Dari<input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label><label>Sampai<input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label></div>}</section>{error && <p className="form-error">{error}</p>}{summary && <><SalesChart initialPoints={initialChartPoints} showControls={false} period={period} customFrom={customFrom} customTo={customTo} rangeOverride={periodRange} onRangeChange={handleChartRangeChange} /><section className="report-highlight"><article><span>Laba kotor estimasi</span><strong>{rupiah(summary.financial.estimatedProfit)}</strong></article><article><span>Omset penjualan</span><strong>{rupiah(summary.sales.total)}</strong><small>{summary.sales.count} transaksi</small></article><article><span>Pemasukan</span><strong>{rupiah(summary.financial.income)}</strong></article><article><span>Pengeluaran</span><strong>{rupiah(summary.financial.expense)}</strong></article></section><section className="report-columns"><DetailTable rows={summary.salesByDate} type="sale" /><DetailTable rows={summary.purchasesByDate} type="purchase" /></section><section className="report-columns"><div className="panel-table"><h2>Retur Penjualan</h2><table><tbody><tr><td>Jumlah transaksi</td><td>{summary.returns.salesCount}</td></tr><tr><td>Total nilai retur</td><td>{rupiah(summary.returns.sales)}</td></tr></tbody></table></div><div className="panel-table"><h2>Retur Pembelian</h2><table><tbody><tr><td>Jumlah transaksi</td><td>{summary.returns.purchasesCount}</td></tr><tr><td>Total nilai retur</td><td>{rupiah(summary.returns.purchases)}</td></tr></tbody></table></div></section><section className="report-columns"><RankingTable title="Peringkat Customer" rows={summary.customerRanking} /><RankingTable title="Peringkat Supplier" rows={summary.supplierRanking} /></section><section className="report-columns"><RankingTable title="Produk Terlaris" rows={summary.topProducts.map((item) => ({ name: item.product?.name || "Produk", total: item._sum.total || 0 }))} quantity /><RankingTable title="Transaksi Operator" rows={summary.operatorRanking} /></section><section className="report-columns"><div className="panel-table"><h2>Pembayaran Penjualan</h2><table><thead><tr><th>Metode</th><th>Transaksi</th><th>Nilai</th></tr></thead><tbody>{summary.paymentBreakdown.map((item) => <tr key={item.paymentMethod}><td>{item.paymentMethod}</td><td>{item._count._all}</td><td>{rupiah(item._sum.total || 0)}</td></tr>)}</tbody></table></div><div className="panel-table"><h2>Status Pembayaran Pembelian</h2><table><thead><tr><th>Status</th><th>Transaksi</th><th>Nilai</th></tr></thead><tbody>{summary.purchasePaymentBreakdown.map((item) => <tr key={item.paymentStatus}><td>{item.paymentStatus}</td><td>{item._count._all}</td><td>{rupiah(item._sum.total || 0)}</td></tr>)}</tbody></table></div></section><div className="panel-table"><h2>Stok Menipis</h2><table><thead><tr><th>Produk</th><th>Stok</th><th>Satuan</th></tr></thead><tbody>{summary.lowStock.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.stock}</td><td>{item.unit}</td></tr>)}</tbody></table></div></>}</main>;
}
