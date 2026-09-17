import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentOperator } from "@/lib/auth";

async function permitted() {
  const operator = await getCurrentOperator();
  return operator && ["ADMIN", "OWNER"].includes(operator.role);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await permitted())) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola kategori" }, { status: 403 });
  const id = Number((await params).id);
  const input = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (!Number.isInteger(id) || !name) return NextResponse.json({ error: "Data kategori tidak valid" }, { status: 400 });
  try {
    return NextResponse.json(await prisma.productCategory.update({ where: { id }, data: { name } }));
  } catch {
    return NextResponse.json({ error: "Kategori gagal diperbarui" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await permitted())) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola kategori" }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "ID kategori tidak valid" }, { status: 400 });
  try {
    await prisma.productCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Kategori masih digunakan produk" }, { status: 409 });
  }
}
