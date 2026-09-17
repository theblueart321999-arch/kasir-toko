import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await getCurrentOperator())) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  return NextResponse.json(await prisma.payable.findMany({ where: { status: "OPEN" }, include: { supplier: true }, orderBy: { createdAt: "desc" } }));
}

export async function POST(request: NextRequest) {
  if (!(await getCurrentOperator())) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !Number.isInteger(body.amount) || body.amount <= 0 || (body.supplierId === undefined && (typeof body.supplierName !== "string" || !body.supplierName.trim()))) {
    return NextResponse.json({ error: "Nama supplier dan jumlah hutang wajib diisi" }, { status: 400 });
  }
  try {
    let supplierId: number | null = null;
    let supplierName = typeof body.supplierName === "string" ? body.supplierName.trim() : "";
    if (Number.isInteger(body.supplierId) && body.supplierId > 0) {
      const supplier = await prisma.supplier.findUnique({ where: { id: body.supplierId } });
      if (!supplier) return NextResponse.json({ error: "Supplier tidak ditemukan" }, { status: 404 });
      supplierId = body.supplierId;
      supplierName = supplier.name;
    } else if (body.createSupplier === true) {
      const supplier = await prisma.supplier.create({ data: { name: supplierName, phone: typeof body.phone === "string" ? body.phone.trim() || null : null } });
      supplierId = supplier.id;
      supplierName = supplier.name;
    }
    return NextResponse.json(await prisma.payable.create({ data: { supplierId, supplierName, amount: body.amount, reference: typeof body.reference === "string" ? body.reference.trim() || null : null, dueDate: typeof body.dueDate === "string" && body.dueDate ? new Date(`${body.dueDate}T00:00:00.000Z`) : null, note: typeof body.note === "string" ? body.note.trim() || null : null } }), { status: 201 });
  } catch { return NextResponse.json({ error: "Hutang gagal disimpan" }, { status: 500 }); }
}
