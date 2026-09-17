"use client";

import { FormEvent, useEffect, useState } from "react";

type Product = { id: number; name: string; sku: string; price: number; stock: number; unit: string };
type Supplier = { id: number; name: string };
type PurchaseItem = { productId: number; quantity: number; unitPrice: number; product: Product };
type Purchase = { id: number; invoiceNumber: string; reference: string | null; total: number; createdAt: string; supplier: Supplier; items: PurchaseItem[] };
type ReturnRecord = { id: number; total: number; reason: string; createdAt: string; purchase: { invoiceNumber: string; supplier: Supplier }; items: PurchaseItem[] };
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function PembelianManager({ operatorName }: { operatorName: string }) {
  const [tab, setTab] = useState<"purchase" | "return" | "history">("purchase");
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [notice, setNotice] = useState("");
  const [purchase, setPurchase] = useState({ supplierId: "", invoiceNumber: "", reference: "", paymentStatus: "PAID", items: [{ productId: "", quantity: "1", unitPrice: "" }] });
  const [returnForm, setReturnForm] = useState({ purchaseId: "", reason: "", itemQuantities: {} as Record<number, string> });

  async function load() {
    const [productResponse, supplierResponse, purchaseResponse, returnResponse] = await Promise.all([fetch("/api/products"), fetch("/api/suppliers"), fetch("/api/purchases"), fetch("/api/purchases/returns")]);
    if (productResponse.ok) setProducts(await productResponse.json());
    if (supplierResponse.ok) setSuppliers(await supplierResponse.json());
    if (purchaseResponse.ok) setPurchases(await purchaseResponse.json());
    if (returnResponse.ok) setReturns(await returnResponse.json());
  }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);
  const selectedPurchase = purchases.find((item) => item.id === Number(returnForm.purchaseId));
  const purchaseTotal = purchase.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  function message(value: string) { setNotice(value); window.setTimeout(() => setNotice(""), 4000); }
  function addPurchaseItem() { setPurchase({ ...purchase, items: [...purchase.items, { productId: "", quantity: "1", unitPrice: "" }] }); }
  async function submitPurchase(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId: Number(purchase.supplierId), invoiceNumber: purchase.invoiceNumber, reference: purchase.reference, paymentStatus: purchase.paymentStatus, items: purchase.items.map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })) }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Pembelian gagal disimpan");
    setPurchase({ supplierId: "", invoiceNumber: "", reference: "", paymentStatus: "PAID", items: [{ productId: "", quantity: "1", unitPrice: "" }] }); message("Pembelian berhasil disimpan"); void load();
  }
  async function submitReturn(event: FormEvent) {
    event.preventDefault();
    if (!selectedPurchase) return message("Pilih pembelian terlebih dahulu");
    const items = selectedPurchase.items.map((item) => ({ productId: item.productId, quantity: Number(returnForm.itemQuantities[item.productId] || 0) })).filter((item) => item.quantity > 0);
    const response = await fetch("/api/purchases/returns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purchaseId: selectedPurchase.id, reason: returnForm.reason, items }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Retur pembelian gagal disimpan");
    setReturnForm({ purchaseId: "", reason: "", itemQuantities: {} }); message("Retur pembelian berhasil disimpan"); void load();
  }
  return <main className="purchase-page">
    <header className="management-header"><div><p className="eyebrow">KASIR TOKO · PEMBELIAN</p><h1>Pembelian & Retur</h1><p>Kelola penerimaan barang dari supplier dan pengembalian pembelian.</p></div><div className="management-user">Masuk sebagai <b>{operatorName}</b><a href="/dashboard">← Dashboard</a></div></header>
    {notice && <div className="management-notice">{notice}</div>}
    <div className="purchase-tabs"><button className={tab === "purchase" ? "selected" : ""} onClick={() => setTab("purchase")}>Pembelian baru</button><button className={tab === "return" ? "selected" : ""} onClick={() => setTab("return")}>Retur pembelian</button><button className={tab === "history" ? "selected" : ""} onClick={() => setTab("history")}>Riwayat</button></div>
    {tab === "purchase" && <form className="purchase-card" onSubmit={submitPurchase}><div className="card-title"><div><h2>Pembelian dari supplier</h2><p>Stok otomatis bertambah dan tercatat sebagai stok masuk.</p></div><strong>{money(purchaseTotal)}</strong></div><div className="purchase-fields"><label>Supplier<select required value={purchase.supplierId} onChange={(e) => setPurchase({ ...purchase, supplierId: e.target.value })}><option value="">Pilih supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><label>No. invoice<input value={purchase.invoiceNumber} onChange={(e) => setPurchase({ ...purchase, invoiceNumber: e.target.value })} placeholder="Otomatis jika kosong" /></label><label>Referensi<input value={purchase.reference} onChange={(e) => setPurchase({ ...purchase, reference: e.target.value })} placeholder="PO / surat jalan" /></label><label>Status pembayaran<select value={purchase.paymentStatus} onChange={(e) => setPurchase({ ...purchase, paymentStatus: e.target.value })}><option value="PAID">Lunas</option><option value="PARTIAL">Sebagian</option><option value="UNPAID">Belum dibayar</option></select></label></div><div className="purchase-items">{purchase.items.map((item, index) => <div className="purchase-item-row" key={index}><select required value={item.productId} onChange={(e) => { const items = [...purchase.items]; items[index] = { ...items[index], productId: e.target.value, unitPrice: products.find((p) => p.id === Number(e.target.value))?.price.toString() || "" }; setPurchase({ ...purchase, items }); }}><option value="">Pilih produk</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.unit})</option>)}</select><input required min="1" type="number" value={item.quantity} onChange={(e) => { const items = [...purchase.items]; items[index] = { ...items[index], quantity: e.target.value }; setPurchase({ ...purchase, items }); }} placeholder="Jumlah" /><input required min="0" type="number" value={item.unitPrice} onChange={(e) => { const items = [...purchase.items]; items[index] = { ...items[index], unitPrice: e.target.value }; setPurchase({ ...purchase, items }); }} placeholder="Harga satuan" /></div>)}</div><div className="purchase-actions"><button type="button" className="management-secondary" onClick={addPurchaseItem}>+ Tambah produk</button><button type="submit" className="management-primary">Simpan pembelian</button></div></form>}
    {tab === "return" && <form className="purchase-card" onSubmit={submitReturn}><div className="card-title"><div><h2>Retur pembelian</h2><p>Jumlah retur tidak boleh melebihi sisa jumlah pembelian.</p></div></div><label>Pembelian<select required value={returnForm.purchaseId} onChange={(e) => setReturnForm({ ...returnForm, purchaseId: e.target.value, itemQuantities: {} })}><option value="">Pilih invoice</option>{purchases.map((item) => <option key={item.id} value={item.id}>{item.invoiceNumber} · {item.supplier.name} · {money(item.total)}</option>)}</select></label>{selectedPurchase && <div className="return-items">{selectedPurchase.items.map((item) => <label key={item.productId}><span><b>{item.product.name}</b><small>Dibeli {item.quantity} {item.product.unit}</small></span><input type="number" min="0" max={item.quantity} value={returnForm.itemQuantities[item.productId] || ""} onChange={(e) => setReturnForm({ ...returnForm, itemQuantities: { ...returnForm.itemQuantities, [item.productId]: e.target.value } })} placeholder="Jumlah retur" /></label>)}</div>}<label>Alasan retur<textarea required rows={3} value={returnForm.reason} onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })} placeholder="Contoh: barang rusak saat diterima" /></label><button className="management-primary" type="submit">Simpan retur</button></form>}
    {tab === "history" && <section className="purchase-history"><div className="card-title"><div><h2>Riwayat pembelian</h2><p>{purchases.length} pembelian · {returns.length} retur</p></div></div><div className="purchase-history-list">{purchases.map((item) => <article key={item.id}><div><b>{item.invoiceNumber}</b><span>{item.supplier.name} · {date(item.createdAt)}</span></div><strong>{money(item.total)}</strong><small>{item.items.length} produk{item.reference ? ` · ${item.reference}` : ""}</small></article>)}{!purchases.length && <p className="management-empty">Belum ada pembelian.</p>}</div><h2 className="history-subtitle">Retur pembelian</h2><div className="purchase-history-list">{returns.map((item) => <article key={item.id}><div><b>{item.purchase.invoiceNumber}</b><span>{item.purchase.supplier.name} · {date(item.createdAt)}</span></div><strong>{money(item.total)}</strong><small>{item.reason}</small></article>)}{!returns.length && <p className="management-empty">Belum ada retur pembelian.</p>}</div></section>}
  </main>;
}
