"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Sale = {
  id: number;
  invoiceNumber: string;
  createdAt: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  items: { id: number; quantity: number; unitPrice: number; total: number; product: { name: string } }[];
};

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const date = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const paymentLabels: Record<string, string> = {
  TUNAI: "Tunai",
  QRIS: "QRIS",
  DEBIT: "Debit",
};

export default function RiwayatPenjualanPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    fetch("/api/sales")
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 401 ? "Silakan login untuk mengakses riwayat penjualan." : "Riwayat penjualan gagal dimuat.");
        setSales((await response.json()) as Sale[]);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Riwayat penjualan gagal dimuat."))
      .finally(() => setLoading(false));
  }, []);

  const visibleSales = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sales;
    return sales.filter((sale) => sale.invoiceNumber.toLowerCase().includes(normalizedQuery));
  }, [query, sales]);

  return (
    <main className="sales-history-page">
      <header className="sales-history-header">
        <div>
          <p className="eyebrow">PENJUALAN</p>
          <h1>Cetak Struk</h1>
          <p className="sales-history-subtitle">Pilih transaksi untuk melihat atau mencetak struk penjualan.</p>
        </div>
        <Link href="/" className="secondary-button">Kembali ke kasir</Link>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="sales-history-card">
        <div className="sales-history-toolbar">
          <div>
            <h2>Riwayat transaksi</h2>
            <p>{loading ? "Memuat transaksi..." : `${visibleSales.length} transaksi ditemukan`}</p>
          </div>
          <label className="sales-history-search">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nomor invoice..." aria-label="Cari nomor invoice" />
          </label>
        </div>

        <div className="sales-history-table-wrap">
          <table className="sales-history-table">
            <thead>
              <tr><th>Nomor invoice</th><th>Tanggal</th><th>Total</th><th>Metode pembayaran</th><th><span className="sr-only">Aksi</span></th></tr>
            </thead>
            <tbody>
              {visibleSales.map((sale) => (
                <tr key={sale.id}>
                  <td data-label="Invoice"><strong>{sale.invoiceNumber}</strong></td>
                  <td data-label="Tanggal">{date(sale.createdAt)}</td>
                  <td data-label="Total"><strong>{currency(sale.total)}</strong></td>
                  <td data-label="Metode">{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</td>
                  <td className="sales-history-action"><button type="button" className="primary-button" onClick={() => setSelectedSale(sale)}>Lihat / Cetak</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !visibleSales.length && <p className="empty-state sales-history-empty">{query ? "Transaksi tidak ditemukan." : "Belum ada transaksi penjualan."}</p>}
        </div>
      </section>
      {selectedSale && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedSale(null); }}>
        <section className="receipt-preview-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-preview-title">
          <div className="modal-heading">
            <div><p className="eyebrow">PREVIEW TRANSAKSI</p><h2 id="receipt-preview-title">Struk Penjualan</h2></div>
            <button type="button" className="modal-close" onClick={() => setSelectedSale(null)} aria-label="Tutup preview struk">×</button>
          </div>
          <div className="receipt-preview">
            <header><h3>Toko</h3><p>{selectedSale.invoiceNumber} · {date(selectedSale.createdAt)}</p></header>
            <div className="receipt-preview-items">{selectedSale.items.map((item) => <div key={item.id}><span>{item.product.name}<small>{item.quantity} × {currency(item.unitPrice)}</small></span><b>{currency(item.total)}</b></div>)}</div>
            <div className="receipt-preview-total"><span>Subtotal</span><b>{currency(selectedSale.subtotal)}</b><span>Pajak</span><b>{currency(selectedSale.tax)}</b><strong>Total</strong><strong>{currency(selectedSale.total)}</strong></div>
          </div>
          <div className="form-actions"><button type="button" className="modal-cancel" onClick={() => setSelectedSale(null)}>Tutup</button><Link href={`/struk/${selectedSale.id}`} target="_blank" className="primary-button">Cetak struk</Link></div>
        </section>
      </div>}
    </main>
  );
}
