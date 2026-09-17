import { NextRequest, NextResponse } from "next/server";
import { Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentOperator } from "@/lib/auth";

const legacyCategories = new Set(Object.values(Category));

async function allowed() {
  const operator = await getCurrentOperator();
  return operator && ["ADMIN", "OWNER"].includes(operator.role);
}

function idFrom(params: { id: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await allowed())) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola produk" }, { status: 403 });
  const id = idFrom(await params);
  if (!id) return NextResponse.json({ error: "ID produk tidak valid" }, { status: 400 });
  const input = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!input) return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const sku = typeof input.sku === "string" ? input.sku.trim() : "";
  const unit = typeof input.unit === "string" ? input.unit.trim() : "";
  const price = input.price;
  const stock = input.stock;
  const categoryId = input.categoryId;
  const category = typeof input.category === "string" ? input.category : "";
  const discountPercent = input.discountPercent === undefined ? 0 : input.discountPercent;
  if (!name || !sku || !unit || !Number.isInteger(price) || (price as number) < 0 || !Number.isInteger(stock) || (stock as number) < 0 || typeof discountPercent !== "number" || discountPercent < 0 || discountPercent > 100 || (!Number.isInteger(categoryId) && !legacyCategories.has(category as Category))) {
    return NextResponse.json({ error: "Data produk tidak valid" }, { status: 400 });
  }
  const categoryRecord = Number.isInteger(categoryId) ? await prisma.productCategory.findUnique({ where: { id: categoryId as number } }) : null;
  if (Number.isInteger(categoryId) && !categoryRecord) return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 400 });
  try {
    const product = await prisma.product.update({
      where: { id },
      data: { name, sku, unit, price: price as number, discountPercent, stock: stock as number, category: categoryRecord?.legacyCategory ?? category as Category, categoryId: categoryRecord?.id ?? null },
      include: { categoryRef: true },
    });
    return NextResponse.json(product);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "SKU sudah terdaftar" }, { status: 409 });
    return NextResponse.json({ error: "Produk gagal diperbarui" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await allowed())) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola produk" }, { status: 403 });
  const id = idFrom(await params);
  if (!id) return NextResponse.json({ error: "ID produk tidak valid" }, { status: 400 });
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Produk tidak dapat dihapus karena sudah memiliki transaksi" }, { status: 409 });
  }
}
