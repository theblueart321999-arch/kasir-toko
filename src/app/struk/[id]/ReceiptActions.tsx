"use client";
export default function ReceiptActions() {
  return <div className="no-print receipt-actions"><a href="/riwayat-penjualan">← Kembali</a><button type="button" onClick={() => window.print()}>Cetak struk</button></div>;
}
