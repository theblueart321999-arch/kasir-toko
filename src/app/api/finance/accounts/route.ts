import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const canManage = (role: string) => role === "ADMIN" || role === "OWNER";

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  try {
    const defaults = [
      { name: "Brankas", type: "CASH" },
      { name: "Dompet", type: "CASH" },
      { name: "Bank", type: "BANK" },
    ];
    for (const account of defaults) {
      const existing = await prisma.cashAccount.findFirst({ where: { name: account.name } });
      if (!existing) await prisma.cashAccount.create({ data: account });
    }
    const accounts = await prisma.cashAccount.findMany({
      where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { fromMovements: { select: { amount: true, type: true } }, toMovements: { select: { amount: true, type: true } } },
    });
    const result = accounts.map(({ fromMovements, toMovements, ...account }) => ({
      ...account,
      balance: account.openingBalance
        + toMovements.reduce((sum, m) => sum + m.amount, 0)
        - fromMovements.reduce((sum, m) => sum + m.amount, 0),
    }));
    return NextResponse.json(result);
  } catch { return NextResponse.json({ error: "Akun kas gagal diambil" }, { status: 503 }); }
}

export async function PUT(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !canManage(operator.role)) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola akun uang kas" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (Array.isArray(body?.order)) {
    const order = body.order.filter((id): id is number => Number.isInteger(id) && id > 0);
    if (order.length !== new Set(order).size) return NextResponse.json({ error: "Urutan akun tidak valid" }, { status: 400 });
    try {
      await prisma.$transaction(order.map((id, index) => prisma.cashAccount.update({ where: { id }, data: { sortOrder: index } })));
      return NextResponse.json({ ok: true });
    } catch { return NextResponse.json({ error: "Urutan akun gagal disimpan" }, { status: 500 }); }
  }
  const id = Number(body?.id);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const openingBalance = body?.openingBalance;
  if (!Number.isInteger(id) || id < 1 || !name) return NextResponse.json({ error: "Data akun tidak valid" }, { status: 400 });
  if (!Number.isInteger(openingBalance) || (openingBalance as number) < 0) return NextResponse.json({ error: "Saldo awal harus bilangan bulat positif" }, { status: 400 });
  try {
    return NextResponse.json(await prisma.cashAccount.update({ where: { id }, data: { name, openingBalance: openingBalance as number } }));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Nama akun sudah digunakan" }, { status: 409 });
    return NextResponse.json({ error: "Akun uang kas tidak ditemukan" }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !canManage(operator.role)) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola akun uang kas" }, { status: 403 });
  const id = Number((await request.json().catch(() => null) as Record<string, unknown> | null)?.id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Akun tidak valid" }, { status: 400 });
  try {
    const account = await prisma.cashAccount.findUnique({ where: { id }, select: { id: true } });
    if (!account) return NextResponse.json({ error: "Akun uang kas tidak ditemukan" }, { status: 404 });
    const movementCount = await prisma.moneyMovement.count({ where: { OR: [{ fromAccountId: id }, { toAccountId: id }] } });
    if (movementCount > 0) return NextResponse.json({ error: "Akun tidak dapat dihapus karena sudah memiliki riwayat arus uang" }, { status: 409 });
    await prisma.cashAccount.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Akun uang kas gagal dihapus" }, { status: 500 }); }
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
