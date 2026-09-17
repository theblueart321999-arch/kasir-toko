import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await getCurrentOperator())) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  return NextResponse.json(await prisma.receivable.findMany({ where: { status: "OPEN" }, include: { customer: true }, orderBy: { createdAt: "desc" } }));
}

export async function POST(request: NextRequest) {
  if (!(await getCurrentOperator())) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !Number.isInteger(body.amount) || body.amount <= 0 || (body.customerId === undefined && (typeof body.customerName !== "string" || !body.customerName.trim()))) {
    return NextResponse.json({ error: "Nama customer dan jumlah piutang wajib diisi" }, { status: 400 });
  }
  try {
    let customerId: number | null = null;
    let customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    if (Number.isInteger(body.customerId) && body.customerId > 0) {
      const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
      if (!customer) return NextResponse.json({ error: "Customer tidak ditemukan" }, { status: 404 });
      customerId = body.customerId;
      customerName = customer.name;
    } else if (body.createCustomer === true) {
      const customer = await prisma.customer.create({ data: { name: customerName, phone: typeof body.phone === "string" ? body.phone.trim() || null : null } });
      customerId = customer.id;
      customerName = customer.name;
    }
    return NextResponse.json(await prisma.receivable.create({ data: { customerId, customerName, amount: body.amount, reference: typeof body.reference === "string" ? body.reference.trim() || null : null, dueDate: typeof body.dueDate === "string" && body.dueDate ? new Date(`${body.dueDate}T00:00:00.000Z`) : null, note: typeof body.note === "string" ? body.note.trim() || null : null } }), { status: 201 });
  } catch { return NextResponse.json({ error: "Piutang gagal disimpan" }, { status: 500 }); }
}
