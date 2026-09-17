import { NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Belum terautentikasi." }, { status: 401 });
  return NextResponse.json({ operator: { id: operator.id, name: operator.name, username: operator.username, role: operator.role, avatarUrl: operator.avatarUrl } });
}
