"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Operator = { name: string; role: string };
type StoreSetting = { storeName: string };

const groups = [
  { label: "Navigasi", items: [
    { href: "/dashboard", icon: "⌂", label: "Dashboard" }, { href: "/", icon: "▣", label: "Kasir" },
    { href: "/#riwayat-penjualan", icon: "↗", label: "Riwayat Penjualan" }, { href: "/#detail-pembayaran", icon: "▤", label: "Detail Pembayaran" },
    { href: "/laporan#cetak-struk", icon: "▥", label: "Cetak Struk" },
  ] },
  { label: "Transaksi", items: [
    { href: "/pembelian", icon: "⇩", label: "Pembelian Baru" }, { href: "/pembelian#riwayat", icon: "◷", label: "Riwayat Pembelian" },
    { href: "/pembelian#retur", icon: "↪", label: "Retur Pembelian" }, { href: "/retur-penjualan", icon: "↩", label: "Retur Penjualan" },
  ] },
  { label: "Produk", items: [
    { href: "/produk", icon: "▦", label: "Data Produk" }, { href: "/produk#kategori", icon: "▧", label: "Kategori Produk" },
    { href: "/produk#edit", icon: "✎", label: "Edit Produk" }, { href: "/produk#level-harga", icon: "◇", label: "Level Harga" },
    { href: "/produk#diskon", icon: "%", label: "Diskon Produk" },
  ] },
  { label: "Inventori", items: [
    { href: "/stok", icon: "◫", label: "Data Stok" }, { href: "/stok#stok-masuk", icon: "⇧", label: "Stok Masuk" },
    { href: "/stok#stok-keluar", icon: "⇩", label: "Stok Keluar" }, { href: "/stok#penyesuaian", icon: "±", label: "Penyesuaian Stok" },
    { href: "/stok#riwayat", icon: "◷", label: "Riwayat Stok" }, { href: "/stok#menipis", icon: "!", label: "Stok Menipis" },
  ] },
  { label: "Kontak", items: [
    { href: "/kontak", icon: "◎", label: "Customer & Supplier" }, { href: "/kontak#customer", icon: "●", label: "Data Customer" },
    { href: "/kontak#supplier", icon: "◉", label: "Data Supplier" },
    { href: "/kontak#catatan", icon: "▱", label: "Catatan Kontak" },
  ] },
  { label: "Keuangan", items: [
    { href: "/keuangan", icon: "Rp", label: "Cashbox" }, { href: "/keuangan#bank", icon: "▤", label: "Akun Bank" },
    { href: "/keuangan#arus-kas", icon: "↕", label: "Arus Uang" }, { href: "/keuangan#pemasukan", icon: "+", label: "Pemasukan" },
    { href: "/keuangan#pengeluaran", icon: "−", label: "Pengeluaran" },
  ] },
  { label: "Laporan", items: [
    { href: "/laporan", icon: "▤", label: "Laporan" }, { href: "/laporan#penjualan", icon: "▥", label: "Laporan Penjualan" },
    { href: "/laporan#pembelian", icon: "▥", label: "Laporan Pembelian" }, { href: "/laporan#retur", icon: "↩", label: "Laporan Retur" },
    { href: "/laporan#terlaris", icon: "★", label: "Produk Terlaris" }, { href: "/laporan#arus-uang", icon: "↕", label: "Laporan Arus Uang" },
    { href: "/laporan#stok-menipis", icon: "!", label: "Laporan Stok Menipis" }, { href: "/saldo", icon: "◉", label: "Laporan Saldo" },
    { href: "/piutang", icon: "↗", label: "Piutang dari Customer" }, { href: "/hutang", icon: "↙", label: "Hutang kepada Supplier" },
  ] },
  { label: "Sistem", items: [
    { href: "/pengaturan#pajak", icon: "%", label: "Pengaturan Pajak" },
    { href: "/pengaturan#struk", icon: "▥", label: "Footer Struk" }, { href: "/pengaturan#operator", icon: "♙", label: "Operator & Akses" },
    { href: "/dashboard#bantuan", icon: "?", label: "Pusat Bantuan" },
  ] },
];

