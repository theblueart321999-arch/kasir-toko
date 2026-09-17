import { Prisma, PurchasePaymentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const canManage = (role: string) => role === "ADMIN" || role === "OWNER";
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  try {
    return NextResponse.json(await prisma.purchase.findMany({
      include: {
        supplier: true,
        operator: { select: { id: true, name: true, username: true } },
        items: { include: { product: true } },
        returns: { include: { items: { include: { product: true } }, operator: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }));
  } catch { return NextResponse.json({ error: "Riwayat pembelian gagal diambil" }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !canManage(operator.role)) return NextResponse.json({ error: "Anda tidak memiliki izin membuat pembelian" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!isRecord(body) || !Number.isInteger(body.supplierId) || !Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json({ error: "supplierId dan items wajib diisi" }, { status: 400 });
  }
  const paymentStatus = typeof body.paymentStatus === "string" && Object.values(PurchasePaymentStatus).includes(body.paymentStatus as PurchasePaymentStatus)
    ? body.paymentStatus as PurchasePaymentStatus : PurchasePaymentStatus.PAID;
  const quantities = new Map<number, { quantity: number; unitPrice: number }>();
  for (const raw of body.items) {
    if (!isRecord(raw) || !Number.isInteger(raw.productId) || !Number.isInteger(raw.quantity) || (raw.quantity as number) <= 0 || !Number.isInteger(raw.unitPrice) || (raw.unitPrice as number) < 0) {
      return NextResponse.json({ error: "Setiap item harus memiliki produk, jumlah, dan harga valid" }, { status: 400 });
    }
    const productId = raw.productId as number;
    const previous = quantities.get(productId);
    quantities.set(productId, { quantity: (previous?.quantity ?? 0) + (raw.quantity as number), unitPrice: raw.unitPrice as number });
  }
  try {
    const purchase = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: body.supplierId as number } });
      if (!supplier || !supplier.active) throw new Error("Supplier tidak ditemukan atau tidak aktif");
      const products = await tx.product.findMany({ where: { id: { in: [...quantities.keys()] } } });
      if (products.length !== quantities.size) throw new Error("Produk tidak ditemukan");
      const items = products.map((product) => {
        const input = quantities.get(product.id) as { quantity: number; unitPrice: number };
        return { product, ...input, total: input.quantity * input.unitPrice };
      });
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const created = await tx.purchase.create({
        data: {
          invoiceNumber: typeof body.invoiceNumber === "string" && body.invoiceNumber.trim() ? body.invoiceNumber.trim() : `PB-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`,
          reference: typeof body.reference === "string" ? body.reference.trim() || null : null,
          supplierId: supplier.id, operatorId: operator.id, subtotal, total: subtotal, paymentStatus,
          items: { create: items.map(({ product, quantity, unitPrice, total }) => ({ productId: product.id, quantity, unitPrice, total })) },
        },
        include: { supplier: true, items: { include: { product: true } } },
      });
      for (const item of items) {
        const updated = await tx.product.update({ where: { id: item.product.id }, data: { stock: { increment: item.quantity } }, select: { stock: true } });
        await tx.stockMovement.create({
          data: { productId: item.product.id, operatorId: operator.id, type: "IN", quantity: item.quantity, beforeStock: item.product.stock, afterStock: updated.stock, note: `Pembelian dari ${supplier.name}`, reference: `PURCHASE-${created.id}` },
        });
      }
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pembelian gagal disimpan";
    if (message.includes("tidak ditemukan") || message.includes("tidak aktif")) return NextResponse.json({ error: message }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Nomor invoice sudah digunakan" }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Transaksi sedang diproses, coba lagi" }, { status: 409 });
    return NextResponse.json({ error: "Pembelian gagal disimpan" }, { status: 500 });
  }
}
