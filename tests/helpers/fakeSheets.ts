/**
 * An in-memory stand-in for the Google Sheets API, for tests that run the real Core and the real `run()` from bot.ts.
 * Import this FIRST in a test file: it lifts the Sheets call pacing (a test makes more than 50 calls a minute) and removes
 * every live credential from the environment, so a test can never reach the Sheet, Drive or fal.
 */
process.env.SHEETS_CALLS_PER_MINUTE = "1000000";
for (const key of ["FAL_KEY", "GOOGLE_SERVICE_ACCOUNT_JSON", "GOOGLE_OWNER_REFRESH_TOKEN", "MM_CORE_SHEET_ID"]) delete process.env[key];

import type { sheets_v4 } from "googleapis";
import { Core, headersOf, schema, type Row } from "../../packages/core/src/index";

export type Cells = string[][];

export class FakeSheets {
  /** Every tab as the Sheet holds it: the header row first. */
  tabs: Record<string, Cells> = {};
  /** Every call, in order, so a test can see what a command wrote ("append costs", "update tasks!A3:Z3"). */
  calls: string[] = [];
  /** Runs after an append lands: a test injects what another process wrote at that moment. */
  onAppend?: (tab: string, rows: Cells) => void;
  /** Makes the next call whose description matches throw (once). */
  failOnce?: { match: RegExp; error: Error };

  constructor() {
    for (const t of schema.tabs) this.tabs[t.name] = [headersOf(t)];
  }

  /** Adds rows to a tab by header name. */
  put(tab: string, rows: Partial<Row>[]): this {
    const headers = this.tabs[tab][0];
    for (const r of rows) this.tabs[tab].push(headers.map((h) => r[h] ?? ""));
    return this;
  }

  /** The rows of a tab as objects, as another process would read them. */
  rows(tab: string): Row[] {
    const [headers, ...body] = this.tabs[tab];
    return body.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
  }

  private check(what: string) {
    this.calls.push(what);
    if (this.failOnce?.match.test(what)) {
      const { error } = this.failOnce;
      this.failOnce = undefined;
      throw error;
    }
  }

  private cells(range: string) {
    const m = range.match(/^(.+)!A(\d+):[A-Z]+(\d+)$/);
    if (!m) throw new Error(`fake Sheets: can't read range ${range}`);
    return { tab: m[1], row: Number(m[2]) };
  }

  api = {
    spreadsheets: {
      values: {
        batchGet: async ({ ranges }: { ranges: string[] }) => {
          this.check(`batchGet ${ranges.join(",")}`);
          return { data: { valueRanges: ranges.map((r) => ({ values: this.tabs[r].map((row) => [...row]) })) } };
        },
        append: async ({ range, requestBody }: { range: string; requestBody: { values: Cells } }) => {
          this.check(`append ${range}`);
          this.tabs[range].push(...requestBody.values.map((r) => r.map(String)));
          this.onAppend?.(range, requestBody.values);
          return { data: {} };
        },
        get: async ({ range }: { range: string }) => {
          this.check(`get ${range}`);
          const { tab, row } = this.cells(range);
          const live = this.tabs[tab][row - 1];
          return { data: { values: live ? [[...live]] : [] } };
        },
        update: async ({ range, requestBody }: { range: string; requestBody: { values: Cells } }) => {
          this.check(`update ${range}`);
          const { tab, row } = this.cells(range);
          this.tabs[tab][row - 1] = requestBody.values[0].map(String);
          return { data: {} };
        },
      },
    },
  };

  /** A new Core, as a new `npm run bot` process would load it: a fresh snapshot of these tabs. */
  load(tabs?: string[]): Promise<Core> {
    return Core.load(tabs, { api: this.api as unknown as sheets_v4.Sheets, id: "fake-sheet" });
  }
}

/** A Sheet with the reference rows a book needs: one product, the task types and the config keys. */
export function seeded(): FakeSheets {
  const fake = new FakeSheets();
  for (const t of schema.tabs) if (["task_types", "config"].includes(t.name)) {
    const headers = headersOf(t);
    fake.put(t.name, (t.seed ?? []).map((r) => Object.fromEntries(headers.map((h, i) => [h, typeof r[i] === "boolean" ? (r[i] ? "TRUE" : "FALSE") : r[i] === undefined ? "" : String(r[i])]))));
  }
  fake.put("products", [{ product_id: "MM-B02", line: "MM", series_no: "1", title: "Makes a Friend", status: "in_production" }]);
  return fake;
}
