import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";

import { put } from "@vercel/blob";

type UploadResult = { path: string } | null;

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function uploadCustomOrderImage(requestId: string, file: File): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = (file.type.split("/")[1] ?? "bin").replace(/[^a-z0-9]/gi, "").slice(0, 10) || "bin";
  const fileName = `${crypto.randomBytes(10).toString("hex")}.${ext}`;

  if (useBlob()) {
    const key = `custom-orders/${requestId}/${fileName}`;
    try {
      const result = await put(key, buffer, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: false,
      });
      return { path: result.url };
    } catch {
      return null;
    }
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "custom-orders", requestId);
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch {
    return null;
  }
  const diskPath = path.join(uploadsDir, fileName);
  try {
    await fs.writeFile(diskPath, buffer);
  } catch {
    return null;
  }
  return { path: `/uploads/custom-orders/${requestId}/${fileName}` };
}

export { uploadCustomOrderImage, useBlob };
