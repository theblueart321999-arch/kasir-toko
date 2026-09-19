import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Memastikan Next.js selalu mengambil data terbaru dari database (tanpa cache)
export const dynamic = "force-dynamic";
export const revalidate = 0;

function dates(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const todayStr = new Date().toISOString().slice(0, 10);

  const from = fromParam || todayStr;
  const to = toParam || from;

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    from > to
  ) {
    throw new Error("Rentang tanggal tidak valid");
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  // Penyesuaian WIB (UTC+7)
  fromDate.setHours(fromDate.getHours() - 7);
  toDate.setHours(toDate.getHours() + 17);

  return {
    from: fromDate,
    to: toDate,
    rawFrom: from,
    rawTo: to,
  };
}

export async function GET(request: NextRequest) {
  if (!(await getCurrentOperator())) {
    return NextResponse.json(
      {
        error: "Autentikasi diperlukan",
      },
      {
        status: 401,
      }
    );
  }

  let range: ReturnType<typeof dates>;

  try {
    range = dates(request);
  } catch {
    return NextResponse.json(
      {
        error: "Format tanggal harus YYYY-MM-DD dan from <= to",
      },
      {
        status: 400,
      }
    );
  }

  const where = {
    gte: range.from,
    lte: range.to,
  };

  try {
    const [
      sales,
      purchases,
      saleReturns,
      purchaseReturns,
      movements,
      lowStock,
      paymentBreakdown,
      purchasePaymentBreakdown,
      topProducts,
      saleRows,
      purchaseRows,
      saleReturnRows,
      purchaseReturnRows,
      movementRows,
      saleItemsForProfit,
    ] = await Promise.all([
      // =========================
      // PENJUALAN
      // =========================
      prisma.sale.aggregate({
        where: {
          createdAt: where,
          status: "COMPLETED",
        },
        _sum: {
          total: true,
        },
        _count: {
          _all: true,
        },
      }),

      // =========================
      // PEMBELIAN
      // =========================
      prisma.purchase.aggregate({
        where: {
          createdAt: where,
          status: "COMPLETED",
        },
        _sum: {
          total: true,
        },
        _count: {
          _all: true,
        },
      }),

      // =========================
      // RETUR PENJUALAN
      // =========================
      prisma.saleReturn.aggregate({
        where: {
          createdAt: where,
          status: "COMPLETED",
        },
        _sum: {
          total: true,
        },
        _count: {
          _all: true,
        },
      }),

      // =========================
      // RETUR PEMBELIAN
      // =========================
      prisma.purchaseReturn.aggregate({
        where: {
          createdAt: where,
          status: "COMPLETED",
        },
        _sum: {
          total: true,
        },
        _count: {
          _all: true,
        },
      }),

      // =========================
      // MUTASI UANG
      // =========================
      prisma.moneyMovement.groupBy({
        by: ["type"],
        where: {
          createdAt: where,
        },
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
      }),

      // =========================
      // STOK MENIPIS
      // =========================
      prisma.product.findMany({
        where: {
          stock: {
            lte: 10,
          },
        },
        orderBy: {
          stock: "asc",
        },
        take: 10,
        select: {
          id: true,
          sku: true,
          name: true,
          stock: true,
          unit: true,
        },
      }),

      // =========================
      // METODE PEMBAYARAN PENJUALAN
      // =========================
      prisma.sale.groupBy({
        by: ["paymentMethod"],
        where: {
          createdAt: where,
          status: "COMPLETED",
        },
        _sum: {
          total: true,
        },
        _count: {
          _all: true,
        },
      }),

      // =========================
      // STATUS PEMBAYARAN PEMBELIAN
      // =========================
      prisma.purchase.groupBy({
        by: ["paymentStatus"],
        where: {
          createdAt: where,
          status: "COMPLETED",
        },
        _sum: {
          total: true,
        },
        _count: {
          _all: true,
        },
      }),

      // =========================
      // PRODUK TERLARIS
      // =========================
      prisma.saleItem.groupBy({
        by: ["productId"],
        where: {
          sale: {
            createdAt: where,
            status: "COMPLETED",
          },
        },
        _sum: {
          quantity: true,
          total: true,
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 100,
      }),

      // =========================
      // DETAIL PENJUALAN
      // =========================
      prisma.sale.findMany({
        where: {
          createdAt: where,
          status: "COMPLETED",
        },
        select: {
          total: true,
          createdAt: true,
          customer: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      // =========================
      // DETAIL PEMBELIAN
      // =========================
      prisma.purchase.findMany({
        where: {
          createdAt: where,
          status: "COMPLETED",
        },
        select: {
          total: true,
          createdAt: true,
          supplier: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      // =========================
      // DETAIL RETUR PENJUALAN
      // =========================
      prisma.saleReturn.findMany({
        where: {
          createdAt: where,
          status: "COMPLETED",
        },
        select: {
          total: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      // =========================
      // DETAIL RETUR PEMBELIAN
      // =========================
      prisma.purchaseReturn.findMany({
        where: {
          createdAt: where,
          status: "COMPLETED",
        },
        select: {
          total: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      // =========================
      // DETAIL MUTASI UANG
      // =========================
      prisma.moneyMovement.findMany({
        where: {
          createdAt: where,
        },
        select: {
          type: true,
          amount: true,
          operator: {
            select: {
              name: true,
            },
          },
        },
      }),

      // =========================
      // ITEM PENJUALAN UNTUK HITUNG HPP
      // =========================
      prisma.saleItem.findMany({
        where: {
          sale: {
            createdAt: where,
            status: "COMPLETED",
          },
        },
        select: {
          quantity: true,
          total: true,
          product: {
            select: {
              id: true,
              costPrice: true,
            },
          },
        },
      }),
    ]);

    // ==========================================
    // DEBUG
    // ==========================================
    console.log("=== DEBUG SUMMARY REPORT ===");
    console.log(
      "1. Param Tanggal Raw:",
      range.rawFrom,
      "s/d",
      range.rawTo
    );

    console.log("2. Query Date Range (UTC):", where);

    console.log(
      "3. Raw Movements GroupBy:",
      JSON.stringify(movements, null, 2)
    );

    console.log(
      "4. Movement Rows:",
      JSON.stringify(movementRows, null, 2)
    );

    console.log("============================");

    // =========================
    // PRODUK TOP
    // =========================
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: topProducts.map((p) => p.productId),
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
      },
    });

    // =========================
    // TOTAL PENJUALAN
    // =========================
    const salesTotal = sales._sum.total ?? 0;

    // =========================
    // HITUNG HPP
    // =========================
    const costOfGoodsSold = saleItemsForProfit.reduce(
      (total, item) => {
        return (
          total +
          item.quantity * (item.product?.costPrice ?? 0)
        );
      },
      0
    );

    // =========================
    // LABA KOTOR
    // =========================
    const estimatedProfit =
      salesTotal - costOfGoodsSold;

    // =========================
    // MUTASI UANG
    // =========================

    // Total semua pemasukan dari MoneyMovement
    const totalMoneyIn =
      movements.find(
        (item) =>
          item.type === "IN" ||
          item.type === ("in" as string)
      )?._sum.amount ?? 0;

    // Total semua pengeluaran dari MoneyMovement
    const expense =
      movements.find(
        (item) =>
          item.type === "OUT" ||
          item.type === ("out" as string)
      )?._sum.amount ?? 0;

    // =====================================================
    // PEMASUKAN LAIN
    // =====================================================
    // Penjualan tidak boleh masuk ke Pemasukan Lain.
    //
    // Jika transaksi penjualan juga membuat MoneyMovement
    // dengan type IN, maka total tersebut dikurangi total
    // penjualan.
    //
    // Contoh:
    // Penjualan       = 1.000.000
    // MoneyMovement IN = 1.200.000
    // Pemasukan Lain  =   200.000
    //
    const otherIncome = Math.max(
      0,
      totalMoneyIn - salesTotal
    );

    // =========================
    // OPERATOR RANKING
    // =========================
    const operatorMap = new Map<string, number>();

    movementRows.forEach((row) => {
      const operatorName =
        row.operator?.name || "Umum";

      const current =
        operatorMap.get(operatorName) ?? 0;

      const isExpense =
        row.type === "OUT" ||
        row.type === ("out" as string);

      operatorMap.set(
        operatorName,
        current +
          (isExpense ? -row.amount : row.amount)
      );
    });

    // =========================
    // GROUP BY TANGGAL
    // =========================
    const byDate = (
      rows: {
        createdAt: Date;
        total: number;
      }[]
    ) => {
      const result = new Map<string, number>();

      rows.forEach((row) => {
        const key = row.createdAt
          .toISOString()
          .slice(0, 10);

        result.set(
          key,
          (result.get(key) ?? 0) + row.total
        );
      });

      return [...result].map(
        ([date, total]) => ({
          date,
          total,
        })
      );
    };

    // =========================
    // CUSTOMER / SUPPLIER RANKING
    // =========================
    const ranking = (
      rows: {
        total: number;
        customer?: {
          name: string;
        } | null;
        supplier?: {
          name: string;
        } | null;
      }[],
      key: "customer" | "supplier"
    ) => {
      const result = new Map<string, number>();

      rows.forEach((row) => {
        const name =
          row[key]?.name || "Umum";

        result.set(
          name,
          (result.get(name) ?? 0) + row.total
        );
      });

      return [...result]
        .map(([name, total]) => ({
          name,
          total,
        }))
        .sort(
          (a, b) => b.total - a.total
        )
        .slice(0, 10);
    };

    // =========================
    // RESPONSE
    // =========================
    return NextResponse.json({
      range: {
        from: range.rawFrom,
        to: range.rawTo,
      },

      // =========================
      // PENJUALAN
      // =========================
      sales: {
        total: salesTotal,
        count: sales._count._all,
      },

      // =========================
      // PEMBELIAN
      // =========================
      purchases: {
        total: purchases._sum.total ?? 0,
        count: purchases._count._all,
      },

      // =========================
      // RETUR
      // =========================
      returns: {
        sales: saleReturns._sum.total ?? 0,
        salesCount: saleReturns._count._all,

        purchases:
          purchaseReturns._sum.total ?? 0,
        purchasesCount:
          purchaseReturns._count._all,
      },

      // =========================
      // MUTASI UANG
      // =========================
      movements: movements.map((m) => ({
        type: m.type,
        total: m._sum.amount ?? 0,
        count: m._count._all,
      })),

      // =========================
      // KEUANGAN
      // =========================
      financial: {
        // PENTING:
        // Ini sekarang hanya pemasukan lain,
        // bukan total penjualan.
        income: otherIncome,

        // Pengeluaran lain
        expense,

        // Laba kotor penjualan
        estimatedProfit,

        // HPP
        costOfGoodsSold,
      },

      // =========================
      // OPERATOR
      // =========================
      operatorRanking: [...operatorMap]
        .map(([name, total]) => ({
          name,
          total,
        }))
        .sort(
          (a, b) => b.total - a.total
        ),

      // =========================
      // GRAFIK
      // =========================
      salesByDate: byDate(saleRows),

      purchasesByDate:
        byDate(purchaseRows),

      saleReturnsByDate:
        byDate(saleReturnRows),

      purchaseReturnsByDate:
        byDate(purchaseReturnRows),

      // =========================
      // CUSTOMER & SUPPLIER
      // =========================
      customerRanking: ranking(
        saleRows,
        "customer"
      ),

      supplierRanking: ranking(
        purchaseRows,
        "supplier"
      ),

      // =========================
      // PEMBAYARAN
      // =========================
      paymentBreakdown,

      purchasePaymentBreakdown,

      // =========================
      // PRODUK TERLARIS
      // =========================
      topProducts: topProducts.map(
        (item) => ({
          ...item,

          product: products.find(
            (p) =>
              p.id === item.productId
          ),
        })
      ),

      // =========================
      // STOK MENIPIS
      // =========================
      lowStock,
    });
  } catch (error) {
    console.error(
      "Laporan summary error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ringkasan laporan gagal diambil",
      },
      {
        status: 503,
      }
    );
  }
}