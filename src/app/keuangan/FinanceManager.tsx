"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Account = { id: number; name: string; type: string; balance: number; openingBalance: number };
type Movement = { id: number; type: string; amount: number; note?: string | null; createdAt: string; fromAccount?: { name: string } | null; toAccount?: { name: string } | null };
const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function FinanceManager({ view = "all" }: { view?: "all" | "cash" | "bank" | "movements" | "history" }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [error, setError] = useState("");
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [movementType, setMovementType] = useState("IN");
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [draggedAccountId, setDraggedAccountId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const filteredMovements = useMemo(() => {
    if (view !== "history") return movements;
    const query = search.trim().toLowerCase();
    const now = new Date();
    const start = new Date(now);
    if (timeFilter === "today") start.setHours(0, 0, 0, 0);
    if (timeFilter === "7days") start.setDate(start.getDate() - 6);
    if (timeFilter === "30days") start.setDate(start.getDate() - 29);
    return movements.filter((movement) => {
      const movementDate = new Date(movement.createdAt);
      const matchesTime = timeFilter === "all"
        || (timeFilter === "today" && movementDate >= start)
        || (timeFilter === "7days" && movementDate >= start)
        || (timeFilter === "30days" && movementDate >= start)
        || (timeFilter === "month" && movementDate.getMonth() === Number(selectedMonth) && movementDate.getFullYear() === Number(selectedYear))
        || (timeFilter === "year" && movementDate.getFullYear() === Number(selectedYear));
      const text = [
        movement.note,
        movement.type === "IN" ? "masuk" : movement.type === "OUT" ? "keluar" : "transfer",
        movement.fromAccount?.name,
        movement.toAccount?.name,
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesTime && (!query || text.includes(query));
    });
  }, [movements, search, selectedMonth, selectedYear, timeFilter, view]);
  const pagedMovements = paginate(filteredMovements, page, pageSize);
  const accountType = "CASH";
  const visibleAccounts = view === "all" || view === "movements" || view === "history" || view === "bank" ? accounts : accounts.filter((account) => account.type === accountType);
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
    const payload: Record<string, unknown> = { ...data, type: String(data.type), amount: Number(data.amount) };
    if (data.fromAccountId) payload.fromAccountId = Number(data.fromAccountId);
    if (data.toAccountId) payload.toAccountId = Number(data.toAccountId);
    payload.note = String(data.note || "").trim() || `Arus kas ${new Date().toLocaleString("id-ID")}`;
    const response = await fetch("/api/finance/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await response.json();
    if (!response.ok) setError(json.error || "Arus uang gagal disimpan"); else { event.currentTarget.reset(); await load(); }
  }
  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.type = accountType;
    data.openingBalance = String(Number(data.openingBalance || 0));
    const response = await fetch("/api/finance/accounts", { method: editingAccount ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingAccount ? { ...data, id: editingAccount.id } : data) });
    const json = await response.json();
    if (!response.ok) setError(json.error || "Akun gagal disimpan"); else { event.currentTarget.reset(); setEditingAccount(null); await load(); }
  }
  async function removeAccount() {
    if (!accountToDelete) return;
    setError("");
    const response = await fetch("/api/finance/accounts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: accountToDelete.id }) });
    const json = await response.json();
    setAccountToDelete(null);
    if (!response.ok) setError(json.error || "Akun gagal dihapus"); else await load();
  }
  async function reorderAccounts(targetId: number) {
    if (draggedAccountId === null || draggedAccountId === targetId) return;
    const next = [...visibleAccounts];
    const from = next.findIndex((account) => account.id === draggedAccountId);
    const to = next.findIndex((account) => account.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setAccounts((current) => {
      const ids = new Set(next.map((account) => account.id));
      return [...next, ...current.filter((account) => !ids.has(account.id))];
    });
    setDraggedAccountId(null);
    const response = await fetch("/api/finance/accounts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: next.map((account) => account.id) }) });
    if (!response.ok) {
      const json = await response.json().catch(() => null);
      setError(json?.error || "Urutan akun gagal disimpan");
      await load();
    }
  }
  const showCash = view !== "movements" && view !== "history";
  const showMovements = view === "all" || view === "movements";
  const isAccountPage = view === "cash" || view === "bank";
  const isHistoryPage = view === "history";
  return <main className="finance-page">
    <header className="report-header"><div><p className="eyebrow">KEUANGAN</p><h1>{view === "movements" ? "Atur Uang Kas" : isHistoryPage ? "Arus Kas" : view === "cash" ? "Kas" : view === "bank" ? "Akun Uang Kas" : "Kas & Arus Uang"}</h1><p>{view === "movements" ? "Kelola dan pantau setiap pergerakan uang." : isHistoryPage ? "Lihat riwayat arus kas yang tercatat." : view === "cash" ? "Kelola uang tunai toko dan saldo awalnya." : view === "bank" ? "Kelola akun uang kas dan saldo awalnya." : "Kelola saldo kasbox dan pergerakan uang."}</p></div><a className="secondary-button" href="/dashboard">Kembali</a></header>
    {error && <p className="form-error">{error}</p>}
    {showCash && <section className="account-grid" aria-label="Urutan akun uang kas">{visibleAccounts.map((account) => <article className="account-card" draggable={isAccountPage} onDragStart={() => setDraggedAccountId(account.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event: DragEvent<HTMLElement>) => { event.preventDefault(); void reorderAccounts(account.id); }} key={account.id}><span>{isAccountPage && "☷ "} {account.name}</span><strong>{rupiah(account.balance)}</strong><small>{isAccountPage ? "Seret untuk mengatur urutan" : "Saldo berjalan"}</small>{isAccountPage && <div className="account-actions"><button type="button" className="table-action" onClick={() => setEditingAccount(account)}>Edit</button><button type="button" className="table-delete" onClick={() => setAccountToDelete(account)}>Hapus</button></div>}</article>)}{!visibleAccounts.length && <p className="empty-state">Belum ada akun uang kas.</p>}</section>}
    {isAccountPage && <form className="panel-form finance-account-form" onSubmit={submitAccount} key={editingAccount?.id || "new"}><h2>{editingAccount ? "Edit akun uang kas" : "Tambah akun uang kas"}</h2><label>Nama akun uang kas *<input name="name" required defaultValue={editingAccount?.name || ""} placeholder="Contoh: Kas Operasional" /></label><label>Saldo awal (Rp)<input name="openingBalance" type="number" min="0" defaultValue={editingAccount?.openingBalance || 0} /></label><div className="form-actions">{editingAccount && <button type="button" className="modal-cancel" onClick={() => setEditingAccount(null)}>Batal</button>}<button className="primary-button" type="submit">{editingAccount ? "Simpan perubahan" : "Simpan akun"}</button></div></form>}
    {isHistoryPage && <section className="panel-table">
      <h2>Riwayat arus kas</h2>
      <div className="table-filters">
        <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari keterangan atau akun..." aria-label="Cari riwayat arus kas" />
        <select value={timeFilter} onChange={(event) => { setTimeFilter(event.target.value); setPage(1); }} aria-label="Pilih waktu riwayat arus kas">
          <option value="all">Semua waktu</option>
          <option value="today">Hari ini</option>
          <option value="7days">7 hari terakhir</option>
          <option value="30days">30 hari terakhir</option>
          <option value="month">Bulanan</option>
          <option value="year">Tahunan</option>
        </select>
        {timeFilter === "month" && <select value={selectedMonth} onChange={(event) => { setSelectedMonth(event.target.value); setPage(1); }} aria-label="Pilih bulan">
          {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((month, index) => <option key={month} value={index}>{month}</option>)}
        </select>}
        {(timeFilter === "month" || timeFilter === "year") && <select value={selectedYear} onChange={(event) => { setSelectedYear(event.target.value); setPage(1); }} aria-label="Pilih tahun">
          {Array.from({ length: 12 }, (_, index) => new Date().getFullYear() - index).map((year) => <option key={year} value={year}>{year}</option>)}
        </select>}
      </div>
      <div className="table-scroll"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Akun kas</th><th>Keterangan</th><th>Jumlah</th></tr></thead><tbody>{pagedMovements.map((m) => <tr key={m.id}><td>{new Date(m.createdAt).toLocaleString("id-ID")}</td><td>{m.type === "IN" ? "Masuk" : m.type === "OUT" ? "Keluar" : "Transfer"}</td><td>{m.fromAccount?.name || "-"} → {m.toAccount?.name || "-"}</td><td>{m.note || "-"}</td><td>{rupiah(m.amount)}</td></tr>)}{!pagedMovements.length && <tr><td colSpan={5}><p className="empty-state">Tidak ada riwayat arus kas yang sesuai.</p></td></tr>}</tbody></table><Pagination page={page} pageSize={pageSize} total={filteredMovements.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></div>
    </section>}
    {showMovements && <section className="finance-columns finance-form-only">
      <form className="panel-form" onSubmit={submit}><h2>Arus uang</h2><label>Jenis<select name="type" value={movementType} onChange={(event) => setMovementType(event.target.value)}><option value="IN">Uang masuk</option><option value="OUT">Uang keluar</option><option value="TRANSFER">Transfer antar akun kas</option></select></label>{movementType === "TRANSFER" && <><label>Dari akun kas !<select name="fromAccountId" defaultValue="" required><option value="">- Pilih akun kas -</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Ke akun kas !<select name="toAccountId" defaultValue="" required><option value="">- Pilih akun kas -</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label></>}{movementType !== "TRANSFER" && <label>Akun kas !<select name={movementType === "IN" ? "toAccountId" : "fromAccountId"} defaultValue="" required><option value="">- Pilih akun kas -</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}<label>Jumlah (Rp) !<input name="amount" type="number" min="1" required /></label><label>Keterangan (opsional)<input name="note" placeholder="Kosongkan untuk catatan waktu otomatis" /></label><button className="primary-button" type="submit">Simpan arus uang</button></form>
    </section>}
    {accountToDelete && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAccountToDelete(null); }}><section className="receipt-success-modal contact-delete-modal"><div className="modal-heading"><div><p className="eyebrow">KONFIRMASI HAPUS</p><h2>Hapus akun?</h2></div><button type="button" className="modal-close" onClick={() => setAccountToDelete(null)}>×</button></div><p>Data <b>{accountToDelete.name}</b> akan dihapus dari daftar akun uang kas.</p><div className="form-actions"><button type="button" className="modal-cancel" onClick={() => setAccountToDelete(null)}>Batal</button><button type="button" className="table-delete" onClick={() => void removeAccount()}>Hapus</button></div></section></div>}
  </main>;
}
