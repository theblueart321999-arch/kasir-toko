import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentOperator } from "@/lib/auth";

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  const products = await prisma.product.findMany({ select: { id: true, sku: true, name: true, price: true, discountPercent: true }, orderBy: { name: "asc" } });
  return NextResponse.json(products);
}

export async function PUT(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !["ADMIN", "OWNER"].includes(operator.role)) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola tingkat harga" }, { status: 403 });
  const input = await request.json().catch(() => null) as { productId?: unknown; discountPercent?: unknown } | null;
  if (!input || !Number.isInteger(input.productId) || typeof input.discountPercent !== "number" || input.discountPercent < 0 || input.discountPercent > 100) {
    return NextResponse.json({ error: "Produk dan diskon harus valid (0-100)" }, { status: 400 });
  }
  try {
    const product = await prisma.product.update({ where: { id: input.productId as number }, data: { discountPercent: input.discountPercent }, select: { id: true, discountPercent: true } });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  }
}
