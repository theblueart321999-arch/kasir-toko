import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { setTenant } from "@/lib/tenant";

export const SESSION_COOKIE = "tanibangun_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 365 * 10;

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(operatorId: number) {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      operatorId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function getCurrentOperator() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { operator: true },
  });
  if (!session || session.expiresAt <= new Date() || !session.operator.active) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  const operator = session.operator;
  if (!operator.accountId) return null;
  const membership = await prisma.operatorWorkspace.findFirst({
    where: { operatorId: operator.id, active: true, workspace: { account: { id: operator.accountId } } },
  });
  if (!membership) return null;
  setTenant(operator.accountId);
  return operator;
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}
