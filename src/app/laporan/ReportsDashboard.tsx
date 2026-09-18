"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PeriodControls from "../PeriodControls";
import { periodRange, type ReportPeriod } from "../periodRange";

type Account = { id: number; name: string; balance: number };
type DebtItem = {
  id: number;
  supplierName?: string;
  supplier?: { name: string };
  amount: number;
  paidAmount?: number;
};
type BalanceReport = {
  summary: { debt: number; receivable: number; productValue: number; cash: number; total: number };
  accounts: Account[];
  receivables: { id: number; customerName: string; amount: number; paidAmount: number }[];
  payables: DebtItem[];
};
type OperationalReport = {
  sales: { total: number; count: number };
  purchases: { total: number };
  financial: { income: number; expense: number; estimatedProfit: number };
  operatorRanking: { name: string; total: number }[];
  topProducts: { product?: { name: string; sku: string } | null; _sum: { quantity: number | null } }[];
};

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const amount = (value: number) => `Rp ${numberFormat.format(Math.max(0, value))}`;
const signedAmount = (value: number) => `${value < 0 ? "- " : ""}Rp ${numberFormat.format(Math.abs(value))}`;

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="balance-report-section-title">{children}</h2>;
}

export default function ReportsDashboard() {
  const [report, setReport] = useState<BalanceReport | null>(null);
  const [operations, setOperations] = useState<OperationalReport | null>(null);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const period = (searchParams.get("period") as ReportPeriod | null) || "today";
    const month = Number(searchParams.get("month") || new Date().getMonth() + 1);
    const year = Number(searchParams.get("year") || new Date().getFullYear());
    const from = searchParams.get("from") || new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") || from;
    const range = periodRange(period, month, year, from, to);
    const query = `?from=${range.from}&to=${range.to}`;
    setReport(null);
    setOperations(null);
    void Promise.all([fetch("/api/reports/balance", { cache: "no-store" }), fetch(`/api/reports/summary${query}`, { cache: "no-store" })])
      .then(async ([balanceResponse, operationsResponse]) => {
        const balanceJson = await balanceResponse.json();
        const operationsJson = await operationsResponse.json();
        if (!balanceResponse.ok) throw new Error(balanceJson.error || "Laporan saldo gagal diambil");
        if (!operationsResponse.ok) throw new Error(operationsJson.error || "Ringkasan operasional gagal diambil");
        setReport(balanceJson);
        setOperations(operationsJson);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Laporan saldo gagal diambil"));
  }, [searchParams]);

  if (error) return <main className="balance-report-page"><p className="form-error">{error}</p></main>;
  if (!report || !operations) return <main className="balance-report-page"><p className="balance-report-loading">Memuat laporan kas...</p></main>;

  const { summary } = report;
  const estimatedNet = operations.financial.estimatedProfit + operations.financial.income - operations.financial.expense;
  return (
    <main className="balance-report-page">
      <header className="balance-report-header"><h1>Laporan Kas</h1></header>
      <PeriodControls />

      <section className="balance-report-metrics" aria-label="Ringkasan operasional">
        <article><span>OMSET</span><strong>{amount(operations.sales.total)}</strong><small>{operations.sales.count} transaksi</small></article>
        <article><span>LABA</span><strong>{signedAmount(operations.financial.estimatedProfit)}</strong><small>Omset dikurangi pembelian</small></article>
        <article><span>PEMASUKAN</span><strong>{amount(operations.financial.income)}</strong><small>Arus kas masuk</small></article>
        <article><span>PENGELUARAN</span><strong>{amount(operations.financial.expense)}</strong><small>Arus kas keluar</small></article>
        <article><span>ESTIMASI LABA BERSIH</span><strong>{signedAmount(estimatedNet)}</strong><small>Laba + pemasukan - pengeluaran</small></article>
      </section>

      <section className="balance-report-overview" aria-label="Ringkasan saldo">
        <article><span>HUTANG</span><strong>{amount(summary.debt)}</strong></article>
        <article><span>PIUTANG</span><strong>{amount(summary.receivable)}</strong></article>
        <article><span>PRODUK</span><strong>{amount(summary.productValue)}</strong></article>
      </section>

      <section className="balance-report-card">
        <SectionTitle>KEUANGAN</SectionTitle>
        {report.accounts.map((account) => <div className="balance-report-row" key={account.id}><div><b>{account.name.toUpperCase()}</b><small>Saldo akun uang kas</small></div><strong>{amount(account.balance)}</strong></div>)}
        <div className="balance-report-row balance-report-total"><div><b>JUMLAH</b><small>Total seluruh akun uang kas</small></div><strong>{amount(summary.cash)}</strong></div>
      </section>

      <section className="balance-report-card balance-report-total-card">
        <SectionTitle>TOTAL SALDO</SectionTitle>
        <strong>{amount(summary.total)}</strong>
      </section>

      <section className="balance-report-detail-grid">
        <div className="balance-report-card"><SectionTitle>DAFTAR TRANSAKSI OPERATOR</SectionTitle>{operations.operatorRanking.length ? operations.operatorRanking.map((operator) => <div className="balance-report-row" key={operator.name}><div><b>{operator.name}</b><small>Aktivitas arus kas</small></div><strong>{amount(operator.total)}</strong></div>) : <p className="balance-report-empty">Belum ada aktivitas operator.</p>}</div>
        <div className="balance-report-card"><SectionTitle>PRODUK TERJUAL</SectionTitle>{operations.topProducts.length ? operations.topProducts.slice(0, 8).map((item) => <div className="balance-report-row" key={item.product?.sku || String(item._sum.quantity)}><div><b>{item.product?.name || "Produk"}</b><small>{item.product?.sku || "SKU tidak tersedia"}</small></div><strong>{item._sum.quantity ?? 0} unit</strong></div>) : <p className="balance-report-empty">Belum ada produk terjual.</p>}</div>
      </section>

    </main>
  );
}
