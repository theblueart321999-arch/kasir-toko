import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();
const tenantTables = [
  "Product", "ProductCategory", "Customer", "Supplier", "Purchase",
  "PurchaseItem", "PurchaseReturn", "PurchaseReturnItem", "Sale", "SaleItem",
  "SaleReturn", "SaleReturnItem", "CashAccount", "MoneyMovement",
  "Receivable", "Payable", "StockMovement", "StoreSetting",
];

async function main() {
  const account = await prisma.account.findFirst({ orderBy: { id: "asc" } })
    ?? await prisma.account.create({ data: { name: "Toko Utama" } });
  const workspace = await prisma.workspace.findFirst({ orderBy: { id: "asc" } })
    ?? await prisma.workspace.create({ data: { name: account.name, account: { connect: { id: account.id } } } });
  if (!account.workspaceId) await prisma.account.update({ where: { id: account.id }, data: { workspaceId: workspace.id } });

  for (const table of tenantTables) {
    await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "accountId" = $1 WHERE "accountId" IS NULL`, account.id);
  }
  const operators = await prisma.operator.findMany();
  for (const operator of operators) {
    if (!operator.accountId) await prisma.operator.update({ where: { id: operator.id }, data: { accountId: account.id } });
    await prisma.operatorWorkspace.upsert({
      where: { operatorId_workspaceId: { operatorId: operator.id, workspaceId: workspace.id } },
      update: { active: true, role: operator.role },
      create: { operatorId: operator.id, workspaceId: workspace.id, role: operator.role },
    });
  }
  const owner = operators.find((operator) => operator.role === Role.OWNER) ?? operators[0];
  if (owner && !workspace.ownerId) await prisma.workspace.update({ where: { id: workspace.id }, data: { ownerId: owner.id } });
}

main().finally(() => prisma.$disconnect());
