import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentOperator } from "@/lib/auth";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  const operator = await getCurrentOperator();
  if (!operator || !["ADMIN", "OWNER"].includes(operator.role)) return NextResponse.json({ error: "Anda tidak memiliki izin mengunggah gambar" }, { status: 403 });
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type)) return NextResponse.json({ error: "Format gambar harus JPG, PNG, atau WebP" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Ukuran gambar maksimal 5 MB" }, { status: 400 });
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${crypto.randomUUID()}.${extension}`;
  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "products");
  try {
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, filename), Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "Gambar gagal disimpan" }, { status: 500 });
  }
  return NextResponse.json({ imageUrl: `/uploads/products/${filename}` });
}
