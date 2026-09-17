"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type Setting = { storeName: string; address: string; phone: string; taxRate: number; receiptFooter: string };
type Price = { id: number; sku: string; name: string; price: number; discountPercent: number };
type Operator = { id: number; name: string; username: string; role: "OWNER" | "ADMIN" | "KASIR"; active: boolean; createdAt: string };
type Profile = { id: number; name: string; username: string; role: string; avatarUrl?: string | null };
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function SettingsManager() {
  const [settings, setSettings] = useState<Setting>({ storeName: "", address: "", phone: "", taxRate: 11, receiptFooter: "" });
  const [prices, setPrices] = useState<Price[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [employee, setEmployee] = useState({ name: "", username: "", password: "", role: "KASIR" as "ADMIN" | "KASIR" });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => { void Promise.all([fetch("/api/settings/store"), fetch("/api/price-levels"), fetch("/api/admin/operators"), fetch("/api/auth/me")]).then(async ([s, p, o, me]) => { if (s.ok) setSettings(await s.json()); if (p.ok) setPrices(await p.json()); if (o.ok) setOperators(await o.json()); if (me.ok) { const data = await me.json(); setProfile(data.operator); } }); }, []);
  async function save() {
    const response = await fetch("/api/settings/store", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    setNotice(response.ok ? "Pengaturan toko disimpan" : ((await response.json()).error || "Gagal menyimpan"));
  }
  async function updateDiscount(productId: number, discountPercent: number) {
    const response = await fetch("/api/price-levels", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, discountPercent }) });
    if (response.ok) setPrices((items) => items.map((item) => item.id === productId ? { ...item, discountPercent } : item));
    else setNotice("Diskon gagal diperbarui");
  }
  async function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/operators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(employee) });
    const data = await response.json();
    if (!response.ok) { setNotice(data.error || "Karyawan gagal ditambahkan"); return; }
    setOperators((items) => [...items, { ...data, createdAt: new Date().toISOString() }]);
    setEmployee({ name: "", username: "", password: "", role: "KASIR" });
    setNotice("Akun karyawan berhasil dibuat");
  }
  async function changeAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 1_500_000) {
      setNotice("Pilih foto JPG, PNG, atau WebP maksimal 1,5 MB.");
      return;
    }
    const avatarUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Foto tidak dapat dibaca."));
      reader.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (!avatarUrl) { setNotice("Foto tidak dapat dibaca."); return; }
    setAvatarSaving(true);
    try {
      const response = await fetch("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarUrl }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Foto profil gagal disimpan.");
      setProfile(data.operator);
      setNotice("Foto profil berhasil diperbarui.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Foto profil gagal disimpan.");
    } finally {
      setAvatarSaving(false);
    }
  }
  return <main className="management-page"><header className="management-header"><div><p className="eyebrow">KASIR TOKO · PENGATURAN</p><h1>Pengaturan Toko</h1><p>Kelola identitas toko, pajak, dan diskon produk.</p></div><a href="/dashboard">← Dashboard</a></header>
    {notice && <div className="management-notice">{notice}</div>}
    <section className="panel-form settings-form" id="profil"><h2>Profil akun</h2><div className="profile-setting"><div className="profile-avatar">{profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : (profile?.name?.slice(0, 2).toUpperCase() || "TB")}</div><div><b>{profile?.name || "Memuat profil..."}</b><p>{profile?.username || ""} · {profile?.role || ""}</p><label className="profile-upload">Ganti foto profil<input type="file" accept="image/jpeg,image/png,image/webp" onChange={changeAvatar} disabled={avatarSaving} /></label><small>JPG, PNG, atau WebP maksimal 1,5 MB.</small></div></div></section>
    <section className="panel-form settings-form"><h2>Identitas & struk</h2><label>Nama toko<input value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} /></label><label>Alamat<textarea value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></label><label>Telepon<input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} /></label><label>Tarif pajak (%)<input type="number" min="0" max="100" step="0.01" value={settings.taxRate} onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })} /></label><label>Footer struk<textarea value={settings.receiptFooter} onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })} /></label><button className="primary-button" onClick={save}>Simpan pengaturan</button></section>
    <section className="panel-form settings-form"><h2>Akun kolaborasi toko</h2><p className="empty-state">Tambahkan akun karyawan agar dapat masuk dengan akun sendiri dan mengelola toko yang sama.</p><form onSubmit={addEmployee}><label>Nama karyawan<input value={employee.name} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} required /></label><label>Username<input value={employee.username} onChange={(e) => setEmployee({ ...employee, username: e.target.value })} required /></label><label>Password sementara<input type="password" minLength={8} value={employee.password} onChange={(e) => setEmployee({ ...employee, password: e.target.value })} required /><small>Minimal 8 karakter.</small></label><label>Peran<select value={employee.role} onChange={(e) => setEmployee({ ...employee, role: e.target.value as "ADMIN" | "KASIR" })}><option value="KASIR">Kasir</option><option value="ADMIN">Admin</option></select></label><button className="primary-button">+ Tambah akun karyawan</button></form><div className="table-scroll"><table><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Status</th></tr></thead><tbody>{operators.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.username}</td><td>{item.role}</td><td>{item.active ? "Aktif" : "Nonaktif"}</td></tr>)}</tbody></table></div></section>
    <section className="panel-table settings-prices"><h2>Diskon produk</h2><p className="empty-state">Diskon diterapkan otomatis saat transaksi baru dibuat.</p><div className="table-scroll"><table><thead><tr><th>Produk</th><th>Harga dasar</th><th>Diskon (%)</th><th>Harga jual</th></tr></thead><tbody>{prices.map((item) => <tr key={item.id}><td><b>{item.name}</b><br /><small>{item.sku}</small></td><td>{money(item.price)}</td><td><input className="compact-input" type="number" min="0" max="100" step="0.01" value={item.discountPercent} onChange={(e) => void updateDiscount(item.id, Number(e.target.value))} /></td><td>{money(Math.round(item.price * (1 - item.discountPercent / 100)))}</td></tr>)}</tbody></table></div></section>
  </main>;
}
