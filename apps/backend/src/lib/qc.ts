/**
 * QC call contract (spec §9, job 1): rubric + active lessons as system prompt,
 * brief + assets as the user message, strict JSON back. Logs real token cost.
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { Core, driveReader, nowIso, type Row } from "@mm/core";

export type QcResult = { result: "pass" | "fail"; notes: string; summaryForMom: string };

const RUBRIC_DIR = new URL("../../rubrics/", import.meta.url);
const MAX_PDF_BYTES = 25_000_000; // API request limit is 32 MB
const anthropic = new Anthropic();

export async function runQc(core: Core, task: Row, assets: Row[], rubric: string): Promise<QcResult> {
  const rubricText = await readFile(new URL(`${rubric || "default"}.md`, RUBRIC_DIR), "utf8").catch(() =>
    readFile(new URL("default.md", RUBRIC_DIR), "utf8"),
  );
  const lessons = core
    .rows("lessons")
    .filter((l) => l.status === "active" && ["all", task.task_type, task.owner].includes(l.applies_to))
    .map((l) => `- ${l.rule}`)
    .join("\n");

  const system = [
    rubricText,
    lessons && `## Lessons from earlier work (treat as requirements)\n${lessons}`,
    `## Output\nReply with JSON only: {"result":"pass|fail","blocking":[],"minor":[],"notes_for_bot":"","summary_for_mom":"one plain sentence"}. Pass requires zero blocking issues.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const content: Anthropic.ContentBlockParam[] = [
    { type: "text", text: `Task ${task.task_id} (${task.task_type}) — ${task.title}\n\nBrief:\n${task.brief}` },
  ];
  for (const a of assets) {
    content.push({ type: "text", text: `Asset ${a.asset_id}: ${a.asset_type}${a.page_number ? ` p${a.page_number}` : ""}, rights_source=${a.rights_source}, made_with=${a.made_with}` });
    const block = await attachment(a.file_url);
    if (block) content.push(block);
    else content.push({ type: "text", text: `(file not attached — ${a.file_url}; resolution and size are checked by preflight, not by you)` });
  }

  const model = core.config("qc_model") || "claude-sonnet-5-5";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await anthropic.messages.create({ model, max_tokens: 1500, system, messages: [{ role: "user", content }] });
    await logCost(core, task, res.usage, model);
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    try {
      const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      const blocking: string[] = j.blocking ?? [];
      const result = j.result === "pass" && blocking.length === 0 ? "pass" : "fail";
      const notes = [blocking.length && `BLOCKING: ${blocking.join("; ")}`, j.minor?.length && `minor: ${j.minor.join("; ")}`, j.notes_for_bot]
        .filter(Boolean)
        .join("\n");
      return { result, notes: notes || "ok", summaryForMom: j.summary_for_mom ?? "" };
    } catch {
      /* one retry on invalid JSON */
    }
  }
  return { result: "fail", notes: "QC returned invalid JSON twice — escalate", summaryForMom: "" };
}

async function attachment(fileUrl: string): Promise<Anthropic.ContentBlockParam | null> {
  const id = fileUrl.match(/[-\w]{25,}/)?.[0];
  if (!id) return null;
  try {
    const drive = driveReader();
    const meta = await drive.files.get({ fileId: id, fields: "mimeType,size" });
    const mime = meta.data.mimeType ?? "";
    if (mime === "application/vnd.google-apps.document") {
      const doc = await drive.files.export({ fileId: id, mimeType: "text/plain" }, { responseType: "text" });
      return { type: "text", text: String(doc.data).slice(0, 60_000) };
    }
    if (mime === "application/pdf" && Number(meta.data.size ?? 0) > MAX_PDF_BYTES) return null;
    const bin = await drive.files.get({ fileId: id, alt: "media" }, { responseType: "arraybuffer" });
    let buf = Buffer.from(bin.data as ArrayBuffer);
    if (mime === "application/pdf") return { type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } };
    if (mime.startsWith("image/")) {
      // Claude sees ~1.5k px anyway; print resolution is checked by preflight, not here.
      buf = await sharp(buf).resize({ width: 1500, height: 1500, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
      return { type: "image", source: { type: "base64", media_type: "image/jpeg", data: buf.toString("base64") } };
    }
  } catch {
    return null;
  }
  return null;
}

async function logCost(core: Core, task: Row, usage: Anthropic.Usage, model: string) {
  const inRate = Number(core.config("qc_price_in_per_mtok") || 3);
  const outRate = Number(core.config("qc_price_out_per_mtok") || 15);
  const usd = (usage.input_tokens * inRate + usage.output_tokens * outRate) / 1_000_000;
  const now = nowIso();
  await core.append("costs", [{
    cost_id: `CO-backend-${now.replace(/\D/g, "").slice(0, 14)}-${task.task_id}`,
    date: new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }),
    category: "qc_api", vendor: "anthropic", amount_usd: usd.toFixed(4), estimated: "FALSE",
    product_id: task.product_id, sku: task.sku, task_id: task.task_id, role: "backend",
    note: `${model} ${usage.input_tokens}in/${usage.output_tokens}out`, entered_by: "backend", created_at: now,
  }]);
}
