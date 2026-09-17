import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentOperator())) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  const amount = (await request.json().catch(() => null))?.amount;
  if (!Number.isInteger(amount) || amount <= 0) return NextResponse.json({ error: "Jumlah penerimaan tidak valid" }, { status: 400 });
  const id = Number((await params).id);
  const receivable = await prisma.receivable.findUnique({ where: { id } });
  if (!receivable) return NextResponse.json({ error: "Piutang tidak ditemukan" }, { status: 404 });
  const remaining = Math.max(receivable.amount - receivable.paidAmount, 0);
  if (amount > remaining) return NextResponse.json({ error: "Penerimaan melebihi sisa piutang" }, { status: 400 });
  return NextResponse.json(await prisma.receivable.update({ where: { id }, data: { paidAmount: { increment: amount }, status: amount === remaining ? "PAID" : "OPEN" } }));
}
