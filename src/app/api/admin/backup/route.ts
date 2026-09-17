import { NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";
import { createPostgresBackup } from "@/lib/backup";
import { promises as fs } from "node:fs";
import path from "node:path";

export async function GET() {
  const operator = await getCurrentOperator();
  if (!operator) return NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 });
  if (!["OWNER", "ADMIN"].includes(operator.role)) return NextResponse.json({ error: "Tidak memiliki izin backup" }, { status: 403 });
  const directory = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, `backup-${operator.accountId ?? "store"}-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`);
  try {
    await createPostgresBackup(file);
    return NextResponse.json({ ok: true, file: path.basename(file), message: "Backup tersimpan di server." });
  } catch {
    await fs.rm(file, { force: true }).catch(() => undefined);
    return NextResponse.json({ error: "Backup gagal dibuat. Pastikan pg_dump tersedia di server." }, { status: 503 });
  }
}
