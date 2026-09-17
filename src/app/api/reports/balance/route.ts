import { NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await getCurrentOperator())) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  try {
    const [accounts, products, unpaidPurchases, receivables, payables] = await Promise.all([
      prisma.cashAccount.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        include: { fromMovements: { select: { amount: true } }, toMovements: { select: { amount: true } } },
      }),
      prisma.product.findMany({ select: { id: true, name: true, stock: true, price: true } }),
      prisma.purchase.findMany({
        where: { status: "COMPLETED", paymentStatus: { in: ["UNPAID", "PARTIAL"] } },
        orderBy: { createdAt: "asc" },
        select: { id: true, invoiceNumber: true, total: true, paymentStatus: true, createdAt: true, supplier: { select: { name: true } } },
      }),
      prisma.receivable.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" } }),
      prisma.payable.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" } }),
    ]);
    const accountBalances = accounts.map(({ fromMovements, toMovements, ...account }) => ({
      ...account,
      balance: account.openingBalance + toMovements.reduce((sum, movement) => sum + movement.amount, 0) - fromMovements.reduce((sum, movement) => sum + movement.amount, 0),
    }));
    const debt = unpaidPurchases.reduce((sum, purchase) => sum + purchase.total, 0) + payables.reduce((sum, item) => sum + item.amount - item.paidAmount, 0);
    const receivable = receivables.reduce((sum, item) => sum + item.amount - item.paidAmount, 0);
    const productValue = products.reduce((sum, product) => sum + product.stock * product.price, 0);
    const cash = accountBalances.reduce((sum, account) => sum + account.balance, 0);
    return NextResponse.json({
      summary: { debt, receivable, productValue, cash, total: cash + receivable + productValue - debt },
      accounts: accountBalances,
      receivables,
      payables: [...unpaidPurchases.map((purchase) => ({ ...purchase, supplierName: purchase.supplier.name, amount: purchase.total })), ...payables],
    });
  } catch {
    return NextResponse.json({ error: "Laporan saldo gagal diambil" }, { status: 503 });
  }
}
