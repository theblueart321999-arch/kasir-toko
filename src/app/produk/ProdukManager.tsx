"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Pagination, { paginate } from "@/components/Pagination";

type Category = { id: number; name: string; slug: string; _count?: { products: number } };
type Product = { id: number; name: string; sku: string; price: number; costPrice?: number; stock: number; unit: string; imageUrl?: string | null; categoryRef?: Category | null; category: string };
type Form = { id?: number; name: string; sku: string; categoryId: string; categoryName: string; costPrice: string; price: string; stock: string; unit: string; manualUnit: string; currency: string; exchangeRate: string; convertToRupiah: boolean; imageUrl: string };
const emptyForm: Form = { name: "", sku: "", categoryId: "", categoryName: "", costPrice: "", price: "", stock: "0", unit: "pcs", manualUnit: "", currency: "IDR", exchangeRate: "1", convertToRupiah: true, imageUrl: "" };
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function ProdukManager({ operatorName }: { operatorName: string }) {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockValue, setStockValue] = useState("");
  const [stockNote, setStockNote] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [categoryEditName, setCategoryEditName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    const [productsResponse, categoriesResponse] = await Promise.all([fetch("/api/products", { cache: "no-store" }), fetch("/api/categories", { cache: "no-store" })]);
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
        categoryName: "",
        costPrice: requestedProduct.costPrice?.toString() || requestedProduct.price.toString(),
        price: requestedProduct.price.toString(),
        stock: requestedProduct.stock.toString(),
        unit: requestedProduct.unit,
        manualUnit: "",
        currency: "IDR",
        exchangeRate: "1",
        convertToRupiah: true,
        imageUrl: requestedProduct.imageUrl || "",
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
  useEffect(() => { setPage(1); }, [query, filter]);
  const pagedProducts = useMemo(() => paginate(visible, page, pageSize), [visible, page, pageSize]);

  function message(text: string) { setNotice(text); window.setTimeout(() => setNotice(""), 3000); }
  async function uploadProductImage(file: File) {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/products/upload", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Gambar gagal diunggah");
    if (form) setForm({ ...form, imageUrl: data.imageUrl });
  }
  function edit(product?: Product) {
    setForm(product ? { id: product.id, name: product.name, sku: product.sku, categoryId: product.categoryRef?.id.toString() || "", categoryName: "", costPrice: product.costPrice?.toString() || product.price.toString(), price: product.price.toString(), stock: product.stock.toString(), unit: product.unit, manualUnit: "", currency: "IDR", exchangeRate: "1", convertToRupiah: true, imageUrl: product.imageUrl || "" } : { ...emptyForm, categoryId: categories[0]?.id.toString() || "" });
  }
  async function createFormCategory() {
    if (!form?.categoryName.trim()) return message("Nama kategori wajib diisi");
    const response = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.categoryName.trim() }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Kategori gagal dibuat");
    setCategories((current) => [...current, data].sort((left, right) => left.name.localeCompare(right.name)));
    setForm({ ...form, categoryId: String(data.id), categoryName: "" });
    message("Kategori berhasil ditambahkan");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const unit = form.unit === "manual" ? form.manualUnit.trim() : form.unit;
    const rate = Number(form.exchangeRate);
    const sourcePrice = Number(form.price);
    const costPrice = Number(form.costPrice);
    const price = form.convertToRupiah ? Math.round(sourcePrice * rate) : sourcePrice;
    if (!form.name.trim() || !unit || form.categoryId === "new" || !Number.isInteger(Number(form.categoryId)) || !Number.isFinite(costPrice) || !Number.isInteger(costPrice) || costPrice < 0 || !Number.isFinite(sourcePrice) || sourcePrice < 0 || price < costPrice || !Number.isFinite(rate) || rate <= 0 || !Number.isInteger(price) || price < 0) {
      message(price < costPrice ? "Harga jual tidak boleh kurang dari harga modal" : "Nama, satuan, kategori, harga modal, harga jual, dan kurs yang valid wajib diisi");
      return;
    }
    const response = await fetch(form.id ? `/api/products/${form.id}` : "/api/products", { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, sku: form.sku, unit, categoryId: Number(form.categoryId), costPrice, price, stock: Number(form.stock), imageUrl: form.imageUrl }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Produk gagal disimpan");
    setForm(null); message("Produk berhasil disimpan"); void load();
  }
  async function remove(product: Product) {
    const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Produk gagal dihapus");
    setProductToDelete(null); message("Produk dihapus"); void load();
  }
  function openStock(product: Product) {
    setStockProduct(product);
    setStockValue(String(product.stock));
    setStockNote("");
  }
  async function saveStock(event: FormEvent) {
    event.preventDefault();
    if (!stockProduct) return;
    const targetStock = Number(stockValue);
    const note = stockNote.trim();
    if (!Number.isInteger(targetStock) || targetStock < 0) return message("Jumlah stok harus berupa angka bulat 0 atau lebih");
    if (!note) return message("Catatan wajib diisi saat mengubah stok");
    const response = await fetch("/api/inventory/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: stockProduct.id, type: "ADJUSTMENT", targetStock, note }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Stok gagal diubah");
    setStockProduct(null);
    message("Stok berhasil diubah dan dicatat");
    void load();
  }
  async function addCategory(event: FormEvent) {
    event.preventDefault();
    if (!newCategory.trim()) return;
    const response = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCategory }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Kategori gagal dibuat");
    setNewCategory(""); message("Kategori ditambahkan"); void load();
  }
  function renameCategory(category: Category) {
    setCategoryToEdit(category);
    setCategoryEditName(category.name);
  }
  async function saveCategoryName(event: FormEvent) {
    event.preventDefault();
    if (!categoryToEdit) return;
    const name = categoryEditName.trim();
    if (!name) return message("Nama kategori wajib diisi");
    if (name === categoryToEdit.name) {
      setCategoryToEdit(null);
      return;
    }
    const response = await fetch(`/api/categories/${categoryToEdit.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Kategori gagal diperbarui");
    setCategoryToEdit(null);
    setCategoryEditName("");
    message("Kategori diperbarui");
    void load();
  }
  async function removeCategory(category: Category) {
    const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Kategori gagal dihapus");
    if (filter === category.id.toString()) setFilter("");
    setCategoryToDelete(null); message("Kategori dihapus"); void load();
  }

  return <main className="management-page">
    <header className="management-header"><div><p className="eyebrow">KASIR TOKO · PRODUK</p><h1>Kelola Produk</h1><p>Atur katalog, harga, stok, dan kategori toko.</p></div><div className="management-user">Masuk sebagai <b>{operatorName}</b><a href="/dashboard">← Dashboard</a></div></header>
    {notice && <div className="management-notice">{notice}</div>}
    <section className="management-toolbar"><div className="management-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama produk atau SKU..." /></div><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">Semua kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button className="management-primary" onClick={() => edit()}>+ Produk baru</button></section>
    <section className="management-layout product-management-layout"><div className="product-table-card"><div className="card-title"><div><h2>Daftar Produk</h2><p>{visible.length} produk ditampilkan</p></div></div>{loading ? <p className="management-empty">Memuat data...</p> : <div className="product-table-wrap"><table className="product-table"><thead><tr><th>Produk</th><th>Kategori</th><th>Harga modal</th><th>Harga jual</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>{pagedProducts.map((product) => <tr key={product.id}><td><b>{product.name}</b><small>{product.sku} · / {product.unit}</small></td><td><span className="category-pill">{product.categoryRef?.name || product.category}</span></td><td><span className="product-cost-price">{money(product.costPrice || product.price)}</span></td><td><b>{money(product.price)}</b></td><td><span className={product.stock < 10 ? "stock-low" : ""}>{product.stock}</span> {product.unit}</td><td><button className="table-action" onClick={() => edit(product)}>Edit</button><button className="table-action" onClick={() => openStock(product)}>Ubah stok</button><button className="table-delete" onClick={() => setProductToDelete(product)}>Hapus</button></td></tr>)}</tbody></table>{!visible.length && <p className="management-empty">Produk tidak ditemukan.</p>}<Pagination page={page} pageSize={pageSize} total={visible.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></div>}</div>
    </section>
    {form && <div className="modal-backdrop"><form className="supplier-dialog" onSubmit={save}><div className="modal-heading"><div><p className="eyebrow">KATALOG PRODUK</p><h2>{form.id ? "Edit produk" : "Tambah produk"}</h2></div><button type="button" className="modal-close" onClick={() => setForm(null)}>×</button></div><p className="supplier-required-note">Harga jual harus sama atau lebih tinggi dari harga modal.</p>        <label>Gambar produk <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadProductImage(file); }} /></label><label>Nama produk *<input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Semen 40kg" /></label><label>SKU <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} placeholder="Otomatis jika kosong" /></label><fieldset className="unit-choice"><legend>Satuan *</legend><div>{["pcs", "kg", "sak", "liter", "meter", "kodi", "manual"].map((unit) => <label key={unit}><input type="radio" name="catalog-product-unit" checked={form.unit === unit} onChange={() => setForm({ ...form, unit })} />{unit === "manual" ? "Isi manual" : unit}</label>)}</div>{form.unit === "manual" && <input required value={form.manualUnit} onChange={(e) => setForm({ ...form, manualUnit: e.target.value })} placeholder="Contoh: dus" />}</fieldset><label>Kategori *<select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Pilih kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}<option value="new">+ Tambah kategori baru</option></select></label>{form.categoryId === "new" && <div className="inline-create"><input required value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value })} placeholder="Nama kategori baru" /><button type="button" className="management-secondary" onClick={() => void createFormCategory()}>Tambah</button></div>}<div className="form-row"><label>Mata uang *<select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="IDR">Rp - Rupiah</option><option value="USD">$ - Dollar AS</option><option value="EUR">€ - Euro</option></select></label><label>Harga modal *<input required min="0" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="0" /></label><label>Harga jual *<input required min="0" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" /></label></div>{form.currency !== "IDR" && <><label className="checkbox-line"><input type="checkbox" checked={form.convertToRupiah} onChange={(e) => setForm({ ...form, convertToRupiah: e.target.checked })} /> Konversi ke Rupiah saat disimpan</label>{form.convertToRupiah && <label>Kurs 1 {form.currency} ke Rupiah *<input required min="0.01" step="0.01" type="number" value={form.exchangeRate} onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })} /></label>}</>}<div className="form-actions"><button type="button" className="modal-cancel" onClick={() => setForm(null)}>Batal</button><button className="primary-button">{form.id ? "Simpan perubahan" : "Tambah produk"}</button></div></form></div>}
    {productToDelete && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProductToDelete(null); }}><section className="receipt-success-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-product-title"><div className="modal-heading"><div><p className="eyebrow">KONFIRMASI</p><h2 id="delete-product-title">Hapus produk?</h2></div><button type="button" className="modal-close" onClick={() => setProductToDelete(null)} aria-label="Tutup">×</button></div><p className="receipt-success-message">Produk <b>{productToDelete.name}</b> akan dihapus dari katalog. Tindakan ini tidak dapat dibatalkan.</p><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setProductToDelete(null)}>Batal</button><button type="button" className="sales-history-delete" onClick={() => void remove(productToDelete)}>Hapus produk</button></div></section></div>}
    {stockProduct && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setStockProduct(null); }}><form className="receipt-success-modal stock-edit-modal" onSubmit={saveStock} role="dialog" aria-modal="true" aria-labelledby="edit-stock-title"><div className="modal-heading"><div><p className="eyebrow">PENYESUAIAN STOK</p><h2 id="edit-stock-title">Ubah jumlah stok</h2><p className="category-edit-help">{stockProduct.name} · Stok saat ini {stockProduct.stock} {stockProduct.unit}</p></div><button type="button" className="modal-close" onClick={() => setStockProduct(null)} aria-label="Tutup">×</button></div><label htmlFor="stock-value">Jumlah stok baru<input id="stock-value" required min="0" step="1" type="number" value={stockValue} onChange={(event) => setStockValue(event.target.value)} /></label><label htmlFor="stock-note">Catatan wajib<textarea id="stock-note" required value={stockNote} onChange={(event) => setStockNote(event.target.value)} placeholder="Contoh: Hasil stok opname tanggal 17 September" /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setStockProduct(null)}>Batal</button><button type="submit" className="primary-button">Simpan perubahan</button></div></form></div>}
    {categoryToDelete && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCategoryToDelete(null); }}><section className="receipt-success-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-category-title"><div className="modal-heading"><div><p className="eyebrow">KONFIRMASI</p><h2 id="delete-category-title">Hapus kategori?</h2></div><button type="button" className="modal-close" onClick={() => setCategoryToDelete(null)} aria-label="Tutup">×</button></div><p className="receipt-success-message">Kategori <b>{categoryToDelete.name}</b> akan dihapus. Produk di dalamnya tetap tersimpan tanpa kategori.</p><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setCategoryToDelete(null)}>Batal</button><button type="button" className="sales-history-delete" onClick={() => void removeCategory(categoryToDelete)}>Hapus kategori</button></div></section></div>}
    {categoryToEdit && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCategoryToEdit(null); }}><form className="receipt-success-modal category-edit-modal" onSubmit={saveCategoryName} role="dialog" aria-modal="true" aria-labelledby="edit-category-title"><div className="modal-heading"><div><p className="eyebrow">KATEGORI PRODUK</p><h2 id="edit-category-title">Edit kategori</h2><p className="category-edit-help">Perbarui nama kategori untuk seluruh produk yang terkait.</p></div><button type="button" className="modal-close" onClick={() => setCategoryToEdit(null)} aria-label="Tutup">×</button></div><label htmlFor="category-edit-name">Nama kategori<input id="category-edit-name" required autoFocus value={categoryEditName} onChange={(event) => setCategoryEditName(event.target.value)} /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setCategoryToEdit(null)}>Batal</button><button type="submit" className="primary-button">Simpan perubahan</button></div></form></div>}
  </main>;
}
