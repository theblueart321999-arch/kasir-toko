"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const darkMode = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("kasir-toko-theme-change", onStoreChange);
      return () => window.removeEventListener("kasir-toko-theme-change", onStoreChange);
    },
    () => {
      const savedTheme = window.localStorage.getItem("kasir-toko-theme");
      return savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    },
    () => false,
  );
  const googleError = searchParams.get("error");

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  function toggleTheme() {
    window.localStorage.setItem("kasir-toko-theme", darkMode ? "light" : "dark");
    window.dispatchEvent(new Event("kasir-toko-theme-change"));
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
    <main className="login-page">
      <button className="login-theme-toggle" type="button" onClick={toggleTheme} aria-label={darkMode ? "Gunakan tema terang" : "Gunakan tema gelap"}>{darkMode ? "☀ Terang" : "☾ Gelap"}</button>
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />
      <section className="login-layout">
        <div className="login-intro">
          <div className="login-logo" aria-hidden="true"><span>K</span><span>T</span></div>
          <p className="login-kicker">KASIR TOKO</p>
          <h1>Kelola toko lebih mudah, setiap hari.</h1>
          <p className="login-description">Satu tempat untuk mengatur penjualan, stok, pembelian, dan laporan bisnis Anda.</p>
          <div className="login-benefits">
            <span><b>✓</b> Penjualan lebih teratur</span>
            <span><b>✓</b> Laporan siap kapan saja</span>
          </div>
        </div>
        <form onSubmit={submit} className="login-card">
          <div className="login-card-heading">
            <p className="login-card-eyebrow">Selamat datang kembali</p>
            <h2>Masuk ke dashboard</h2>
            <p>Gunakan akun Anda untuk melanjutkan.</p>
          </div>
          <label className="login-field">Username
            <span className="login-input-wrap"><span className="login-input-icon" aria-hidden="true">✉</span><input required value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Masukkan username" /></span>
          </label>
          <label className="login-field">Password
            <span className="login-input-wrap"><span className="login-input-icon" aria-hidden="true">●</span><input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Masukkan password" /><button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>{showPassword ? "Sembunyikan" : "Lihat"}</button></span>
          </label>
          {(error || googleError) && <p className="login-error" role="alert"><span aria-hidden="true">!</span>{error || (googleError === "google_config" ? "Login Google belum dikonfigurasi oleh administrator." : googleError === "google_state" ? "Sesi Google tidak valid. Silakan coba lagi." : "Login Google gagal. Silakan coba lagi.")}</p>}
          <button disabled={loading} className="login-submit">{loading ? "Memproses..." : "Masuk ke akun"}</button>
          <div className="login-divider"><span />atau<span /></div>
          <a href="/api/auth/google" className="login-google">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="#4285F4" d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.26Z" />
            <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.75Z" />
            <path fill="#FBBC05" d="M6.54 13.83a5.86 5.86 0 0 1 0-3.66V7.64H3.3a9.75 9.75 0 0 0 0 8.72l3.24-2.53Z" />
            <path fill="#EA4335" d="M12 6.14c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.22 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.39l3.24 2.53C7.31 7.86 9.46 6.14 12 6.14Z" />
          </svg>
          Masuk dengan Google
          </a>
          <p className="login-register">Belum punya akun? <a href="/daftar">Daftar sekarang</a></p>
        </form>
      </section>
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
