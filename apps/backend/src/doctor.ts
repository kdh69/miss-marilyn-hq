/**
 * npm run doctor — proves every connection, one line per check, with the fix for anything red.
 * Safe to run any time: read-only except one tiny test file it creates and deletes.
 */
import Anthropic from "@anthropic-ai/sdk";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Readable } from "node:stream";
import { Core, driveReader, driveWriter, headersOf, schema, sheetId, sheetsClient, writerIdentity } from "@mm/core";

const run = promisify(execFile);
let red = 0;
let amber = 0;
const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m: string, fix: string) => { red++; console.log(`  \x1b[31m✗\x1b[0m ${m}\n      → ${fix}`); };
const warn = (m: string, fix: string) => { amber++; console.log(`  \x1b[33m!\x1b[0m ${m}\n      → ${fix}`); };
const section = (t: string) => console.log(`\n${t}`);
const has = (k: string) => !!process.env[k]?.trim();

async function main() {
  section("Keys");
  const required = ["GOOGLE_SERVICE_ACCOUNT_JSON", "MM_CORE_SHEET_ID"];
  const backend = ["ANTHROPIC_API_KEY", "KYLE_EMAIL"];
  const optional = ["CLARA_EMAIL", "RESEND_API_KEY", "NOTIFY_FROM", "PANEL_URL", "GOOGLE_OWNER_REFRESH_TOKEN"];
  const panel = ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "AUTH_SECRET", "PANEL_USERS"];
  for (const k of required) (has(k) ? ok(k) : bad(`${k} missing`, "add it to .env / GitHub secrets (see docs/SETUP.md)"));
  for (const k of backend) (has(k) ? ok(k) : warn(`${k} missing`, "needed by the backend in GitHub secrets"));
  for (const k of panel) (has(k) ? ok(`${k} (panel)`) : warn(`${k} missing`, "needed in Vercel for sign-in; optional locally"));
  for (const k of optional) if (!has(k)) console.log(`  · ${k} not set (optional)`);
  if (red) return;

  let saEmail = "";
  try {
    saEmail = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!).client_email;
    ok(`service account: ${saEmail}`);
  } catch {
    return bad("GOOGLE_SERVICE_ACCOUNT_JSON isn't valid JSON", "paste the whole key file on ONE line, wrapped in single quotes in .env");
  }
  if (has("PANEL_USERS")) {
    const users = process.env.PANEL_USERS!.split(",").map((s) => s.trim().split(":"));
    const roles = new Set(users.map(([, r]) => r));
    roles.has("mom") && roles.has("kyle") ? ok(`PANEL_USERS: ${users.length} people`) : warn("PANEL_USERS should list Clara as :mom and you as :kyle", "e.g. clara@x.com:mom,kyle@y.com:kyle");
  }

  section("MM Core sheet");
  let core: Core;
  try {
    const meta = await sheetsClient().spreadsheets.get({ spreadsheetId: sheetId(), fields: "properties.title,sheets(properties.title,protectedRanges.description)" });
    ok(`opened "${meta.data.properties?.title}"`);
    const tabs = new Set(meta.data.sheets?.map((s) => s.properties?.title));
    const missing = schema.tabs.filter((t) => !tabs.has(t.name)).map((t) => t.name);
    if (missing.length) return bad(`missing tabs: ${missing.join(", ")}`, "run npm run sheet:setup");
    ok(`all ${schema.tabs.length} tabs present`);
    const prot = meta.data.sheets?.flatMap((s) => s.protectedRanges ?? []).filter((p) => p.description?.startsWith("mm-core")).length ?? 0;
    prot ? ok(`${prot} protected ranges`) : warn("no protected ranges", "run npm run sheet:setup (needs the service account as Editor)");
    core = await Core.load();
  } catch (e) {
    return bad(`can't open the Sheet: ${msg(e)}`, `share MM Core with ${saEmail} as Editor, and check MM_CORE_SHEET_ID`);
  }
  const hdr = await sheetsClient().spreadsheets.values.batchGet({ spreadsheetId: sheetId(), ranges: schema.tabs.map((t) => `${t.name}!1:1`) });
  schema.tabs.forEach((t, i) => {
    const live = (hdr.data.valueRanges?.[i]?.values?.[0] ?? []) as string[];
    const want = headersOf(t);
    const diff = want.filter((h, j) => live[j] !== h);
    if (diff.length) bad(`${t.name}: row 1 doesn't match the schema (first mismatch: ${diff[0]})`, "someone edited row 1 — run npm run sheet:setup to restore it");
  });
  if (!red) ok("every header row matches the schema");
  const status = core.config("system_status");
  status === "RUN" ? ok("system_status = RUN") : warn(`system_status = ${status || "(blank)"}`, "set it to RUN in config (or Resume on the panel)");

  section("Drive folders");
  for (const key of ["drive_work_folder_id", "drive_brand_folder_id", "drive_photos_inbox_id", "drive_backups_folder_id"]) {
    const id = core.config(key);
    if (!id) { bad(`${key} is empty`, "fill it in the config tab"); continue; }
    try {
      const f = await driveReader().files.get({ fileId: id, fields: "name,capabilities(canAddChildren)" });
      f.data.capabilities?.canAddChildren ? ok(`${f.data.name} (writable)`) : bad(`${f.data.name} is read-only for the service account`, `share "Miss Marilyn Business" with ${saEmail} as Editor`);
    } catch (e) {
      bad(`${key}: ${msg(e)}`, `share "Miss Marilyn Business" with ${saEmail} as Editor`);
    }
  }

  section("Uploads (Clara's photos, weekly backups)");
  try {
    const folder = core.config("drive_backups_folder_id");
    const f = await driveWriter().files.create({
      requestBody: { name: "doctor-upload-test.txt", parents: [folder], mimeType: "text/plain" },
      media: { mimeType: "text/plain", body: Readable.from(["ok"]) },
      fields: "id",
    });
    await driveWriter().files.delete({ fileId: f.data.id! }).catch(() => driveWriter().files.update({ fileId: f.data.id!, requestBody: { trashed: true } }));
    ok(`uploads work as ${writerIdentity() === "owner" ? "the folder owner" : "the service account"}`);
  } catch (e) {
    const m = msg(e);
    /quota/i.test(m)
      ? bad("service accounts can't own uploaded files in a personal Drive", "run npm run google:authorize once and add GOOGLE_OWNER_REFRESH_TOKEN (docs/SETUP.md §Uploads)")
      : bad(`upload test failed: ${m}`, "check the folder sharing above");
  }

  section("Bot account sharing");
  const bot = core.config("bot_account_email");
  if (!bot) warn("bot_account_email is empty in config", "add the bot Gmail so this check can confirm it's shared");
  else {
    for (const [label, id, want] of [["MM Core", sheetId(), "writer"], ["MM Work", core.config("drive_work_folder_id"), "writer"], ["MM Brand", core.config("drive_brand_folder_id"), "reader"]] as const) {
      try {
        const p = await driveReader().permissions.list({ fileId: id, fields: "permissions(emailAddress,role)" });
        const role = p.data.permissions?.find((x) => x.emailAddress?.toLowerCase() === bot.toLowerCase())?.role;
        if (!role) bad(`${label} isn't shared with ${bot}`, `share it as ${want === "writer" ? "Editor" : "Viewer"}`);
        else if (want === "reader" && role !== "reader") warn(`${label}: bot has ${role}`, "bots should only view MM Brand — set to Viewer");
        else ok(`${label} shared with the bot (${role})`);
      } catch (e) {
        warn(`${label}: can't read sharing (${msg(e)})`, "fine if the service account isn't an owner — check by hand");
      }
    }
  }

  section("Claude QC");
  if (!has("ANTHROPIC_API_KEY")) warn("skipped — no ANTHROPIC_API_KEY", "add it to run QC");
  else {
    const model = core.config("qc_model") || "claude-sonnet-5-5";
    try {
      await new Anthropic().models.retrieve(model);
      ok(`API key works, model ${model} available`);
    } catch (e) {
      bad(`Anthropic: ${msg(e)}`, `check the key and that config qc_model (${model}) is a current model ID`);
    }
  }

  section("KDP preflight");
  try {
    await run("python3", ["-I", "-c", "import pymupdf"]);
    ok("python3 + PyMuPDF available");
  } catch {
    warn("PyMuPDF not installed here", "pip install -r apps/backend/preflight/requirements.txt (GitHub Actions installs it automatically)");
  }

  section("Email");
  if (!has("RESEND_API_KEY")) console.log("  · Resend not set — alerts show on GitHub only, Clara gets no weekly email");
  else {
    const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } });
    if (!r.ok) bad(`Resend key rejected (${r.status})`, "make a new key at resend.com");
    else {
      const d = (await r.json()) as { data?: { name: string; status: string }[] };
      const verified = d.data?.filter((x) => x.status === "verified").map((x) => x.name) ?? [];
      verified.length ? ok(`Resend domain verified: ${verified.join(", ")}`) : warn("no verified Resend domain", "add the DNS records Resend shows for the brand domain");
    }
  }
}

function msg(e: unknown): string {
  const any = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return String(any?.response?.data?.error?.message ?? any?.message ?? e).slice(0, 160);
}

main()
  .catch((e) => bad(`doctor crashed: ${msg(e)}`, "send this output to Claude"))
  .finally(() => {
    console.log(`\n${red ? `\x1b[31m${red} problem(s)\x1b[0m` : "\x1b[32mAll required checks passed\x1b[0m"}${amber ? `, ${amber} warning(s)` : ""}\n`);
    process.exit(red ? 1 : 0);
  });
