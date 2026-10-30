import { redirect } from "next/navigation";
import { canSee, viewer } from "@/lib/viewer";
import { AccountRow } from "@/components/AccountRow";
import { PauseButton } from "@/components/PauseButton";
import { Card, Empty, PageHeader } from "@/components/ui";
import { Table } from "@/components/Table";
import { getSnapshot, lastTick, spendToday } from "@/lib/data";

const PHASES: [string, string][] = [["now", "Set up now"], ["phase_0", "Business basics"], ["phase_1", "Selling and social"], ["phase_2", "Automation"], ["phase_3", "Merch and storefront"]];

/** Kyle only: pause/resume, backend health, config, accounts. */
export default async function System() {
  const [s, v] = await Promise.all([getSnapshot(), viewer()]);
  if (v.view !== "kyle") redirect("/");
  const halted = s.config.find((c) => c.key === "system_status")?.value === "HALT";
  const tick = lastTick(s);
  const spend = spendToday(s);
  const minutes = tick ? Math.round((Date.now() - new Date(tick).getTime()) / 60000) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="System" sub={halted ? "Bots are paused." : "Bots are running."} action={v.real === "kyle" ? <PauseButton halted={halted} /> : undefined} />
      <Card title="Backend">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-[var(--quiet)]">Last tick</dt><dd>{tick ? `${tick} (${minutes} min ago)` : "no backend log rows yet"}</dd>
          <dt className="text-[var(--quiet)]">Spend today</dt><dd>bots ${spend.bots.toFixed(2)} of ${spend.cap} · QC ${spend.qc.toFixed(2)} of $5</dd>
          <dt className="text-[var(--quiet)]">Status</dt><dd>{halted ? "HALT" : "RUN"}</dd>
        </dl>
      </Card>
      <Card title="Backend notes">
        <Table rows={[...s.log].reverse().filter((l) => l.actor === "backend").slice(0, 10)} cols={[["ts", "When"], ["message", "Note"], ["task_id", "Task"], ["to_status", "Now"]]} empty="No backend notes yet." />
      </Card>
      <Card title="Config">
        <Table rows={s.config} cols={[["key", "Key"], ["value", "Value"], ["note", "Note"]]} empty="No config rows." />
      </Card>
      <div id="accounts" className="flex flex-col gap-4">
        {PHASES.map(([phase, title]) => {
          const rows = s.accounts.filter((a) => a.phase === phase);
          if (!rows.length) return null;
          return (
            <Card key={phase} title={title}>
              <div className="flex flex-col divide-y divide-black/5">
                {rows.map((a) => <AccountRow key={a.account_id} a={a} canEdit={v.real === "kyle"} technical />)}
              </div>
            </Card>
          );
        })}
        {!s.accounts.length && <Empty>No accounts listed yet — run npm run sheet:setup.</Empty>}
      </div>
    </div>
  );
}
