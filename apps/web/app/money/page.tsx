import { Card, Stat } from "@/components/ui";
import { Table } from "@/components/Table";
import { getSnapshot, spendToday } from "@/lib/data";

const usd = (n: number) => `$${n.toFixed(2)}`;

export default async function Money() {
  const s = await getSnapshot();
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Sales (net, all time)" value={usd(net)} tone="accent" />
        <Stat label="Costs (all time)" value={usd(costs)} />
        <Stat label="Bot spend today" value={usd(spend.bots)} sub={`of $${spend.cap}`} tone="accent-2" />
      </div>
      <Card title="Profit by book">
        <Table rows={byProduct} cols={[["title", "Book"], ["rev", "Sales"], ["cost", "Costs"], ["profit", "Profit"]]} empty="No books yet." />
        {!s.transactions.length && <p className="mt-3 text-xs text-[var(--quiet)]">Sales appear here once the KDP and Etsy imports run after launch.</p>}
      </Card>
    </div>
  );
}
