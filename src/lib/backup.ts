import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Runs pg_dump without ever returning DATABASE_URL to the caller. */
export async function createPostgresBackup(outputFile: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL belum dikonfigurasi");
  await execFileAsync(process.env.PG_DUMP_PATH || "pg_dump", [
    "--dbname", databaseUrl, "--format", "custom", "--file", outputFile,
  ], { windowsHide: true, maxBuffer: 1024 * 1024 });
}
