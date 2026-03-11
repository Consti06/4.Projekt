import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { isValidAdminSessionToken, ADMIN_SESSION_COOKIE } from "@/lib/admin-session";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeExtension(filename: string, mimeType: string): string {
  const extension = path.extname(filename).toLowerCase();
  if (extension && /^[.a-z0-9]+$/.test(extension)) {
    return extension;
  }

  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/avif":
      return ".avif";
    default:
      return ".bin";
  }
}

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidAdminSessionToken(sessionToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File);

  if (!files.length) {
    return NextResponse.json(
      { error: "No files were uploaded." },
      { status: 400 },
    );
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const uploadedFiles: Array<{ url: string; name: string }> = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: `${file.name} is not an image.` },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `${file.name} exceeds the 10 MB limit.` },
        { status: 400 },
      );
    }

    const extension = sanitizeExtension(file.name, file.type);
    const filename = `${randomUUID()}${extension}`;
    const filePath = path.join(uploadsDir, filename);
    const bytes = await file.arrayBuffer();

    await writeFile(filePath, Buffer.from(bytes));
    uploadedFiles.push({
      url: `/uploads/${filename}`,
      name: file.name,
    });
  }

  return NextResponse.json({ files: uploadedFiles });
}
