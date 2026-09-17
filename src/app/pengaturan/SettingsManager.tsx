"use client";

import { FormEvent, useEffect, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Setting = { storeName: string; address: string; phone: string; taxRate: number; receiptFooter: string };
type Price = { id: number; sku: string; name: string; price: number; discountPercent: number };
type Operator = { id: number; name: string; username: string; role: "OWNER" | "ADMIN" | "KASIR"; active: boolean; createdAt: string };
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function SettingsManager() {
  const [settings, setSettings] = useState<Setting>({ storeName: "", address: "", phone: "", taxRate: 11, receiptFooter: "" });
  const [prices, setPrices] = useState<Price[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [employee, setEmployee] = useState({ name: "", username: "", password: "", role: "KASIR" as "ADMIN" | "KASIR" });
  const [notice, setNotice] = useState("");
  const [operatorPage, setOperatorPage] = useState(1);
  const [pricePage, setPricePage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pagedOperators = paginate(operators, operatorPage, pageSize);
  const pagedPrices = paginate(prices, pricePage, pageSize);
  useEffect(() => { void Promise.all([fetch("/api/settings/store"), fetch("/api/price-levels"), fetch("/api/admin/operators")]).then(async ([s, p, o]) => { if (s.ok) setSettings(await s.json()); if (p.ok) setPrices(await p.json()); if (o.ok) setOperators(await o.json()); }); }, []);
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
  return <main className="management-page"><header className="management-header"><div><p className="eyebrow">KASIR TOKO · PENGATURAN</p><h1>Pengaturan Toko</h1><p>Kelola identitas toko, pajak, dan diskon produk.</p></div><a href="/dashboard">← Dashboard</a></header>
    {notice && <div className="management-notice">{notice}</div>}
    <section className="panel-form settings-form"><h2>Identitas & struk</h2><label>Nama toko<input value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} /></label><label>Alamat<textarea value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></label><label>Telepon<input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} /></label><label>Tarif pajak (%)<input type="number" min="0" max="100" step="0.01" value={settings.taxRate} onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })} /></label><label>Footer struk<textarea value={settings.receiptFooter} onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })} /></label><button className="primary-button" onClick={save}>Simpan pengaturan</button></section>
    <section className="panel-form settings-form"><h2>Akun kolaborasi toko</h2><p className="empty-state">Tambahkan akun karyawan agar dapat masuk dengan akun sendiri dan mengelola toko yang sama.</p><form onSubmit={addEmployee}><label>Nama karyawan<input value={employee.name} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} required /></label><label>Username<input value={employee.username} onChange={(e) => setEmployee({ ...employee, username: e.target.value })} required /></label><label>Password sementara<input type="password" minLength={8} value={employee.password} onChange={(e) => setEmployee({ ...employee, password: e.target.value })} required /><small>Minimal 8 karakter.</small></label><label>Peran<select value={employee.role} onChange={(e) => setEmployee({ ...employee, role: e.target.value as "ADMIN" | "KASIR" })}><option value="KASIR">Kasir</option><option value="ADMIN">Admin</option></select></label><button className="primary-button">+ Tambah akun karyawan</button></form><div className="table-scroll"><table><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Status</th></tr></thead><tbody>{pagedOperators.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.username}</td><td>{item.role}</td><td>{item.active ? "Aktif" : "Nonaktif"}</td></tr>)}</tbody></table><Pagination page={operatorPage} pageSize={pageSize} total={operators.length} onPageChange={setOperatorPage} onPageSizeChange={(size) => { setPageSize(size); setOperatorPage(1); setPricePage(1); }} /></div></section>
    <section className="panel-table settings-prices"><h2>Diskon produk</h2><p className="empty-state">Diskon diterapkan otomatis saat transaksi baru dibuat.</p><div className="table-scroll"><table><thead><tr><th>Produk</th><th>Harga dasar</th><th>Diskon (%)</th><th>Harga jual</th></tr></thead><tbody>{pagedPrices.map((item) => <tr key={item.id}><td><b>{item.name}</b><br /><small>{item.sku}</small></td><td>{money(item.price)}</td><td><input className="compact-input" type="number" min="0" max="100" step="0.01" value={item.discountPercent} onChange={(e) => void updateDiscount(item.id, Number(e.target.value))} /></td><td>{money(Math.round(item.price * (1 - item.discountPercent / 100)))}</td></tr>)}</tbody></table><Pagination page={pricePage} pageSize={pageSize} total={prices.length} onPageChange={setPricePage} onPageSizeChange={(size) => { setPageSize(size); setOperatorPage(1); setPricePage(1); }} /></div></section>
  </main>;
}
