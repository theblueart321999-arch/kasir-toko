"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Product = { id: number; name: string; sku: string; unit: string };
type SaleItem = { productId: number; quantity: number; unitPrice: number; product: Product };
type Sale = { id: number; invoiceNumber: string; createdAt: string; total: number; items: SaleItem[] };
type ReturnItem = { productId: number; quantity: number; total: number; product: Product };
type SaleReturn = { id: number; sale: { invoiceNumber: string; createdAt: string }; reason: string; total: number; createdAt: string; items: ReturnItem[] };

const currency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function ReturPenjualanPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [salesResponse, returnsResponse] = await Promise.all([fetch("/api/sales"), fetch("/api/sales/returns")]);
    if (salesResponse.ok) setSales((await salesResponse.json()) as Sale[]);
    if (returnsResponse.ok) setReturns((await returnsResponse.json()) as SaleReturn[]);
    if (!salesResponse.ok || !returnsResponse.ok) setNotice("Silakan login untuk mengakses retur penjualan.");
    setLoading(false);
  }
  useEffect(() => {
    Promise.all([fetch("/api/sales"), fetch("/api/sales/returns")]).then(async ([salesResponse, returnsResponse]) => {
      if (salesResponse.ok) setSales((await salesResponse.json()) as Sale[]);
      if (returnsResponse.ok) setReturns((await returnsResponse.json()) as SaleReturn[]);
      if (!salesResponse.ok || !returnsResponse.ok) setNotice("Silakan login untuk mengakses retur penjualan.");
      setLoading(false);
    }).catch(() => { setNotice("Data retur gagal dimuat."); setLoading(false); });
  }, []);

  const visibleSales = useMemo(() => sales.filter((sale) => sale.invoiceNumber.toLowerCase().includes(query.toLowerCase())), [query, sales]);
  const selectedSale = sales.find((sale) => sale.id === selectedId);
  const selectedTotal = selectedSale?.items.reduce((sum, item) => sum + item.unitPrice * (quantities[item.productId] || 0), 0) || 0;

  function selectSale(sale: Sale) {
    setSelectedId(sale.id);
    setQuantities({});
    setNotice("");
  }
  function availableQuantity(item: SaleItem) {
    const alreadyReturned = returns.filter((itemReturn) => itemReturn.sale.invoiceNumber === selectedSale?.invoiceNumber)
      .flatMap((itemReturn) => itemReturn.items).filter((itemReturn) => itemReturn.productId === item.productId)
      .reduce((sum, itemReturn) => sum + itemReturn.quantity, 0);
    return Math.max(0, item.quantity - alreadyReturned);
  }
  async function submitReturn() {
    if (!selectedSale || !reason.trim() || !Object.values(quantities).some(Boolean)) {
      setNotice("Pilih barang dan isi alasan retur.");
      return;
    }
    const response = await fetch("/api/sales/returns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId: selectedSale.id, reason, items: Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([productId, quantity]) => ({ productId: Number(productId), quantity })) }),
    });
    const result = await response.json();
    if (!response.ok) { setNotice(result.error || "Retur gagal disimpan"); return; }
    setNotice("Retur berhasil disimpan dan stok dikembalikan.");
    setQuantities({}); setReason(""); await load();
  }

  return <main className="return-page">
    <header className="return-header"><div><Link href="/" className="return-back">← Kembali ke kasir</Link><p className="eyebrow">PENJUALAN</p><h1>Retur Penjualan</h1><p className="return-subtitle">Pilih transaksi, tentukan barang yang dikembalikan, dan simpan alasan retur.</p></div><Link href="/" className="return-home">Kasir</Link></header>
    {notice && <div className="return-notice">{notice}</div>}
    <div className="return-layout">
      <section className="return-card"><div className="return-card-heading"><div><h2>Riwayat transaksi</h2><p>{loading ? "Memuat..." : `${visibleSales.length} transaksi ditemukan`}</p></div><div className="return-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nomor invoice..." /></div></div>
        <div className="sale-list">{visibleSales.map((sale) => <button className={`sale-row ${selectedId === sale.id ? "selected" : ""}`} key={sale.id} onClick={() => selectSale(sale)}><span><b>{sale.invoiceNumber}</b><small>{date(sale.createdAt)} · {sale.items.length} produk</small></span><strong>{currency(sale.total)}</strong></button>)}{!loading && !visibleSales.length && <p className="return-empty">Transaksi tidak ditemukan.</p>}</div>
      </section>
      <section className="return-card return-form-card"><h2>Detail retur</h2>{selectedSale ? <><div className="selected-sale"><b>{selectedSale.invoiceNumber}</b><span>{date(selectedSale.createdAt)}</span></div><div className="return-items">{selectedSale.items.map((item) => { const available = availableQuantity(item); return <label className="return-item" key={item.productId}><span><b>{item.product.name}</b><small>{item.product.sku} · Terjual {item.quantity} {item.product.unit} · Tersisa {available}</small></span><input type="number" min="0" max={available} value={quantities[item.productId] || ""} disabled={!available} onChange={(event) => setQuantities((current) => ({ ...current, [item.productId]: Math.min(available, Math.max(0, Number(event.target.value) || 0)) }))} /></label>; })}</div><label className="return-reason">Alasan retur<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Contoh: barang rusak saat diterima" rows={3} /></label><div className="return-total"><span>Total pengembalian</span><strong>{currency(selectedTotal)}</strong></div><button className="return-submit" onClick={submitReturn}>Konfirmasi Retur</button></> : <div className="return-placeholder"><span>↩</span><p>Pilih transaksi di sebelah kiri untuk mulai retur.</p></div>}</section>
    </div>
    <section className="return-card return-history"><div className="return-card-heading"><div><h2>Riwayat retur</h2><p>Pengembalian yang sudah tercatat</p></div></div><div className="history-list">{returns.map((item) => <div className="history-row" key={item.id}><div><b>{item.sale.invoiceNumber}</b><small>{date(item.createdAt)} · {item.reason}</small></div><strong>{currency(item.total)}</strong></div>)}{!returns.length && <p className="return-empty">Belum ada retur.</p>}</div></section>
  </main>;
}
