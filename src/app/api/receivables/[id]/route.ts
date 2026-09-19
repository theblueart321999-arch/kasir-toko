import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getCurrentOperator())) {
    return NextResponse.json(
      { error: "Autentikasi diperlukan" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;

  // Receivable.id = String/CUID
  const id = (await params).id;

  if (!id) {
    return NextResponse.json(
      { error: "ID piutang tidak valid" },
      { status: 400 }
    );
  }

  const receivable = await prisma.receivable.findUnique({
    where: {
      id,
    },
  });

  if (!receivable) {
    return NextResponse.json(
      { error: "Piutang tidak ditemukan" },
      { status: 404 }
    );
  }

  // Perpanjang jatuh tempo
  if (action === "EXTEND") {
    const dueDate =
      typeof body?.dueDate === "string" && body.dueDate
        ? new Date(`${body.dueDate}T00:00:00.000Z`)
        : null;

    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      return NextResponse.json(
        { error: "Jatuh tempo baru wajib diisi" },
        { status: 400 }
      );
    }

    const updated = await prisma.receivable.update({
      where: {
        id,
      },
      data: {
        dueDate,
      },
    });

    return NextResponse.json(updated);
  }

  // Pembayaran penuh
  const amount =
    action === "FULL"
      ? receivable.amount - receivable.paidAmount
      : body?.amount;

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Jumlah pembayaran tidak valid" },
      { status: 400 }
    );
  }

  const remaining = Math.max(
    receivable.amount - receivable.paidAmount,
    0
  );

  if (amount > remaining) {
    return NextResponse.json(
      { error: "Pembayaran melebihi sisa piutang" },
      { status: 400 }
    );
  }

  const updated = await prisma.receivable.update({
    where: {
      id,
    },
    data: {
      paidAmount: {
        increment: amount,
      },
      status:
        amount === remaining
          ? "PAID"
          : "OPEN",
    },
  });

  return NextResponse.json(updated);
}