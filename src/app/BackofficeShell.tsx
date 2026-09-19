"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Operator = { id: number; name: string; email?: string | null; username: string; role: string; avatarUrl?: string | null };
type Notification = { id: string; severity: "OVERDUE" | "DUE_SOON" | "WARNING"; title: string; description: string; href: string };
const groups = [
  { label: "Navigasi", items: [
    { href: "/dashboard", icon: "⌂", label: "Dashboard" }, { href: "/", icon: "▣", label: "Kasir" },
  ] },
  { label: "Transaksi", items: [
    { href: "/pembelian", icon: "⇩", label: "Pembelian Baru" },
    { href: "/pembelian/retur", icon: "↪", label: "Retur Pembelian" }, { href: "/retur-penjualan", icon: "↩", label: "Retur Penjualan" },
  ] },
  { label: "Produk", items: [
    { href: "/produk", icon: "▦", label: "Data Produk" }, { href: "/produk/kategori", icon: "▧", label: "Kategori Produk" },
    { href: "/produk/level-harga", icon: "◇", label: "Level Harga" }, { href: "/produk/diskon", icon: "%", label: "Diskon Produk" },
  ] },
  { label: "Inventori", items: [
    { href: "/stok", icon: "◫", label: "Data Stok" },
    { href: "/stok/riwayat", icon: "◷", label: "Riwayat Stok" }, { href: "/stok/menipis", icon: "!", label: "Stok Menipis" }, 
  ] },
  { label: "Kontak", items: [
    { href: "/kontak", icon: "◎", label: "Customer & Supplier" },
  ] },
  { label: "Keuangan", items: [
    { href: "/keuangan/bank", icon: "▤", label: "Akun Uang Kas" },
    { href: "/keuangan/pemasukan-pengeluaran", icon: "↕", label: "Pemasukan & Pengeluaran Kas" },
    { href: "/keuangan/arus-kas", icon: "◷", label: "Arus Kas" },
  ] },
  { label: "Laporan", items: [
    { href: "/laporan", icon: "▤", label: "Laporan Kas" }, { href: "/laporan/penjualan", icon: "▥", label: "Laporan Penjualan" },
    { href: "/laporan/pembelian", icon: "▥", label: "Laporan Pembelian" }, { href: "/laporan/retur", icon: "↩", label: "Laporan Retur" },
    { href: "/laporan/produk-terlaris", icon: "★", label: "Produk Terlaris" },
    { href: "/piutang", icon: "↗", label: "Piutang dari Customer" }, { href: "/hutang", icon: "↙", label: "Hutang kepada Supplier" },
  ] },
  { label: "Sistem", items: [
    { href: "/operator", icon: "♙", label: "Operator & Akses" },
    { href: "/bantuan", icon: "?", label: "Bantuan" },
  ] },
];

function shortMenuLabel(label: string) {
  const firstWord = label.split(/\s+/)[0];
  return firstWord.replace(/[&%]/g, "");
}