export default function BackofficeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [store, setStore] = useState<StoreSetting>({ storeName: "TaniBangun" });
  const [collapsed, setCollapsed] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const darkMode = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("kasir-toko-theme-change", onStoreChange);
      return () => window.removeEventListener("kasir-toko-theme-change", onStoreChange);
    },
    () => {
      const savedTheme = window.localStorage.getItem("kasir-toko-theme");
      return savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    },
    () => false,
  );
  const hash = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("hashchange", onStoreChange);
      return () => window.removeEventListener("hashchange", onStoreChange);
    },
    () => window.location.hash,
    () => "",
  );
  const sidebarRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const publicPage = pathname === "/login" || pathname === "/daftar" || pathname.startsWith("/struk/");

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  function toggleTheme() {
    window.localStorage.setItem("kasir-toko-theme", darkMode ? "light" : "dark");
    window.dispatchEvent(new Event("kasir-toko-theme-change"));
  }

  useEffect(() => {
    if (publicPage || collapsed) return;
    const timer = window.setTimeout(() => {
      const nav = navRef.current;
      const activeLink = activeLinkRef.current;
      if (!nav || !activeLink) return;
      const targetTop = activeLink.offsetTop - (nav.clientHeight / 2) + (activeLink.offsetHeight / 2);
      nav.scrollTop = Math.max(0, targetTop);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [pathname, hash, collapsed, publicPage]);

  useEffect(() => {
    if (publicPage) return;
    fetch("/api/auth/me").then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        setOperator(data.operator);
      }
    }).catch(() => undefined);
  }, [publicPage]);

  useEffect(() => {
    if (publicPage) return;
    fetch("/api/settings/store").then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        if (typeof data.storeName === "string" && data.storeName.trim()) setStore({ storeName: data.storeName.trim() });
      }
    }).catch(() => undefined);
  }, [publicPage]);

  useEffect(() => {
    if (publicPage) return;
    function minimizeAfterAction(event: MouseEvent) {
      if (sidebarRef.current?.contains(event.target as Node)) return;
      window.setTimeout(() => {
        setCollapsed(true);
        window.localStorage.setItem("tanibangun-sidebar-collapsed", "true");
      }, 0);
    }
    document.addEventListener("click", minimizeAfterAction);
    return () => document.removeEventListener("click", minimizeAfterAction);
  }, [publicPage]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function minimizeSidebar() {
    setUserMenuOpen(false);
    setCollapsed(true);
    window.localStorage.setItem("tanibangun-sidebar-collapsed", "true");
  }

  function handleBrandClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("tanibangun-sidebar-collapsed", String(next));
  }

  function isActive(href: string) {
    const [itemPath, itemHash] = href.split("#");
    const pathMatches = pathname === itemPath || (itemPath === "/" && pathname === "/");
    if (!pathMatches) return false;
    return itemHash ? hash === `#${itemHash}` : hash === "";
  }

  if (publicPage) return children;

  return (
    <div className={`backoffice-layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside ref={sidebarRef} className="backoffice-sidebar" aria-label="Sidebar navigasi">
        <Link className="backoffice-brand" href="/dashboard" onClick={handleBrandClick} title={collapsed ? "Buka sidebar" : "Tutup sidebar"}>
          <span className="backoffice-brand-mark" aria-hidden="true"><i>K</i><i>T</i></span>
          <span className="backoffice-brand-name"><b>{store.storeName}</b><small>KASIR TOKO</small></span>
        </Link>
        <button
          className="sidebar-toggle"
          type="button"
          aria-label={collapsed ? "Lebarkan sidebar" : "Minimalkan sidebar"}
          title={collapsed ? "Lebarkan sidebar" : "Minimalkan sidebar"}
          onClick={() => {
            const next = !collapsed;
            setCollapsed(next);
            window.localStorage.setItem("tanibangun-sidebar-collapsed", String(next));
          }}
        >
          <svg className="sidebar-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect className="sidebar-toggle-line" x="3" y="4" width="18" height="3" rx="1.5" />
            <rect className="sidebar-toggle-line" x="3" y="10.5" width="18" height="3" rx="1.5" />
            <rect className="sidebar-toggle-line" x="3" y="17" width="18" height="3" rx="1.5" />
          </svg>
        </button>
        <nav ref={navRef} className="backoffice-nav" aria-label="Menu aplikasi">
          {groups.map((group) => <div className="nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return <Link className={active ? "active" : ""} href={item.href} key={item.href} ref={active ? activeLinkRef : undefined} title={collapsed ? item.label : undefined} onClick={minimizeSidebar}><span>{item.icon}</span><b>{item.label}</b></Link>;
            })}
          </div>)}
        </nav>
        <div className="backoffice-footer">
          <Link className={isActive("/pengaturan") ? "active" : ""} href="/pengaturan" ref={isActive("/pengaturan") ? activeLinkRef : undefined} title={collapsed ? "Pengaturan" : undefined} onClick={minimizeSidebar}><span>⚙</span><b>Pengaturan</b></Link>
          <div className="backoffice-user-menu">
            <button
              className="backoffice-user"
              type="button"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              onClick={() => setUserMenuOpen((open) => !open)}
              title="Buka menu akun"
            >
              <div className="backoffice-avatar">{operator?.name?.slice(0, 2).toUpperCase() || "TB"}</div>
              <span><b>{operator?.name || "Operator"}</b><small>{operator?.role || "Memuat..."}</small></span>
            </button>
            {userMenuOpen && (
              <div className="backoffice-account-menu" role="menu">
                <button type="button" onClick={logout} role="menuitem"><span>↪</span>Keluar</button>
              </div>
            )}
          </div>
        </div>
      </aside>
      <section className="backoffice-content">
        <button className="theme-toggle theme-toggle-top" type="button" onClick={toggleTheme} title={darkMode ? "Gunakan tema terang" : "Gunakan tema gelap"} aria-label={darkMode ? "Gunakan tema terang" : "Gunakan tema gelap"}>
          <span aria-hidden="true">{darkMode ? "☀" : "☾"}</span>
        </button>
        {children}
      </section>
    </div>
  );
}
