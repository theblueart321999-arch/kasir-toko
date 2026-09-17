import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const canManage = (role: string) => role === "ADMIN" || role === "OWNER";

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  try {
    const accounts = await prisma.cashAccount.findMany({
      where: { active: true }, orderBy: { name: "asc" },
      include: { fromMovements: { select: { amount: true, type: true } }, toMovements: { select: { amount: true, type: true } } },
    });
    return NextResponse.json(accounts.map(({ fromMovements, toMovements, ...account }) => ({
      ...account,
      balance: account.openingBalance
        + toMovements.reduce((sum, m) => sum + m.amount, 0)
        - fromMovements.reduce((sum, m) => sum + m.amount, 0),
    })));
  } catch { return NextResponse.json({ error: "Akun kas gagal diambil" }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !canManage(operator.role)) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola akun kas" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).name !== "string" || !((body as Record<string, unknown>).name as string).trim()) {
    return NextResponse.json({ error: "Nama akun wajib diisi" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const openingBalance = input.openingBalance === undefined ? 0 : input.openingBalance;
  if (!Number.isInteger(openingBalance) || (openingBalance as number) < 0) return NextResponse.json({ error: "Saldo awal harus bilangan bulat positif" }, { status: 400 });
  try {
    return NextResponse.json(await prisma.cashAccount.create({ data: { name: (input.name as string).trim(), type: typeof input.type === "string" ? input.type.trim() || "CASH" : "CASH", openingBalance: openingBalance as number } }), { status: 201 });
  } catch { return NextResponse.json({ error: "Akun kas gagal dibuat" }, { status: 500 }); }
}
