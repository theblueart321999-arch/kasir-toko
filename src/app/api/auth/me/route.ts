import { NextResponse } from "next/server";
import { getCurrentOperator, refreshCurrentSession } from "@/lib/auth";

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Belum terautentikasi." }, { status: 401 });
  await refreshCurrentSession();
  return NextResponse.json({ operator: { id: operator.id, name: operator.name, email: operator.email, username: operator.username, role: operator.role, avatarUrl: operator.avatarUrl } }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
