import { Category } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentOperator } from "@/lib/auth";

const categories = new Set(Object.values(Category));

export async function GET(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Anda harus masuk terlebih dahulu" }, { status: 401 });
  try {
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const category = request.nextUrl.searchParams.get("category");

    if (category && !categories.has(category as Category)) {
      return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: {
        ...(category ? { category: category as Category } : {}),
        ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }] } : {}),
      },
      include: { categoryRef: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Produk gagal diambil" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !["ADMIN", "OWNER"].includes(operator.role)) {
    return NextResponse.json({ error: "Anda tidak memiliki izin mengelola produk" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  if (!body || typeof body !== "object") return NextResponse.json({ error: "Body wajib berupa objek" }, { status: 400 });
  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const sku = typeof input.sku === "string" ? input.sku.trim() : "";
  const unit = typeof input.unit === "string" ? input.unit.trim() : "";
  const category = typeof input.category === "string" ? input.category : "";
  const categoryId = input.categoryId === undefined ? undefined : input.categoryId;
  const price = input.price;
  const stock = input.stock === undefined ? 0 : input.stock;
  const discountPercent = input.discountPercent === undefined ? 0 : input.discountPercent;

  if (!name || !sku || !unit || (!categories.has(category as Category) && !Number.isInteger(categoryId)) || !Number.isInteger(price) || (price as number) < 0 || !Number.isInteger(stock) || (stock as number) < 0 || typeof discountPercent !== "number" || discountPercent < 0 || discountPercent > 100) {
    return NextResponse.json({ error: "name, sku, unit, category, price, dan stock tidak valid" }, { status: 400 });
  }

  try {
    const categoryRecord = Number.isInteger(categoryId) ? await prisma.productCategory.findUnique({ where: { id: categoryId as number } }) : null;
    if (Number.isInteger(categoryId) && !categoryRecord) return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 400 });
    const legacyCategory = categoryRecord?.legacyCategory ?? (category as Category);
    const product = await prisma.product.create({ data: { name, sku, unit, category: legacyCategory, categoryId: categoryRecord?.id, price: price as number, discountPercent, stock: stock as number }, include: { categoryRef: true } });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "SKU sudah terdaftar" }, { status: 409 });
    }
    return NextResponse.json({ error: "Produk gagal dibuat" }, { status: 500 });
  }
}
