"use client";

import { useEffect, useState } from "react";

type Setting = { storeName: string; address: string; phone: string; taxRate: number; receiptFooter: string };

export default function SettingsManager() {
  const [settings, setSettings] = useState<Setting>({ storeName: "", address: "", phone: "", taxRate: 11, receiptFooter: "" });
  const [notice, setNotice] = useState("");
  useEffect(() => { void fetch("/api/settings/store").then(async (response) => { if (response.ok) setSettings(await response.json()); }); }, []);
  async function save() {
    const response = await fetch("/api/settings/store", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    setNotice(response.ok ? "Pengaturan toko disimpan" : ((await response.json()).error || "Gagal menyimpan"));
  }
  return <main className="management-page"><header className="management-header"><div><p className="eyebrow">KASIR TOKO · PENGATURAN</p><h1>Pengaturan Toko</h1><p>Kelola identitas toko, pajak, dan diskon produk.</p></div><a href="/dashboard">← Dashboard</a></header>
    {notice && <div className="management-notice">{notice}</div>}
    <section className="panel-form settings-form"><h2>Identitas & struk</h2><label>Nama toko<input value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} /></label><label>Alamat<textarea value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></label><label>Telepon<input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} /></label><label>Tarif pajak (%)<input type="number" min="0" max="100" step="0.01" value={settings.taxRate} onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })} /></label><label>Footer struk<textarea value={settings.receiptFooter} onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })} /></label><button className="primary-button" onClick={save}>Simpan pengaturan</button></section>
  </main>;
}
