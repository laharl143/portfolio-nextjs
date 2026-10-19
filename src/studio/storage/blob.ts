import "server-only";
import "@/studio/marker";
import { del, get, list, put } from "@vercel/blob";

// Private Vercel Blob store (spec 0003): `studio-dev` in Development and Preview, `studio-prod` in Production.
// No Blob URL is ever rendered to the browser; reads go through guarded server code only.
function token() {
  const value = process.env.BLOB_READ_WRITE_TOKEN;
  if (!value) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }
  return value;
}

export async function isStoreReachable(): Promise<boolean> {
  try {
    await list({ limit: 1, token: token() });
    return true;
  } catch {
    return false;
  }
}

// Contract files (spec 0007): written once at a fixed pathname, never overwritten.
export async function putPrivatePdf(pathname: string, bytes: Buffer): Promise<void> {
  await put(pathname, bytes, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: "application/pdf",
    token: token(),
  });
}

// The stored bytes as a stream, or null when the Blob file is missing.
export async function getPrivateFile(pathname: string): Promise<ReadableStream<Uint8Array> | null> {
  const result = await get(pathname, { access: "private", useCache: false, token: token() });
  if (!result || result.statusCode !== 200) {
    return null;
  }
  return result.stream;
}

export async function deletePrivateFile(pathname: string): Promise<void> {
  await del(pathname, { token: token() });
}
