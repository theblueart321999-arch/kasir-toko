import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function dates(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from") || new Date().toISOString().slice(0, 10);
  const to = request.nextUrl.searchParams.get("to") || from;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) throw new Error("Rentang tanggal tidak valid");
  return { from: new Date(`${from}T00:00:00.000Z`), to: new Date(`${to}T00:00:00.000Z`), toExclusive: new Date(`${to}T00:00:00.000Z`).getTime() + 86400000 };
}

export async function GET(request: NextRequest) {
  if (!(await getCurrentOperator())) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  let range: ReturnType<typeof dates>;
  try { range = dates(request); } catch { return NextResponse.json({ error: "Format tanggal harus YYYY-MM-DD dan from <= to" }, { status: 400 }); }
  const where = { gte: range.from, lt: new Date(range.toExclusive) };
  try {
    const [sales, purchases, saleReturns, purchaseReturns, movements, lowStock, paymentBreakdown, purchasePaymentBreakdown, topProducts, saleRows, purchaseRows, movementRows] = await Promise.all([
      prisma.sale.aggregate({ where: { createdAt: where, status: "COMPLETED" }, _sum: { total: true }, _count: { _all: true } }),
      prisma.purchase.aggregate({ where: { createdAt: where, status: "COMPLETED" }, _sum: { total: true }, _count: { _all: true } }),
      prisma.saleReturn.aggregate({ where: { createdAt: where, status: "COMPLETED" }, _sum: { total: true }, _count: { _all: true } }),
      prisma.purchaseReturn.aggregate({ where: { createdAt: where, status: "COMPLETED" }, _sum: { total: true }, _count: { _all: true } }),
      prisma.moneyMovement.groupBy({ by: ["type"], where: { createdAt: where }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.product.findMany({ where: { stock: { lte: 10 } }, orderBy: { stock: "asc" }, take: 10, select: { id: true, sku: true, name: true, stock: true, unit: true } }),
      prisma.sale.groupBy({ by: ["paymentMethod"], where: { createdAt: where, status: "COMPLETED" }, _sum: { total: true }, _count: { _all: true } }),
      prisma.purchase.groupBy({ by: ["paymentStatus"], where: { createdAt: where, status: "COMPLETED" }, _sum: { total: true }, _count: { _all: true } }),
      prisma.saleItem.groupBy({ by: ["productId"], where: { sale: { createdAt: where, status: "COMPLETED" } }, _sum: { quantity: true, total: true }, orderBy: { _sum: { total: "desc" } }, take: 5 }),
      prisma.sale.findMany({ where: { createdAt: where, status: "COMPLETED" }, select: { total: true, createdAt: true, customer: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
      prisma.purchase.findMany({ where: { createdAt: where, status: "COMPLETED" }, select: { total: true, createdAt: true, supplier: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
      prisma.moneyMovement.findMany({ where: { createdAt: where }, select: { type: true, amount: true, operator: { select: { name: true } } } }),
    ]);
    const products = await prisma.product.findMany({ where: { id: { in: topProducts.map((p) => p.productId) } }, select: { id: true, name: true, sku: true } });
    const byDate = (rows: { createdAt: Date; total: number }[]) => {
      const result = new Map<string, number>();
      rows.forEach((row) => { const key = row.createdAt.toISOString().slice(0, 10); result.set(key, (result.get(key) ?? 0) + row.total); });
      return [...result].map(([date, total]) => ({ date, total }));
    };
    const ranking = (rows: { total: number; customer?: { name: string } | null; supplier?: { name: string } | null }[], key: "customer" | "supplier") => {
      const result = new Map<string, number>();
      rows.forEach((row) => { const name = row[key]?.name || "Umum"; result.set(name, (result.get(name) ?? 0) + row.total); });
      return [...result].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 10);
    };
    const income = movements.find((item) => item.type === "IN")?._sum.amount ?? 0;
    const expense = movements.find((item) => item.type === "OUT")?._sum.amount ?? 0;
    const operatorMap = new Map<string, number>();
    movementRows.forEach((row) => operatorMap.set(row.operator.name, (operatorMap.get(row.operator.name) ?? 0) + (row.type === "OUT" ? -row.amount : row.amount)));
    return NextResponse.json({ range: { from: request.nextUrl.searchParams.get("from"), to: request.nextUrl.searchParams.get("to") }, sales: { total: sales._sum.total ?? 0, count: sales._count._all }, purchases: { total: purchases._sum.total ?? 0, count: purchases._count._all }, returns: { sales: saleReturns._sum.total ?? 0, salesCount: saleReturns._count._all, purchases: purchaseReturns._sum.total ?? 0, purchasesCount: purchaseReturns._count._all }, movements: movements.map((m) => ({ type: m.type, total: m._sum.amount ?? 0, count: m._count._all })), financial: { income, expense, estimatedProfit: (sales._sum.total ?? 0) - (purchases._sum.total ?? 0) }, operatorRanking: [...operatorMap].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total), salesByDate: byDate(saleRows), purchasesByDate: byDate(purchaseRows), customerRanking: ranking(saleRows, "customer"), supplierRanking: ranking(purchaseRows, "supplier"), paymentBreakdown, purchasePaymentBreakdown, topProducts: topProducts.map((item) => ({ ...item, product: products.find((p) => p.id === item.productId) })), lowStock });
  } catch { return NextResponse.json({ error: "Ringkasan laporan gagal diambil" }, { status: 503 }); }
}
