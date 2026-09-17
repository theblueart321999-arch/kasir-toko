"use client";

import { useEffect, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Account = { id: number; name: string; type: string; balance: number };
type Debt = { id: number; invoiceNumber: string; total: number; paymentStatus: string; createdAt: string; supplier: { name: string } };
type BalanceData = {
  summary: { debt: number; receivable: number; productValue: number; cash: number; total: number };
  accounts: Account[];
  receivables: { name: string; total: number }[];
  payables: Debt[];
};
const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function BalanceReport() {
  const [data, setData] = useState<BalanceData | null>(null);
  const [error, setError] = useState("");
  const [receivablePage, setReceivablePage] = useState(1);
  const [payablePage, setPayablePage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => {
    fetch("/api/reports/balance").then(async (response) => {
      const json = await response.json();
      if (!response.ok) setError(json.error || "Laporan saldo gagal dimuat");
      else setData(json);
    }).catch(() => setError("Laporan saldo gagal dimuat"));
  }, []);
  const receivables = data ? paginate(data.receivables, receivablePage, pageSize) : [];
  const payables = data ? paginate(data.payables, payablePage, pageSize) : [];
  return <main className="balance-page"><header className="report-header"><div><p className="eyebrow">ANALITIK TOKO</p><h1>Laporan Saldo</h1><p>Ringkasan posisi kas, piutang, hutang, dan nilai persediaan.</p></div><a className="secondary-button" href="/laporan">Kembali</a></header>{error && <p className="form-error">{error}</p>}{data && <><section className="balance-summary"><article><span>Hutang</span><strong>{rupiah(data.summary.debt)}</strong></article><article><span>Piutang</span><strong>{rupiah(data.summary.receivable)}</strong></article><article><span>Produk</span><strong>{rupiah(data.summary.productValue)}</strong></article></section><section className="balance-panel"><h2>Keuangan</h2>{data.accounts.map((account) => <div className="balance-row" key={account.id}><div><b>{account.name}</b><small>{account.type === "BANK" ? "Rekening bank" : "Kas toko"}</small></div><strong>{rupiah(account.balance)}</strong></div>)}<div className="balance-row balance-total"><b>JUMLAH</b><strong>{rupiah(data.summary.cash)}</strong></div></section><section className="balance-panel balance-total-panel"><h2>Total Saldo</h2><strong>{rupiah(data.summary.total)}</strong><small>Kas + piutang + nilai produk - hutang</small></section><section className="balance-columns"><div className="balance-panel" id="piutang"><h2>Daftar Piutang</h2>{data.receivables.length ? receivables.map((item) => <div className="balance-row" key={item.name}><b>{item.name}</b><strong>{rupiah(item.total)}</strong></div>) : <p className="empty-state">Belum ada piutang tercatat.</p>}</div><Pagination page={receivablePage} pageSize={pageSize} total={data.receivables.length} onPageChange={setReceivablePage} onPageSizeChange={(size) => { setPageSize(size); setReceivablePage(1); setPayablePage(1); }} /><div className="balance-panel" id="hutang"><h2>Daftar Hutang</h2>{data.payables.length ? payables.map((item) => <div className="balance-row" key={item.id}><div><b>{item.supplier.name}</b><small>{item.invoiceNumber} · {item.paymentStatus}</small></div><strong>{rupiah(item.total)}</strong></div>) : <p className="empty-state">Belum ada hutang tercatat.</p>}</div><Pagination page={payablePage} pageSize={pageSize} total={data.payables.length} onPageChange={setPayablePage} onPageSizeChange={(size) => { setPageSize(size); setReceivablePage(1); setPayablePage(1); }} /></section></>}</main>;
}
