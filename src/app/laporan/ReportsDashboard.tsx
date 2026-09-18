"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

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

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const amount = (value: number) => `Rp ${numberFormat.format(Math.max(0, value))}`;

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="balance-report-section-title">{children}</h2>;
}

export default function ReportsDashboard() {
  const [report, setReport] = useState<BalanceReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/reports/balance", { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Laporan saldo gagal diambil");
        setReport(json);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Laporan saldo gagal diambil"));
  }, []);

  if (error) return <main className="balance-report-page"><p className="form-error">{error}</p></main>;
  if (!report) return <main className="balance-report-page"><p className="balance-report-loading">Memuat laporan saldo...</p></main>;

  const { summary } = report;
  return (
    <main className="balance-report-page">
      <header className="balance-report-header"><h1>Laporan Kas</h1></header>

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

    </main>
  );
}
