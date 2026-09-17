"use client";

import { useEffect, useMemo, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Category = { id: number; name: string };
type Movement = {
  id: number; type: "IN" | "OUT" | "ADJUSTMENT"; quantity: number; beforeStock: number; afterStock: number;
  note: string | null; createdAt: string; product: { id: number; name: string; sku: string; unit: string; categoryRef?: Category | null };
  operator: { name: string };
};
const labels = { IN: "Stok masuk", OUT: "Stok keluar", ADJUSTMENT: "Penyesuaian" };
const formatDate = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function StockHistoryManager({ operatorName }: { operatorName: string }) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    Promise.all([fetch("/api/inventory/movements"), fetch("/api/categories")]).then(async ([movementResponse, categoryResponse]) => {
      if (movementResponse.ok) setMovements(await movementResponse.json() as Movement[]);
      if (categoryResponse.ok) setCategories(await categoryResponse.json() as Category[]);
    }).catch(() => undefined);
  }, []);
  useEffect(() => { setPage(1); }, [query, category, pageSize]);
  const visible = useMemo(() => movements.filter((movement) => {
    const product = movement.product;
    const text = `${product.name} ${product.sku} ${movement.note || ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (!category || product.categoryRef?.id.toString() === category);
  }), [movements, query, category]);
  const paged = paginate(visible, page, pageSize);

  return <main className="management-page">
    <header className="management-header"><div><p className="eyebrow">KASIR TOKO · INVENTORI</p><h1>Riwayat Stok</h1><p>Lihat seluruh aktivitas perubahan stok produk.</p></div><div className="management-user">Masuk sebagai <b>{operatorName}</b><a href="/dashboard">← Dashboard</a></div></header>
    <section className="product-table-card stock-history-page-card"><div className="card-title stock-history-heading"><div><h2>Riwayat perubahan stok</h2><p>{visible.length} aktivitas ditampilkan</p></div><div className="stock-history-filters"><div className="management-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk, SKU, atau catatan..." /></div><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Semua kategori</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div>
      <div className="product-table-wrap"><table className="product-table"><thead><tr><th>Waktu</th><th>Produk</th><th>Kategori</th><th>Perubahan</th><th>Stok</th><th>Operator</th></tr></thead><tbody>{paged.map((movement) => <tr key={movement.id}><td>{formatDate(movement.createdAt)}</td><td><b>{movement.product.name}</b><small>{movement.product.sku} · {movement.note || "Tanpa catatan"}</small></td><td>{movement.product.categoryRef?.name || "Tanpa kategori"}</td><td><span className={movement.type === "OUT" ? "movement-out" : "movement-in"}>{movement.type === "OUT" ? "-" : "+"}{movement.quantity} · {labels[movement.type]}</span></td><td>{movement.beforeStock} → <b>{movement.afterStock}</b> {movement.product.unit}</td><td>{movement.operator.name}</td></tr>)}</tbody></table>{!visible.length && <p className="management-empty">{query || category ? "Riwayat stok tidak ditemukan." : "Belum ada perubahan stok."}</p>}</div>
      <Pagination page={page} pageSize={pageSize} total={visible.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
    </section>
  </main>;
}
