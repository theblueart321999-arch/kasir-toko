import { NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const dueSoonDays = 7;

export async function GET() {
  if (!(await getCurrentOperator())) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  try {
    const now = new Date();
    const soon = new Date(now);
    soon.setDate(soon.getDate() + dueSoonDays);
    const [products, payables, receivables] = await Promise.all([
      prisma.product.findMany({ where: { stock: { lte: 10 } }, select: { id: true, name: true, stock: true, unit: true }, orderBy: { stock: "asc" }, take: 20 }),
      prisma.payable.findMany({ where: { status: "OPEN" }, select: { id: true, supplierName: true, amount: true, paidAmount: true, dueDate: true, reference: true }, orderBy: { dueDate: "asc" }, take: 50 }),
      prisma.receivable.findMany({ where: { status: "OPEN" }, select: { id: true, customerName: true, amount: true, paidAmount: true, dueDate: true, reference: true }, orderBy: { dueDate: "asc" }, take: 50 }),
    ]);
    const notifications = [
      ...products.map((product) => ({ id: `stock-${product.id}`, type: "STOCK_LOW", severity: product.stock <= 0 ? "OVERDUE" : "WARNING", title: product.stock <= 0 ? "Stok habis" : "Stok menipis", description: `${product.name} tersisa ${product.stock} ${product.unit}`, href: "/stok" })),
      ...payables.filter((item) => item.amount > item.paidAmount && item.dueDate && item.dueDate <= soon).map((item) => ({ id: `payable-${item.id}`, type: "PAYABLE", severity: item.dueDate && item.dueDate < now ? "OVERDUE" : "DUE_SOON", title: item.dueDate && item.dueDate < now ? "Hutang sudah jatuh tempo" : "Hutang segera jatuh tempo", description: `${item.supplierName} · ${item.reference || "Tanpa referensi"}`, href: "/hutang", dueDate: item.dueDate })),
      ...receivables.filter((item) => item.amount > item.paidAmount && item.dueDate && item.dueDate <= soon).map((item) => ({ id: `receivable-${item.id}`, type: "RECEIVABLE", severity: item.dueDate && item.dueDate < now ? "OVERDUE" : "DUE_SOON", title: item.dueDate && item.dueDate < now ? "Piutang sudah jatuh tempo" : "Piutang segera jatuh tempo", description: `${item.customerName} · ${item.reference || "Tanpa referensi"}`, href: "/piutang", dueDate: item.dueDate })),
    ];
    return NextResponse.json({ notifications, dueSoonDays });
  } catch {
    return NextResponse.json({ error: "Notifikasi gagal diambil" }, { status: 503 });
  }
}
