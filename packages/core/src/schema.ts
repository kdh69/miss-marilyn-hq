import raw from "../schema.json" with { type: "json" };

export type TabDef = {
  name: string;
  group: "work" | "money" | "system";
  id: string | null;
  headers: string[] | "$lists";
  dropdowns?: Record<string, string>;
  backendOnlyFrom?: string;
  backendOnly?: boolean;
  kyleOnly?: boolean;
  seed?: (string | number | boolean)[][];
};

export const schema = raw as unknown as {
  tabs: TabDef[];
  lists: Record<string, string[]>;
  transitions: { bot: string[][]; backend: string[][] };
};

export const LIST_NAMES = Object.keys(schema.lists);

export function headersOf(tab: TabDef): string[] {
  return tab.headers === "$lists" ? LIST_NAMES : tab.headers;
}

export function tabDef(name: string): TabDef {
  const t = schema.tabs.find((x) => x.name === name);
  if (!t) throw new Error(`unknown tab ${name}`);
  return t;
}

export type TaskStatus = (typeof raw.lists.task_status)[number];
export type Actor = "bot" | "backend" | "kyle";

/** Section 6: is `from → to` legal for this actor? Kyle may do anything. */
export function isLegalTransition(
  actor: Actor,
  from: string,
  to: string,
  opts: { needsQc?: boolean } = {},
): boolean {
  if (actor === "kyle" || from === to) return true;
  return schema.transitions[actor].some(([f, t, cond]) => {
    if ((f !== "*" && f !== from) || t !== to) return false;
    if (cond === "needs_qc=false") return opts.needsQc === false;
    return true;
  });
}
