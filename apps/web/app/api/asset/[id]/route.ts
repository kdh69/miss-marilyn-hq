import { google } from "googleapis";
import { googleAuth } from "@mm/core";
import { authConfigured, me } from "@/auth";

/**
 * Streams a Drive file (page art, PDFs) to the panel through the service account,
 * so Clara sees images inside the site without Drive access of her own.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (authConfigured() && !(await me())) return new Response("Sign in", { status: 401 });
  const { id } = await params;
  if (!/^[-\w]{20,}$/.test(id)) return new Response("Bad id", { status: 400 });
  try {
    const drive = google.drive({ version: "v3", auth: googleAuth() });
    const meta = await drive.files.get({ fileId: id, fields: "mimeType" });
    const file = await drive.files.get({ fileId: id, alt: "media" }, { responseType: "arraybuffer" });
    return new Response(Buffer.from(file.data as ArrayBuffer), {
      headers: { "Content-Type": meta.data.mimeType ?? "application/octet-stream", "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
