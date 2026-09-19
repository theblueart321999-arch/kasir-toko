
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

  const id = (await params).id;

  const payable = await prisma.payable.findUnique({
    where: {
      id,
    },
  });

  if (!payable) {
    return NextResponse.json(
      { error: "Hutang tidak ditemukan" },
      { status: 404 }
    );
  }

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

    const updatedPayable = await prisma.payable.update({
      where: {
        id,
      },
      data: {
        dueDate,
      },
    });

    return NextResponse.json(updatedPayable);
  }

  const amount =
    action === "FULL"
      ? payable.amount - payable.paidAmount
      : body?.amount;

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Jumlah pembayaran tidak valid" },
      { status: 400 }
    );
  }

  const remaining = Math.max(
    payable.amount - payable.paidAmount,
    0
  );

  if (amount > remaining) {
    return NextResponse.json(
      { error: "Pembayaran melebihi sisa hutang" },
      { status: 400 }
    );
  }

  const updatedPayable = await prisma.payable.update({
    where: {
      id,
    },
    data: {
      paidAmount: {
        increment: amount,
      },
      status: amount === remaining ? "PAID" : "OPEN",
    },
  });

  return NextResponse.json(updatedPayable);
}
