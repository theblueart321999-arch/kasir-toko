import { Prisma, ReturnStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const canManage = (role: string) => role === "ADMIN" || role === "OWNER";
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  try {
    return NextResponse.json(await prisma.purchaseReturn.findMany({
      where: { status: ReturnStatus.COMPLETED },
      include: { purchase: { select: { id: true, invoiceNumber: true, supplier: true, createdAt: true } }, operator: { select: { id: true, name: true } }, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    }));
  } catch { return NextResponse.json({ error: "Riwayat retur pembelian gagal diambil" }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !canManage(operator.role)) return NextResponse.json({ error: "Anda tidak memiliki izin membuat retur pembelian" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!isRecord(body) || !Number.isInteger(body.purchaseId) || typeof body.reason !== "string" || !body.reason.trim() || !Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json({ error: "purchaseId, alasan, dan items wajib diisi" }, { status: 400 });
  }
  const reason = body.reason;
  const quantities = new Map<number, number>();
  for (const raw of body.items) {
    if (!isRecord(raw) || !Number.isInteger(raw.productId) || !Number.isInteger(raw.quantity) || (raw.quantity as number) <= 0) return NextResponse.json({ error: "Setiap item harus memiliki produk dan jumlah positif" }, { status: 400 });
    quantities.set(raw.productId as number, (quantities.get(raw.productId as number) ?? 0) + (raw.quantity as number));
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({ where: { id: body.purchaseId as number }, include: { items: true, returns: { where: { status: ReturnStatus.COMPLETED }, include: { items: true } }, supplier: true } });
      if (!purchase) throw new Error("Pembelian tidak ditemukan");
      if (purchase.status !== "COMPLETED") throw new Error("Pembelian tidak dapat diretur");
      const returned = new Map<number, number>();
      for (const previous of purchase.returns) for (const item of previous.items) returned.set(item.productId, (returned.get(item.productId) ?? 0) + item.quantity);
      const purchased = new Map(purchase.items.map((item) => [item.productId, item]));
      const items = [...quantities.entries()].map(([productId, quantity]) => {
        const bought = purchased.get(productId);
        if (!bought) throw new Error("Produk tidak ada dalam pembelian");
        if (quantity > bought.quantity - (returned.get(productId) ?? 0)) throw new Error(`Jumlah retur melebihi jumlah pembelian untuk produk ${productId}`);
        return { productId, quantity, unitPrice: bought.unitPrice, total: bought.unitPrice * quantity };
      });
      const products = await tx.product.findMany({ where: { id: { in: items.map((item) => item.productId) } } });
      const productMap = new Map(products.map((product) => [product.id, product]));
      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product || product.stock < item.quantity) throw new Error(`Stok tidak cukup untuk mengembalikan ${product?.name ?? "produk"}`);
      }
      const total = items.reduce((sum, item) => sum + item.total, 0);
      const created = await tx.purchaseReturn.create({ data: { purchaseId: purchase.id, operatorId: operator.id, reason: reason.trim(), total, items: { create: items } }, include: { purchase: true, items: { include: { product: true } } } });
      for (const item of items) {
        const product = productMap.get(item.productId) as { stock: number };
        const updated = await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } }, select: { stock: true } });
        await tx.stockMovement.create({ data: { productId: item.productId, operatorId: operator.id, type: "OUT", quantity: item.quantity, beforeStock: product.stock, afterStock: updated.stock, note: `Retur pembelian: ${reason.trim()}`, reference: `PURCHASE-RETURN-${created.id}` } });
      }
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retur pembelian gagal disimpan";
    if (message.includes("tidak") || message.includes("melebihi") || message.includes("Stok")) return NextResponse.json({ error: message }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Transaksi sedang diproses, coba lagi" }, { status: 409 });
    return NextResponse.json({ error: "Retur pembelian gagal disimpan" }, { status: 500 });
  }
}
