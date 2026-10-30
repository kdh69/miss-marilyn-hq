import { viewer } from "@/auth";
import { Card, PageHeader, Stat } from "@/components/ui";
import { Table } from "@/components/Table";
import { getSnapshot, spendToday } from "@/lib/data";

const usd = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`;

export default async function Money() {
  const [s, v] = await Promise.all([getSnapshot(), viewer()]);
  const net = s.transactions.reduce((a, t) => a + (Number(t.net_usd) || 0), 0);
  const costs = s.costs.reduce((a, c) => a + (Number(c.amount_usd) || 0), 0);
  const spend = spendToday(s);
  const byProduct = s.products.map((p) => {
    const rev = s.transactions.filter((t) => t.sku.startsWith(p.product_id)).reduce((a, t) => a + (Number(t.net_usd) || 0), 0);
    const cost = s.costs.filter((c) => c.product_id === p.product_id).reduce((a, c) => a + (Number(c.amount_usd) || 0), 0);
    return { title: p.title, rev: usd(rev), cost: usd(cost), profit: usd(rev - cost) };
  });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Money" sub={s.transactions.length ? "Sales and costs so far." : "Sales start showing here after launch."} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Sales so far" value={usd(net)} tone="accent" />
        <Stat label="Spent so far" value={usd(costs)} />
        <Stat label="Profit" value={usd(net - costs)} tone="accent-2" />
      </div>
      {v.view === "kyle" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat label="Bot spend today" value={usd(spend.bots)} sub={`of $${spend.cap} cap`} />
          <Stat label="QC spend today" value={usd(spend.qc)} sub="of $5 cap" />
        </div>
      )}
      <Card title="By book">
        <Table rows={byProduct} cols={[["title", "Book"], ["rev", "Sales"], ["cost", "Costs"], ["profit", "Profit"]]} empty="No books yet." />
        {!s.transactions.length && <p className="mt-3 text-xs text-[var(--quiet)]">Amazon and Etsy sales get pulled in once the books are on sale.</p>}
      </Card>
    </div>
  );
}
