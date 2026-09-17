import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SalesChart from "./SalesChart";

const modules = [
  { href: "/kasir", icon: "▣", title: "Kasir", description: "Buat transaksi penjualan baru" },
  { href: "/produk", icon: "▦", title: "Produk", description: "Kelola katalog dan kategori" },
  { href: "/stok", icon: "◫", title: "Stok Barang", description: "Pantau stok masuk dan keluar" },
  { href: "/pembelian", icon: "⇩", title: "Pembelian", description: "Penerimaan dan retur supplier" },
  { href: "/kontak", icon: "◎", title: "Customer & Supplier", description: "Kelola data relasi toko" },
  { href: "/laporan", icon: "⌁", title: "Laporan", description: "Lihat performa penjualan" },
  { href: "/keuangan", icon: "Rp", title: "Keuangan", description: "Kelola kasbox dan arus uang" },
  { href: "/pengaturan", icon: "⚙", title: "Pengaturan", description: "Atur toko dan operasional" },
];

export default async function DashboardPage() {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  const today = new Date();
  const start = new Date(today); start.setHours(0, 0, 0, 0);
  const chartStart = new Date(start); chartStart.setDate(chartStart.getDate() - 6);
  const chartSales = await prisma.sale.findMany({
    where: { createdAt: { gte: chartStart }, status: "COMPLETED" },
    select: { total: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const chartDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(chartStart);
    date.setDate(chartStart.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(date),
      dateLabel: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(date),
      total: chartSales.filter((sale) => sale.createdAt.toISOString().slice(0, 10) === key).reduce((sum, sale) => sum + sale.total, 0),
    };
  });
  const [sales, transactions, lowStock] = await Promise.all([
    prisma.sale.aggregate({ where: { createdAt: { gte: start }, status: "COMPLETED" }, _sum: { total: true } }),
    prisma.sale.count({ where: { createdAt: { gte: start }, status: "COMPLETED" } }),
    prisma.product.count({ where: { stock: { lte: 10 } } }),
  ]);
  const format = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">TANIBANGUN POS</p>
          <h1>Dashboard Utama</h1>
          <p className="dashboard-subtitle">Pusat kendali operasional toko Anda. Masuk sebagai {operator.name} ({operator.role}).</p>
        </div>
        <Link className="dashboard-primary" href="/kasir">Buka Kasir <span>→</span></Link>
      </header>
      <SalesChart initialPoints={chartDays} />
      <section className="dashboard-stats">
        <article><span>Penjualan hari ini</span><strong>{format(sales._sum.total ?? 0)}</strong><small>{transactions ? "Performa hari ini" : "Belum ada transaksi hari ini"}</small></article>
        <article><span>Transaksi hari ini</span><strong>{transactions}</strong><small>Transaksi selesai</small></article>
        <article><span>Stok menipis</span><strong>{lowStock}</strong><small>{lowStock ? "Perlu segera diperiksa" : "Semua stok terpantau"}</small></article>
      </section>
      <section className="module-section">
        <div className="module-heading"><div><h2>Modul Operasional</h2><p>Pilih modul untuk mulai mengelola toko.</p></div></div>
        <div className="module-grid">{modules.map((module) => <Link className="module-card" href={module.href} key={module.href}><span className="module-icon">{module.icon}</span><span><b>{module.title}</b><small>{module.description}</small></span><i>→</i></Link>)}</div>
      </section>
    </main>
  );
}
