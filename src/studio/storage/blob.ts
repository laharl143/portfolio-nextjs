import "server-only";
import "@/studio/marker";
import { list } from "@vercel/blob";

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
