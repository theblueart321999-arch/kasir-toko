import { Prisma, PurchasePaymentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const canManage = (role: string) => role === "ADMIN" || role === "OWNER";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator)
    return NextResponse.json(
      { error: "Autentikasi diperlukan" },
      { status: 401 },
    );

  try {
    return NextResponse.json(
      await prisma.purchase.findMany({
        include: {
          supplier: true,
          operator: { select: { id: true, name: true, username: true } },
          items: { include: { product: true } },
          returns: {
            include: {
              items: { include: { product: true } },
              operator: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  } catch {
    return NextResponse.json(
      { error: "Riwayat pembelian gagal diambil" },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !canManage(operator.role))
    return NextResponse.json(
      { error: "Anda tidak memiliki izin membuat pembelian" },
      { status: 403 },
    );

  const body = await request.json().catch(() => null);
  if (
    !isRecord(body) ||
    (body.supplierId !== undefined &&
      body.supplierId !== null &&
      body.supplierId !== "" &&
      !Number.isInteger(body.supplierId)) ||
    !Array.isArray(body.items) ||
    !body.items.length
  ) {
    return NextResponse.json(
      { error: "items wajib diisi dan supplier harus valid jika dipilih" },
      { status: 400 },
    );
  }

  const paymentStatus =
    typeof body.paymentStatus === "string" &&
    Object.values(PurchasePaymentStatus).includes(
      body.paymentStatus as PurchasePaymentStatus,
    )
      ? (body.paymentStatus as PurchasePaymentStatus)
      : PurchasePaymentStatus.PAID;

  const paymentMethod =
    typeof body.paymentMethod === "string" && body.paymentMethod.trim()
      ? body.paymentMethod.trim()
      : "CASH";

  const requestedPaidAmount = Number.isInteger(body.paidAmount)
    ? (body.paidAmount as number)
    : 0;

  if (requestedPaidAmount < 0)
    return NextResponse.json(
      { error: "Jumlah dibayar tidak valid" },
      { status: 400 },
    );

  const dueDate =
    typeof body.dueDate === "string" && body.dueDate
      ? new Date(`${body.dueDate}T00:00:00.000Z`)
      : null;

  if (
    paymentStatus !== PurchasePaymentStatus.PAID &&
    (!dueDate || Number.isNaN(dueDate.getTime()))
  ) {
    return NextResponse.json(
      {
        error: "Jatuh tempo wajib diisi untuk pembelian yang belum lunas",
      },
      { status: 400 },
    );
  }

  const quantities = new Map<number, { quantity: number; unitPrice: number }>();

  for (const raw of body.items) {
    if (
      !isRecord(raw) ||
      !Number.isInteger(raw.productId) ||
      !Number.isInteger(raw.quantity) ||
      (raw.quantity as number) <= 0 ||
      !Number.isInteger(raw.unitPrice) ||
      (raw.unitPrice as number) < 0
    ) {
      return NextResponse.json(
        { error: "Setiap item harus memiliki produk, jumlah, dan harga valid" },
        { status: 400 },
      );
    }
    const productId = raw.productId as number;
    const previous = quantities.get(productId);
    quantities.set(productId, {
      quantity: (previous?.quantity ?? 0) + (raw.quantity as number),
      unitPrice: raw.unitPrice as number,
    });
  }

  try {
    const purchase = await prisma.$transaction(
      async (tx) => {
        const selectedSupplierId =
          body.supplierId === undefined ||
          body.supplierId === null ||
          body.supplierId === ""
            ? null
            : (body.supplierId as number);

        const now = new Date();
        const pad = (value: number) => value.toString().padStart(2, "0");
        const anonymousName = `ANONIM_${pad(now.getHours())}_${pad(
          now.getMinutes(),
        )}_${pad(now.getSeconds())}_${pad(now.getDate())}_${pad(
          now.getMonth() + 1,
        )}_${now.getFullYear()}`;

        const supplier = selectedSupplierId
          ? await tx.supplier.findUnique({
              where: { id: selectedSupplierId },
            })
          : await tx.supplier.create({
              data: {
                name: anonymousName,
                notes: "Supplier otomatis untuk pembelian tanpa supplier.",
              },
            });

        if (!supplier || !supplier.active)
          throw new Error("Supplier tidak ditemukan atau tidak aktif");

        const products = await tx.product.findMany({
          where: { id: { in: [...quantities.keys()] } },
        });

        if (products.length !== quantities.size)
          throw new Error("Produk tidak ditemukan");

        const items = products.map((product) => {
          const input = quantities.get(product.id) as {
            quantity: number;
            unitPrice: number;
          };
          return {
            product,
            ...input,
            total: input.quantity * input.unitPrice,
          };
        });

        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const paidAmount =
          paymentStatus === PurchasePaymentStatus.PAID
            ? subtotal
            : paymentStatus === PurchasePaymentStatus.PARTIAL
              ? requestedPaidAmount
              : 0;

        if (
          paymentStatus === PurchasePaymentStatus.PARTIAL &&
          (paidAmount <= 0 || paidAmount >= subtotal)
        ) {
          throw new Error(
            "Jumlah dibayar harus lebih kecil dari total pembelian",
          );
        }

        const created = await tx.purchase.create({
          data: {
            invoiceNumber:
              typeof body.invoiceNumber === "string" &&
              body.invoiceNumber.trim()
                ? body.invoiceNumber.trim()
                : `PB-${Date.now()}-${Math.floor(Math.random() * 1000)
                    .toString()
                    .padStart(3, "0")}`,
            reference:
              typeof body.reference === "string" && body.reference.trim()
                ? body.reference.trim()
                : `SJ-${Date.now()}-${Math.floor(Math.random() * 1000)
                    .toString()
                    .padStart(3, "0")}`,
            supplierId: supplier.id,
            operatorId: operator.id,
            subtotal,
            total: subtotal,
            paymentMethod,
            paymentStatus,
            paidAmount,
            items: {
              create: items.map(({ product, quantity, unitPrice, total }) => ({
                productId: product.id,
                quantity,
                unitPrice,
                total,
              })),
            },
          },
          include: { supplier: true, items: { include: { product: true } } },
        });

        if (paymentStatus !== PurchasePaymentStatus.PAID) {
          await tx.payable.create({
            data: {
              supplierId: supplier.id,
              supplierName: supplier.name,
              reference: created.invoiceNumber,
              amount: subtotal - paidAmount,
              paidAmount: 0,
              dueDate,
              note: `Sisa pembelian ${created.invoiceNumber}`,
            },
          });
        }

        for (const item of items) {
          const updated = await tx.product.update({
            where: { id: item.product.id },
            data: {
              stock: { increment: item.quantity },
              costPrice: item.unitPrice,
            },
            select: { stock: true },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.product.id,
              operatorId: operator.id,
              type: "IN",
              quantity: item.quantity,
              beforeStock: item.product.stock,
              afterStock: updated.stock,
              note: `Pembelian dari ${supplier.name}`,
              reference: `PURCHASE-${created.id}`,
            },
          });
        }

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pembelian gagal disimpan";

    if (message.includes("tidak ditemukan") || message.includes("tidak aktif"))
      return NextResponse.json({ error: message }, { status: 400 });

    if (message.includes("Jumlah dibayar"))
      return NextResponse.json({ error: message }, { status: 400 });

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return NextResponse.json(
        { error: "Nomor invoice sudah digunakan" },
        { status: 409 },
      );

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    )
      return NextResponse.json(
        { error: "Transaksi sedang diproses, coba lagi" },
        { status: 409 },
      );

    return NextResponse.json(
      { error: "Pembelian gagal disimpan" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !canManage(operator.role)) {
    return NextResponse.json(
      { error: "Anda tidak memiliki izin untuk menghapus pembelian" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");

  if (!idParam) {
    return NextResponse.json(
      { error: "ID transaksi tidak valid" },
      { status: 400 },
    );
  }

  // Jika ID di skema Prisma bertipe Number, gunakan: const targetId = parseInt(idParam, 10);
  // Jika ID di skema Prisma bertipe String (UUID/CUID), gunakan: const targetId = idParam;
  // Jika Anda mendukung angka sebagai ID, sesuaikan parser di bawah:
  const numericId = parseInt(idParam, 10);
  const targetId = isNaN(numericId) ? idParam : numericId;

  try {
    await prisma.$transaction(
      async (tx) => {
        // 1. Cari data transaksi pembelian beserta item produknya
        // Pastikan 'include' ada agar properti 'items' terbaca oleh TypeScript
        const purchase = await tx.purchase.findUnique({
          where: { id: targetId as any },
          include: { items: true },
        });

        if (!purchase) {
          throw new Error("Transaksi pembelian tidak ditemukan");
        }

        // 2. Kurangi stok produk
        for (const item of purchase.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (product) {
            const updatedProduct = await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
              select: { stock: true },
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                operatorId: operator.id,
                type: "OUT",
                quantity: item.quantity,
                beforeStock: product.stock,
                afterStock: updatedProduct.stock,
                note: `Pembatalan/Hapus Pembelian INV: ${purchase.invoiceNumber}`,
                reference: `DELETE-PURCHASE-${purchase.id}`,
              },
            });
          }
        }

        // 3. Hapus hutang (Payable) jika ada
        await tx.payable.deleteMany({
          where: { reference: purchase.invoiceNumber },
        });

        // 4. Hapus item transaksi pembelian
        await tx.purchaseItem.deleteMany({
          where: { purchaseId: purchase.id },
        });

        // 5. Hapus transaksi utama
        await tx.purchase.delete({
          where: { id: purchase.id },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return NextResponse.json({ message: "Transaksi berhasil dihapus" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menghapus transaksi";

    if (message.includes("tidak ditemukan")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Gagal menghapus transaksi dari database" },
      { status: 500 },
    );
  }
}
