"use client";

import { FormEvent, useEffect, useState } from "react";

type Account = { id: number; name: string; balance: number; openingBalance: number };
type Movement = { id: number; type: string; amount: number; note?: string | null; createdAt: string; fromAccount?: { name: string } | null; toAccount?: { name: string } | null };
const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function FinanceManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [error, setError] = useState("");
  const load = async () => {
    const [a, m] = await Promise.all([fetch("/api/finance/accounts"), fetch("/api/finance/movements")]);
    const aj = await a.json(); const mj = await m.json();
    if (!a.ok || !m.ok) setError(aj.error || mj.error || "Data gagal dimuat");
    else { setAccounts(aj); setMovements(mj); }
  };
  // Initial data is loaded after mount so the form remains responsive.
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.amount = String(Number(data.amount));
    const response = await fetch("/api/finance/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const json = await response.json();
    if (!response.ok) setError(json.error || "Arus uang gagal disimpan"); else { event.currentTarget.reset(); await load(); }
  }
  return <main className="finance-page">
    <header className="report-header"><div><p className="eyebrow">KEUANGAN</p><h1>Kas & Arus Uang</h1><p>Kelola saldo kasbox dan catat setiap pergerakan uang.</p></div><a className="secondary-button" href="/dashboard">Kembali</a></header>
    {error && <p className="form-error">{error}</p>}
    <section className="account-grid">{accounts.map((account) => <article className="account-card" key={account.id}><span>{account.name}</span><strong>{rupiah(account.balance)}</strong><small>Saldo berjalan</small></article>)}{!accounts.length && <p className="empty-state">Belum ada akun kas.</p>}</section>
    <section className="finance-columns">
      <form className="panel-form" onSubmit={submit}><h2>Catat arus uang</h2><label>Jenis<select name="type" defaultValue="IN"><option value="IN">Uang masuk</option><option value="OUT">Uang keluar</option><option value="TRANSFER">Transfer antar akun</option></select></label><label>Dari akun<select name="fromAccountId" defaultValue=""><option value="">- Pilih akun -</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Ke akun<select name="toAccountId" defaultValue=""><option value="">- Pilih akun -</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Jumlah (Rp)<input name="amount" type="number" min="1" required /></label><label>Keterangan<input name="note" placeholder="Contoh: setoran penjualan" /></label><button className="primary-button" type="submit">Simpan arus uang</button></form>
      <div className="panel-table"><h2>Arus uang terbaru</h2><div className="table-scroll"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Akun</th><th>Jumlah</th></tr></thead><tbody>{movements.map((m) => <tr key={m.id}><td>{new Date(m.createdAt).toLocaleDateString("id-ID")}</td><td>{m.type === "IN" ? "Masuk" : m.type === "OUT" ? "Keluar" : "Transfer"}</td><td>{m.fromAccount?.name || "-"} → {m.toAccount?.name || "-"}</td><td>{rupiah(m.amount)}</td></tr>)}</tbody></table></div></div>
    </section>
  </main>;
}
