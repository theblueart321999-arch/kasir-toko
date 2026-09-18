"use client";

import { useEffect, useMemo, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Product = {
  id: number;
  name: string;
  sku: string;
  stock: number;
  unit: string;
  categoryRef?: { name: string } | null;
};

export default function LowStockManager({ operatorName }: { operatorName: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/products")
      .then(async (response) => {
        if (!response.ok) throw new Error("Produk gagal diambil");
        setProducts((await response.json()) as Product[]);
      })
      .catch(() => setError("Data stok menipis gagal diambil"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setPage(1); }, [query, pageSize]);

  const visible = useMemo(() => products.filter((product) => (
    product.stock <= 10
    && `${product.name} ${product.sku} ${product.categoryRef?.name || ""}`.toLowerCase().includes(query.toLowerCase())
  )), [products, query]);
  const paged = paginate(visible, page, pageSize);
  const outOfStock = visible.filter((product) => product.stock <= 0).length;

  return <main className="management-page">
    <header className="management-header">
      <div><p className="eyebrow">KASIR TOKO · INVENTORI</p><h1>Stok Menipis</h1><p>Daftar produk yang perlu segera diperiksa atau direstok.</p></div>
      <div className="management-user">Masuk sebagai <b>{operatorName}</b><a href="/dashboard">← Dashboard</a></div>
    </header>
    <section className="stock-low-summary">
      <article className="stock-low-summary-attention"><span>Stok menipis</span><strong>{visible.length}</strong><small>Di bawah 10 unit</small></article>
      <article className="stock-low-summary-empty"><span>Stok habis</span><strong>{outOfStock}</strong><small>Perlu segera direstok</small></article>
    </section>
    <section className="product-table-card stock-low-page-card">
      <div className="card-title"><div><h2>Daftar stok menipis</h2><p>{visible.length} produk ditampilkan</p></div><div className="management-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk, SKU, atau kategori..." /></div></div>
      {loading ? <p className="management-empty">Memuat data stok...</p> : error ? <p className="management-empty">{error}</p> : <div className="product-table-wrap"><table className="product-table"><thead><tr><th>Produk</th><th>Kategori</th><th>Stok saat ini</th><th>Status</th></tr></thead><tbody>{paged.map((product) => <tr key={product.id}><td><b>{product.name}</b><small>{product.sku}</small></td><td>{product.categoryRef?.name || "Tanpa kategori"}</td><td><b className="stock-low">{product.stock}</b> {product.unit}</td><td><span className={product.stock <= 0 ? "stock-empty" : "stock-low"}>{product.stock <= 0 ? "Habis" : "Menipis"}</span></td></tr>)}</tbody></table>{!visible.length && <p className="management-empty">Tidak ada produk dengan stok menipis.</p>}</div>}
      {!loading && !error && <Pagination page={page} pageSize={pageSize} total={visible.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}
    </section>
  </main>;
}