export default function BackofficeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
  const globalHeaderRef = useRef<HTMLElement>(null  );
  const pinned = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("tanibangun-sidebar-pin-change", onStoreChange);
      return () => window.removeEventListener("tanibangun-sidebar-pin-change", onStoreChange);
    },
    () => window.localStorage.getItem("tanibangun-sidebar-pinned") === "true",
    () => false,
  );
  const sidebarIsCollapsed = collapsed && !pinned;
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
    if (publicPage || sidebarIsCollapsed) return;
    const timer = window.setTimeout(() => {
      const nav = navRef.current;
      const activeLink = activeLinkRef.current;
      if (!nav || !activeLink) return;
      const targetTop = activeLink.offsetTop - (nav.clientHeight / 2) + (activeLink.offsetHeight / 2);
      nav.scrollTop = Math.max(0, targetTop);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [pathname, hash, sidebarIsCollapsed, publicPage]);

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
    const loadNotifications = () => fetch("/api/notifications").then(async (response) => {
      if (response.ok) setNotifications((await response.json()).notifications || []);
    }).catch(() => undefined);
    void loadNotifications();
    const timer = window.setInterval(loadNotifications, 60_000);
    window.addEventListener("inventory-change", loadNotifications);
    window.addEventListener("focus", loadNotifications);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("inventory-change", loadNotifications);
      window.removeEventListener("focus", loadNotifications);
    };
  }, [publicPage]);

  useEffect(() => {
    function refreshOperator() {
      fetch("/api/auth/me").then(async (response) => {
        if (response.ok) setOperator((await response.json()).operator);
      }).catch(() => undefined);
    }
    window.addEventListener("kasir-toko-profile-change", refreshOperator);
    return () => window.removeEventListener("kasir-toko-profile-change", refreshOperator);
  }, []);

  useEffect(() => {
    if (publicPage) return;
    function minimizeAfterAction(event: MouseEvent) {
      if (pinned) return;
      if (globalHeaderRef.current?.contains(event.target as Node)) return;
      if (sidebarRef.current?.contains(event.target as Node)) return;
      window.setTimeout(() => {
        setCollapsed(true);
        window.localStorage.setItem("tanibangun-sidebar-collapsed", "true");
      }, 0);
    }
    document.addEventListener("click", minimizeAfterAction);
    return () => document.removeEventListener("click", minimizeAfterAction);
  }, [publicPage, pinned]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function changeAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 1_500_000) {
      window.alert("Pilih foto JPG, PNG, atau WebP maksimal 1,5 MB.");
      return;
    }
    const avatarUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error());
      reader.onerror = () => reject(new Error());
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (!avatarUrl) return;
    setAvatarSaving(true);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Foto profil gagal disimpan.");
      setOperator(data.operator);
      window.dispatchEvent(new Event("kasir-toko-profile-change"));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Foto profil gagal disimpan.");
    } finally {
      setAvatarSaving(false);
    }
  }

  function minimizeSidebar() {
    setUserMenuOpen(false);
    if (pinned) return;
    setCollapsed(true);
    window.localStorage.setItem("tanibangun-sidebar-collapsed", "true");
  }

  function closeSidebarAfterBrandClick() {
    setUserMenuOpen(false);
    if (pinned) return;
    setCollapsed(true);
    window.localStorage.setItem("tanibangun-sidebar-collapsed", "true");
  }

  function openSidebarFromBrandClick() {
    setUserMenuOpen(false);
    if (pinned) return;
    setCollapsed(false);
    window.localStorage.setItem("tanibangun-sidebar-collapsed", "false");
  }

  function togglePinned() {
    const next = !pinned;
    window.localStorage.setItem("tanibangun-sidebar-pinned", String(next));
    window.dispatchEvent(new Event("tanibangun-sidebar-pin-change"));
    if (next) {
      setCollapsed(false);
      window.localStorage.setItem("tanibangun-sidebar-collapsed", "false");
    } else {
      setCollapsed(true);
      window.localStorage.setItem("tanibangun-sidebar-collapsed", "true");
    }
  }

  function isActive(href: string) {
    const [itemPath, itemHash] = href.split("#");
    const pathMatches = pathname === itemPath || (itemPath === "/" && pathname === "/");
    if (!pathMatches) return false;
    return itemHash ? hash === `#${itemHash}` : hash === "";
  }

  if (publicPage) return children;

  return (
    <div className={`backoffice-layout ${sidebarIsCollapsed ? "sidebar-collapsed" : ""} ${pinned ? "sidebar-pinned" : ""}`}>
      <header ref={globalHeaderRef} className="backoffice-global-header">
        <button
          className="sidebar-toggle"
          type="button"
          aria-label={sidebarIsCollapsed ? "Lebarkan sidebar" : "Minimalkan sidebar"}
          title={sidebarIsCollapsed ? "Lebarkan sidebar" : "Minimalkan sidebar"}
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
        <Link className="backoffice-brand" href="/dashboard" onClick={openSidebarFromBrandClick} title="Dashboard">
          <span className="backoffice-brand-mark" aria-hidden="true"><i>K</i><i>T</i></span>
          <span className="backoffice-brand-name"><b>Kasir Toko</b></span>
        </Link>
        {pinned && (
          <button className="sidebar-pin active" type="button" onClick={togglePinned} aria-label="Lepas pin sidebar" title="Lepas pin sidebar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 3 6.5 6.5-2.2 2.2-1.8-1.8-3.7 3.7 1.8 1.8-2.2 2.2-6.5-6.5 2.2-2.2 1.8 1.8 3.7-3.7-1.8-1.8L14.5 3Z" /><path d="m10.8 13.2-7.3 7.3M3.5 20.5l3 .1" /></svg>
          </button>
        )}
        <div className="notification-wrap">
        <button className="header-notification" type="button" aria-label="Notifikasi" title="Notifikasi" onClick={() => setNotificationsOpen((open) => !open)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
          </svg>
          {notifications.length > 0 && <span className="notification-count">{notifications.length > 99 ? "99+" : notifications.length}</span>}
        </button>
        {notificationsOpen && <div className="notification-panel" role="dialog" aria-label="Daftar notifikasi"><div className="notification-panel-header"><b>Notifikasi</b><small>Jatuh tempo ≤ 7 hari</small></div>{notifications.length ? notifications.map((notification) => <Link href={notification.href} className={`notification-item notification-${notification.severity.toLowerCase()}`} key={notification.id} onClick={() => setNotificationsOpen(false)}><span className="notification-dot" /><span><b>{notification.title}</b><small>{notification.description}</small></span></Link>) : <p className="notification-empty">Tidak ada peringatan saat ini.</p>}</div>}
        </div>
        <button className="theme-toggle theme-toggle-header" type="button" onClick={toggleTheme} title={darkMode ? "Gunakan tema terang" : "Gunakan tema gelap"} aria-label={darkMode ? "Gunakan tema terang" : "Gunakan tema gelap"}>
          <span aria-hidden="true">{darkMode ? "☀" : "☾"}</span>
        </button>
        <div className="backoffice-header-account">
          <button className="backoffice-user" type="button" aria-expanded={userMenuOpen} aria-haspopup="menu" onClick={() => setUserMenuOpen((open) => !open)} title="Buka menu akun">
            <div className="backoffice-avatar">{operator?.avatarUrl ? <img src={operator.avatarUrl} alt="" referrerPolicy="no-referrer" /> : (operator?.name?.slice(0, 2).toUpperCase() || "TB")}</div>
            <span><b>{operator?.name || "Operator"}</b><small>{operator?.role || "Memuat..."}</small></span>
          </button>
          {userMenuOpen && <div className="backoffice-account-menu" role="menu">
            <button type="button" onClick={() => { setProfileOpen(true); setUserMenuOpen(false); }} role="menuitem"><span>◉</span>Profil Saya</button>
            <button type="button" onClick={() => { setLogoutConfirmOpen(true); setUserMenuOpen(false); }} role="menuitem"><span>↪</span>Keluar</button>
          </div>}
        </div>
      </header>
      <div className="backoffice-body">
        <aside ref={sidebarRef} className="backoffice-sidebar" aria-label="Sidebar navigasi">
          <div className={`backoffice-sidebar-header ${pinned ? "sidebar-header-pinned" : ""}`}>
          <button
            className="sidebar-toggle"
            type="button"
            aria-label={sidebarIsCollapsed ? "Lebarkan sidebar" : "Minimalkan sidebar"}
            title={sidebarIsCollapsed ? "Lebarkan sidebar" : "Minimalkan sidebar"}
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
          <Link className="backoffice-brand" href="/dashboard" onClick={closeSidebarAfterBrandClick} title="Dashboard">
            <span className="backoffice-brand-mark" aria-hidden="true"><i>K</i><i>T</i></span>
            <span className="backoffice-brand-name"><b>Kasir Toko</b></span>
          </Link>
          <button className={`sidebar-pin ${pinned ? "active" : ""}`} type="button" onClick={togglePinned} aria-label={pinned ? "Lepas pin sidebar" : "Pin sidebar"} title={pinned ? "Lepas pin sidebar" : "Pin sidebar"}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 3 6.5 6.5-2.2 2.2-1.8-1.8-3.7 3.7 1.8 1.8-2.2 2.2-6.5-6.5 2.2-2.2 1.8 1.8 3.7-3.7-1.8-1.8L14.5 3Z" /><path d="m10.8 13.2-7.3 7.3M3.5 20.5l3 .1" /></svg>
          </button>
            </div>
            <nav ref={navRef} className="backoffice-nav" aria-label="Menu aplikasi">
          {groups.map((group) => <div className="nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return <Link className={active ? "active" : ""} href={item.href} key={item.href} ref={active ? activeLinkRef : undefined} title={sidebarIsCollapsed ? item.label : undefined} onClick={minimizeSidebar}><span>{item.icon}</span><b><em>{shortMenuLabel(item.label)}</em><i>{item.label}</i></b></Link>;
            })}
          </div>)}
          </nav>
          <div className="backoffice-footer">
          <Link className={isActive("/pengaturan") ? "active" : ""} href="/pengaturan" ref={isActive("/pengaturan") ? activeLinkRef : undefined} title={sidebarIsCollapsed ? "Setting" : undefined} onClick={minimizeSidebar}><span>⚙</span><b><em>Setting</em><i>Setting</i></b></Link>
          </div>
        </aside>
        <section className="backoffice-content">
          {children}
        </section>
        {profileOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileOpen(false); }}>
          <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
            <div className="modal-heading"><div><p className="eyebrow">AKUN OPERATOR</p><h2 id="profile-title">Profil Saya</h2></div><button className="modal-close" type="button" onClick={() => setProfileOpen(false)} aria-label="Tutup">×</button></div>
            <div className="profile-modal-body">
              <div className="profile-avatar">{operator?.avatarUrl ? <img src={operator.avatarUrl} alt="" referrerPolicy="no-referrer" /> : (operator?.name?.slice(0, 2).toUpperCase() || "TB")}</div>
              <div><h3>{operator?.name || "Operator"}</h3><p>Email / username: {operator?.email || operator?.username || "—"}</p><p>Peran: <b>{operator?.role || "—"}</b></p><label className="profile-upload">{avatarSaving ? "Menyimpan..." : "Ganti foto profil"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={changeAvatar} disabled={avatarSaving} /></label><small>JPG, PNG, atau WebP maksimal 1,5 MB.</small></div>
            </div>
          </section>
        </div>}
        {logoutConfirmOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setLogoutConfirmOpen(false); }}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title"><div className="modal-heading"><h2 id="logout-title">Keluar dari akun?</h2><button className="modal-close" type="button" onClick={() => setLogoutConfirmOpen(false)} aria-label="Tutup">×</button></div><p>Anda akan keluar dari sesi Kasir Toko.</p><div className="form-actions"><button className="modal-cancel" type="button" onClick={() => setLogoutConfirmOpen(false)}>Batal</button><button className="primary-button" type="button" onClick={logout}>Keluar</button></div></section>
        </div>}
      </div>
    </div>
  );
}
