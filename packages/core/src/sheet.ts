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

type RetryErr = { config: { method?: string; retryConfig?: { currentRetryAttempt?: number } }; response?: { status?: number } };

/**
 * Sheets allows 60 reads and 60 writes a minute per user, and refused calls seem to count too, so
 * `pace` keeps each process under that and this retry is only the backstop. A 429 means the
 * request was refused, so it is safe to resend even an append: back off 0.1 s doubling, capped
 * at 30 s, for up to ~3 minutes. Server errors and dropped connections are retried only for
 * reads and in-place updates.
 */
const RETRY = {
  retry: 10,
  maxRetryDelay: 30_000,
  shouldRetry: (err: RetryErr) => {
    const attempt = err.config.retryConfig?.currentRetryAttempt ?? 0;
    const status = err.response?.status ?? 0;
    if (status === 429) return attempt < 10;
    const idempotent = ["GET", "PUT"].includes((err.config.method ?? "GET").toUpperCase());
    return idempotent && (status >= 500 || !err.response) && attempt < 3;
  },
};

/** Calls per minute one process allows itself, per kind (Sheets' limit is 60; leave room for the panel). */
const PER_MINUTE = Number(process.env.SHEETS_CALLS_PER_MINUTE) || 50;
const recent: Record<"read" | "write", number[]> = { read: [], write: [] };

/** Waits, if needed, so this process stays under PER_MINUTE reads (or writes) in any 60 s. */
async function pace(kind: "read" | "write") {
  const q = recent[kind];
  for (;;) {
    const now = Date.now();
    while (q.length && now - q[0] >= 60_000) q.shift();
    if (q.length < PER_MINUTE) return void q.push(now);
    await new Promise((r) => setTimeout(r, 60_000 - (now - q[0]) + 50));
  }
}

export function sheetsClient(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: googleAuth(), retryConfig: RETRY });
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
    await pace("read");
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

  /**
   * Physically remove rows matching `match`. Only for test scaffolding (dry run) —
   * production code retires rows with a status, never deletes (spec §2).
   * Re-reads the tab first so indexes are current; deletes bottom-up.
   */
  async deleteWhere(tab: string, match: (r: Row) => boolean): Promise<number> {
    await pace("read");
    const meta = await this.api.spreadsheets.get({ spreadsheetId: this.id, fields: "sheets(properties(sheetId,title))" });
    const gid = meta.data.sheets?.find((s) => s.properties?.title === tab)?.properties?.sheetId;
    if (gid === undefined || gid === null) throw new Error(`no tab ${tab}`);
    await pace("read");
    const res = await this.api.spreadsheets.values.get({ spreadsheetId: this.id, range: tab });
    const [headers = [], ...body] = (res.data.values ?? []) as string[][];
    const idx = body
      .map((r, i) => ({ i, row: Object.fromEntries(headers.map((h, j) => [h, r[j] ?? ""])) as Row }))
      .filter(({ row }) => match(row))
      .map(({ i }) => i + 1) // +1 for the header row (0-based grid index)
      .sort((a, b) => b - a);
    if (!idx.length) return 0;
    await pace("write");
    await this.api.spreadsheets.batchUpdate({
      spreadsheetId: this.id,
      requestBody: { requests: idx.map((i) => ({ deleteDimension: { range: { sheetId: gid, dimension: "ROWS", startIndex: i, endIndex: i + 1 } } })) },
    });
    return idx.length;
  }

  config(key: string): string {
    return this.rows("config").find((r) => r.key === key)?.value ?? "";
  }

  /** Append rows (log, costs, mom_queue, …). Missing fields are written blank. */
  async append(tab: string, rows: Partial<Row>[]): Promise<void> {
    if (!rows.length) return;
    const headers = headersOf(tabDef(tab));
    await pace("write");
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
    await pace("read");
    const live = await this.api.spreadsheets.values.get({ spreadsheetId: this.id, range: `${tab}!A${rowNum}:${width}${rowNum}` });
    const liveRow: Row = Object.fromEntries(snap.headers.map((h, j) => [h, (live.data.values?.[0]?.[j] as string) ?? ""]));
    if (liveRow[def.id] !== id) return false; // row moved (someone sorted/deleted)
    if ("updated_at" in liveRow && liveRow.updated_at !== snap.rows[idx].updated_at) return false;

    const next = { ...liveRow, ...patch } as Row;
    if ("updated_at" in next) {
      next.updated_at = nowIso();
      next.updated_by = actor;
    }
    await pace("write");
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
