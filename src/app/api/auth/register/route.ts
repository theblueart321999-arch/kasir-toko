import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const storeName = typeof body?.storeName === "string" ? body.storeName.trim() : "";
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!name || !storeName || !username || password.length < 8) {
    return NextResponse.json({ error: "Nama, nama toko, username, dan password minimal 8 karakter wajib diisi." }, { status: 400 });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({ data: { name: storeName } });
      const workspace = await tx.workspace.create({ data: { name: storeName, account: { connect: { id: account.id } } } });
      const operator = await tx.operator.create({
        data: { name, username, passwordHash: await bcrypt.hash(password, 12), role: "OWNER", accountId: account.id },
      });
      await tx.workspace.update({ where: { id: workspace.id }, data: { ownerId: operator.id } });
      await tx.operatorWorkspace.create({ data: { operatorId: operator.id, workspaceId: workspace.id, role: "OWNER" } });
      await tx.storeSetting.create({ data: { storeName, accountId: account.id } });
      return operator;
    });
    await createSession(result.id);
    return NextResponse.json({ operator: { id: result.id, name: result.name, username: result.username, role: result.role } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Username atau nama toko sudah digunakan." }, { status: 409 });
  }
}
