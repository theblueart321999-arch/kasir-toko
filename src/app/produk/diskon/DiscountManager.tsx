"use client";

import { useEffect, useMemo, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Product = {
  id: number;
  name: string;
  sku: string;
  price: number;
  discountPercent: number;
  costPrice: number;
};

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const discountOptions = [
  { value: 20, label: "Cepat laku", description: "Diskon kompetitif" },
  { value: 30, label: "Seimbang", description: "Rekomendasi umum" },
  { value: 50, label: "Promosi besar", description: "Menarik perhatian" },
];

export default function DiscountManager({ operatorName }: { operatorName: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/price-levels", { cache: "no-store" });
    if (response.ok) setProducts(await response.json() as Product[]);
    else setNotice("Data diskon gagal diambil");
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { setPage(1); }, [query, pageSize]);

  const visible = useMemo(() => products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase())), [products, query]);
  const paged = paginate(visible, page, pageSize);

  async function updateDiscount(productId: number, value: string) {
    const discountPercent = Number(value);
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) return;
    setSaving(productId);
    const response = await fetch("/api/price-levels", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, discountPercent }) });
    if (response.ok) {
      setProducts((current) => current.map((product) => product.id === productId ? { ...product, discountPercent } : product));
      setNotice("Diskon berhasil diperbarui");
    } else {
      setNotice("Diskon gagal diperbarui");
    }
    setSaving(null);
    window.setTimeout(() => setNotice(""), 2500);
  }
  function applyRecommendation(productId: number, discountPercent: number) {
    setProducts((current) => current.map((product) => product.id === productId ? { ...product, discountPercent } : product));
    void updateDiscount(productId, String(discountPercent));
  }
  async function resetDiscount(productId: number) {
    setSaving(productId);
    const response = await fetch("/api/price-levels", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, action: "resetDiscount" }) });
    if (response.ok) {
      setProducts((current) => current.map((product) => product.id === productId ? { ...product, discountPercent: 0 } : product));
      setNotice("Diskon dikembalikan ke default");
    } else {
      setNotice("Diskon gagal dikembalikan");
    }
    setSaving(null);
    window.setTimeout(() => setNotice(""), 2500);
  }

  return <main className="management-page">
    <header className="management-header"><div><p className="eyebrow">KASIR TOKO · PRODUK</p><h1>Diskon Produk</h1><p>Atur diskon penjualan untuk setiap produk.</p></div><div className="management-user">Masuk sebagai <b>{operatorName}</b><a href="/dashboard">← Dashboard</a></div></header>
    {notice && <div className="management-notice">{notice}</div>}
    <section className="category-management-card discount-page-card">
      <div className="card-title"><div><h2>Daftar diskon</h2><p>{visible.length} produk ditampilkan</p></div><div className="management-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama produk atau SKU..." /></div></div>
      {loading ? <p className="management-empty">Memuat data diskon...</p> : <div className="category-table-wrap"><table className="product-table"><thead><tr><th>Produk</th><th>Harga normal</th><th>Opsi rekomendasi</th><th>Diskon aktif</th><th>Harga setelah diskon</th></tr></thead><tbody>{paged.map((product) => { const finalPrice = Math.round(product.price * (1 - product.discountPercent / 100)); return <tr key={product.id}><td><b>{product.name}</b><small>{product.sku}</small></td><td><b>{money(product.price)}</b><button type="button" className="discount-reset-button" disabled={saving === product.id || product.discountPercent === 0} onClick={() => void resetDiscount(product.id)}>{product.discountPercent === 0 ? "Harga default" : "Kembalikan default"}</button></td><td><div className="price-options discount-options">{discountOptions.map((option) => { const optionPrice = Math.round(product.price * (1 - option.value / 100)); return <button type="button" key={option.value} className={`price-option-button ${product.discountPercent === option.value ? "recommended" : ""}`} disabled={saving === product.id} onClick={() => applyRecommendation(product.id, option.value)}><span>{option.value}%</span><b>{money(optionPrice)}</b><small>{option.label}</small><i title={`${option.value}% ${option.label}: ${option.description}`}>!</i></button>; })}</div></td><td><div className="discount-editor"><input aria-label={`Diskon ${product.name}`} min="0" max="100" type="number" value={product.discountPercent} disabled={saving === product.id} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, discountPercent: Number(event.target.value) } : item))} onBlur={(event) => void updateDiscount(product.id, event.target.value)} /><span>%</span></div></td><td><b className="discount-final-price">{money(finalPrice)}</b></td></tr>; })}</tbody></table>{!visible.length && <p className="management-empty">Produk tidak ditemukan.</p>}</div>}
      {!loading && <Pagination page={page} pageSize={pageSize} total={visible.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}
      <div className="discount-rule-info"><b>3 opsi rekomendasi diskon</b>{discountOptions.map((option) => <span key={option.value} className="discount-rule-option"><strong>{option.value}% {option.label}</strong> - {option.description.toLowerCase()}</span>)}<span className="discount-rule-option"><strong>Default</strong> - tanpa diskon</span></div>
    </section>
  </main>;
}
