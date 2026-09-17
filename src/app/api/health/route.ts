import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGoogleOAuthConfig } from "@/lib/google-oauth";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "connected", googleOAuth: getGoogleOAuthConfig() ? "configured" : "not_configured" });
  } catch {
    return NextResponse.json({ status: "error", database: "unavailable" }, { status: 503 });
  }
}
