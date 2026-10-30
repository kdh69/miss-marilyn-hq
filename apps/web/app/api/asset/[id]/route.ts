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
  // Sample mode (no Sheet connected): a placeholder drawing, so the preview shows pictures.
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && id.startsWith("sample-art-")) return samplePicture(id);
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

/** A simple river scene, tinted per page, labelled with the page number. Sample mode only. */
function samplePicture(id: string) {
  const n = Number(id.match(/(\d+)$/)?.[1] ?? 1);
  const hues = [28, 200, 160, 265, 340, 45, 190, 120];
  const h = hues[(n - 1) % hues.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h},80%,88%)"/><stop offset="1" stop-color="hsl(${(h + 40) % 360},70%,80%)"/></linearGradient></defs>
  <rect width="400" height="400" fill="url(#sky)"/>
  <circle cx="${90 + n * 25}" cy="95" r="38" fill="hsl(45,95%,70%)"/>
  <path d="M0 260 Q100 220 200 255 T400 250 V400 H0Z" fill="hsl(200,60%,62%)"/>
  <path d="M0 300 Q120 270 230 300 T400 295 V400 H0Z" fill="hsl(205,55%,52%)"/>
  <ellipse cx="200" cy="262" rx="58" ry="24" fill="hsl(25,45%,40%)"/>
  <circle cx="232" cy="248" r="16" fill="hsl(25,45%,40%)"/>
  <circle cx="237" cy="244" r="3" fill="#222"/>
  <text x="24" y="376" font-family="Georgia,serif" font-size="26" fill="#fff" opacity=".9">Page ${n}</text>
</svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
}
