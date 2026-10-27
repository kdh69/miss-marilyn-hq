import Link from "next/link";
import { Bar, Card } from "@/components/ui";
import { Table } from "@/components/Table";
import { bookProgress, getSnapshot } from "@/lib/data";

export default async function Books() {
  const s = await getSnapshot();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {s.products.map((p, i) => {
        const b = bookProgress(s, p.product_id);
        const pages = s.pages.filter((x) => x.product_id === p.product_id);
        return (
          <Card key={p.product_id}>
            <Link href={`/books/${p.product_id}`} className="block">
              <p className="text-xs text-[var(--quiet)]">{p.product_id} · {p.status.replace("_", " ")}</p>
              <p className="mt-1 text-lg font-semibold">{p.title}</p>
              <div className="my-3"><Bar pct={b.pct} tone={i % 2 ? "accent-2" : "accent"} /></div>
              <p className="text-sm text-[var(--quiet)]">{b.stage} · {pages.length ? `${pages.length} pages` : "no pages yet"}</p>
              <p className="mt-3 text-sm font-semibold text-orange-600">Open the book →</p>
            </Link>
            <div className="mt-4">
              <Table rows={s.listings.filter((l) => l.sku.startsWith(p.product_id))} cols={[["channel", "Where"], ["status", "Status"], ["price", "Price"]]} empty="Not listed anywhere yet." />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
