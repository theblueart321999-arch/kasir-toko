"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Purchase = {
  id: number;
  invoiceNumber: string;
  createdAt: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: string;
  supplier?: {
    name: string;
  } | null;
  items: {
    id: number;
    quantity: number;
    unitPrice: number;
    total: number;
    product: {
      name: string;
    };
  }[];
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

const paymentStatusLabels: Record<string, string> = {
  PAID: "Lunas",
  UNPAID: "Belum Lunas",
  PARTIAL: "Sebagian",
};

export default function RiwayatPembelianPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetch("/api/purchases")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Silakan login untuk mengakses riwayat pembelian."
              : "Riwayat pembelian gagal dimuat.",
          );
        }

        setPurchases((await response.json()) as Purchase[]);
      })
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error
            ? reason.message
            : "Riwayat pembelian gagal dimuat.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const visiblePurchases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return purchases;
    }

    return purchases.filter((purchase) => {
      const supplierName = purchase.supplier?.name?.toLowerCase() || "";
      const invoiceNumber = purchase.invoiceNumber?.toLowerCase() || "";

      return (
        supplierName.includes(normalizedQuery) ||
        invoiceNumber.includes(normalizedQuery)
      );
    });
  }, [query, purchases]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const pagedPurchases = useMemo(
    () => paginate(visiblePurchases, page, pageSize),
    [visiblePurchases, page, pageSize],
  );

  async function deletePurchase(purchase: Purchase) {
    setError(""); // Reset status error sebelum eksekusi

    try {
      const response = await fetch(`/api/purchases?id=${purchase.id}`, {
        method: "DELETE",
      });

      const contentType = response.headers.get("content-type");
      let result: { error?: string } = {};

      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      }

      if (!response.ok) {
        setError(
          result.error ||
            `Gagal menghapus transaksi (Status Code: ${response.status}).`,
        );
        return;
      }

      setPurchases((current) =>
        current.filter((item) => item.id !== purchase.id),
      );
    } catch (err) {
      console.error("Error deleting purchase:", err);
      setError("Terjadi kesalahan jaringan/server saat menghapus transaksi.");
    }
  }

  return (
    <main className="sales-history-page">
      <header className="sales-history-header">
        <div>
          <p className="eyebrow">PEMBELIAN</p>

          <h1>Riwayat Pembelian</h1>

          <p className="sales-history-subtitle">
            Pilih transaksi untuk melihat detail atau mencetak bukti pembelian.
          </p>
        </div>

        <Link href="/" className="secondary-button">
          Kembali ke kasir
        </Link>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="sales-history-card">
        <div className="sales-history-toolbar">
          <div>
            <h2>Riwayat transaksi</h2>

            <p>
              {loading
                ? "Memuat transaksi..."
                : `${visiblePurchases.length} transaksi ditemukan`}
            </p>
          </div>

          <label className="sales-history-search">
            <span aria-hidden="true">⌕</span>

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari supplier..."
              aria-label="Cari supplier atau nomor invoice"
            />
          </label>
        </div>

        <div className="sales-history-table-wrap">
          <table className="sales-history-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Tanggal</th>
                <th>Total</th>
                <th>Status pembayaran</th>
                <th>
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {pagedPurchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td data-label="Supplier">
                    <strong>{purchase.supplier?.name || "Umum"}</strong>
                  </td>

                  <td data-label="Tanggal">{date(purchase.createdAt)}</td>

                  <td data-label="Total">
                    <strong>{currency(purchase.total)}</strong>
                  </td>

                  <td data-label="Status">
                    {paymentStatusLabels[purchase.paymentStatus] ||
                      purchase.paymentStatus}
                  </td>

                  <td className="sales-history-action">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setSelectedPurchase(purchase)}
                    >
                      Lihat / Cetak
                    </button>

                    <button
                      type="button"
                      className="sales-history-delete"
                      onClick={() => setPurchaseToDelete(purchase)}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={visiblePurchases.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />

          {!loading && !visiblePurchases.length && (
            <p className="empty-state sales-history-empty">
              {query
                ? "Transaksi tidak ditemukan."
                : "Belum ada transaksi pembelian."}
            </p>
          )}
        </div>
      </section>

      {/* MODAL DETAIL PEMBELIAN */}
      {selectedPurchase && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPurchase(null);
            }
          }}
        >
          <section
            className="receipt-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-preview-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">PREVIEW TRANSAKSI</p>

                <h2 id="purchase-preview-title">Bukti Pembelian</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedPurchase(null)}
                aria-label="Tutup preview pembelian"
              >
                ×
              </button>
            </div>

            <div className="receipt-preview">
              <header>
                <h3>Toko</h3>

                <p>Supplier: {selectedPurchase.supplier?.name || "Umum"}</p>

                <p>
                  {selectedPurchase.invoiceNumber} ·{" "}
                  {date(selectedPurchase.createdAt)}
                </p>
              </header>

              <div className="receipt-preview-items">
                {selectedPurchase.items.map((item) => (
                  <div key={item.id}>
                    <span>
                      {item.product.name}

                      <small>
                        {item.quantity} × {currency(item.unitPrice)}
                      </small>
                    </span>

                    <b>{currency(item.total)}</b>
                  </div>
                ))}
              </div>

              <div className="receipt-preview-total">
                <span>Subtotal</span>

                <b>{currency(selectedPurchase.subtotal)}</b>

                <span>Pajak</span>

                <b>{currency(selectedPurchase.tax)}</b>

                <strong>Total</strong>

                <strong>{currency(selectedPurchase.total)}</strong>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="modal-cancel"
                onClick={() => setSelectedPurchase(null)}
              >
                Tutup
              </button>

              <Link
                href={`/struk-pembelian/${selectedPurchase.id}`}
                target="_blank"
                className="primary-button"
              >
                Cetak bukti
              </Link>
            </div>
          </section>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {purchaseToDelete && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPurchaseToDelete(null);
            }
          }}
        >
          <section
            className="receipt-success-modal delete-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-purchase-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">KONFIRMASI</p>

                <h2 id="delete-purchase-title">Hapus transaksi?</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setPurchaseToDelete(null)}
                aria-label="Tutup"
              >
                ×
              </button>
            </div>

            <p className="receipt-success-message">
              Transaksi dari supplier{" "}
              <b>{purchaseToDelete.supplier?.name || "Umum"}</b> dengan invoice{" "}
              <b>{purchaseToDelete.invoiceNumber}</b> akan dihapus dan stok
              produk akan dikurangi kembali. Tindakan ini tidak dapat
              dibatalkan.
            </p>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPurchaseToDelete(null)}
              >
                Batal
              </button>

              <button
                type="button"
                className="sales-history-delete"
                onClick={() => {
                  const purchase = purchaseToDelete;
                  setPurchaseToDelete(null);
                  void deletePurchase(purchase);
                }}
              >
                Hapus transaksi
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
