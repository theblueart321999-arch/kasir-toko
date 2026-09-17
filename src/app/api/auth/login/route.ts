import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body wajib berupa objek." }, { status: 400 });
  }
  const { username, password } = body as { username?: unknown; password?: unknown };
  if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
    return NextResponse.json({ error: "Username dan password wajib diisi." }, { status: 400 });
  }
  const operator = await prisma.operator.findUnique({ where: { username: username.trim().toLowerCase() } });
  if (!operator || !operator.active || !(await bcrypt.compare(password, operator.passwordHash))) {
    return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
  }
  await createSession(operator.id);
  return NextResponse.json({ operator: { id: operator.id, name: operator.name, username: operator.username, role: operator.role } });
}
