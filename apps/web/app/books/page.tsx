import { Card } from "@/components/ui";
import { Table } from "@/components/Table";
import { getSnapshot } from "@/lib/data";

export default async function Books() {
  const s = await getSnapshot();
  return (
    <div className="flex flex-col gap-4">
      {s.products.map((p) => (
        <Card key={p.product_id} title={p.title}>
          <p className="mb-3 text-sm text-[var(--quiet)]">{p.product_id} · {p.status}{p.lesson_theme ? ` · ${p.lesson_theme}` : ""}</p>
          <Table
            rows={s.listings.filter((l) => l.sku.startsWith(p.product_id))}
            cols={[["sku", "Format"], ["channel", "Where"], ["status", "Status"], ["price", "Price"], ["live_url", "Link"]]}
            empty="No listings yet."
          />
        </Card>
      ))}
    </div>
  );
}
