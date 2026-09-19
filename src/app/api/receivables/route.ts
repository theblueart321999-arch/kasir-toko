import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await getCurrentOperator())) {
    return NextResponse.json(
      { error: "Autentikasi diperlukan" },
      { status: 401 }
    );
  }

  const receivables = await prisma.receivable.findMany({
    where: {
      status: "OPEN",
    },
    include: {
      customer: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(receivables);
}

export async function POST(request: NextRequest) {
  if (!(await getCurrentOperator())) {
    return NextResponse.json(
      { error: "Autentikasi diperlukan" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "Data tidak valid" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(body.amount) || body.amount <= 0) {
    return NextResponse.json(
      { error: "Jumlah piutang wajib diisi dengan benar" },
      { status: 400 }
    );
  }

  const hasCustomerId =
    body.customerId !== undefined &&
    body.customerId !== null;

  const hasCustomerName =
    typeof body.customerName === "string" &&
    body.customerName.trim() !== "";

  if (!hasCustomerId && !hasCustomerName) {
    return NextResponse.json(
      { error: "Nama customer dan jumlah piutang wajib diisi" },
      { status: 400 }
    );
  }

  try {
    let customerId: number | null = null;

    let customerName =
      typeof body.customerName === "string"
        ? body.customerName.trim()
        : "";

    // Menggunakan customer yang sudah ada
    if (Number.isInteger(body.customerId) && body.customerId > 0) {
      const customer = await prisma.customer.findUnique({
        where: {
          id: body.customerId,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer tidak ditemukan" },
          { status: 404 }
        );
      }

      customerId = customer.id;
      customerName = customer.name;
    }

    // Membuat customer baru
    else if (body.createCustomer === true) {
      if (!customerName) {
        return NextResponse.json(
          { error: "Nama customer wajib diisi" },
          { status: 400 }
        );
      }

      const customer = await prisma.customer.create({
        data: {
          name: customerName,
          phone:
            typeof body.phone === "string"
              ? body.phone.trim() || null
              : null,
        },
      });

      customerId = customer.id;
      customerName = customer.name;
    }

    const dueDate =
      typeof body.dueDate === "string" && body.dueDate
        ? new Date(`${body.dueDate}T00:00:00.000Z`)
        : null;

    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return NextResponse.json(
        { error: "Tanggal jatuh tempo tidak valid" },
        { status: 400 }
      );
    }

    const reference =
      typeof body.reference === "string"
        ? body.reference.trim() || null
        : null;

    const note =
      typeof body.note === "string"
        ? body.note.trim() || null
        : null;

    const receivable = await prisma.receivable.create({
      data: {
        customerId,
        customerName,
        amount: body.amount,
        reference,
        dueDate,
        note,
      },
    });

    return NextResponse.json(receivable, {
      status: 201,
    });
  } catch (error) {
    console.error("Gagal membuat piutang:", error);

    return NextResponse.json(
      { error: "Piutang gagal disimpan" },
      { status: 500 }
    );
  }
}