import { NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_AVATAR_LENGTH = 2_000_000;

export async function PATCH(request: Request) {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Belum terautentikasi." }, { status: 401 });

  const body = await request.json().catch(() => null) as { avatarUrl?: unknown } | null;
  const avatarUrl = body?.avatarUrl;
  if (typeof avatarUrl !== "string" || avatarUrl.length > MAX_AVATAR_LENGTH || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(avatarUrl)) {
    return NextResponse.json({ error: "Format foto tidak valid atau ukurannya terlalu besar." }, { status: 400 });
  }

  const updated = await prisma.operator.update({
    where: { id: operator.id },
    data: { avatarUrl },
    select: { id: true, name: true, email: true, username: true, role: true, avatarUrl: true },
  });
  return NextResponse.json({ operator: updated });
}
