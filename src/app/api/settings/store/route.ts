import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentOperator } from "@/lib/auth";

const canManage = (role: string) => ["ADMIN", "OWNER"].includes(role);

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  const settings = await prisma.storeSetting.findFirst({ orderBy: { id: "asc" } })
    ?? await prisma.storeSetting.create({ data: {} });
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  if (!canManage(operator.role)) return NextResponse.json({ error: "Anda tidak memiliki izin mengubah pengaturan" }, { status: 403 });
  const input = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!input) return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  const storeName = typeof input.storeName === "string" ? input.storeName.trim() : "";
  const address = typeof input.address === "string" ? input.address.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const receiptFooter = typeof input.receiptFooter === "string" ? input.receiptFooter.trim() : "";
  const taxRate = input.taxRate;
  if (!storeName || typeof taxRate !== "number" || taxRate < 0 || taxRate > 100) {
    return NextResponse.json({ error: "Nama toko dan tarif pajak harus valid" }, { status: 400 });
  }
  const existing = await prisma.storeSetting.findFirst({ orderBy: { id: "asc" } });
  const settings = existing
    ? await prisma.storeSetting.update({ where: { id: existing.id }, data: { storeName, address, phone, taxRate, receiptFooter } })
    : await prisma.storeSetting.create({ data: { storeName, address, phone, taxRate, receiptFooter } });
  return NextResponse.json(settings);
}
