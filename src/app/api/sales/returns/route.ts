import { Prisma, ReturnStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  try {
    const returns = await prisma.saleReturn.findMany({
      where: { status: ReturnStatus.COMPLETED },
      include: {
        sale: { select: { id: true, invoiceNumber: true, createdAt: true } },
        operator: { select: { id: true, name: true, username: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(returns);
  } catch {
    return NextResponse.json({ error: "Riwayat retur gagal diambil" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }
  if (!isRecord(body) || !Number.isInteger(body.saleId) || typeof body.reason !== "string" || !body.reason.trim() || !Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json({ error: "saleId, alasan, dan items wajib diisi" }, { status: 400 });
  }
  const reason = body.reason;

  const quantities = new Map<number, number>();
  for (const item of body.items) {
    if (!isRecord(item) || !Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || (item.quantity as number) <= 0) {
      return NextResponse.json({ error: "Setiap item harus memiliki productId dan quantity positif" }, { status: 400 });
    }
    quantities.set(item.productId as number, (quantities.get(item.productId as number) ?? 0) + (item.quantity as number));
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: body.saleId as number },
        include: { items: true, returns: { where: { status: ReturnStatus.COMPLETED }, include: { items: true } } },
      });
      if (!sale) throw new Error("Transaksi tidak ditemukan");
      if (sale.status !== "COMPLETED") throw new Error("Transaksi tidak dapat diretur");

      const returnedByProduct = new Map<number, number>();
      for (const previous of sale.returns) {
        for (const item of previous.items) returnedByProduct.set(item.productId, (returnedByProduct.get(item.productId) ?? 0) + item.quantity);
      }
      const saleItems = new Map(sale.items.map((item) => [item.productId, item]));
      const returnItems = [...quantities.entries()].map(([productId, quantity]) => {
        const sold = saleItems.get(productId);
        if (!sold) throw new Error("Produk tidak ada dalam transaksi");
        const available = sold.quantity - (returnedByProduct.get(productId) ?? 0);
        if (quantity > available) throw new Error(`Jumlah retur melebihi jumlah terjual untuk ${sold.productId}`);
        return { productId, quantity, unitPrice: sold.unitPrice, total: sold.unitPrice * quantity };
      });
      const total = returnItems.reduce((sum, item) => sum + item.total, 0);
      const created = await tx.saleReturn.create({
        data: {
          saleId: sale.id,
          operatorId: operator.id,
          reason,
          total,
          status: ReturnStatus.COMPLETED,
          items: { create: returnItems },
        },
        include: { sale: true, items: { include: { product: true } } },
      });
      for (const item of returnItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId }, select: { stock: true } });
        if (!product) throw new Error("Produk tidak ditemukan");
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
          select: { stock: true },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            operatorId: operator.id,
            type: "IN",
            quantity: item.quantity,
            beforeStock: product.stock,
            afterStock: updated.stock,
            note: `Retur penjualan: ${reason}`,
            reference: `SALE-RETURN-${created.id}`,
          },
        });
      }
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retur gagal disimpan";
    if (message.includes("tidak") || message.includes("melebihi")) return NextResponse.json({ error: message }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Transaksi sedang diproses, coba lagi" }, { status: 409 });
    return NextResponse.json({ error: "Retur gagal disimpan" }, { status: 500 });
  }
}
