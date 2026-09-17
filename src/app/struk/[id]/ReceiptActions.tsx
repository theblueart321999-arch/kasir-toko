"use client";
export default function ReceiptActions() {
  return <div className="no-print receipt-actions"><a href="/dashboard">← Kembali</a><button type="button" onClick={() => window.print()}>Cetak struk</button></div>;
}
