"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Product = { id: number; name: string; sku: string; stock: number; unit: string };
type Movement = { id: number; type: "IN" | "OUT" | "ADJUSTMENT"; quantity: number; beforeStock: number; afterStock: number; note: string | null; createdAt: string; product: Product; operator: { name: string } };
type FormType = "IN" | "OUT" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
const labels = { IN: "Stok masuk", OUT: "Stok keluar", ADJUSTMENT: "Penyesuaian" };

export default function StokManager({ operatorName }: { operatorName: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ productId: "", type: "IN", quantity: "", note: "" });
  const [productPage, setProductPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load() {
    const [productResponse, movementResponse] = await Promise.all([fetch("/api/products"), fetch("/api/inventory/movements")]);
    if (productResponse.ok) setProducts(await productResponse.json());
    if (movementResponse.ok) setMovements(await movementResponse.json());
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const visible = useMemo(() => products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()) && (!lowOnly || p.stock <= 10)), [products, query, lowOnly]);
  useEffect(() => { setProductPage(1); }, [query, lowOnly]);
  const pagedProducts = useMemo(() => paginate(visible, productPage, pageSize), [visible, productPage, pageSize]);
  const lowCount = products.filter((p) => p.stock <= 10).length;
  function message(value: string) { setNotice(value); window.setTimeout(() => setNotice(""), 3500); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const isAdjustment = form.type === "ADJUSTMENT_IN" || form.type === "ADJUSTMENT_OUT";
    const response = await fetch("/api/inventory/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, type: isAdjustment ? "ADJUSTMENT" : form.type, adjustmentDirection: form.type === "ADJUSTMENT_OUT" ? "OUT" : "IN", productId: Number(form.productId), quantity: Number(form.quantity) }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Perubahan stok gagal disimpan");
    setForm({ ...form, quantity: "", note: "" }); message("Perubahan stok berhasil disimpan"); window.dispatchEvent(new Event("inventory-change")); void load();
  }
  return <main className="stock-page">
    <header className="management-header"><div><p className="eyebrow">KASIR TOKO · INVENTORI</p><h1>Manajemen Stok</h1><p>Pantau persediaan dan catat setiap perubahan stok.</p></div><div className="management-user">Masuk sebagai <b>{operatorName}</b><a href="/dashboard">← Dashboard</a></div></header>
    {notice && <div className="management-notice">{notice}</div>}
    <section className="stock-summary"><article className="stock-summary-products"><span>Total produk</span><strong>{products.length}</strong><small>Produk aktif di katalog</small></article><article className="stock-summary-low"><span>Stok menipis</span><strong className={lowCount ? "stock-low" : ""}>{lowCount}</strong><small>Di bawah 10 unit</small></article><article className="stock-summary-activity"><span>Aktivitas terbaru</span><strong>{movements.length}</strong><small>Perubahan stok tercatat</small></article></section>
    <section className="stock-layout"><form className="stock-form-card" onSubmit={submit}><div className="card-title"><div><h2>Catat perubahan</h2><p>Stok diperbarui secara atomik.</p></div></div><label>Produk<select required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}><option value="">Pilih produk</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock} {p.unit})</option>)}</select></label><label>Jenis perubahan<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as FormType })}><option value="IN">{labels.IN}</option><option value="OUT">{labels.OUT}</option><option value="ADJUSTMENT_IN">Penyesuaian (+)</option><option value="ADJUSTMENT_OUT">Penyesuaian (-)</option></select></label><label>Jumlah<input required min="1" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label><label>Catatan (wajib untuk penyesuaian)<textarea required={form.type === "ADJUSTMENT_IN" || form.type === "ADJUSTMENT_OUT"} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Contoh: Koreksi hasil opname" rows={3} /></label><button className="management-primary" type="submit">Simpan perubahan</button></form>
      <div className="product-table-card"><div className="card-title"><div><h2>Stok produk</h2><p>{visible.length} produk ditampilkan</p></div></div><div className="stock-filters"><div className="management-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari produk atau SKU..." /></div><label><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Stok menipis</label></div><div className="product-table-wrap"><table className="product-table"><thead><tr><th>Produk</th><th>Stok saat ini</th><th>Status</th></tr></thead><tbody>{pagedProducts.map((p) => <tr key={p.id}><td><b>{p.name}</b><small>{p.sku}</small></td><td><b className={p.stock <= 10 ? "stock-low" : ""}>{p.stock}</b> {p.unit}</td><td><span className={p.stock <= 10 ? "stock-low" : "stock-ok"}>{p.stock <= 10 ? "Menipis" : "Aman"}</span></td></tr>)}</tbody></table>{!visible.length && <p className="management-empty">Produk tidak ditemukan.</p>}</div></div>
    </section>
  </main>;
}
