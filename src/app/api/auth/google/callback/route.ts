import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { getGoogleOAuthConfig } from "@/lib/google-oauth";

type GoogleProfile = { sub?: string; email?: string; name?: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state");
  if (!code || !state || !expectedState || state !== expectedState) return NextResponse.redirect(new URL("/login?error=google_state", request.url));
  const config = getGoogleOAuthConfig();
  if (!config) return NextResponse.redirect(new URL("/login?error=google_config", request.url));
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code" }) });
    if (!tokenResponse.ok) throw new Error("Google token exchange failed");
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) throw new Error("Google access token missing");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!profileResponse.ok) throw new Error("Google profile lookup failed");
    const profile = await profileResponse.json() as GoogleProfile;
    if (!profile.sub || !profile.email) throw new Error("Google profile incomplete");
    const email = profile.email.toLowerCase();
    let operator = await prisma.operator.findFirst({ where: { googleId: profile.sub } });
    if (!operator) operator = await prisma.operator.findFirst({ where: { email } });
    if (!operator) {
      const storeName = profile.name ? `Toko ${profile.name}` : "Toko Baru";
      operator = await prisma.$transaction(async (tx) => {
        const account = await tx.account.create({ data: { name: `${storeName}-${Date.now()}` } });
        const workspace = await tx.workspace.create({ data: { name: storeName, account: { connect: { id: account.id } } } });
        const created = await tx.operator.create({ data: { name: profile.name || email.split("@")[0], username: email, email, googleId: profile.sub, passwordHash: randomBytes(32).toString("hex"), role: "OWNER", accountId: account.id } });
        await tx.workspace.update({ where: { id: workspace.id }, data: { ownerId: created.id } });
        await tx.operatorWorkspace.create({ data: { operatorId: created.id, workspaceId: workspace.id, role: "OWNER" } });
        await tx.storeSetting.create({ data: { storeName, accountId: account.id } });
        return created;
      });
    } else if (!operator.googleId || !operator.email) {
      operator = await prisma.operator.update({ where: { id: operator.id }, data: { googleId: profile.sub, email } });
    }
    await createSession(operator.id);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_failed", request.url));
  }
}
