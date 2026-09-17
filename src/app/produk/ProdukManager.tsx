"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Category = { id: number; name: string; slug: string; _count?: { products: number } };
type Product = { id: number; name: string; sku: string; price: number; stock: number; unit: string; categoryRef?: Category | null; category: string };
type Form = { id?: number; name: string; sku: string; categoryId: string; price: string; stock: string; unit: string };
const emptyForm: Form = { name: "", sku: "", categoryId: "", price: "", stock: "0", unit: "pcs" };
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function ProdukManager({ operatorName }: { operatorName: string }) {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [productsResponse, categoriesResponse] = await Promise.all([fetch("/api/products"), fetch("/api/categories")]);
    const loadedProducts = productsResponse.ok ? await productsResponse.json() as Product[] : [];
    const loadedCategories = categoriesResponse.ok ? await categoriesResponse.json() as Category[] : [];
    setProducts(loadedProducts);
    setCategories(loadedCategories);
    const requestedId = Number(searchParams.get("edit"));
    const requestedProduct = loadedProducts.find((product) => product.id === requestedId);
    if (requestedProduct) {
      setForm({
        id: requestedProduct.id,
        name: requestedProduct.name,
        sku: requestedProduct.sku,
        categoryId: requestedProduct.categoryRef?.id.toString() || loadedCategories[0]?.id.toString() || "",
        price: requestedProduct.price.toString(),
        stock: requestedProduct.stock.toString(),
        unit: requestedProduct.unit,
      });
    }
    setLoading(false);
  }, [searchParams]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(() => products.filter((product) => {
    const text = `${product.name} ${product.sku}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (!filter || product.categoryRef?.id.toString() === filter);
  }), [products, query, filter]);

  function message(text: string) { setNotice(text); window.setTimeout(() => setNotice(""), 3000); }
  function edit(product?: Product) {
    setForm(product ? { id: product.id, name: product.name, sku: product.sku, categoryId: product.categoryRef?.id.toString() || "", price: product.price.toString(), stock: product.stock.toString(), unit: product.unit } : { ...emptyForm, categoryId: categories[0]?.id.toString() || "" });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const response = await fetch(form.id ? `/api/products/${form.id}` : "/api/products", { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, categoryId: Number(form.categoryId), price: Number(form.price), stock: Number(form.stock) }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Produk gagal disimpan");
    setForm(null); message("Produk berhasil disimpan"); void load();
  }
  async function remove(product: Product) {
    if (!window.confirm(`Hapus ${product.name}?`)) return;
    const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Produk gagal dihapus");
    message("Produk dihapus"); void load();
  }
  async function addCategory(event: FormEvent) {
    event.preventDefault();
    if (!newCategory.trim()) return;
    const response = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCategory }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Kategori gagal dibuat");
    setNewCategory(""); message("Kategori ditambahkan"); void load();
  }
  async function renameCategory(category: Category) {
    const name = window.prompt("Nama kategori", category.name)?.trim();
    if (!name || name === category.name) return;
    const response = await fetch(`/api/categories/${category.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Kategori gagal diperbarui");
    message("Kategori diperbarui"); void load();
  }
  async function removeCategory(category: Category) {
    if (!window.confirm(`Hapus kategori ${category.name}? Produk di dalamnya tetap tersimpan.`)) return;
    const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Kategori gagal dihapus");
    if (filter === category.id.toString()) setFilter("");
    message("Kategori dihapus"); void load();
  }

  return <main className="management-page">
    <header className="management-header"><div><p className="eyebrow">KASIR TOKO · PRODUK</p><h1>Kelola Produk</h1><p>Atur katalog, harga, stok, dan kategori toko.</p></div><div className="management-user">Masuk sebagai <b>{operatorName}</b><a href="/dashboard">← Dashboard</a></div></header>
    {notice && <div className="management-notice">{notice}</div>}
    <section className="management-toolbar"><div className="management-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama produk atau SKU..." /></div><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">Semua kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button className="management-primary" onClick={() => edit()}>+ Produk baru</button></section>
    <section className="management-layout"><div className="product-table-card"><div className="card-title"><div><h2>Daftar Produk</h2><p>{visible.length} produk ditampilkan</p></div></div>{loading ? <p className="management-empty">Memuat data...</p> : <div className="product-table-wrap"><table className="product-table"><thead><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>{visible.map((product) => <tr key={product.id}><td><b>{product.name}</b><small>{product.sku} · / {product.unit}</small></td><td><span className="category-pill">{product.categoryRef?.name || product.category}</span></td><td><b>{money(product.price)}</b></td><td><span className={product.stock < 10 ? "stock-low" : ""}>{product.stock}</span> {product.unit}</td><td><button className="table-action" onClick={() => edit(product)}>Edit</button><button className="table-delete" onClick={() => remove(product)}>Hapus</button></td></tr>)}</tbody></table>{!visible.length && <p className="management-empty">Produk tidak ditemukan.</p>}</div>}</div>
      <aside className="category-card"><div className="card-title"><div><h2>Kategori</h2><p>Kelompokkan produk agar mudah dicari.</p></div></div><form className="category-form" onSubmit={addCategory}><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nama kategori baru" /><button>Tambah</button></form><div className="category-list">{categories.map((category) => <div key={category.id}><span>{category.name}<small>{category._count?.products || 0} produk</small></span><span className="category-actions"><button onClick={() => renameCategory(category)} aria-label={`Ubah ${category.name}`}>Edit</button><button onClick={() => removeCategory(category)} aria-label={`Hapus ${category.name}`}>×</button></span></div>)}</div></aside>
    </section>
    {form && <div className="modal-backdrop"><form className="product-form" onSubmit={save}><div className="modal-heading"><div><p className="eyebrow">KATALOG PRODUK</p><h2>{form.id ? "Edit produk" : "Tambah produk"}</h2></div><button type="button" className="modal-close" onClick={() => setForm(null)}>×</button></div><label>Nama produk<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><div className="form-row"><label>SKU<input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} /></label><label>Satuan<input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label></div><div className="form-row"><label>Harga jual (Rp)<input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label><label>Stok awal<input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label></div><label>Kategori<select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Pilih kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><div className="form-actions"><button type="button" className="modal-cancel" onClick={() => setForm(null)}>Batal</button><button className="management-primary">{form.id ? "Simpan perubahan" : "Tambah produk"}</button></div></form></div>}
  </main>;
}
