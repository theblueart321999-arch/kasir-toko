import { PrismaClient } from "@prisma/client";
import { currentTenantId } from "@/lib/tenant";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

const tenantModels = new Set([
  "Product", "ProductCategory", "Customer", "Supplier", "Purchase", "PurchaseItem",
  "PurchaseReturn", "PurchaseReturnItem", "Sale", "SaleItem", "SaleReturn",
  "SaleReturnItem", "CashAccount", "MoneyMovement", "Receivable", "Payable",
  "StockMovement", "StoreSetting",
]);

// Every authenticated request gets its tenant from auth.ts. Keeping this at
// the client boundary prevents a missed where clause in an individual route
// from exposing another store.
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const accountId = currentTenantId();
        if (!accountId || !tenantModels.has(model)) return query(args);
        const scoped = args as Record<string, unknown>;
        if (["findUnique", "findFirst", "findMany", "count", "aggregate", "groupBy", "update", "updateMany", "delete", "deleteMany"].includes(operation)) {
          scoped.where = { ...((scoped.where as Record<string, unknown> | undefined) ?? {}), accountId };
        }
        if (operation === "create") scoped.data = { ...((scoped.data as Record<string, unknown> | undefined) ?? {}), accountId };
        if (operation === "createMany") {
          scoped.data = Array.isArray(scoped.data)
            ? scoped.data.map((item: Record<string, unknown>) => ({ ...item, accountId }))
            : { ...((scoped.data as Record<string, unknown> | undefined) ?? {}), accountId };
        }
        return query(scoped);
      },
    },
  },
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;
