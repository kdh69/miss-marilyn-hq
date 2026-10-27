import { google, type drive_v3 } from "googleapis";
import { googleAuth } from "./sheet";

/**
 * Who creates files in Drive (uploads, backups).
 *
 * Service accounts made since 2025 have no Drive storage quota, so they can't own
 * uploaded binary files in a personal (free Gmail) Drive. If GOOGLE_OWNER_REFRESH_TOKEN
 * is set (run `npm run google:authorize` once), files are created as the folder
 * owner instead. Reads and Sheet edits always use the service account.
 */
export function ownerAuth() {
  const token = process.env.GOOGLE_OWNER_REFRESH_TOKEN;
  const id = process.env.AUTH_GOOGLE_ID;
  const secret = process.env.AUTH_GOOGLE_SECRET;
  if (!token || !id || !secret) return null;
  const client = new google.auth.OAuth2(id, secret);
  client.setCredentials({ refresh_token: token });
  return client;
}

export const writerIdentity = (): "owner" | "service_account" => (ownerAuth() ? "owner" : "service_account");

export function driveWriter(): drive_v3.Drive {
  return google.drive({ version: "v3", auth: ownerAuth() ?? googleAuth() });
}

export function driveReader(): drive_v3.Drive {
  return google.drive({ version: "v3", auth: googleAuth() });
}

/** Short-lived access token for the writer identity (browser direct uploads). */
export async function writerAccessToken(): Promise<string> {
  const owner = ownerAuth();
  if (owner) return (await owner.getAccessToken()).token ?? "";
  const client = await googleAuth().getClient();
  return (await client.getAccessToken()).token ?? "";
}

/**
 * Start a resumable upload into `folderId`. The browser then PUTs the file straight
 * to the returned URL, so big photos and videos never pass through Vercel
 * (whose request limit is 4.5 MB). `origin` enables CORS for that PUT.
 */
export async function startResumableUpload(opts: { folderId: string; name: string; mimeType: string; size: number; origin: string }): Promise<string> {
  const token = await writerAccessToken();
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": opts.mimeType,
      "X-Upload-Content-Length": String(opts.size),
      Origin: opts.origin,
    },
    body: JSON.stringify({ name: opts.name, parents: [opts.folderId] }),
  });
  const url = res.headers.get("location");
  if (!res.ok || !url) throw new Error(`Drive upload session failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return url;
}
