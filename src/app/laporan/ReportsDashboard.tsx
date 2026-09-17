"use client";

import { useEffect, useState } from "react";
import SalesChart from "../dashboard/SalesChart";

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
  return <div className="panel-table report-detail-table"><h2>Transaksi {type === "sale" ? "Penjualan" : "Pembelian"}</h2><table><thead><tr><th>Tanggal</th>{type === "sale" && <th>Laba</th>}<th>Nilai</th></tr></thead><tbody>{rows.map((row) => <tr key={`${type}-${row.date}`}><td>{new Intl.DateTimeFormat("id-ID").format(new Date(`${row.date}T00:00:00`))}</td>{type === "sale" && <td className="profit-cell">{rupiah(row.total * 0.4)}</td>}<td>{rupiah(row.total)}</td></tr>)}<tr className="total-row"><th>Jumlah</th>{type === "sale" && <th>{rupiah(rows.reduce((sum, row) => sum + row.total * 0.4, 0))}</th>}<th>{rupiah(rows.reduce((sum, row) => sum + row.total, 0))}</th></tr></tbody></table></div>;
}
function RankingTable({ title, rows, quantity }: { title: string; rows: Ranking[]; quantity?: boolean }) {
  return <div className="panel-table ranking-table"><h2>{title}</h2><table><thead><tr><th>No</th><th>Nama</th>{quantity ? <th>Jml</th> : null}<th>Nilai</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.name}><td>{index + 1}</td><td>{row.name}</td>{quantity ? <td>{Math.round(row.total / 40000)}</td> : null}<td>{rupiah(row.total)}</td></tr>)}{!rows.length && <tr><td colSpan={quantity ? 4 : 3}>Belum ada data</td></tr>}</tbody></table></div>;
}

export default function ReportsDashboard() {
  const [from, setFrom] = useState(today); const [to, setTo] = useState(today); const [summary, setSummary] = useState<Summary | null>(null); const [error, setError] = useState("");
  const load = async () => { const response = await fetch(`/api/reports/summary?from=${from}&to=${to}`); const json = await response.json(); if (!response.ok) setError(json.error || "Laporan gagal dimuat"); else { setError(""); setSummary(json); } };
  // The initial request should run only once; date changes are submitted explicitly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);
  const initialChartPoints = summary?.salesByDate.map((row) => {
    const date = new Date(`${row.date}T00:00:00`);
    return {
      key: row.date,
      label: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(date),
      dateLabel: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date),
      total: row.total,
    };
  }) ?? [];
  return <main className="report-page"><header className="report-header"><div><p className="eyebrow">ANALITIK TOKO</p><h1>Laporan Detail</h1><p>Analisis lengkap penjualan, pembelian, keuangan, dan peringkat toko.</p></div><a className="secondary-button" href="/dashboard">Kembali</a></header><form className="date-filter" onSubmit={(e) => { e.preventDefault(); void load(); }}><label>Dari<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>Sampai<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label><button className="primary-button">Tampilkan Laporan</button></form>{error && <p className="form-error">{error}</p>}{summary && <><SalesChart initialPoints={initialChartPoints} /><section className="report-highlight"><article><span>Laba kotor estimasi</span><strong>{rupiah(summary.financial.estimatedProfit)}</strong></article><article><span>Omset penjualan</span><strong>{rupiah(summary.sales.total)}</strong><small>{summary.sales.count} transaksi</small></article><article><span>Pemasukan</span><strong>{rupiah(summary.financial.income)}</strong></article><article><span>Pengeluaran</span><strong>{rupiah(summary.financial.expense)}</strong></article></section><section className="report-columns"><DetailTable rows={summary.salesByDate} type="sale" /><DetailTable rows={summary.purchasesByDate} type="purchase" /></section><section className="report-columns"><div className="panel-table"><h2>Retur Penjualan</h2><table><tbody><tr><td>Jumlah transaksi</td><td>{summary.returns.salesCount}</td></tr><tr><td>Total nilai retur</td><td>{rupiah(summary.returns.sales)}</td></tr></tbody></table></div><div className="panel-table"><h2>Retur Pembelian</h2><table><tbody><tr><td>Jumlah transaksi</td><td>{summary.returns.purchasesCount}</td></tr><tr><td>Total nilai retur</td><td>{rupiah(summary.returns.purchases)}</td></tr></tbody></table></div></section><section className="report-columns"><RankingTable title="Peringkat Customer" rows={summary.customerRanking} /><RankingTable title="Peringkat Supplier" rows={summary.supplierRanking} /></section><section className="report-columns"><RankingTable title="Produk Terlaris" rows={summary.topProducts.map((item) => ({ name: item.product?.name || "Produk", total: item._sum.total || 0 }))} quantity /><RankingTable title="Transaksi Operator" rows={summary.operatorRanking} /></section><section className="report-columns"><div className="panel-table"><h2>Pembayaran Penjualan</h2><table><thead><tr><th>Metode</th><th>Transaksi</th><th>Nilai</th></tr></thead><tbody>{summary.paymentBreakdown.map((item) => <tr key={item.paymentMethod}><td>{item.paymentMethod}</td><td>{item._count._all}</td><td>{rupiah(item._sum.total || 0)}</td></tr>)}</tbody></table></div><div className="panel-table"><h2>Status Pembayaran Pembelian</h2><table><thead><tr><th>Status</th><th>Transaksi</th><th>Nilai</th></tr></thead><tbody>{summary.purchasePaymentBreakdown.map((item) => <tr key={item.paymentStatus}><td>{item.paymentStatus}</td><td>{item._count._all}</td><td>{rupiah(item._sum.total || 0)}</td></tr>)}</tbody></table></div></section><div className="panel-table"><h2>Stok Menipis</h2><table><thead><tr><th>Produk</th><th>Stok</th><th>Satuan</th></tr></thead><tbody>{summary.lowStock.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.stock}</td><td>{item.unit}</td></tr>)}</tbody></table></div></>}</main>;
}
