import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SalesChart from "./SalesChart";
import DashboardPeriod from "./DashboardPeriod";
import { periodRange, type ReportPeriod } from "../periodRange";

const modules = [
  { href: "/kasir", icon: "▣", title: "Kasir", description: "Buat transaksi penjualan baru" },
  { href: "/produk", icon: "▦", title: "Produk", description: "Kelola katalog dan kategori" },
  { href: "/stok", icon: "◫", title: "Stok Barang", description: "Pantau stok masuk dan keluar" },
  { href: "/pembelian", icon: "⇩", title: "Pembelian", description: "Penerimaan dan retur supplier" },
  { href: "/kontak", icon: "◎", title: "Customer & Supplier", description: "Kelola data relasi toko" },
  { href: "/laporan", icon: "⌁", title: "Laporan", description: "Lihat performa penjualan" },
  { href: "/keuangan/bank", icon: "Rp", title: "Akun Uang Kas", description: "Kelola akun uang kas toko" },
  { href: "/pengaturan", icon: "⚙", title: "Pengaturan", description: "Atur toko dan operasional" },
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const operator = await getCurrentOperator();
  if (!operator) redirect("/login");
  const query = await searchParams;
  const period = (typeof query.period === "string" ? query.period : "today") as ReportPeriod;
  const month = Number(typeof query.month === "string" ? query.month : new Date().getMonth() + 1);
  const year = Number(typeof query.year === "string" ? query.year : new Date().getFullYear());
  const customFrom = typeof query.from === "string" ? query.from : new Date().toISOString().slice(0, 10);
  const customTo = typeof query.to === "string" ? query.to : customFrom;
  const selectedRange = periodRange(period, month, year, customFrom, customTo);
  const start = new Date(`${selectedRange.from}T00:00:00.000Z`);
  const end = new Date(`${selectedRange.to}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const today = new Date();
  const chartStart = new Date(start);
  const chartSales = await prisma.sale.findMany({
    where: { createdAt: { gte: chartStart, lt: end }, status: "COMPLETED" },
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
  const [sales, purchases, movements, operatorRows, transactions, soldRows, lowStock, products, unpaidPurchases, receivables, payables] = await Promise.all([
    prisma.sale.aggregate({ where: { createdAt: { gte: start, lt: end }, status: "COMPLETED" }, _sum: { total: true } }),
    prisma.purchase.aggregate({ where: { createdAt: { gte: start, lt: end }, status: "COMPLETED" }, _sum: { total: true } }),
    prisma.moneyMovement.groupBy({ by: ["type"], where: { createdAt: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.moneyMovement.groupBy({ by: ["operatorId"], where: { createdAt: { gte: start, lt: end } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.sale.count({ where: { createdAt: { gte: start, lt: end }, status: "COMPLETED" } }),
    prisma.saleItem.groupBy({ by: ["productId"], where: { sale: { createdAt: { gte: start, lt: end }, status: "COMPLETED" } }, _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 }),
    prisma.product.count({ where: { stock: { lte: 10 } } }),
    prisma.product.findMany({ select: { stock: true, costPrice: true } }),
    prisma.purchase.findMany({ where: { status: "COMPLETED", paymentStatus: { in: ["UNPAID", "PARTIAL"] } }, select: { total: true } }),
    prisma.receivable.findMany({ where: { status: "OPEN" }, select: { amount: true, paidAmount: true } }),
    prisma.payable.findMany({ where: { status: "OPEN" }, select: { amount: true, paidAmount: true } }),
  ]);
  const operators = await prisma.operator.findMany({ where: { id: { in: operatorRows.map((row) => row.operatorId) } }, select: { id: true, name: true } });
  const soldProducts = await prisma.product.findMany({ where: { id: { in: soldRows.map((row) => row.productId) } }, select: { id: true, name: true, sku: true } });
  const format = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
  const turnover = sales._sum.total ?? 0;
  const purchaseTotal = purchases._sum.total ?? 0;
  const income = movements.find((movement) => movement.type === "IN")?._sum.amount ?? 0;
  const expense = movements.find((movement) => movement.type === "OUT")?._sum.amount ?? 0;
  const profit = turnover - purchaseTotal;
  const netEstimate = profit + income - expense;
  const debt = unpaidPurchases.reduce((sum, purchase) => sum + purchase.total, 0) + payables.reduce((sum, item) => sum + item.amount - item.paidAmount, 0);
  const receivable = receivables.reduce((sum, item) => sum + item.amount - item.paidAmount, 0);
  const productValue = products.reduce((sum, product) => sum + product.stock * product.costPrice, 0);
  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">KASIR TOKO</p>
          <h1>Dashboard Utama</h1>
          <p className="dashboard-subtitle">Pusat kendali operasional toko Anda. Masuk sebagai {operator.name} ({operator.role}).</p>
        </div>
        <Link className="dashboard-primary" href="/kasir">Buka Kasir <span>→</span></Link>
      </header>
      <SalesChart initialPoints={chartDays} />
      <DashboardPeriod />
      <section className="dashboard-primary-table-wrap" aria-label="Ringkasan keuangan">
        <table className="dashboard-primary-table">
          <thead><tr><th>Omset</th><th>Laba</th><th>Pemasukan</th><th>Pengeluaran</th><th>Estimasi laba bersih</th></tr></thead>
          <tbody><tr><td><strong>{format(turnover)}</strong><small>{transactions ? "Penjualan selesai" : "Belum ada penjualan"}</small></td><td><strong>{format(profit)}</strong><small>Omset dikurangi pembelian</small></td><td><strong>{format(income)}</strong><small>Arus kas masuk</small></td><td><strong>{format(expense)}</strong><small>Arus kas keluar</small></td><td><strong>{format(netEstimate)}</strong><small>Laba + pemasukan - pengeluaran</small></td></tr></tbody>
        </table>
      </section>
      <section className="dashboard-stats dashboard-balance-stats">
        <article><span>Hutang</span><strong>{format(debt)}</strong><small>Sisa kewajiban toko</small></article>
        <article><span>Piutang</span><strong>{format(receivable)}</strong><small>Sisa tagihan customer</small></article>
        <article><span>Produk</span><strong>{format(productValue)}</strong><small>Total modal stok produk</small></article>
      </section>
      <section className="dashboard-detail-grid">
        <div className="dashboard-detail-card"><h2>Daftar transaksi operator</h2>{operatorRows.length ? operatorRows.map((row) => <div className="dashboard-detail-row" key={row.operatorId}><span>{operators.find((operator) => operator.id === row.operatorId)?.name || "Operator"}<small>{row._count._all} aktivitas arus kas</small></span><b>{format(row._sum.amount ?? 0)}</b></div>) : <p>Belum ada aktivitas operator.</p>}</div>
        <div className="dashboard-detail-card"><h2>Produk terjual</h2>{soldRows.length ? soldRows.map((row) => { const product = soldProducts.find((item) => item.id === row.productId); return <div className="dashboard-detail-row" key={row.productId}><span>{product?.name || "Produk" }<small>{product?.sku || ""}</small></span><b>{row._sum.quantity ?? 0} unit</b></div>; }) : <p>Belum ada produk terjual.</p>}</div>
      </section>
      <section className="module-section">
        <div className="module-heading"><div><h2>Modul Operasional</h2><p>Pilih modul untuk mulai mengelola toko.</p></div></div>
        <div className="module-grid">{modules.map((module) => <Link className="module-card" href={module.href} key={module.href}><span className="module-icon">{module.icon}</span><span><b>{module.title}</b><small>{module.description}</small></span><i>→</i></Link>)}</div>
      </section>
    </main>
  );
}
