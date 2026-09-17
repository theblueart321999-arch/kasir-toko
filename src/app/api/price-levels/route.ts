import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentOperator } from "@/lib/auth";

async function permitted() {
  const operator = await getCurrentOperator();
  return operator && ["ADMIN", "OWNER"].includes(operator.role);
}

export async function GET() {
  if (!(await getCurrentOperator())) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  const products = await prisma.product.findMany({ select: { id: true, sku: true, name: true, price: true, defaultPrice: true, costPrice: true, discountPercent: true, priceLevels: { orderBy: { minQuantity: "asc" } }, purchaseItems: { orderBy: { purchase: { createdAt: "desc" } }, take: 1, select: { unitPrice: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json(products.map(({ purchaseItems, ...product }) => ({
    ...product,
    defaultPrice: product.defaultPrice ?? product.price,
    costPrice: product.costPrice || purchaseItems[0]?.unitPrice || product.price,
    costSource: product.costPrice ? "Harga modal tersimpan" : purchaseItems[0] ? "Pembelian terakhir" : "Harga katalog (modal belum dicatat)",
  })));
}

export async function PUT(request: NextRequest) {
  if (!(await permitted())) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola tingkat harga" }, { status: 403 });
  const input = await request.json().catch(() => null) as { productId?: unknown; discountPercent?: unknown; action?: unknown } | null;
  if (input?.action === "reset") {
    if (!Number.isInteger(input.productId)) return NextResponse.json({ error: "Produk tidak valid" }, { status: 400 });
    try {
      const current = await prisma.product.findUnique({ where: { id: input.productId as number }, select: { price: true, defaultPrice: true } });
      if (!current) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
      const defaultPrice = current.defaultPrice ?? current.price;
      return NextResponse.json(await prisma.product.update({ where: { id: input.productId as number }, data: { price: defaultPrice, defaultPrice }, select: { id: true, price: true, defaultPrice: true } }));
    } catch { return NextResponse.json({ error: "Harga default gagal dipulihkan" }, { status: 500 }); }
  }
  if (!input || !Number.isInteger(input.productId) || typeof input.discountPercent !== "number" || input.discountPercent < 0 || input.discountPercent > 100) return NextResponse.json({ error: "Produk dan diskon harus valid (0-100)" }, { status: 400 });
  try {
    const product = await prisma.product.update({ where: { id: input.productId as number }, data: { discountPercent: input.discountPercent }, select: { id: true, discountPercent: true } });
    return NextResponse.json(product);
  } catch { return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 }); }
}

export async function PATCH(request: NextRequest) {
  if (!(await permitted())) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola tingkat harga" }, { status: 403 });
  const input = await request.json().catch(() => null) as { productId?: unknown; price?: unknown } | null;
  if (!input || !Number.isInteger(input.productId) || !Number.isInteger(input.price) || (input.price as number) < 0) return NextResponse.json({ error: "Produk dan harga rekomendasi harus valid" }, { status: 400 });
  try {
    const product = await prisma.product.update({ where: { id: input.productId as number }, data: { price: input.price as number }, select: { id: true, price: true } });
    return NextResponse.json(product);
  } catch { return NextResponse.json({ error: "Harga rekomendasi gagal diterapkan" }, { status: 404 }); }
}

export async function POST(request: NextRequest) {
  if (!(await permitted())) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola tingkat harga" }, { status: 403 });
  const input = await request.json().catch(() => null) as { productId?: unknown; minQuantity?: unknown; price?: unknown } | null;
  if (!input || !Number.isInteger(input.productId) || !Number.isInteger(input.minQuantity) || (input.minQuantity as number) < 2 || !Number.isInteger(input.price) || (input.price as number) < 0) return NextResponse.json({ error: "Jumlah minimal dan harga harus valid" }, { status: 400 });
  try {
    const level = await prisma.priceLevel.upsert({ where: { productId_minQuantity: { productId: input.productId as number, minQuantity: input.minQuantity as number } }, update: { price: input.price as number }, create: { productId: input.productId as number, minQuantity: input.minQuantity as number, price: input.price as number } });
    return NextResponse.json(level);
  } catch { return NextResponse.json({ error: "Level harga gagal disimpan" }, { status: 400 }); }
}

export async function DELETE(request: NextRequest) {
  if (!(await permitted())) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola tingkat harga" }, { status: 403 });
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Level harga tidak valid" }, { status: 400 });
  await prisma.priceLevel.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
