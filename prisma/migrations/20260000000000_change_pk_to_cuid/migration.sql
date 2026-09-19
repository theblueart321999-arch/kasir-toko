-- Disable constraints temporarily to prevent dependency issues
SET CONSTRAINTS ALL DEFERRED;

-- 1. DROP FOREIGN KEYS
ALTER TABLE "SaleItem" DROP CONSTRAINT IF EXISTS "SaleItem_saleId_fkey";
ALTER TABLE "SaleReturn" DROP CONSTRAINT IF EXISTS "SaleReturn_saleId_fkey";
ALTER TABLE "SaleReturnItem" DROP CONSTRAINT IF EXISTS "SaleReturnItem_returnId_fkey";

ALTER TABLE "PurchaseItem" DROP CONSTRAINT IF EXISTS "PurchaseItem_purchaseId_fkey";
ALTER TABLE "PurchaseReturn" DROP CONSTRAINT IF EXISTS "PurchaseReturn_purchaseId_fkey";
ALTER TABLE "PurchaseReturnItem" DROP CONSTRAINT IF EXISTS "PurchaseReturnItem_returnId_fkey";

-- 2. ALTER SALE TABLES
ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "Sale_pkey";
ALTER TABLE "Sale" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Sale" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_pkey" PRIMARY KEY ("id");

ALTER TABLE "SaleItem" DROP CONSTRAINT IF EXISTS "SaleItem_pkey";
ALTER TABLE "SaleItem" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "SaleItem" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "SaleItem" ALTER COLUMN "saleId" TYPE TEXT USING "saleId"::text;
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id");

ALTER TABLE "SaleReturn" DROP CONSTRAINT IF EXISTS "SaleReturn_pkey";
ALTER TABLE "SaleReturn" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "SaleReturn" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "SaleReturn" ALTER COLUMN "saleId" TYPE TEXT USING "saleId"::text;
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_pkey" PRIMARY KEY ("id");

ALTER TABLE "SaleReturnItem" DROP CONSTRAINT IF EXISTS "SaleReturnItem_pkey";
ALTER TABLE "SaleReturnItem" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "SaleReturnItem" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "SaleReturnItem" ALTER COLUMN "returnId" TYPE TEXT USING "returnId"::text;
ALTER TABLE "SaleReturnItem" ADD CONSTRAINT "SaleReturnItem_pkey" PRIMARY KEY ("id");

-- 3. ALTER PURCHASE TABLES
ALTER TABLE "Purchase" DROP CONSTRAINT IF EXISTS "Purchase_pkey";
ALTER TABLE "Purchase" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Purchase" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id");

ALTER TABLE "PurchaseItem" DROP CONSTRAINT IF EXISTS "PurchaseItem_pkey";
ALTER TABLE "PurchaseItem" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "PurchaseItem" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "PurchaseItem" ALTER COLUMN "purchaseId" TYPE TEXT USING "purchaseId"::text;
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id");

ALTER TABLE "PurchaseReturn" DROP CONSTRAINT IF EXISTS "PurchaseReturn_pkey";
ALTER TABLE "PurchaseReturn" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "PurchaseReturn" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "PurchaseReturn" ALTER COLUMN "purchaseId" TYPE TEXT USING "purchaseId"::text;
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_pkey" PRIMARY KEY ("id");

ALTER TABLE "PurchaseReturnItem" DROP CONSTRAINT IF EXISTS "PurchaseReturnItem_pkey";
ALTER TABLE "PurchaseReturnItem" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "PurchaseReturnItem" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "PurchaseReturnItem" ALTER COLUMN "returnId" TYPE TEXT USING "returnId"::text;
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_pkey" PRIMARY KEY ("id");

-- 4. ALTER OTHER TRANSACTION TABLES
ALTER TABLE "StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_pkey";
ALTER TABLE "StockMovement" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "StockMovement" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id");

ALTER TABLE "MoneyMovement" DROP CONSTRAINT IF EXISTS "MoneyMovement_pkey";
ALTER TABLE "MoneyMovement" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "MoneyMovement" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "MoneyMovement" ADD CONSTRAINT "MoneyMovement_pkey" PRIMARY KEY ("id");

ALTER TABLE "Receivable" DROP CONSTRAINT IF EXISTS "Receivable_pkey";
ALTER TABLE "Receivable" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Receivable" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_pkey" PRIMARY KEY ("id");

ALTER TABLE "Payable" DROP CONSTRAINT IF EXISTS "Payable_pkey";
ALTER TABLE "Payable" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Payable" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_pkey" PRIMARY KEY ("id");

-- 5. RE-ADD FOREIGN KEYS
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaleReturnItem" ADD CONSTRAINT "SaleReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "SaleReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "PurchaseReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;