import { MoneyMovementType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const types = new Set(Object.values(MoneyMovementType));

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });

  try {
    const movements = await prisma.moneyMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
        operator: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(movements);
  } catch {
    return NextResponse.json({ error: "Arus uang gagal diambil" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.type !== "string" || !types.has(body.type as MoneyMovementType)) {
    return NextResponse.json({ error: "Tipe arus kas tidak valid" }, { status: 400 });
  }

  const parsedAmount = typeof body.amount === "number" ? body.amount : Number(body.amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "Nominal jumlah wajib angka positif" }, { status: 400 });
  }

  const type = body.type as MoneyMovementType;
  const amount = Math.round(parsedAmount);
  const fromAccountId = body.fromAccountId ? Number(body.fromAccountId) : null;
  const toAccountId = body.toAccountId ? Number(body.toAccountId) : null;

  if (
    (type === MoneyMovementType.IN && !toAccountId) ||
    (type === MoneyMovementType.OUT && !fromAccountId) ||
    (type === MoneyMovementType.TRANSFER && (!fromAccountId || !toAccountId || fromAccountId === toAccountId))
  ) {
    return NextResponse.json({ error: "Akun sumber/tujuan wajib sesuai jenis arus" }, { status: 400 });
  }

  // --- KODE PERBAIKAN LOGIKA BISNIS (NON-PENJUALAN) ---
  // Pastikan parameter kategori dikirim dari frontend. Jika Anda ingin endpoint ini 
  // MURNI hanya untuk transaksi manual/non-penjualan, blokir jika ada kiriman kategori "SALES".
  const category = typeof body.category === "string" ? body.category.trim().toUpperCase() : "OTHER";
  
  if (type === MoneyMovementType.IN && category === "SALES") {
    return NextResponse.json({ 
      error: "Arus uang penjualan (Omset) harus melalui modul kasir/sales, bukan movement manual!" 
    }, { status: 400 });
  }
  // ----------------------------------------------------

  try {
    const targetAccountIds = [fromAccountId, toAccountId].filter((id): id is number => id !== null);
    const accounts = await prisma.cashAccount.findMany({
      where: { id: { in: targetAccountIds }, active: true },
      select: { id: true },
    });

    if (accounts.length !== new Set(targetAccountIds).size) {
      return NextResponse.json({ error: "Akun tidak ditemukan atau tidak aktif" }, { status: 400 });
    }

    const movement = await prisma.moneyMovement.create({
      data: {
        type,
        amount,
        fromAccountId,
        toAccountId,
        operatorId: operator.id,
        // Menyimpan kategori ke db jika fieldnya tersedia di skema prisma Anda
        // category: category, 
        note:
          typeof body.note === "string" && body.note.trim()
            ? body.note.trim()
            : `Arus kas ${new Date().toLocaleString("id-ID")}`,
        reference: typeof body.reference === "string" ? body.reference.trim() || null : null,
      },
      include: { fromAccount: true, toAccount: true },
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    console.error("Gagal simpan MoneyMovement:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: `Gagal simpan: ${error.message}` }, { status: 409 });
    }
    return NextResponse.json({ error: "Arus uang gagal disimpan" }, { status: 500 });
  }
}
