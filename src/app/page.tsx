"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Category = "Semua" | "Bangunan" | "Pertanian";

type Product = {
  id: number;
  name: string;
  sku: string;
  category: Exclude<Category, "Semua">;
  price: number;
  discountPercent?: number;
  stock: number;
  unit: string;
  color: string;
  icon: string;
};

type ProductEditForm = { name: string; sku: string; price: string; stock: string; unit: string };

const fallbackProducts: Product[] = [
  { id: 1, name: "Semen Tiga Roda 40kg", sku: "SMN-001", category: "Bangunan", price: 68_000, stock: 24, unit: "sak", color: "sand", icon: "▰" },
  { id: 2, name: "Besi Beton 10mm", sku: "BSI-010", category: "Bangunan", price: 89_000, stock: 18, unit: "batang", color: "steel", icon: "╱" },
  { id: 3, name: "Cat Tembok Putih 5kg", sku: "CAT-005", category: "Bangunan", price: 145_000, stock: 9, unit: "kaleng", color: "paint", icon: "●" },
  { id: 4, name: "Pupuk NPK Mutiara 1kg", sku: "PPK-101", category: "Pertanian", price: 28_500, stock: 32, unit: "bungkus", color: "leaf", icon: "✦" },
  { id: 5, name: "Cangkul Baja Premium", sku: "ALP-201", category: "Pertanian", price: 115_000, stock: 7, unit: "pcs", color: "tool", icon: "⌁" },
  { id: 6, name: "Selang Air 1/2 inch", sku: "SLG-012", category: "Pertanian", price: 12_000, stock: 46, unit: "meter", color: "water", icon: "≈" },
  { id: 7, name: "Batu Bata Merah", sku: "BBT-001", category: "Bangunan", price: 1_200, stock: 580, unit: "pcs", color: "brick", icon: "▦" },
  { id: 8, name: "Benih Jagung Hibrida", sku: "BNH-301", category: "Pertanian", price: 42_000, stock: 15, unit: "bungkus", color: "seed", icon: "⌁" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

type ApiProduct = Omit<Product, "category" | "color" | "icon"> & { category: "BANGUNAN" | "PERTANIAN" };

function normalizeProducts(data: ApiProduct[]): Product[] {
  return data.map((product, index) => ({
    ...product,
    category: product.category === "BANGUNAN" ? "Bangunan" : "Pertanian",
    color: fallbackProducts[index % fallbackProducts.length].color,
    icon: fallbackProducts[index % fallbackProducts.length].icon,
  }));
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [category, setCategory] = useState<Category>("Semua");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [payment, setPayment] = useState("Tunai");
  const [notice, setNotice] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [taxRate, setTaxRate] = useState(11);
  const [receiptId, setReceiptId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductEditForm | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/products")
      .then(async (response) => {
        if (!response.ok) throw new Error("Database belum tersedia");
        return normalizeProducts((await response.json()) as ApiProduct[]);
      })
      .then((data) => {
        if (active && data.length) setProducts(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory = category === "Semua" || product.category === category;
        const matchesQuery = `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase());
        return matchesCategory && matchesQuery;
      }),
    [category, products, query],
  );

  const cartItems = products.filter((product) => cart[product.id]);
  const subtotal = cartItems.reduce((total, product) => total + Math.round(product.price * (1 - (product.discountPercent || 0) / 100)) * cart[product.id], 0);
  const tax = Math.round(subtotal * taxRate / 100);
  const total = subtotal + tax;
  const itemCount = Object.values(cart).reduce((sum, count) => sum + count, 0);
  const received = Number(cashReceived) || 0;
  const change = Math.max(0, received - total);

  function addToCart(product: Product) {
    setCart((current) => ({ ...current, [product.id]: (current[product.id] || 0) + 1 }));
    setNotice(`${product.name} ditambahkan`);
    window.setTimeout(() => setNotice(""), 1800);
  }

  function openProductEdit(product: Product) {
    setEditingProduct(product);
    setEditForm({ name: product.name, sku: product.sku, price: product.price.toString(), stock: product.stock.toString(), unit: product.unit });
  }

  async function saveProductEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProduct || !editForm) return;
    setSavingProduct(true);
    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          price: Number(editForm.price),
          stock: Number(editForm.stock),
          category: editingProduct.category === "Bangunan" ? "BANGUNAN" : "PERTANIAN",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Produk gagal diperbarui");
      const updated = normalizeProducts([result as ApiProduct])[0];
      setProducts((current) => current.map((product) => product.id === updated.id ? { ...product, ...updated } : product));
      setEditingProduct(null);
      setEditForm(null);
      setNotice("Produk berhasil diperbarui");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Produk gagal diperbarui");
    } finally {
      setSavingProduct(false);
      window.setTimeout(() => setNotice(""), 3000);
    }
  }

  function changeQuantity(id: number, delta: number) {
    if (delta < 0 && cart[id] && cart[id] + delta <= 0 && Object.keys(cart).length === 1) {
      setShowCart(false);
    }
    setCart((current) => {
      const next = Math.max(0, (current[id] || 0) + delta);
      const updated = { ...current };
      if (next === 0) delete updated[id];
      else updated[id] = next;
      return updated;
    });
    fetch("/api/settings/store").then((response) => response.ok ? response.json() : null).then((data) => { if (data && typeof data.taxRate === "number") setTaxRate(data.taxRate); }).catch(() => undefined);
  }

  function clearCart() {
    setCart({});
    setShowCart(false);
  }

  async function completeSale() {
    if (!itemCount) return;
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: payment.toUpperCase(),
          items: cartItems.map((product) => ({ productId: product.id, quantity: cart[product.id] })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || (response.status === 503
          ? "Database belum terhubung. Jalankan PostgreSQL lalu coba lagi."
          : "Transaksi gagal disimpan"));
      }
      setNotice(`Transaksi ${formatCurrency(total)} berhasil disimpan`);
      if (typeof result.id === "number") setReceiptId(result.id);
      setCart({});
      setShowCart(false);
      setShowPaymentDetails(false);
      setCashReceived("");
      const refreshed = await fetch("/api/products");
      if (refreshed.ok) {
        const data = normalizeProducts((await refreshed.json()) as ApiProduct[]);
        if (data.length) setProducts(data);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Transaksi gagal disimpan");
    } finally {
      window.setTimeout(() => setNotice(""), 3000);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace" id="kasir">
        <header className="topbar">
          <div><p className="eyebrow">RABU, 16 SEPTEMBER 2026</p><h1>Selamat datang, Andi <span>✦</span></h1></div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifikasi" title="Notifikasi">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg><i />
            </button>
          </div>
        </header>
        <div className="content-grid">
          <section className="catalog">
            <div className="section-heading"><div><h2>Mulai Transaksi</h2><p>Pilih produk untuk ditambahkan ke keranjang</p></div><button className="scan-button">⌁ &nbsp; Scan Barcode</button></div>
            <div className="toolbar">
              <div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama produk atau SKU..." /><kbd>⌘ K</kbd></div>
              <div className="categories">{(["Semua", "Bangunan", "Pertanian"] as Category[]).map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
            </div>
            <div className="product-grid">
              {visibleProducts.map((product) => <article className="product-card" key={product.id} onClick={() => addToCart(product)}>
                <div className={`product-illustration ${product.color}`}>
                  <button className="product-edit-button" aria-label={`Edit ${product.name}`} onClick={(event) => { event.stopPropagation(); openProductEdit(product); }}>Edit</button>
                  <span>{product.icon}</span><em>{product.category}</em>
                </div>
                <div className="product-info"><div><h3>{product.name}</h3><p>{product.sku} · Stok {product.stock} {product.unit}</p></div><strong>{formatCurrency(product.price)}</strong></div>
                <button className="add-button" onClick={(event) => { event.stopPropagation(); addToCart(product); }}>+ Tambah</button>
              </article>)}
            </div>
            {!visibleProducts.length && <div className="empty-state">Produk tidak ditemukan. Coba kata kunci lain.</div>}
          </section>

          <aside className={`cart-panel ${showCart ? "cart-panel-open" : ""}`}>
            <div className="cart-heading">
              <div><h2>Keranjang</h2><p>{itemCount} item dalam transaksi</p></div>
              <div className="cart-heading-actions">
                <button className="clear-button" disabled={!itemCount} onClick={clearCart}><span aria-hidden="true">⌫</span> Kosongkan</button>
                <button className="close-cart" aria-label="Tutup keranjang" title="Tutup keranjang" onClick={() => setShowCart(false)}>×</button>
              </div>
            </div>
            <div className="cart-items">
              {cartItems.length ? cartItems.map((product) => <div className="cart-item" key={product.id}>
                <div className={`mini-icon ${product.color}`}>{product.icon}</div><div className="cart-item-main"><b>{product.name}</b><span>{formatCurrency(product.price)} / {product.unit}</span><div className="quantity"><button onClick={() => changeQuantity(product.id, -1)}>−</button><b>{cart[product.id]}</b><button onClick={() => changeQuantity(product.id, 1)}>+</button></div></div><strong>{formatCurrency(product.price * cart[product.id])}</strong><button className="remove-cart-item" aria-label={`Hapus ${product.name}`} title={`Hapus ${product.name}`} onClick={() => changeQuantity(product.id, -cart[product.id])}>×</button>
              </div>) : <div className="cart-empty"><span>⌑</span><b>Keranjang masih kosong</b><p>Pilih produk untuk memulai transaksi</p></div>}
            </div>
            <div className="summary"><div><span>Subtotal</span><b>{formatCurrency(subtotal)}</b></div><div><span>Pajak ({taxRate}%)</span><b>{formatCurrency(tax)}</b></div><div className="total-row"><span>Total</span><strong>{formatCurrency(total)}</strong></div></div>
            <button
              className="pay-button"
              disabled={!itemCount}
              onClick={() => {
                setShowCart(false);
                setShowPaymentDetails(true);
              }}
            >
              Bayar Sekarang <span>→</span>
            </button>
          </aside>
        </div>
      </section>
      {showCart && <button className="cart-backdrop" aria-label="Tutup pembayaran" onClick={() => setShowCart(false)} />}
      {showPaymentDetails && <div className="payment-detail-backdrop">
        <section className="payment-detail-page" aria-label="Detail pembayaran">
          <header className="payment-detail-header"><button aria-label="Kembali ke keranjang" onClick={() => setShowPaymentDetails(false)}>←</button><div><p className="eyebrow">KONFIRMASI TRANSAKSI</p><h2>Detail Pembayaran</h2></div><button aria-label="Tutup detail pembayaran" onClick={() => setShowPaymentDetails(false)}>×</button></header>
          <div className="payment-detail-content">
            <div className="payment-order-card"><div><span>Ringkasan pesanan</span><b>{itemCount} item</b></div>{cartItems.map((product) => <div className="payment-order-line" key={product.id}><span>{product.name} <small>× {cart[product.id]}</small></span><b>{formatCurrency(Math.round(product.price * (1 - (product.discountPercent || 0) / 100)) * cart[product.id])}</b></div>)}<div className="payment-total-line"><span>Total pembayaran</span><strong>{formatCurrency(total)}</strong></div></div>
            <div className="payment-choice-card"><h3>Pilih metode pembayaran</h3><p>Metode pembayaran akan digunakan untuk transaksi ini.</p><div className="payment-method payment-method-floating">{["Tunai", "QRIS", "Debit"].map((method) => <button key={method} className={payment === method ? "active" : ""} onClick={() => setPayment(method)}><span>{method === "Tunai" ? "◉" : method === "QRIS" ? "▦" : "▤"}</span><b>{method}</b><small>{method === "Tunai" ? "Bayar di kasir" : method === "QRIS" ? "Scan kode QR" : "Kartu debit"}</small></button>)}</div>
              {payment === "Tunai" && <div className="cash-form"><label>Uang diterima<input inputMode="numeric" value={cashReceived} onChange={(event) => setCashReceived(event.target.value.replace(/\D/g, ""))} placeholder="Masukkan nominal uang" /></label><div className="cash-change"><span>Kembalian</span><strong className={received < total ? "not-enough" : ""}>{received >= total ? formatCurrency(change) : "Uang belum cukup"}</strong></div></div>}
              {payment === "QRIS" && <div className="payment-instruction"><span>▦</span><div><b>QRIS siap digunakan</b><p>Tampilkan kode QR saat konfirmasi pembayaran.</p></div></div>}
              {payment === "Debit" && <div className="payment-instruction"><span>▤</span><div><b>Mesin EDC</b><p>Pastikan pembayaran kartu berhasil sebelum konfirmasi.</p></div></div>}
            </div>
          </div>
          <div className="payment-confirm-bar"><div><span>Total yang harus dibayar</span><strong>{formatCurrency(total)}</strong></div><button disabled={payment === "Tunai" && received < total} onClick={completeSale}>Konfirmasi Pembayaran <span>→</span></button></div>
        </section>
      </div>}
      <button className={`floating-cart ${itemCount ? "has-items" : ""}`} aria-label="Buka keranjang" onClick={() => setShowCart(true)}>
        <span className="cart-icon">🛒</span>
        {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
        <span className="floating-cart-label">{itemCount ? `${formatCurrency(total)}` : "Keranjang"}</span>
        <span className="floating-cart-arrow">→</span>
      </button>
      {editingProduct && editForm && <div className="modal-backdrop">
        <form className="product-form" onSubmit={saveProductEdit}>
          <div className="modal-heading"><div><p className="eyebrow">EDIT PRODUK</p><h2>{editingProduct.name}</h2></div><button type="button" className="modal-close" aria-label="Tutup edit produk" onClick={() => { setEditingProduct(null); setEditForm(null); }}>×</button></div>
          <label>Nama produk<input required value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label>
          <div className="form-row"><label>SKU<input required value={editForm.sku} onChange={(event) => setEditForm({ ...editForm, sku: event.target.value.toUpperCase() })} /></label><label>Satuan<input required value={editForm.unit} onChange={(event) => setEditForm({ ...editForm, unit: event.target.value })} /></label></div>
          <div className="form-row"><label>Harga jual (Rp)<input required min="0" type="number" value={editForm.price} onChange={(event) => setEditForm({ ...editForm, price: event.target.value })} /></label><label>Stok<input required min="0" type="number" value={editForm.stock} onChange={(event) => setEditForm({ ...editForm, stock: event.target.value })} /></label></div>
          <div className="form-actions"><button type="button" className="modal-cancel" onClick={() => { setEditingProduct(null); setEditForm(null); }}>Batal</button><button className="management-primary" disabled={savingProduct}>{savingProduct ? "Menyimpan..." : "Simpan perubahan"}</button></div>
        </form>
      </div>}
      {notice && <div className="toast">✓ &nbsp; {notice}{receiptId && <a href={`/struk/${receiptId}`} target="_blank" rel="noreferrer"> Cetak struk</a>}</div>}
    </main>
  );
}
