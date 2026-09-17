import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentOperator } from "@/lib/auth";

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Anda harus masuk terlebih dahulu" }, { status: 401 });
  try {
    return NextResponse.json(await prisma.productCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }));
  } catch {
    return NextResponse.json({ error: "Kategori gagal diambil" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !["ADMIN", "OWNER"].includes(operator.role)) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola kategori" }, { status: 403 });
  const input = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const slug = typeof input?.slug === "string" ? input.slug.trim().toLowerCase() : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (name.length < 2 || !slug) return NextResponse.json({ error: "Nama kategori tidak valid" }, { status: 400 });
  try {
    return NextResponse.json(await prisma.productCategory.create({ data: { name, slug } }), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Nama atau slug kategori sudah digunakan" }, { status: 409 });
  }
}
