"use client";

import { useEffect, useMemo, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Level = { id: number; minQuantity: number; price: number };
type Price = { id: number; sku: string; name: string; price: number; defaultPrice: number | null; costPrice: number; costSource: string; priceLevels: Level[] };
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function PriceLevelManager({ operatorName }: { operatorName: string }) {
  const [prices, setPrices] = useState<Price[]>([]);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Price | null>(null);
  const [minQuantity, setMinQuantity] = useState("10");
  const [levelPrice, setLevelPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMarkups, setSelectedMarkups] = useState<Record<number, number>>({});
  useEffect(() => {
    fetch("/api/price-levels", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Data level harga gagal dimuat");
        setPrices(Array.isArray(data) ? data as Price[] : []);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Data level harga gagal dimuat"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { setPage(1); }, [query, pageSize]);
  function message(value: string) { setNotice(value); window.setTimeout(() => setNotice(""), 3000); }
  function openLevel(product: Price, level?: Level) { setSelected(product); setMinQuantity(String(level?.minQuantity || 10)); setLevelPrice(String(level?.price || Math.round(product.costPrice * 1.3))); }
  async function saveLevel() {
    if (!selected) return;
    const response = await fetch("/api/price-levels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: selected.id, minQuantity: Number(minQuantity), price: Number(levelPrice) }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Level harga gagal disimpan");
    setPrices((items) => items.map((item) => item.id === selected.id ? { ...item, priceLevels: [...item.priceLevels.filter((level) => level.minQuantity !== data.minQuantity), data].sort((a, b) => a.minQuantity - b.minQuantity) } : item));
    setSelected(null); message("Level harga grosir disimpan");
  }
  async function removeLevel(level: Level) {
    const response = await fetch(`/api/price-levels?id=${level.id}`, { method: "DELETE" });
    if (!response.ok) return message("Level harga gagal dihapus");
    setPrices((items) => items.map((item) => ({ ...item, priceLevels: item.priceLevels.filter((entry) => entry.id !== level.id) })));
    message("Level harga dihapus");
  }
  async function applyRecommended(product: Price) {
    await applyMarkup(product, 30);
  }
  async function applyMarkup(product: Price, markup: number) {
    const recommended = Math.round(product.costPrice * (1 + markup / 100));
    const response = await fetch("/api/price-levels", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, price: recommended }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Harga rekomendasi gagal diterapkan");
    setSelectedMarkups((items) => ({ ...items, [product.id]: markup }));
    setPrices((items) => items.map((item) => item.id === product.id ? { ...item, price: data.price } : item));
    message(`Harga rekomendasi ${markup}% ${money(recommended)} diterapkan`);
  }
  async function resetDefault(product: Price) {
    const response = await fetch("/api/price-levels", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, action: "reset" }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Harga default gagal dipulihkan");
    setSelectedMarkups((items) => {
      const next = { ...items };
      delete next[product.id];
      return next;
    });
    setPrices((items) => items.map((item) => item.id === product.id ? { ...item, price: data.price, defaultPrice: data.defaultPrice } : item));
    message(`Harga dikembalikan ke ${money(data.price)}`);
  }
  const visible = useMemo(() => prices.filter((item) => `${item.name} ${item.sku}`.toLowerCase().includes(query.toLowerCase())), [prices, query]);
  const paged = paginate(visible, page, pageSize);
  return <main className="management-page">
    <header className="management-header"><div><p className="eyebrow">KASIR TOKO · PRODUK</p><h1>Level Harga Grosir</h1><p>Atur harga berdasarkan jumlah pembelian dan lihat rekomendasi keuntungan.</p></div><div className="management-user">Masuk sebagai <b>{operatorName}</b><a href="/dashboard">← Dashboard</a></div></header>
    {notice && <div className="management-notice">{notice}</div>}
    <section className="category-management-card"><div className="card-title category-list-heading"><div><h2>Harga dan keuntungan produk</h2><p>Harga modal diambil dari pembelian terakhir.</p></div><div className="category-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama produk atau SKU..." /></div></div>
      <div className="category-table-wrap">{loading ? <p className="management-empty">Memuat data level harga...</p> : <><table className="category-table price-level-table"><thead><tr><th>Produk</th><th>Modal</th><th>Harga jual</th><th>Opsi rekomendasi</th><th>Keuntungan</th><th>Level grosir</th></tr></thead><tbody>{paged.map((item) => { const options = [20, 30, 50].map((markup) => ({ markup, price: Math.round(item.costPrice * (1 + markup / 100)) })); const selectedMarkup = selectedMarkups[item.id]; const selectedOption = options.find((option) => option.markup === selectedMarkup) ?? options[1]; const profit = selectedOption.price - item.costPrice; const margin = selectedOption.price > 0 ? (profit / selectedOption.price) * 100 : 0; return <tr key={item.id}><td><b>{item.name}</b><small className="category-slug">{item.sku}</small></td><td><b>{money(item.costPrice)}</b><small className="category-slug">{item.costSource}</small></td><td><b>{money(item.price)}</b><button type="button" className="price-reset-button" disabled={item.defaultPrice === null || item.price === item.defaultPrice} onClick={() => void resetDefault(item)}>{item.price === item.defaultPrice ? "Harga default" : "Kembalikan default"}</button></td><td><div className="price-options">{options.map((option) => <button type="button" className={`price-option-button ${option.markup === selectedMarkup ? "recommended" : ""}`} key={option.markup} onClick={() => void applyMarkup(item, option.markup)}><span>{option.markup}%</span><b>{money(option.price)}</b><small>{option.markup === 20 ? "Cepat laku" : option.markup === 30 ? "Seimbang" : "Margin tinggi"}</small><i title={option.markup === 20 ? "Cocok untuk barang mahal, persaingan ketat, atau barang yang ingin cepat terjual." : option.markup === 30 ? "Pilihan seimbang untuk kebutuhan toko sehari-hari dan perputaran stok normal." : "Cocok untuk barang murah, lambat laku, berisiko rusak, atau membutuhkan biaya penyimpanan lebih besar."}>!</i></button>)}</div></td><td><b className={margin >= 20 ? "stock-ok" : "stock-low"}>{money(profit)} / item</b><small className="category-slug">{margin.toFixed(1)}% margin pada opsi {selectedMarkup ?? 30}%</small></td><td><div className="price-level-list">{item.priceLevels.map((level) => <span key={level.id}>{level.minQuantity}+ × {money(level.price)} <button type="button" onClick={() => void removeLevel(level)}>×</button></span>)}<button type="button" className="wholesale-button" onClick={() => openLevel(item)}>+ Atur grosir</button></div></td></tr>; })}</tbody></table>{!visible.length && <p className="management-empty">{query ? "Produk tidak ditemukan." : "Belum ada produk."}</p>}<Pagination page={page} pageSize={pageSize} total={visible.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></>}</div>
      <div className="price-rule-info"><b>3 opsi rekomendasi harga</b><span className="price-rule-option"><i title="Cocok untuk barang mahal, persaingan ketat, atau barang yang ingin cepat terjual.">!</i><strong>20% Kompetitif</strong> - cepat laku</span><span className="price-rule-option"><i title="Pilihan seimbang untuk kebutuhan toko sehari-hari dan perputaran stok normal.">!</i><strong>30% Seimbang</strong> - rekomendasi umum</span><span className="price-rule-option"><i title="Cocok untuk barang murah, lambat laku, berisiko rusak, atau membutuhkan biaya penyimpanan lebih besar.">!</i><strong>50% Margin tinggi</strong> - barang murah/lambat laku</span></div>
    </section>
    {selected && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="receipt-success-modal category-edit-modal"><div className="modal-heading"><div><p className="eyebrow">LEVEL HARGA GROSIR</p><h2>Atur harga berdasarkan jumlah</h2><p className="category-edit-help">{selected.name} · Modal {money(selected.costPrice)}</p></div><button type="button" className="modal-close" onClick={() => setSelected(null)}>×</button></div><label>Minimal jumlah pembelian<input min="2" type="number" value={minQuantity} onChange={(event) => setMinQuantity(event.target.value)} /></label><label>Harga jual per item<input min="0" type="number" value={levelPrice} onChange={(event) => setLevelPrice(event.target.value)} /></label><p className="price-level-preview">Keuntungan: <b>{money(Number(levelPrice) - selected.costPrice)}</b> per item ({selected.costPrice ? (((Number(levelPrice) - selected.costPrice) / Number(levelPrice || 1)) * 100).toFixed(1) : "0.0"}%)</p><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setSelected(null)}>Batal</button><button type="button" className="primary-button" onClick={() => void saveLevel()}>Simpan level harga</button></div></section></div>}
  </main>;
}
