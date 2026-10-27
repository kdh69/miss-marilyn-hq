import { describe, expect, it } from "vitest";
import { LIST_NAMES, headersOf, schema } from "../packages/core/src/schema";

describe("schema.json integrity", () => {
  it("tab names are unique", () => {
    const names = schema.tabs.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const t of schema.tabs) {
    describe(t.name, () => {
      const headers = headersOf(t);
      it("headers are unique snake_case", () => {
        expect(new Set(headers).size).toBe(headers.length);
        for (const h of headers) expect(h).toMatch(/^[a-z][a-z0-9_]*$/);
      });
      it("id column exists", () => {
        if (t.id) expect(headers).toContain(t.id);
      });
      it("backend-only column exists", () => {
        if (t.backendOnlyFrom) expect(headers).toContain(t.backendOnlyFrom);
      });
      it("every dropdown points at a real column and list", () => {
        for (const [col, list] of Object.entries(t.dropdowns ?? {})) {
          expect(headers, `${t.name}.${col}`).toContain(col);
          expect(LIST_NAMES, `list ${list}`).toContain(list);
        }
      });
      it("seed rows fit the headers and use allowed dropdown values", () => {
        for (const row of t.seed ?? []) {
          expect(row.length, JSON.stringify(row)).toBeLessThanOrEqual(headers.length);
          for (const [col, list] of Object.entries(t.dropdowns ?? {})) {
            const v = row[headers.indexOf(col)];
            if (v !== undefined && v !== "") expect(schema.lists[list], `${t.name}.${col}=${v}`).toContain(String(v));
          }
        }
      });
    });
  }

  it("task_types rows line up with the lists", () => {
    const tt = schema.tabs.find((t) => t.name === "task_types")!;
    for (const [type, owner, , , momItem] of tt.seed!) {
      expect(schema.lists.task_type).toContain(type);
      expect(schema.lists.role).toContain(owner);
      if (momItem) expect(schema.lists.mom_item_type).toContain(momItem);
    }
    expect(tt.seed!.map((r) => r[0]).sort()).toEqual([...schema.lists.task_type].sort());
  });

  it("every rubric referenced by task_types exists", async () => {
    const { existsSync } = await import("node:fs");
    const tt = schema.tabs.find((t) => t.name === "task_types")!;
    for (const r of tt.seed!) if (r[5]) expect(existsSync(`apps/backend/rubrics/${r[5]}.md`), String(r[5])).toBe(true);
  });

  it("transitions only use real statuses", () => {
    const ok = new Set([...schema.lists.task_status, "*"]);
    for (const [from, to] of [...schema.transitions.bot, ...schema.transitions.backend]) {
      expect(ok.has(from), from).toBe(true);
      expect(ok.has(to), to).toBe(true);
    }
  });

  it("config has the keys the code reads", () => {
    const keys = schema.tabs.find((t) => t.name === "config")!.seed!.map((r) => r[0]);
    for (const k of ["system_status", "daily_bot_cap_usd", "daily_qc_cap_usd", "qc_model", "qc_max_attempts", "requests_default_to", "drive_photos_inbox_id", "drive_backups_folder_id"]) {
      expect(keys).toContain(k);
    }
  });
});
