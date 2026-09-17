import { NextRequest, NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseDate(value: string | null, fallback: Date) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  return new Date(`${value}T00:00:00.000Z`);
}

export async function GET(request: NextRequest) {
  if (!(await getCurrentOperator())) {
    return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  }

  const now = new Date();
  const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 6);
  const from = parseDate(request.nextUrl.searchParams.get("from"), defaultFrom);
  const to = parseDate(request.nextUrl.searchParams.get("to"), defaultTo);
  const group = request.nextUrl.searchParams.get("group") === "month" ? "month" : "day";

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: "Rentang tanggal tidak valid" }, { status: 400 });
  }

  try {
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: from, lt: new Date(to.getTime() + 86400000) }, status: "COMPLETED" },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const values = new Map<string, number>();
    for (const sale of sales) {
      const date = sale.createdAt.toISOString();
      const key = group === "month" ? date.slice(0, 7) : date.slice(0, 10);
      values.set(key, (values.get(key) ?? 0) + sale.total);
    }

    const points: { key: string; label: string; dateLabel: string; total: number }[] = [];
    if (group === "month") {
      const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
      const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 7);
        points.push({
          key,
          label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(cursor),
          dateLabel: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(cursor),
          total: values.get(key) ?? 0,
        });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    } else {
      const cursor = new Date(from);
      while (cursor <= to) {
        const key = cursor.toISOString().slice(0, 10);
        points.push({
          key,
          label: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(cursor),
          dateLabel: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(cursor),
          total: values.get(key) ?? 0,
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    return NextResponse.json({ points });
  } catch {
    return NextResponse.json({ error: "Grafik penjualan gagal diambil" }, { status: 503 });
  }
}
