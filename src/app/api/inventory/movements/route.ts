import { StockMovementType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const movementTypes = new Set(Object.values(StockMovementType));
const canManage = (role: string) => ["ADMIN", "OWNER"].includes(role);

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator || !canManage(operator.role)) {
    return NextResponse.json({ error: "Anda tidak memiliki izin mengelola stok" }, { status: 403 });
  }
  try {
    const movements = await prisma.stockMovement.findMany({
      include: { product: { include: { categoryRef: true } }, operator: { select: { id: true, name: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(movements);
  } catch {
    return NextResponse.json({ error: "Riwayat stok gagal diambil" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !canManage(operator.role)) {
    return NextResponse.json({ error: "Anda tidak memiliki izin mengelola stok" }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body wajib berupa objek" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const productId = input.productId;
  const quantity = input.quantity;
  const targetStock = input.targetStock;
  const type = input.type;
  const adjustmentDirection = input.adjustmentDirection;
  const note = typeof input.note === "string" ? input.note.trim() : null;
  const reference = typeof input.reference === "string" ? input.reference.trim() : null;
  const validAdjustment = type === StockMovementType.ADJUSTMENT && (
    (Number.isInteger(targetStock) && (targetStock as number) >= 0 && Boolean(note)) ||
    (adjustmentDirection === "IN" || adjustmentDirection === "OUT") && Number.isInteger(quantity) && (quantity as number) > 0 && Boolean(note)
  );
  if (!Number.isInteger(productId) || typeof type !== "string" || !movementTypes.has(type as StockMovementType) || (type === StockMovementType.ADJUSTMENT ? !validAdjustment : (!Number.isInteger(quantity) || (quantity as number) <= 0))) {
    return NextResponse.json({ error: "productId, type, dan quantity positif wajib valid" }, { status: 400 });
  }

  try {
    const movement = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId as number } });
      if (!product) throw new Error("Produk tidak ditemukan");
      const delta = type === StockMovementType.ADJUSTMENT
        ? Number.isInteger(targetStock) ? (targetStock as number) - product.stock : adjustmentDirection === "OUT" ? -(quantity as number) : quantity as number
        : type === StockMovementType.OUT ? -(quantity as number) : quantity as number;
      const movementQuantity = type === StockMovementType.ADJUSTMENT ? Math.abs(delta) : quantity as number;
      if (type === StockMovementType.ADJUSTMENT && delta === 0) throw new Error("Jumlah stok tidak berubah");
      const afterStock = product.stock + delta;
      if (afterStock < 0) throw new Error(`Stok tidak cukup untuk ${product.name}`);
      const updated = await tx.product.updateMany({
        where: { id: product.id, stock: product.stock },
        data: { stock: afterStock },
      });
      if (updated.count !== 1) throw new Error("Stok berubah, silakan coba lagi");
      return tx.stockMovement.create({
        data: {
          productId: product.id, operatorId: operator.id, type: type as StockMovementType,
          quantity: movementQuantity, beforeStock: product.stock, afterStock, note, reference,
        },
        include: { product: { include: { categoryRef: true } }, operator: { select: { id: true, name: true, username: true } } },
      });
    });
    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Perubahan stok gagal disimpan";
    if (message.startsWith("Produk") || message.startsWith("Stok")) return NextResponse.json({ error: message }, { status: 400 });
    return NextResponse.json({ error: "Perubahan stok gagal disimpan" }, { status: 409 });
  }
}
