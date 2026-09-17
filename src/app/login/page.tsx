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
        <a href="/api/auth/google" className="flex w-full items-center justify-center gap-2 rounded border border-slate-300 px-4 py-2 font-medium text-slate-700">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="#4285F4" d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.26Z" />
            <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.75Z" />
            <path fill="#FBBC05" d="M6.54 13.83a5.86 5.86 0 0 1 0-3.66V7.64H3.3a9.75 9.75 0 0 0 0 8.72l3.24-2.53Z" />
            <path fill="#EA4335" d="M12 6.14c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.22 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.39l3.24 2.53C7.31 7.86 9.46 6.14 12 6.14Z" />
          </svg>
          Masuk dengan Google
        </a>
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
