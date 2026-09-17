import { PrismaClient, Category, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const products = [
  ["SMN-001", "Semen Tiga Roda 40kg", Category.BANGUNAN, 68000, 24, "sak"],
  ["BSI-010", "Besi Beton 10mm", Category.BANGUNAN, 89000, 18, "batang"],
  ["CAT-005", "Cat Tembok Putih 5kg", Category.BANGUNAN, 145000, 9, "kaleng"],
  ["PPK-101", "Pupuk NPK Mutiara 1kg", Category.PERTANIAN, 28500, 32, "bungkus"],
  ["ALP-201", "Cangkul Baja Premium", Category.PERTANIAN, 115000, 7, "pcs"],
  ["SLG-012", "Selang Air 1/2 inch", Category.PERTANIAN, 12000, 46, "meter"],
  ["BBT-001", "Batu Bata Merah", Category.BANGUNAN, 1200, 580, "pcs"],
  ["BNH-301", "Benih Jagung Hibrida", Category.PERTANIAN, 42000, 15, "bungkus"],
] as const;

async function main() {
  const account = await prisma.account.findFirst({ orderBy: { id: "asc" } })
    ?? await prisma.account.create({ data: { name: "Toko Utama" } });
  const workspace = await prisma.workspace.findFirst({ orderBy: { id: "asc" } })
    ?? await prisma.workspace.create({ data: { name: account.name, account: { connect: { id: account.id } } } });
  const passwordHash = await bcrypt.hash("admin123", 12);
  const kasirPasswordHash = await bcrypt.hash("kasir123", 12);
  await prisma.operator.upsert({
    where: { username: "admin" },
    update: { name: "Demo Admin", passwordHash, role: Role.ADMIN, active: true, accountId: account.id },
    create: { name: "Demo Admin", username: "admin", passwordHash, role: Role.ADMIN, accountId: account.id },
  });
  await prisma.cashAccount.upsert({ where: { name: "Kas Utama" }, update: { active: true, accountId: account.id }, create: { name: "Kas Utama", type: "CASH", accountId: account.id } });
  await prisma.cashAccount.upsert({ where: { name: "Bank" }, update: { active: true, accountId: account.id }, create: { name: "Bank", type: "BANK", accountId: account.id } });
  await prisma.operator.upsert({
    where: { username: "kasir" },
    update: { name: "Demo Kasir", passwordHash: kasirPasswordHash, role: Role.KASIR, active: true, accountId: account.id },
    create: { name: "Demo Kasir", username: "kasir", passwordHash: kasirPasswordHash, role: Role.KASIR, accountId: account.id },
  });

  const buildingCategory = await prisma.productCategory.upsert({
    where: { slug: "bangunan" },
    update: { name: "Bangunan", legacyCategory: Category.BANGUNAN, accountId: account.id },
    create: { name: "Bangunan", slug: "bangunan", legacyCategory: Category.BANGUNAN, accountId: account.id },
  });
  const farmingCategory = await prisma.productCategory.upsert({
    where: { slug: "pertanian" },
    update: { name: "Pertanian", legacyCategory: Category.PERTANIAN, accountId: account.id },
    create: { name: "Pertanian", slug: "pertanian", legacyCategory: Category.PERTANIAN, accountId: account.id },
  });

  for (const [sku, name, category, price, stock, unit] of products) {
    const categoryId = category === Category.BANGUNAN ? buildingCategory.id : farmingCategory.id;
    await prisma.product.upsert({ where: { sku }, update: { name, category, categoryId, price, stock, unit, accountId: account.id }, create: { sku, name, category, categoryId, price, stock, unit, accountId: account.id } });
  }
  await prisma.operatorWorkspace.upsert({ where: { operatorId_workspaceId: { operatorId: (await prisma.operator.findUniqueOrThrow({ where: { username: "admin" } })).id, workspaceId: workspace.id } }, update: { role: Role.ADMIN }, create: { operatorId: (await prisma.operator.findUniqueOrThrow({ where: { username: "admin" } })).id, workspaceId: workspace.id, role: Role.ADMIN } });
  await prisma.operatorWorkspace.upsert({ where: { operatorId_workspaceId: { operatorId: (await prisma.operator.findUniqueOrThrow({ where: { username: "kasir" } })).id, workspaceId: workspace.id } }, update: { role: Role.KASIR }, create: { operatorId: (await prisma.operator.findUniqueOrThrow({ where: { username: "kasir" } })).id, workspaceId: workspace.id, role: Role.KASIR } });
  if (!workspace.ownerId) await prisma.workspace.update({ where: { id: workspace.id }, data: { ownerId: (await prisma.operator.findUniqueOrThrow({ where: { username: "admin" } })).id } });
}

main().finally(() => prisma.$disconnect());
