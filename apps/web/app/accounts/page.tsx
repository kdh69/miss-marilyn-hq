import { viewer } from "@/auth";
import { AccountRow } from "@/components/AccountRow";
import { Bar, Card, Empty } from "@/components/ui";
import { getSnapshot } from "@/lib/data";

const PHASES: [string, string][] = [["now", "Set up now"], ["phase_0", "Business basics"], ["phase_1", "Selling and social"], ["phase_2", "Automation"], ["phase_3", "Merch and storefront"]];

export default async function Accounts() {
  const [s, v] = await Promise.all([getSnapshot(), viewer()]);
  const all = s.accounts.filter((a) => a.status !== "not_needed");
  const done = all.filter((a) => a.status === "done").length;
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-sm font-semibold">{done} of {all.length} accounts set up</p>
        <div className="mt-2"><Bar pct={all.length ? Math.round((done / all.length) * 100) : 0} /></div>
        <p className="mt-2 text-xs text-[var(--quiet)]">Passwords never go here — they live in the shared password manager.</p>
      </Card>
      {PHASES.map(([phase, title]) => {
        const rows = s.accounts.filter((a) => a.phase === phase);
        if (!rows.length) return null;
        return (
          <Card key={phase} title={title}>
            <div className="flex flex-col divide-y divide-black/5">
              {rows.map((a) => <AccountRow key={a.account_id} a={a} canEdit={v.view === "kyle" && v.real === "kyle"} />)}
            </div>
          </Card>
        );
      })}
      {!s.accounts.length && <Empty>No accounts listed yet — run npm run sheet:setup.</Empty>}
    </div>
  );
}
