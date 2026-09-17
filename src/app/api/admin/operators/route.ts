import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentOperator } from "@/lib/auth";

const canManage = (role: string) => role === "OWNER" || role === "ADMIN";

export async function GET() {
  const current = await getCurrentOperator();
  if (!current) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  if (!canManage(current.role)) return NextResponse.json({ error: "Tidak memiliki izin" }, { status: 403 });
  const operators = await prisma.operator.findMany({
    where: { accountId: current.accountId! },
    select: { id: true, name: true, username: true, role: true, active: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(operators);
}

export async function POST(request: NextRequest) {
  const current = await getCurrentOperator();
  if (!current) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  if (!canManage(current.role)) return NextResponse.json({ error: "Tidak memiliki izin" }, { status: 403 });
  const input = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const username = typeof input?.username === "string" ? input.username.trim().toLowerCase() : "";
  const password = typeof input?.password === "string" ? input.password : "";
  const role = input?.role === "ADMIN" || input?.role === "KASIR" ? input.role : "KASIR";
  if (!name || !username || password.length < 8) return NextResponse.json({ error: "Nama, username, dan password minimal 8 karakter wajib diisi" }, { status: 400 });
  if (role === "ADMIN" && current.role !== "OWNER") return NextResponse.json({ error: "Hanya owner dapat membuat admin" }, { status: 403 });
  try {
    const workspace = await prisma.workspace.findFirst({ where: { account: { id: current.accountId! } } });
    if (!workspace) return NextResponse.json({ error: "Workspace tidak ditemukan" }, { status: 409 });
    const operator = await prisma.operator.create({ data: { name, username, passwordHash: await bcrypt.hash(password, 12), role, accountId: current.accountId } });
    await prisma.operatorWorkspace.create({ data: { operatorId: operator.id, workspaceId: workspace.id, role } });
    return NextResponse.json({ id: operator.id, name, username, role, active: true }, { status: 201 });
  } catch { return NextResponse.json({ error: "Username sudah digunakan atau operator gagal dibuat" }, { status: 409 }); }
}
