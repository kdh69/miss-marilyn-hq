/**
 * Build or repair MM Core from packages/core/schema.json (spec §3–5).
 * Safe to re-run: creates missing tabs, rewrites row 1, seeds only empty tabs,
 * and replaces every dropdown and protected range it owns.
 *
 * Needs: GOOGLE_SERVICE_ACCOUNT_JSON, MM_CORE_SHEET_ID (and the Sheet shared
 * with the service account as Editor).  Run: npm run sheet:setup
 */
import type { sheets_v4 } from "googleapis";
import { LIST_NAMES, headersOf, schema, sheetId, sheetsClient } from "../packages/core/src";

const api = sheetsClient();
const spreadsheetId = sheetId();
const serviceEmail = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!).client_email as string;
const PROTECT_TAG = "mm-core";
const DEPTH = 5000;

const ORANGE = { red: 1, green: 0.945, blue: 0.902 };
const PURPLE = { red: 0.929, green: 0.914, blue: 0.996 };

async function main() {
  let meta = await api.spreadsheets.get({ spreadsheetId });
  let existing = meta.data.sheets ?? [];
  const reqs: sheets_v4.Schema$Request[] = [];

  // 1. Tabs: reuse the default "Sheet1" as the first tab, add the rest in order.
  const names = new Set(existing.map((s) => s.properties?.title));
  if (names.has("Sheet1") && !names.has(schema.tabs[0].name)) {
    reqs.push({ updateSheetProperties: { properties: { sheetId: existing.find((s) => s.properties?.title === "Sheet1")!.properties!.sheetId!, title: schema.tabs[0].name }, fields: "title" } });
    names.add(schema.tabs[0].name);
  }
  schema.tabs.forEach((t, index) => {
    if (!names.has(t.name)) reqs.push({ addSheet: { properties: { title: t.name, index } } });
  });
  if (reqs.length) await api.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: reqs.splice(0) } });

  meta = await api.spreadsheets.get({ spreadsheetId, fields: "sheets(properties,protectedRanges)" });
  existing = meta.data.sheets ?? [];
  const gid = (name: string) => existing.find((s) => s.properties?.title === name)!.properties!.sheetId!;

  // 2. Headers + seeds (seed only when the tab has no data rows yet).
  const current = await api.spreadsheets.values.batchGet({ spreadsheetId, ranges: schema.tabs.map((t) => t.name) });
  const valueData: sheets_v4.Schema$ValueRange[] = [];
  schema.tabs.forEach((t, i) => {
    const headers = headersOf(t);
    valueData.push({ range: `${t.name}!A1`, values: [headers] });
    const hasData = (current.data.valueRanges?.[i]?.values?.length ?? 0) > 1;
    if (t.headers === "$lists") {
      const longest = Math.max(...LIST_NAMES.map((n) => schema.lists[n].length));
      const grid = Array.from({ length: longest }, (_, r) => LIST_NAMES.map((n) => schema.lists[n][r] ?? ""));
      valueData.push({ range: `lists!A2`, values: grid }); // lists always mirrors schema
    } else if (t.seed && !hasData) {
      valueData.push({ range: `${t.name}!A2`, values: t.seed.map((row) => row.map((v) => (typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : v))) });
    }
  });
  await api.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data: valueData } });

  // 3. Formatting, dropdowns, protections.
  for (const s of existing) for (const p of s.protectedRanges ?? []) {
    if (p.description?.startsWith(PROTECT_TAG)) reqs.push({ deleteProtectedRange: { protectedRangeId: p.protectedRangeId! } });
  }

  const listCol = (name: string) => LIST_NAMES.indexOf(name);
  for (const t of schema.tabs) {
    const id = gid(t.name);
    const headers = headersOf(t);
    const lockedFrom = t.backendOnlyFrom ? headers.indexOf(t.backendOnlyFrom) : -1;
    const wholeLocked = !!(t.backendOnly || t.kyleOnly);

    reqs.push({ updateSheetProperties: { properties: { sheetId: id, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } });
    reqs.push({
      repeatCell: {
        range: { sheetId: id, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
        cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: wholeLocked ? PURPLE : ORANGE } },
        fields: "userEnteredFormat(textFormat,backgroundColor)",
      },
    });
    if (lockedFrom >= 0) {
      reqs.push({
        repeatCell: {
          range: { sheetId: id, startRowIndex: 0, endRowIndex: 1, startColumnIndex: lockedFrom, endColumnIndex: headers.length },
          cell: { userEnteredFormat: { backgroundColor: PURPLE } },
          fields: "userEnteredFormat.backgroundColor",
        },
      });
    }

    for (const [col, list] of Object.entries(t.dropdowns ?? {})) {
      const c = headers.indexOf(col);
      const lc = listCol(list);
      const letter = String.fromCharCode(65 + (lc % 26));
      const prefix = lc >= 26 ? String.fromCharCode(64 + Math.floor(lc / 26)) : "";
      reqs.push({
        setDataValidation: {
          range: { sheetId: id, startRowIndex: 1, endRowIndex: DEPTH, startColumnIndex: c, endColumnIndex: c + 1 },
          rule: {
            condition: { type: "ONE_OF_RANGE", values: [{ userEnteredValue: `=lists!$${prefix}${letter}$2:$${prefix}${letter}$${schema.lists[list].length + 1}` }] },
            strict: true, // reject input, not warn
            showCustomUi: true,
          },
        },
      });
    }

    // Row 1 is Kyle-only on every tab (owner can always edit).
    reqs.push({ addProtectedRange: { protectedRange: { description: `${PROTECT_TAG}:header:${t.name}`, range: { sheetId: id, startRowIndex: 0, endRowIndex: 1 }, editors: { users: [] } } } });
    if (wholeLocked) {
      const editors = t.kyleOnly ? [] : [serviceEmail];
      reqs.push({ addProtectedRange: { protectedRange: { description: `${PROTECT_TAG}:tab:${t.name}`, range: { sheetId: id, startRowIndex: 1 }, editors: { users: editors } } } });
    } else if (lockedFrom >= 0) {
      reqs.push({ addProtectedRange: { protectedRange: { description: `${PROTECT_TAG}:backend:${t.name}`, range: { sheetId: id, startRowIndex: 1, startColumnIndex: lockedFrom, endColumnIndex: headers.length }, editors: { users: [serviceEmail] } } } });
    }
  }

  await api.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: reqs } });
  console.log(`MM Core ready: ${schema.tabs.length} tabs, ${reqs.length} formatting/validation/protection requests applied.`);
  console.log("Next: share the Sheet with the bot account as Editor (protections keep it out of the locked ranges).");
}

main().catch((e) => {
  console.error(e?.response?.data ?? e);
  process.exit(1);
});
