"use client";

import { FormEvent, useEffect, useState } from "react";
import Pagination, { paginate } from "@/components/Pagination";

type Product = { id: number; name: string; sku: string; price: number; stock: number; unit: string };
type Supplier = { id: number; name: string };
type ProductCategory = { id: number; name: string };
type PurchaseItem = { productId: number; quantity: number; unitPrice: number; product: Product };
type Purchase = { id: number; invoiceNumber: string; reference: string | null; total: number; createdAt: string; supplier: Supplier; items: PurchaseItem[] };
type ReturnRecord = { id: number; total: number; reason: string; createdAt: string; purchase: { invoiceNumber: string; supplier: Supplier }; items: PurchaseItem[] };
type HistoryPeriod = "all" | "day" | "week" | "month" | "year" | "range";
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function PembelianManager({ operatorName, initialTab = "purchase" }: { operatorName: string; initialTab?: "purchase" | "return" | "history" }) {
  const [tab, setTab] = useState<"purchase" | "return" | "history">(initialTab);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [notice, setNotice] = useState("");
  const [purchase, setPurchase] = useState({ supplierId: "", invoiceNumber: "", reference: "", paymentMethod: "CASH", paymentStatus: "PAID", paidAmount: "", dueDate: "", items: [{ productId: "", quantity: "1", unitPrice: "" }] });
  const [returnForm, setReturnForm] = useState({ purchaseId: "", reason: "", itemQuantities: {} as Record<number, string> });
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productRowIndex, setProductRowIndex] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState({ name: "", sku: "", categoryId: "", categoryName: "", unit: "pcs", manualUnit: "", currency: "IDR", price: "", exchangeRate: "1", convertToRupiah: true, imageUrl: "" });
  const [savingProduct, setSavingProduct] = useState(false);
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>("all");
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [returnPage, setReturnPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load() {
    const [productResponse, supplierResponse, categoryResponse, purchaseResponse, returnResponse] = await Promise.all([fetch("/api/products"), fetch("/api/suppliers"), fetch("/api/categories"), fetch("/api/purchases"), fetch("/api/purchases/returns")]);
    if (productResponse.ok) setProducts(await productResponse.json());
    if (supplierResponse.ok) setSuppliers(await supplierResponse.json());
    if (categoryResponse.ok) setCategories(await categoryResponse.json());
    if (purchaseResponse.ok) setPurchases(await purchaseResponse.json());
    if (returnResponse.ok) setReturns(await returnResponse.json());
  }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);
  const selectedPurchase = purchases.find((item) => item.id === Number(returnForm.purchaseId));
  const purchaseTotal = purchase.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  function historyRange() {
    if (historyPeriod === "all") return null;
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    if (historyPeriod === "day") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (historyPeriod === "week") {
      const day = start.getDay();
      const mondayOffset = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - mondayOffset);
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime() + 6 * 24 * 60 * 60 * 1000);
      end.setHours(23, 59, 59, 999);
    } else if (historyPeriod === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (historyPeriod === "year") {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    } else {
      if (!historyStart || !historyEnd) return null;
      const [startYear, startMonth, startDay] = historyStart.split("-").map(Number);
      const [endYear, endMonth, endDay] = historyEnd.split("-").map(Number);
      start.setFullYear(startYear, startMonth - 1, startDay);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(endYear, endMonth - 1, endDay);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  }
  const range = historyRange();
  const isInHistoryRange = (value: string) => !range || (new Date(value) >= range.start && new Date(value) <= range.end);
  const filteredPurchases = purchases.filter((item) => isInHistoryRange(item.createdAt));
  const filteredReturns = returns.filter((item) => isInHistoryRange(item.createdAt));
  useEffect(() => { setHistoryPage(1); setReturnPage(1); }, [historyPeriod, historyStart, historyEnd]);
  const pagedPurchases = paginate(filteredPurchases, historyPage, pageSize);
  const pagedReturns = paginate(filteredReturns, returnPage, pageSize);
  function message(value: string) { setNotice(value); window.setTimeout(() => setNotice(""), 4000); }
  function addPurchaseItem() {
    setPurchase((current) => ({ ...current, items: [...current.items, { productId: "", quantity: "1", unitPrice: "" }] }));
  }
  function removePurchaseItem(index: number) {
    setPurchase((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  }
  async function uploadProductImage(file: File) {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/products/upload", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Gambar gagal diunggah");
    setNewProduct((current) => ({ ...current, imageUrl: data.imageUrl }));
  }
  function selectSupplier(value: string) {
    if (value === "new") {
      setSupplierDialogOpen(true);
      return;
    }
    setPurchase({ ...purchase, supplierId: value });
  }
  function selectProduct(index: number, value: string) {
    if (value === "new") {
      setProductRowIndex(index);
      setProductDialogOpen(true);
      return;
    }
    const items = [...purchase.items];
    items[index] = { ...items[index], productId: value, unitPrice: products.find((product) => product.id === Number(value))?.price.toString() || "" };
    setPurchase({ ...purchase, items });
  }
  async function createProduct() {
    const unit = newProduct.unit === "manual" ? newProduct.manualUnit.trim() : newProduct.unit;
    const categoryId = Number(newProduct.categoryId);
    const rate = Number(newProduct.exchangeRate);
    const sourcePrice = Number(newProduct.price);
    const convertedPrice = newProduct.convertToRupiah ? Math.round(sourcePrice * rate) : sourcePrice;
    if (!newProduct.name.trim() || !unit || !Number.isInteger(categoryId) || !sourcePrice || !Number.isFinite(rate) || rate <= 0 || convertedPrice < 0) {
      message("Nama, satuan, kategori, harga, dan kurs yang valid wajib diisi");
      return;
    }
    setSavingProduct(true);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProduct.name, sku: newProduct.sku, unit, categoryId, price: convertedPrice, stock: 0, imageUrl: newProduct.imageUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        message(data.error || "Produk gagal dibuat");
        return;
      }
      setProducts((current) => [...current, data].sort((left, right) => left.name.localeCompare(right.name)));
      if (productRowIndex !== null) {
        const items = [...purchase.items];
        items[productRowIndex] = { ...items[productRowIndex], productId: String(data.id), unitPrice: String(data.price) };
        setPurchase({ ...purchase, items });
      }
      setNewProduct({ name: "", sku: "", categoryId: "", categoryName: "", unit: "pcs", manualUnit: "", currency: "IDR", price: "", exchangeRate: "1", convertToRupiah: true, imageUrl: "" });
      setProductRowIndex(null);
      setProductDialogOpen(false);
      message("Produk berhasil ditambahkan");
    } catch {
      message("Produk gagal dibuat");
    } finally {
      setSavingProduct(false);
    }
  }
  async function createCategory() {
    const name = newProduct.categoryName.trim();
    if (name.length < 2) {
      message("Nama kategori minimal 2 karakter");
      return;
    }
    const response = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await response.json();
    if (!response.ok) {
      message(data.error || "Kategori gagal dibuat");
      return;
    }
    setCategories((current) => [...current, data].sort((left, right) => left.name.localeCompare(right.name)));
    setNewProduct((current) => ({ ...current, categoryId: String(data.id), categoryName: "" }));
    message("Kategori berhasil ditambahkan");
  }
  async function createSupplier() {
    if (!newSupplier.name.trim() || !newSupplier.phone.trim() || !newSupplier.email.trim() || !newSupplier.address.trim()) {
      message("Nama, nomor telepon, email, dan alamat supplier wajib diisi");
      return;
    }
    setSavingSupplier(true);
    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier),
      });
      const data = await response.json();
      if (!response.ok) {
        message(data.error || "Supplier gagal dibuat");
        return;
      }
      setSuppliers((current) => [...current, data].sort((left, right) => left.name.localeCompare(right.name)));
      setPurchase((current) => ({ ...current, supplierId: String(data.id) }));
      setNewSupplier({ name: "", phone: "", email: "", address: "", notes: "" });
      setSupplierDialogOpen(false);
      message("Supplier berhasil ditambahkan");
    } catch {
      message("Supplier gagal dibuat");
    } finally {
      setSavingSupplier(false);
    }
  }
  async function submitPurchase(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId: purchase.supplierId ? Number(purchase.supplierId) : undefined, invoiceNumber: purchase.invoiceNumber, reference: purchase.reference, paymentMethod: purchase.paymentMethod, paymentStatus: purchase.paymentStatus, paidAmount: purchase.paymentStatus === "PARTIAL" ? Number(purchase.paidAmount) : purchase.paymentStatus === "PAID" ? purchaseTotal : 0, dueDate: purchase.paymentStatus === "PAID" ? undefined : purchase.dueDate, items: purchase.items.map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })) }) });
    const data = await response.json();
    if (!response.ok) return message(data.error || "Pembelian gagal disimpan");
    setPurchase({ supplierId: "", invoiceNumber: "", reference: "", paymentMethod: "CASH", paymentStatus: "PAID", paidAmount: "", dueDate: "", items: [{ productId: "", quantity: "1", unitPrice: "" }] }); message("Pembelian berhasil disimpan"); void load();
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
    <header className="management-header"><div><p className="eyebrow">KASIR TOKO · PEMBELIAN</p><h1>{tab === "history" ? "Riwayat Pembelian" : tab === "return" ? "Retur Pembelian" : "Pembelian Baru"}</h1><p>{tab === "history" ? "Lihat dan filter seluruh riwayat pembelian." : tab === "return" ? "Proses pengembalian barang kepada supplier." : "Catat penerimaan barang baru dari supplier."}</p></div><div className="management-user">Masuk sebagai <b>{operatorName}</b><a href="/dashboard">← Dashboard</a></div></header>
    {notice && <div className="management-notice">{notice}</div>}
    {tab === "purchase" && <form className="purchase-card" onSubmit={submitPurchase}>
      <div className="card-title"><div><h2>Pembelian dari supplier</h2><p>Stok otomatis bertambah dan tercatat sebagai stok masuk.</p></div><span /></div>
      <div className="purchase-fields">
        <label>Supplier <span className="optional-label">(opsional)</span><select value={purchase.supplierId} onChange={(e) => selectSupplier(e.target.value)}><option value="">Kosong — buat anonim otomatis</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}<option value="new">+ Tambah supplier baru</option></select></label>
        <label>No. invoice<input value={purchase.invoiceNumber} onChange={(e) => setPurchase({ ...purchase, invoiceNumber: e.target.value })} placeholder="Otomatis jika kosong" /></label>
        <label>No. surat jalan / referensi<input value={purchase.reference} onChange={(e) => setPurchase({ ...purchase, reference: e.target.value })} placeholder="Otomatis jika kosong" /></label>
      </div>
      <div className="purchase-items">{purchase.items.map((item, index) => <div className="purchase-item-row" key={index}>
        <select required value={item.productId} onChange={(e) => selectProduct(index, e.target.value)}><option value="">Pilih produk</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.unit})</option>)}<option value="new">+ Tambah produk baru</option></select>
        <input required min="1" type="number" value={item.quantity} onChange={(e) => { const items = [...purchase.items]; items[index] = { ...items[index], quantity: e.target.value }; setPurchase({ ...purchase, items }); }} placeholder="Jumlah" />
        <input required min="0" type="number" value={item.unitPrice} onChange={(e) => { const items = [...purchase.items]; items[index] = { ...items[index], unitPrice: e.target.value }; setPurchase({ ...purchase, items }); }} placeholder="Harga satuan" />
        {purchase.items.length > 1 && <button type="button" className="remove-purchase-item" onClick={() => removePurchaseItem(index)}>Hapus</button>}
      </div>)}<button type="button" className="add-purchase-item" onClick={addPurchaseItem}>+ Tambah item barang</button></div>
      <div className="purchase-total-row"><span>Total pembelian</span><strong>{money(purchaseTotal)}</strong></div>
      <div className="purchase-payment-fields"><label>Metode pembayaran<select value={purchase.paymentMethod} onChange={(e) => setPurchase({ ...purchase, paymentMethod: e.target.value })}><option value="CASH">Tunai</option><option value="TRANSFER">Transfer bank</option><option value="DEBIT">Kartu debit</option><option value="CREDIT">Kartu kredit</option><option value="QRIS">QRIS</option></select></label><label>Status pembayaran<select value={purchase.paymentStatus} onChange={(e) => setPurchase({ ...purchase, paymentStatus: e.target.value, paidAmount: e.target.value === "PAID" ? String(purchaseTotal) : e.target.value === "UNPAID" ? "0" : purchase.paidAmount, dueDate: e.target.value === "PAID" ? "" : purchase.dueDate })}><option value="PAID">Lunas</option><option value="PARTIAL">Sebagian</option><option value="UNPAID">Belum dibayar</option></select></label>{purchase.paymentStatus === "PARTIAL" && <label>Jumlah dibayar<input required min="1" max={purchaseTotal > 0 ? purchaseTotal - 1 : undefined} type="number" value={purchase.paidAmount} onChange={(e) => setPurchase({ ...purchase, paidAmount: e.target.value })} placeholder="Nominal yang sudah dibayar" /><small>Sisa otomatis masuk hutang.</small></label>}{purchase.paymentStatus !== "PAID" && <label>Jatuh tempo hutang<input required type="date" value={purchase.dueDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setPurchase({ ...purchase, dueDate: e.target.value })} /><small>Tanggal pembayaran terakhir kepada supplier.</small></label>}</div>
      <div className="purchase-actions"><button type="submit" className="management-primary">Simpan pembelian</button></div>
    </form>}
    {tab === "return" && <form className="purchase-card" onSubmit={submitReturn}><div className="card-title"><div><h2>Retur pembelian</h2><p>Jumlah retur tidak boleh melebihi sisa jumlah pembelian.</p></div></div><label>Pembelian<select required value={returnForm.purchaseId} onChange={(e) => setReturnForm({ ...returnForm, purchaseId: e.target.value, itemQuantities: {} })}><option value="">Pilih invoice</option>{purchases.map((item) => <option key={item.id} value={item.id}>{item.invoiceNumber} · {item.supplier.name} · {money(item.total)}</option>)}</select></label>{selectedPurchase && <div className="return-items">{selectedPurchase.items.map((item) => <label key={item.productId}><span><b>{item.product.name}</b><small>Dibeli {item.quantity} {item.product.unit}</small></span><input type="number" min="0" max={item.quantity} value={returnForm.itemQuantities[item.productId] || ""} onChange={(e) => setReturnForm({ ...returnForm, itemQuantities: { ...returnForm.itemQuantities, [item.productId]: e.target.value } })} placeholder="Jumlah retur" /></label>)}</div>}<label>Alasan retur<textarea required rows={3} value={returnForm.reason} onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })} placeholder="Contoh: barang rusak saat diterima" /></label><button className="management-primary" type="submit">Simpan retur</button></form>}
    {tab === "history" && <section className="purchase-history"><div className="card-title"><div><h2>Riwayat pembelian</h2><p>{filteredPurchases.length} pembelian · {filteredReturns.length} retur</p></div></div><div className="history-filter"><label>Periode<select value={historyPeriod} onChange={(event) => setHistoryPeriod(event.target.value as HistoryPeriod)}><option value="all">Semua waktu</option><option value="day">Hari ini</option><option value="week">Minggu ini</option><option value="month">Bulan ini</option><option value="year">Tahun ini</option><option value="range">Rentang tanggal</option></select></label>{historyPeriod === "range" && <><label>Dari<input type="date" value={historyStart} onChange={(event) => setHistoryStart(event.target.value)} /></label><label>Sampai<input type="date" value={historyEnd} min={historyStart || undefined} onChange={(event) => setHistoryEnd(event.target.value)} /></label></>}</div><div className="purchase-history-list">{pagedPurchases.map((item) => <article key={item.id}><div><b>{item.invoiceNumber}</b><span>{item.supplier.name} · {date(item.createdAt)}</span></div><strong>{money(item.total)}</strong><small>{item.items.length} produk{item.reference ? ` · ${item.reference}` : ""}</small></article>)}{!filteredPurchases.length && <p className="management-empty">Tidak ada pembelian pada periode ini.</p>}</div><Pagination page={historyPage} pageSize={pageSize} total={filteredPurchases.length} onPageChange={setHistoryPage} onPageSizeChange={(size) => { setPageSize(size); setHistoryPage(1); setReturnPage(1); }} /><h2 className="history-subtitle">Retur pembelian</h2><div className="purchase-history-list">{pagedReturns.map((item) => <article key={item.id}><div><b>{item.purchase.invoiceNumber}</b><span>{item.purchase.supplier.name} · {date(item.createdAt)}</span></div><strong>{money(item.total)}</strong><small>{item.reason}</small></article>)}{!filteredReturns.length && <p className="management-empty">Tidak ada retur pada periode ini.</p>}</div><Pagination page={returnPage} pageSize={pageSize} total={filteredReturns.length} onPageChange={setReturnPage} onPageSizeChange={(size) => { setPageSize(size); setHistoryPage(1); setReturnPage(1); }} /></section>}
    {supplierDialogOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSupplierDialogOpen(false); }}><section className="supplier-dialog" role="dialog" aria-modal="true" aria-labelledby="supplier-dialog-title"><div className="modal-heading"><div><p className="eyebrow">DATA SUPPLIER</p><h2 id="supplier-dialog-title">Tambah supplier baru</h2></div><button type="button" className="modal-close" aria-label="Tutup tambah supplier" onClick={() => setSupplierDialogOpen(false)}>×</button></div><p className="supplier-required-note">Kolom bertanda * wajib diisi.</p><label>Nama supplier *<input autoFocus required value={newSupplier.name} onChange={(event) => setNewSupplier({ ...newSupplier, name: event.target.value })} placeholder="Contoh: PT Sumber Makmur" /></label><div className="form-row"><label>No. telepon *<input required value={newSupplier.phone} onChange={(event) => setNewSupplier({ ...newSupplier, phone: event.target.value })} placeholder="Contoh: 0812..." /></label><label>Email *<input required type="email" value={newSupplier.email} onChange={(event) => setNewSupplier({ ...newSupplier, email: event.target.value })} placeholder="supplier@email.com" /></label></div><label>Alamat *<textarea required rows={2} value={newSupplier.address} onChange={(event) => setNewSupplier({ ...newSupplier, address: event.target.value })} placeholder="Alamat lengkap supplier" /></label><label>Catatan <span className="optional-label">(opsional)</span><textarea rows={2} value={newSupplier.notes} onChange={(event) => setNewSupplier({ ...newSupplier, notes: event.target.value })} placeholder="Informasi tambahan" /></label><div className="form-actions"><button type="button" className="modal-cancel" onClick={() => setSupplierDialogOpen(false)}>Batal</button><button type="button" className="primary-button" disabled={savingSupplier} onClick={() => void createSupplier()}>{savingSupplier ? "Menyimpan..." : "Simpan supplier"}</button></div></section></div>}
   {productDialogOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProductDialogOpen(false); }}><section className="supplier-dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title"><div className="modal-heading"><div><p className="eyebrow">DATA PRODUK</p><h2 id="product-dialog-title">Tambah produk baru</h2></div><button type="button" className="modal-close" aria-label="Tutup tambah produk" onClick={() => setProductDialogOpen(false)}>×</button></div><p className="supplier-required-note">SKU kosong dibuat otomatis. Harga akan disimpan dalam Rupiah.</p>   <label>Gambar produk <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProductImage(file); }} /></label><label>Nama produk *<input autoFocus required value={newProduct.name} onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })} placeholder="Contoh: Semen 40kg" /></label><label>SKU <input value={newProduct.sku} onChange={(event) => setNewProduct({ ...newProduct, sku: event.target.value.toUpperCase() })} placeholder="Otomatis jika kosong" /></label><fieldset className="unit-choice"><legend>Satuan *</legend>   <div>{["pcs", "kg", "sak", "liter", "meter", "kodi", "manual"].map((unit) => <label key={unit}><input type="radio" name="product-unit" checked={newProduct.unit === unit} onChange={() => setNewProduct({ ...newProduct, unit })} />{unit === "manual" ? "Isi manual" : unit}</label>)}</div>{newProduct.unit === "manual" && <input required value={newProduct.manualUnit} onChange={(event) => setNewProduct({ ...newProduct, manualUnit: event.target.value })} placeholder="Contoh: dus" />}</fieldset><label>Kategori *<select required value={newProduct.categoryId} onChange={(event) => setNewProduct({ ...newProduct, categoryId: event.target.value })}><option value="">Pilih kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}<option value="new">+ Tambah kategori baru</option></select></label>{newProduct.categoryId === "new" && <div className="inline-create"><input value={newProduct.categoryName} onChange={(event) => setNewProduct({ ...newProduct, categoryName: event.target.value })} placeholder="Nama kategori baru" /><button type="button" className="management-secondary" onClick={() => void createCategory()}>Tambah</button></div>}<div className="form-row"><label>Mata uang *<select value={newProduct.currency} onChange={(event) => setNewProduct({ ...newProduct, currency: event.target.value })}><option value="IDR">Rp - Rupiah</option><option value="USD">$ - Dollar AS</option><option value="EUR">€ - Euro</option></select></label><label>Harga satuan *<input required min="0" type="number" value={newProduct.price} onChange={(event) => setNewProduct({ ...newProduct, price: event.target.value })} placeholder="0" /></label></div>{newProduct.currency !== "IDR" && <><label className="checkbox-line"><input type="checkbox" checked={newProduct.convertToRupiah} onChange={(event) => setNewProduct({ ...newProduct, convertToRupiah: event.target.checked })} /> Konversi ke Rupiah saat disimpan</label>{newProduct.convertToRupiah && <label>Kurs 1 {newProduct.currency} ke Rupiah *<input required min="0.01" step="0.01" type="number" value={newProduct.exchangeRate} onChange={(event) => setNewProduct({ ...newProduct, exchangeRate: event.target.value })} /></label>}</>}<div className="form-actions"><button type="button" className="modal-cancel" onClick={() => setProductDialogOpen(false)}>Batal</button><button type="button" className="primary-button" disabled={savingProduct} onClick={() => void createProduct()}>{savingProduct ? "Menyimpan..." : "Simpan produk"}</button></div></section></div>}
  </main>;
}
