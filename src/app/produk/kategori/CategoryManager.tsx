"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Category = { id: number; name: string; slug: string; _count?: { products: number } };

export default function CategoryManager({ operatorName }: { operatorName: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [query, setQuery] = useState("");
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [categoryEditName, setCategoryEditName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    const response = await fetch("/api/categories");
    if (response.ok) setCategories(await response.json() as Category[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [pageSize, query]);

  function message(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 3000);
  }
  async function addCategory(event: FormEvent) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return message("Nama kategori wajib diisi");
    const response = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Kategori gagal dibuat");
    setNewCategory("");
    message("Kategori ditambahkan");
    void load();
  }
  function openEdit(category: Category) {
    setCategoryToEdit(category);
    setCategoryEditName(category.name);
  }
  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    if (!categoryToEdit) return;
    const name = categoryEditName.trim();
    if (!name) return message("Nama kategori wajib diisi");
    const response = await fetch(`/api/categories/${categoryToEdit.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Kategori gagal diperbarui");
    setCategoryToEdit(null);
    message("Kategori diperbarui");
    void load();
  }
  async function removeCategory() {
    if (!categoryToDelete) return;
    const response = await fetch(`/api/categories/${categoryToDelete.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Kategori gagal dihapus");
    setCategoryToDelete(null);
    message("Kategori dihapus");
    void load();
  }

  const visibleCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return categories;
    return categories.filter((category) => `${category.name} ${category.slug}`.toLowerCase().includes(normalizedQuery));
  }, [categories, query]);
  const pagedCategories = paginate(visibleCategories, page, pageSize);
  return <main className="management-page">
    <header className="management-header"><div><p className="eyebrow">KASIR TOKO · PRODUK</p><h1>Kategori Produk</h1><p>Kelola kategori untuk mengelompokkan produk di kasir.</p></div><div className="management-user">Masuk sebagai <b>{operatorName}</b><a href="/dashboard">← Dashboard</a></div></header>
    {notice && <div className="management-notice">{notice}</div>}
    <section className="category-management-card">
      <div className="card-title category-list-heading"><div><h2>Daftar Kategori</h2><p>{visibleCategories.length} kategori ditampilkan</p></div><div className="category-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau slug kategori..." /></div></div>
      <form className="category-form category-management-form" onSubmit={addCategory}><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Nama kategori baru" /><button>Tambah kategori</button></form>
      <div className="category-table-wrap"><table className="category-table"><thead><tr><th>Nama kategori</th><th>Slug</th><th>Jumlah produk</th><th>Aksi</th></tr></thead><tbody>{pagedCategories.map((category) => <tr key={category.id}><td><b>{category.name}</b></td><td><span className="category-slug">{category.slug}</span></td><td>{category._count?.products || 0} produk</td><td><button type="button" className="table-action" onClick={() => openEdit(category)}>Edit</button><button type="button" className="table-delete" onClick={() => setCategoryToDelete(category)}>Hapus</button></td></tr>)}</tbody></table>{!visibleCategories.length && <p className="management-empty">{query ? "Kategori tidak ditemukan." : "Belum ada kategori."}</p>}</div>
      <Pagination page={page} pageSize={pageSize} total={visibleCategories.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
    </section>
    {categoryToEdit && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCategoryToEdit(null); }}><form className="receipt-success-modal category-edit-modal" onSubmit={saveCategory} role="dialog" aria-modal="true" aria-labelledby="edit-category-title"><div className="modal-heading"><div><p className="eyebrow">KATEGORI PRODUK</p><h2 id="edit-category-title">Edit kategori</h2><p className="category-edit-help">Perbarui nama kategori untuk produk yang terkait.</p></div><button type="button" className="modal-close" onClick={() => setCategoryToEdit(null)} aria-label="Tutup">×</button></div><label htmlFor="category-edit-name">Nama kategori<input id="category-edit-name" required autoFocus value={categoryEditName} onChange={(event) => setCategoryEditName(event.target.value)} /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setCategoryToEdit(null)}>Batal</button><button type="submit" className="primary-button">Simpan perubahan</button></div></form></div>}
    {categoryToDelete && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCategoryToDelete(null); }}><section className="receipt-success-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-category-title"><div className="modal-heading"><div><p className="eyebrow">KONFIRMASI</p><h2 id="delete-category-title">Hapus kategori?</h2></div><button type="button" className="modal-close" onClick={() => setCategoryToDelete(null)} aria-label="Tutup">×</button></div><p className="receipt-success-message">Kategori <b>{categoryToDelete.name}</b> akan dihapus.</p><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setCategoryToDelete(null)}>Batal</button><button type="button" className="sales-history-delete" onClick={() => void removeCategory()}>Hapus kategori</button></div></section></div>}
  </main>;
}
