import { MoneyMovementType, PaymentMethod, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const paymentMethods = new Set(Object.values(PaymentMethod));

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export async function DELETE(request: NextRequest) {
  const { getCurrentOperator } = await import("@/lib/auth");
  const operator = await getCurrentOperator();
  if (!operator || !["ADMIN", "OWNER"].includes(operator.role)) {
    return NextResponse.json(
      { error: "Anda tidak memiliki izin menghapus transaksi" },
      { status: 403 }
    );
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Transaksi tidak valid" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true, returns: { select: { id: true } } },
      });
      if (!sale) throw new Error("Transaksi tidak ditemukan");
      if (sale.returns.length) {
        throw new Error("Transaksi yang memiliki retur tidak dapat dihapus");
      }

      // Restore stok produk
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: Number(item.productId) },
          data: { stock: { increment: item.quantity } },
        });
      }

      // Hapus catatan mutasi uang kas terkait transaksi ini
      await tx.moneyMovement.deleteMany({
        where: { reference: `SALE-${sale.id}` },
      });

      // Hapus transaksi penjualan
      await tx.sale.delete({ where: { id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transaksi gagal dihapus";
    if (message.includes("tidak ditemukan") || message.includes("memiliki retur")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Transaksi gagal dihapus" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { getCurrentOperator } = await import("@/lib/auth");
    if (!(await getCurrentOperator())) {
      return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
    }

    const sales = await prisma.sale.findMany({
      include: {
        customer: true,
        items: { include: { product: true } },
        returns: {
          include: {
            items: { include: { product: true } },
            operator: { select: { id: true, name: true, username: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sales);
  } catch {
    return NextResponse.json({ error: "Riwayat transaksi gagal diambil" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const { getCurrentOperator } = await import("@/lib/auth");
  const operator = await getCurrentOperator();
  if (!operator) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  // Validasi struktur dasar body dan items
  if (!isRecord(body) || !Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json(
      { error: "items wajib diisi dan berbentuk array" },
      { status: 400 }
    );
  }

  // Normalisasi & validasi paymentMethod
  const paymentMethodStr =
    typeof body.paymentMethod === "string" ? body.paymentMethod.toUpperCase() : "";
  if (!paymentMethods.has(paymentMethodStr as PaymentMethod)) {
    return NextResponse.json(
      { error: "Metode pembayaran tidak valid" },
      { status: 400 }
    );
  }
  const paymentMethod = paymentMethodStr as PaymentMethod;

  // Normalisasi & validasi paidAmount
  let paidAmount = 0;
  if (typeof body.paidAmount === "number") {
    paidAmount = body.paidAmount;
  } else if (typeof body.paidAmount === "string") {
    paidAmount = Number(body.paidAmount.replace(/[^0-9.]/g, ""));
  }

  if (isNaN(paidAmount) || paidAmount < 0) {
    return NextResponse.json(
      { error: "Nominal pembayaran tidak valid" },
      { status: 400 }
    );
  }

  const merged = new Map<number, number>();
  for (const item of body.items) {
    if (!isRecord(item)) {
      return NextResponse.json(
        { error: "Setiap item harus berupa objek valid" },
        { status: 400 }
      );
    }

    const pid = Number(item.productId);
    const qty = Number(item.quantity);

    if (!Number.isInteger(pid) || !Number.isInteger(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "Setiap item harus memiliki productId dan quantity positif" },
        { status: 400 }
      );
    }
    merged.set(pid, (merged.get(pid) ?? 0) + qty);
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: [...merged.keys()] } },
        include: { priceLevels: true },
      });

      if (products.length !== merged.size) {
        throw new Error("Satu atau lebih produk tidak ditemukan");
      }

      const items = products.map((product) => {
        const quantity = merged.get(product.id) as number;
        if (product.stock < quantity) {
          throw new Error(`Stok tidak cukup untuk ${product.name}`);
        }

        const tier = product.priceLevels
          .filter((level) => level.minQuantity <= quantity)
          .sort((a, b) => b.minQuantity - a.minQuantity)[0];

        const unitPrice =
          tier?.price ?? Math.round(product.price * (1 - product.discountPercent / 100));

        return { product, quantity, unitPrice, total: unitPrice * quantity };
      });

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);

      const settings = await tx.storeSetting.findFirst();
      const taxRate = settings?.taxRate ?? 11;
      const tax = Math.round((subtotal * taxRate) / 100);
      const total = subtotal + tax;

      // VALIDASI NOMINAL BAYAR
      if (paidAmount < total) {
        throw new Error(
          `Pembayaran kurang. Total: Rp ${total.toLocaleString("id-ID")}, Dibayar: Rp ${paidAmount.toLocaleString("id-ID")}`
        );
      }
      const change = paidAmount - total;

      for (const item of items) {
        const updated = await tx.product.updateMany({
          where: { id: item.product.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (updated.count !== 1) {
          throw new Error(`Stok tidak cukup untuk ${item.product.name}`);
        }
      }

      const uniqueSuffix = crypto.randomUUID().slice(0, 8).toUpperCase();
      const invoiceNumber = `TB-${Date.now()}-${uniqueSuffix}`;

      const rawCustomerId = Number(body.customerId);
      const customerId =
        !isNaN(rawCustomerId) && Number.isInteger(rawCustomerId)
          ? rawCustomerId
          : undefined;

      // Tentukan akun kas tujuan (menggunakan ID akun dari body, operator, atau cari akun kasir aktif secara otomatis)
      let targetAccountId = Number(body.accountId);
      if (isNaN(targetAccountId) || !targetAccountId) {
        targetAccountId = operator.accountId ?? 0;
      }

      if (!targetAccountId) {
        const defaultAccount = await tx.cashAccount.findFirst({
          where: { active: true },
          select: { id: true },
        });
        if (defaultAccount) {
          targetAccountId = defaultAccount.id;
        }
      }

      // 1. Simpan Transaksi Penjualan
      const created = await tx.sale.create({
        data: {
          invoiceNumber,
          subtotal,
          tax,
          total,
          paidAmount,
          change,
          paymentMethod,
          ...(customerId ? { customerId } : {}),
          ...(targetAccountId ? { accountId: targetAccountId } : {}),
          items: {
            create: items.map(({ product, quantity, unitPrice, total }) => ({
              productId: product.id,
              quantity,
              unitPrice,
              costPrice: product.costPrice,
              total,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });

      // 2. Buat Catatan Mutasi Kas di MoneyMovement
      if (targetAccountId) {
        await tx.moneyMovement.create({
          data: {
            type: MoneyMovementType.IN,
            amount: total, // Menyimpan total penjualan kotor
            toAccountId: targetAccountId,
            operatorId: operator.id,
            note: `Penjualan Kasir #${invoiceNumber}`,
            reference: `SALE-${created.id}`,
          },
        });
      }

      return created;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Sale POST Error:", error);

    const message = error instanceof Error ? error.message : "Transaksi gagal disimpan";
    if (
      message.startsWith("Produk") ||
      message.startsWith("Satu") ||
      message.startsWith("Stok") ||
      message.startsWith("Pembayaran")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: "Database belum terhubung. Jalankan PostgreSQL lalu coba lagi." },
        { status: 503 }
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Nomor invoice sudah digunakan, silakan coba lagi." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Gagal menyimpan transaksi: ${error.message}` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Transaksi gagal disimpan" }, { status: 500 });
  }
}