import { Prisma, ReturnStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const canManage = (role: string) =>
  role === "ADMIN" || role === "OWNER";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value);

export async function GET() {
  const operator = await getCurrentOperator();

  if (!operator) {
    return NextResponse.json(
      { error: "Autentikasi diperlukan" },
      { status: 401 }
    );
  }

  try {
    const returns = await prisma.purchaseReturn.findMany({
      where: {
        status: ReturnStatus.COMPLETED,
      },
      include: {
        purchase: {
          select: {
            id: true,
            invoiceNumber: true,
            supplier: true,
            createdAt: true,
          },
        },
        operator: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(returns);
  } catch (error) {
    console.error(
      "Gagal mengambil riwayat retur pembelian:",
      error
    );

    return NextResponse.json(
      { error: "Riwayat retur pembelian gagal diambil" },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  const operator = await getCurrentOperator();

  if (!operator) {
    return NextResponse.json(
      { error: "Autentikasi diperlukan" },
      { status: 401 }
    );
  }

  if (!canManage(operator.role)) {
    return NextResponse.json(
      {
        error:
          "Anda tidak memiliki izin membuat retur pembelian",
      },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body JSON tidak valid" },
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Data retur tidak valid" },
      { status: 400 }
    );
  }

  // Purchase.id sekarang String/CUID
  const purchaseId =
    typeof body.purchaseId === "string"
      ? body.purchaseId.trim()
      : "";

  if (
    !purchaseId ||
    typeof body.reason !== "string" ||
    !body.reason.trim() ||
    !Array.isArray(body.items) ||
    body.items.length === 0
  ) {
    return NextResponse.json(
      {
        error: "purchaseId, alasan, dan items wajib diisi",
      },
      { status: 400 }
    );
  }

  const reason = body.reason.trim();

  const quantities = new Map<number, number>();

  for (const raw of body.items) {
    if (!isRecord(raw)) {
      return NextResponse.json(
        {
          error:
            "Setiap item harus memiliki produk dan jumlah positif",
        },
        { status: 400 }
      );
    }

    const productId = raw.productId;
    const quantity = raw.quantity;

    if (
      !Number.isInteger(productId) ||
      !Number.isInteger(quantity) ||
      (quantity as number) <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Setiap item harus memiliki produk dan jumlah positif",
        },
        { status: 400 }
      );
    }

    const productIdNumber = productId as number;
    const quantityNumber = quantity as number;

    quantities.set(
      productIdNumber,
      (quantities.get(productIdNumber) ?? 0) + quantityNumber
    );
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Purchase.id adalah String/CUID
        const purchase = await tx.purchase.findUnique({
          where: {
            id: purchaseId,
          },
          include: {
            supplier: true,
          },
        });

        if (!purchase) {
          throw new Error("Pembelian tidak ditemukan");
        }

        if (purchase.status !== "COMPLETED") {
          throw new Error("Pembelian tidak dapat diretur");
        }

        // Ambil item pembelian langsung dari PurchaseItem.
        // Tidak menggunakan purchase.items agar tidak terkena
        // error relation "items does not exist on Purchase".
        const purchaseItems = await tx.purchaseItem.findMany({
          where: {
            purchaseId: purchase.id,
          },
        });

        // Ambil retur pembelian sebelumnya secara langsung.
        // Tidak menggunakan purchase.returns.
        const previousReturns =
          await tx.purchaseReturn.findMany({
            where: {
              purchaseId: purchase.id,
              status: ReturnStatus.COMPLETED,
            },
            include: {
              items: true,
            },
          });

        const returned = new Map<number, number>();

        for (const previous of previousReturns) {
          for (const item of previous.items) {
            returned.set(
              item.productId,
              (returned.get(item.productId) ?? 0) +
                item.quantity
            );
          }
        }

        const purchased = new Map(
          purchaseItems.map((item) => [
            item.productId,
            item,
          ])
        );

        const items = [];

        for (const [productId, quantity] of quantities.entries()) {
          const bought = purchased.get(productId);

          if (!bought) {
            throw new Error(
              "Produk tidak ada dalam pembelian"
            );
          }

          const alreadyReturned =
            returned.get(productId) ?? 0;

          const available =
            bought.quantity - alreadyReturned;

          if (quantity > available) {
            throw new Error(
              `Jumlah retur melebihi jumlah pembelian untuk produk ${productId}`
            );
          }

          items.push({
            productId,
            quantity,
            unitPrice: bought.unitPrice,
            total: bought.unitPrice * quantity,
          });
        }

        if (items.length === 0) {
          throw new Error("Tidak ada item retur");
        }

        // Pastikan stok mencukupi sebelum transaksi dibuat
        const products = await tx.product.findMany({
          where: {
            id: {
              in: items.map(
                (item) => item.productId
              ),
            },
          },
          select: {
            id: true,
            name: true,
            stock: true,
          },
        });

        const productMap = new Map(
          products.map((product) => [
            product.id,
            product,
          ])
        );

        for (const item of items) {
          const product = productMap.get(
            item.productId
          );

          if (!product) {
            throw new Error("Produk tidak ditemukan");
          }

          if (product.stock < item.quantity) {
            throw new Error(
              `Stok tidak cukup untuk mengembalikan ${product.name}`
            );
          }
        }

        const total = items.reduce(
          (sum, item) => sum + item.total,
          0
        );

        const created =
          await tx.purchaseReturn.create({
            data: {
              purchaseId: purchase.id,
              operatorId: operator.id,
              reason,
              total,
              status: ReturnStatus.COMPLETED,
              items: {
                create: items,
              },
            },
            include: {
              purchase: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          });

        // Kurangi stok karena barang dikembalikan ke supplier
        for (const item of items) {
          const product = productMap.get(
            item.productId
          );

          if (!product) {
            throw new Error("Produk tidak ditemukan");
          }

          const updated =
            await tx.product.update({
              where: {
                id: item.productId,
              },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
              select: {
                stock: true,
              },
            });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              operatorId: operator.id,
              type: "OUT",
              quantity: item.quantity,
              beforeStock: product.stock,
              afterStock: updated.stock,
              note: `Retur pembelian: ${reason}`,
              reference: `PURCHASE-RETURN-${created.id}`,
            },
          });
        }

        return created;
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return NextResponse.json(result, {
      status: 201,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Retur pembelian gagal disimpan";

    if (
      message.includes("tidak ditemukan") ||
      message.includes("tidak dapat") ||
      message.includes("tidak ada") ||
      message.includes("melebihi") ||
      message.includes("Stok")
    ) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        {
          error:
            "Transaksi sedang diproses, coba lagi",
        },
        { status: 409 }
      );
    }

    console.error(
      "Gagal menyimpan retur pembelian:",
      error
    );

    return NextResponse.json(
      { error: "Retur pembelian gagal disimpan" },
      { status: 500 }
    );
  }
}