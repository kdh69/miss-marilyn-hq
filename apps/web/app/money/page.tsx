import { Bar, Card, PageHeader, Stat } from "@/components/ui";
import { MoneyChart } from "@/components/MoneyChart";
import { Table } from "@/components/Table";
import { notFound } from "next/navigation";
import { costsByCategory, getSnapshot, moneyByMonth, spendToday } from "@/lib/data";
import { canSee, viewerRole } from "@/lib/viewer";

const usd = (n: number) => `$${n.toFixed(2)}`;
const CATEGORY: Record<string, string> = { ai_credits: "Bots (Grok)", qc_api: "Quality checks (Claude)", print_proof: "Print proofs", software: "Software", listing_fees: "Listing fees", ads: "Ads", legal: "Legal", contractor: "Contractors", other: "Other" };

export default async function Money() {
  if (!canSee(await viewerRole(), "/money")) notFound();
  const s = await getSnapshot();
  const net = s.transactions.reduce((a, t) => a + (Number(t.net_usd) || 0), 0);
  const costs = s.costs.reduce((a, c) => a + (Number(c.amount_usd) || 0), 0);
  const spend = spendToday(s);
  const months = moneyByMonth(s, 6);
  const thisMonth = months[months.length - 1];
  const cats = costsByCategory(s);
  const byProduct = s.products.map((p) => {
    const rev = s.transactions.filter((t) => t.sku.startsWith(p.product_id)).reduce((a, t) => a + (Number(t.net_usd) || 0), 0);
    const cost = s.costs.filter((c) => c.product_id === p.product_id).reduce((a, c) => a + (Number(c.amount_usd) || 0), 0);
    return { title: p.title, rev: usd(rev), cost: usd(cost), profit: usd(rev - cost) };
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Money" sub={`${s.transactions.filter((t) => t.txn_type === "sale").length} sales so far`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales this month (net)" value={usd(thisMonth.sales)} tone="accent" />
        <Stat label="Costs this month" value={usd(thisMonth.costs)} />
        <Stat label="Profit, all time" value={usd(net - costs)} tone={net - costs >= 0 ? "ink" : "accent-2"} />
        <Stat label="Bot spend today" value={usd(spend.bots)} sub={`of $${spend.cap}`} tone="accent-2" />
      </div>

      <Card title="Sales and costs, last 6 months">
        <MoneyChart data={months} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Profit by product">
          <Table rows={byProduct} cols={[["title", "Product"], ["rev", "Sales"], ["cost", "Costs"], ["profit", "Profit"]]} empty="No products yet." />
        </Card>
        <Card title="Where the money goes">
          <ul className="flex flex-col gap-3">
            {cats.map(([cat, amt]) => (
              <li key={cat}>
                <div className="mb-1 flex justify-between text-sm"><span>{CATEGORY[cat] ?? cat}</span><span className="tabular-nums">{usd(amt)}</span></div>
                <Bar pct={Math.round((amt / (cats[0]?.[1] || 1)) * 100)} tone="accent-2" />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[var(--quiet)]">Bots are capped at ${spend.cap}/day and quality checks at $5/day. The backend pauses the team if a cap is hit.</p>
        </Card>
      </div>
      {s._sample && <p className="px-1 text-xs text-[var(--quiet)]">Sample numbers. Real sales appear once the KDP and Etsy imports run after launch.</p>}
    </div>
  );
}
