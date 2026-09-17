"use client";

import { FormEvent, useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const googleError = searchParams.get("error");
  function loginGoogle() {
    fetch("/api/auth/google").then(async (response) => {
      if (response.redirected) window.location.assign(response.url);
      else { const data = await response.json(); setError(data.error || "Login Google gagal."); }
    }).catch(() => setError("Login Google gagal. Periksa koneksi server."));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login gagal.");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div><p className="text-sm font-semibold tracking-wide text-slate-500">KASIR TOKO</p><h1 className="mt-2 text-2xl font-bold">Masuk ke dashboard</h1></div>
        <label className="block text-sm font-medium">Username<input required value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full rounded border p-2" autoComplete="username" /></label>
        <label className="block text-sm font-medium">Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded border p-2" autoComplete="current-password" /></label>
        {(error || googleError) && <p className="text-sm text-red-600" role="alert">{error || (googleError === "google_config" ? "Login Google belum dikonfigurasi oleh administrator." : googleError === "google_state" ? "Sesi Google tidak valid. Silakan coba lagi." : "Login Google gagal. Silakan coba lagi.")}</p>}
        <button disabled={loading} className="w-full rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50">{loading ? "Memproses..." : "Masuk"}</button>
        <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />atau<span className="h-px flex-1 bg-slate-200" /></div>
        <button type="button" onClick={loginGoogle} className="flex w-full items-center justify-center gap-2 rounded border border-slate-300 px-4 py-2 font-medium text-slate-700"><span aria-hidden="true" className="text-base font-bold text-blue-600">G</span> Masuk dengan Google</button>
        <p className="text-center text-sm text-slate-500">Belum punya akun? <a className="font-semibold text-slate-900 underline" href="/daftar">Daftar sekarang</a></p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
