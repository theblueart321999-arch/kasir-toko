"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function GoogleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M21.6 12.23c0-.7-.06-1.36-.18-2H12v3.79h5.38a4.6 4.6 0 0 1-1.99 3.02v2.5h3.22c1.88-1.73 2.99-4.28 2.99-7.31Z" /><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.46l-3.22-2.5c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.06v2.58A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.39 13.87A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.55H3.06A10 10 0 0 0 2 12c0 1.61.39 3.13 1.06 4.45l3.33-2.58Z" /><path fill="#EA4335" d="M12 6c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.96 2.91 14.7 2 12 2a10 10 0 0 0-8.94 5.55l3.33 2.58C7.18 7.76 9.39 6 12 6Z" /></svg>;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", storeName: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Pendaftaran gagal.");
    else { router.push("/dashboard"); router.refresh(); }
    setLoading(false);
  }
  function registerGoogle() { router.push("/api/auth/google"); }
  return (
    <main className="register-page">
      <div className="register-decoration register-decoration-one" />
      <div className="register-decoration register-decoration-two" />
      <section className="register-layout">
        <div className="register-intro">
          <div className="register-logo" aria-hidden="true"><span>K</span><span>T</span></div>
          <p className="register-kicker">KASIR TOKO</p>
          <h1>Mulai kelola toko dengan lebih rapi.</h1>
          <p className="register-description">Buat akun pemilik toko untuk mengatur produk, transaksi, stok, dan laporan dalam satu tempat.</p>
          <div className="register-benefit"><span>✓</span><p><b>Workspace siap digunakan</b><small>Data toko Anda tersimpan dalam satu dashboard.</small></p></div>
        </div>
        <form onSubmit={submit} className="register-card">
          <div className="register-heading">
            <p className="register-eyebrow">MEMULAI PERJALANAN</p>
            <h2>Buat akun toko</h2>
            <p>Daftarkan akun pemilik dan mulai kelola toko Anda.</p>
          </div>
          <label className="register-field">Nama pemilik
            <span className="register-input-wrap"><span aria-hidden="true">♙</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" autoComplete="name" /></span>
          </label>
          <label className="register-field">Nama toko
            <span className="register-input-wrap"><span aria-hidden="true">⌂</span><input required value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} placeholder="Contoh: Toko Makmur" /></span>
          </label>
          <label className="register-field">Username
            <span className="register-input-wrap"><span aria-hidden="true">@</span><input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Buat username" autoComplete="username" /></span>
          </label>
          <label className="register-field">Password
            <span className="register-input-wrap"><span aria-hidden="true">●</span><input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimal 8 karakter" autoComplete="new-password" /></span>
          </label>
          {error && <p className="register-error" role="alert"><span aria-hidden="true">!</span>{error}</p>}
          <button disabled={loading} className="register-submit">{loading ? "Membuat akun..." : "Daftar dan buat toko"}</button>
          <div className="register-divider"><span />atau<span /></div>
          <button type="button" onClick={registerGoogle} className="register-google"><GoogleIcon /> Daftar dengan Google</button>
          <p className="register-login">Sudah punya akun? <a href="/login">Masuk</a></p>
        </form>
      </section>
    </main>
  );
}
