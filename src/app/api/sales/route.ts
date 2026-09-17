import { PaymentMethod, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const paymentMethods = new Set(Object.values(PaymentMethod));

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export async function GET() {
  try {
    const { getCurrentOperator } = await import("@/lib/auth");
    if (!(await getCurrentOperator())) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
    const sales = await prisma.sale.findMany({
      include: {
        customer: true,
        items: { include: { product: true } },
        returns: { include: { items: { include: { product: true } }, operator: { select: { id: true, name: true, username: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sales);
  } catch {
    return NextResponse.json({ error: "Riwayat transaksi gagal diambil" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }
  if (!isRecord(body) || !Array.isArray(body.items) || !body.items.length || typeof body.paymentMethod !== "string" || !paymentMethods.has(body.paymentMethod as PaymentMethod)) {
    return NextResponse.json({ error: "paymentMethod dan items wajib valid" }, { status: 400 });
  }

  const merged = new Map<number, number>();
  for (const item of body.items) {
    if (!isRecord(item) || !Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || (item.quantity as number) <= 0) {
      return NextResponse.json({ error: "Setiap item harus memiliki productId dan quantity positif" }, { status: 400 });
    }
    merged.set(item.productId as number, (merged.get(item.productId as number) ?? 0) + (item.quantity as number));
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: [...merged.keys()] } } });
      if (products.length !== merged.size) throw new Error("Produk tidak ditemukan");
      const items = products.map((product) => {
        const quantity = merged.get(product.id) as number;
        if (product.stock < quantity) throw new Error(`Stok tidak cukup untuk ${product.name}`);
        const unitPrice = Math.round(product.price * (1 - product.discountPercent / 100));
        return { product, quantity, unitPrice, total: unitPrice * quantity };
      });
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const settings = await tx.storeSetting.findUnique({ where: { id: 1 } });
      const taxRate = settings?.taxRate ?? 11;
      const tax = Math.round(subtotal * taxRate / 100);
      for (const item of items) {
        const updated = await tx.product.updateMany({
          where: { id: item.product.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count !== 1) throw new Error(`Stok tidak cukup untuk ${item.product.name}`);
      }
      const created = await tx.sale.create({
        data: {
          invoiceNumber: `TB-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`,
          subtotal, tax, total: subtotal + tax, paymentMethod: body.paymentMethod as PaymentMethod,
          items: { create: items.map(({ product, quantity, unitPrice, total }) => ({ productId: product.id, quantity, unitPrice, total })) },
        },
        include: { items: { include: { product: true } } },
      });
      return created;
    });
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transaksi gagal disimpan";
    if (message.startsWith("Produk") || message.startsWith("Stok")) return NextResponse.json({ error: message }, { status: 400 });
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json({ error: "Database belum terhubung. Jalankan PostgreSQL lalu coba lagi." }, { status: 503 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) return NextResponse.json({ error: "Transaksi gagal disimpan" }, { status: 409 });
    return NextResponse.json({ error: "Transaksi gagal disimpan" }, { status: 500 });
  }
}
