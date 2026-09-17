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
  return <main className="min-h-screen flex items-center justify-center p-6"><form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"><div><p className="text-sm font-semibold tracking-wide text-slate-500">KASIR TOKO</p><h1 className="mt-2 text-2xl font-bold">Buat akun toko</h1><p className="mt-1 text-sm text-slate-500">Akun ini menjadi pemilik toko dan workspace Anda.</p></div><label className="block text-sm font-medium">Nama pemilik<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded border p-2" /></label><label className="block text-sm font-medium">Nama toko<input required value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} className="mt-1 w-full rounded border p-2" /></label><label className="block text-sm font-medium">Username<input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="mt-1 w-full rounded border p-2" autoComplete="username" /></label><label className="block text-sm font-medium">Password<input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 w-full rounded border p-2" autoComplete="new-password" /></label>{error && <p className="text-sm text-red-600" role="alert">{error}</p>}<button disabled={loading} className="w-full rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50">{loading ? "Membuat akun..." : "Daftar dan buat toko"}</button><div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />atau<span className="h-px flex-1 bg-slate-200" /></div><button type="button" onClick={registerGoogle} className="flex w-full items-center justify-center gap-2 rounded border border-slate-300 px-4 py-2 font-medium text-slate-700"><GoogleIcon /> Daftar dengan Google</button><p className="text-center text-sm text-slate-500">Sudah punya akun? <a className="font-semibold text-slate-900 underline" href="/login">Masuk</a></p></form></main>;
}
