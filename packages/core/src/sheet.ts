import { google, sheets_v4 } from "googleapis";
import { headersOf, schema, tabDef } from "./schema";

export type Row = Record<string, string>;

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

export function googleAuth() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  const creds = JSON.parse(json);
  return new google.auth.GoogleAuth({ credentials: creds, scopes: SCOPES });
}

export function sheetsClient(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: googleAuth() });
}

export function sheetId(): string {
  const id = process.env.MM_CORE_SHEET_ID;
  if (!id) throw new Error("MM_CORE_SHEET_ID is not set");
  return id;
}

const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const colLetter = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/**
 * One snapshot of MM Core per run: a single batchGet for every tab,
 * rows keyed by header name (spec §2 — never by column letter).
 */
export class Core {
  private constructor(
    private api: sheets_v4.Sheets,
    private id: string,
    private data: Map<string, { headers: string[]; rows: Row[] }>,
  ) {}

  static async load(tabs = schema.tabs.map((t) => t.name)): Promise<Core> {
    const api = sheetsClient();
    const id = sheetId();
    const res = await api.spreadsheets.values.batchGet({
      spreadsheetId: id,
      ranges: tabs,
      valueRenderOption: "FORMATTED_VALUE",
    });
    const data = new Map<string, { headers: string[]; rows: Row[] }>();
    res.data.valueRanges?.forEach((vr, i) => {
      const [headers = [], ...body] = (vr.values ?? []) as string[][];
      const rows = body.map((r) => Object.fromEntries(headers.map((h, j) => [h, r[j] ?? ""])));
      data.set(tabs[i], { headers, rows });
    });
    return new Core(api, id, data);
  }

  rows(tab: string): Row[] {
    return this.data.get(tab)?.rows ?? [];
  }

  config(key: string): string {
    return this.rows("config").find((r) => r.key === key)?.value ?? "";
  }

  /** Append rows (log, costs, mom_queue, …). Missing fields are written blank. */
  async append(tab: string, rows: Partial<Row>[]): Promise<void> {
    if (!rows.length) return;
    const headers = headersOf(tabDef(tab));
    await this.api.spreadsheets.values.append({
      spreadsheetId: this.id,
      range: tab,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows.map((r) => headers.map((h) => r[h] ?? "")) },
    });
    this.data.get(tab)?.rows.push(...rows.map((r) => Object.fromEntries(headers.map((h) => [h, r[h] ?? ""]))));
  }

  /**
   * Update one row by ID. Re-reads the row first and refuses if `updated_at`
   * moved since our snapshot (a bot wrote in between); caller retries once.
   */
  async update(tab: string, id: string, patch: Partial<Row>, actor = "backend"): Promise<boolean> {
    const def = tabDef(tab);
    if (!def.id) throw new Error(`${tab} has no id column`);
    const snap = this.data.get(tab);
    if (!snap) throw new Error(`${tab} not loaded`);
    const idx = snap.rows.findIndex((r) => r[def.id!] === id);
    if (idx < 0) throw new Error(`${tab}: no row ${id}`);
    const rowNum = idx + 2;
    const width = colLetter(snap.headers.length - 1);
    const live = await this.api.spreadsheets.values.get({ spreadsheetId: this.id, range: `${tab}!A${rowNum}:${width}${rowNum}` });
    const liveRow: Row = Object.fromEntries(snap.headers.map((h, j) => [h, (live.data.values?.[0]?.[j] as string) ?? ""]));
    if (liveRow[def.id] !== id) return false; // row moved (someone sorted/deleted)
    if ("updated_at" in liveRow && liveRow.updated_at !== snap.rows[idx].updated_at) return false;

    const next = { ...liveRow, ...patch } as Row;
    if ("updated_at" in next) {
      next.updated_at = nowIso();
      next.updated_by = actor;
    }
    await this.api.spreadsheets.values.update({
      spreadsheetId: this.id,
      range: `${tab}!A${rowNum}:${width}${rowNum}`,
      valueInputOption: "RAW",
      requestBody: { values: [snap.headers.map((h) => next[h] ?? "")] },
    });
    snap.rows[idx] = next;
    return true;
  }

  async log(actor: string, taskId: string, from: string, to: string, message = ""): Promise<void> {
    await this.append("log", [{ ts: nowIso(), actor, task_id: taskId, from_status: from, to_status: to, message }]);
  }
}

export { nowIso };
