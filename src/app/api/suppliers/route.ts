import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentOperator } from "@/lib/auth";

const canManage = (role: string) => role === "ADMIN" || role === "OWNER";
function inputOf(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const optional = (key: string) => typeof input[key] === "string" ? (input[key] as string).trim() || null : null;
  return { name, phone: optional("phone"), email: optional("email"), address: optional("address"), notes: optional("notes"), active: input.active === undefined ? true : input.active === true };
}
export async function GET(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Anda harus masuk terlebih dahulu" }, { status: 401 });
  const search = request.nextUrl.searchParams.get("search")?.trim();
  try { return NextResponse.json(await prisma.supplier.findMany({ where: search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : undefined, orderBy: [{ active: "desc" }, { name: "asc" }] })); }
  catch { return NextResponse.json({ error: "Supplier gagal diambil" }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !canManage(operator.role)) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola supplier" }, { status: 403 });
  const data = inputOf(await request.json().catch(() => null));
  if (!data?.name || !data.phone || !data.email || !data.address) return NextResponse.json({ error: "Nama, nomor telepon, email, dan alamat supplier wajib diisi" }, { status: 400 });
  try { return NextResponse.json(await prisma.supplier.create({ data }), { status: 201 }); }
  catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Nomor telepon atau email sudah terdaftar" }, { status: 409 }); return NextResponse.json({ error: "Supplier gagal dibuat" }, { status: 500 }); }
}
export async function PUT(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !canManage(operator.role)) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola supplier" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = Number(body?.id); const data = inputOf(body);
  if (!Number.isInteger(id) || id < 1 || !data?.name) return NextResponse.json({ error: "Data supplier tidak valid" }, { status: 400 });
  try { return NextResponse.json(await prisma.supplier.update({ where: { id }, data })); }
  catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Nomor telepon atau email sudah terdaftar" }, { status: 409 }); return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 }); }
}
export async function DELETE(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !canManage(operator.role)) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola supplier" }, { status: 403 });
  const id = Number(request.nextUrl.searchParams.get("id") || (await request.json().catch(() => null) as Record<string, unknown> | null)?.id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "ID supplier tidak valid" }, { status: 400 });
  try { await prisma.supplier.delete({ where: { id } }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 }); }
}
