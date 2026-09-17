import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createPostgresBackup } from "../src/lib/backup";

const directory = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
await mkdir(directory, { recursive: true });
const file = path.join(directory, `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`);
await createPostgresBackup(file);
console.log(`PostgreSQL backup written to ${file}`);
