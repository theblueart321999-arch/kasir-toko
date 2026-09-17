import { MoneyMovementType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const types = new Set(Object.values(MoneyMovementType));
export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  try {
    return NextResponse.json(await prisma.moneyMovement.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      include: { fromAccount: { select: { id: true, name: true } }, toAccount: { select: { id: true, name: true } }, operator: { select: { id: true, name: true } } },
    }));
  } catch { return NextResponse.json({ error: "Arus uang gagal diambil" }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.type !== "string" || !types.has(body.type as MoneyMovementType) || !Number.isInteger(body.amount) || (body.amount as number) <= 0) {
    return NextResponse.json({ error: "type dan amount wajib valid" }, { status: 400 });
  }
  const type = body.type as MoneyMovementType;
  const fromAccountId = Number.isInteger(body.fromAccountId) ? body.fromAccountId as number : null;
  const toAccountId = Number.isInteger(body.toAccountId) ? body.toAccountId as number : null;
  if ((type === MoneyMovementType.IN && !toAccountId) || (type === MoneyMovementType.OUT && !fromAccountId) || (type === MoneyMovementType.TRANSFER && (!fromAccountId || !toAccountId || fromAccountId === toAccountId))) {
    return NextResponse.json({ error: "Akun sumber/tujuan wajib sesuai jenis arus" }, { status: 400 });
  }
  try {
    const accounts = await prisma.cashAccount.findMany({ where: { id: { in: [fromAccountId, toAccountId].filter((id): id is number => id !== null) }, active: true }, select: { id: true } });
    if (accounts.length !== new Set([fromAccountId, toAccountId].filter((id): id is number => id !== null)).size) return NextResponse.json({ error: "Akun tidak ditemukan atau tidak aktif" }, { status: 400 });
    return NextResponse.json(await prisma.moneyMovement.create({ data: { type, amount: body.amount as number, fromAccountId, toAccountId, operatorId: operator.id, note: typeof body.note === "string" ? body.note.trim() || null : null, reference: typeof body.reference === "string" ? body.reference.trim() || null : null }, include: { fromAccount: true, toAccount: true } }), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return NextResponse.json({ error: "Arus uang tidak dapat disimpan" }, { status: 409 });
    return NextResponse.json({ error: "Arus uang gagal disimpan" }, { status: 500 });
  }
}
