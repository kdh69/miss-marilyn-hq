import Link from "next/link";
import { Bar, Card, PageHeader, Pill, StageTrack } from "@/components/ui";
import { bookProgress, bookStages, getSnapshot, type Snapshot } from "@/lib/data";
import { CHANNEL, STAGE_LABEL } from "@/lib/labels";
import type { Row } from "@mm/core";

const PRODUCT_TONE: Record<string, "green" | "orange" | "gray"> = { live: "green", in_production: "orange", concept: "gray" };
const COVER: Record<string, string> = { OL: "from-sky-200 via-teal-100 to-orange-100", MM: "from-orange-200 via-rose-100 to-violet-200" };

export default async function Books() {
  const s = await getSnapshot();
  const isBook = (p: Row) => s.skus.some((k) => k.product_id === p.product_id && ["PB", "HC", "EB"].includes(k.format)) || s.pages.some((x) => x.product_id === p.product_id);
  const books = s.products.filter((p) => p.status !== "retired" && isBook(p));
  const other = s.products.filter((p) => p.status !== "retired" && !isBook(p));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Books" sub={`${books.length} books · ${other.length} printables and other products`} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {books.map((p, i) => <BookCard key={p.product_id} s={s} p={p} i={i} />)}
      </div>
      {other.length > 0 && (
        <>
          <h2 className="px-1 pt-2 text-[15px] font-semibold">Printables and more</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {other.map((p) => (
              <Card key={p.product_id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{p.title}</p>
                  <Pill tone={PRODUCT_TONE[p.status]}>{p.status.replace("_", " ")}</Pill>
                </div>
                {p.subtitle && <p className="text-sm text-[var(--quiet)]">{p.subtitle}</p>}
                <Listings s={s} productId={p.product_id} />
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BookCard({ s, p, i }: { s: Snapshot; p: Row; i: number }) {
  const b = bookProgress(s, p.product_id);
  const pages = s.pages.filter((x) => x.product_id === p.product_id);
  const yours = pages.filter((x) => x.text_final).length;
  const stages = bookStages(s, p.product_id).map((x) => ({ ...x, label: STAGE_LABEL[x.type] }));
  return (
    <Card className="flex flex-col">
      <Link href={`/books/${p.product_id}`} className="group flex gap-4">
        <div className={`flex aspect-[3/4] w-24 shrink-0 flex-col justify-end rounded-xl bg-gradient-to-br ${COVER[p.line] ?? COVER.MM} p-2 shadow-md ring-1 ring-black/5 transition group-hover:-rotate-2`}>
          <p className="text-[10px] font-bold leading-tight text-[var(--ink)]/80">{p.title}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={PRODUCT_TONE[p.status]}>{p.status.replace("_", " ")}</Pill>
            {p.age_range && <span className="text-xs text-[var(--quiet)]">ages {p.age_range}</span>}
          </div>
          <p className="mt-1 text-lg font-semibold leading-snug group-hover:text-orange-700">{p.title}</p>
          {p.lesson_theme && <p className="text-sm text-[var(--quiet)]">About {p.lesson_theme}</p>}
          <p className="mt-2 text-xs text-[var(--quiet)]">{pages.length ? `${pages.length} pages · ${yours} in your words` : "No pages yet"}</p>
        </div>
      </Link>
      <div className="mt-4"><Bar pct={b.pct} tone={i % 2 ? "accent-2" : "accent"} /></div>
      <div className="mt-3"><StageTrack stages={stages} /></div>
      <Listings s={s} productId={p.product_id} />
      <Link href={`/books/${p.product_id}`} className="mt-4 text-sm font-semibold text-orange-700">Open the book →</Link>
    </Card>
  );
}

function Listings({ s, productId }: { s: Snapshot; productId: string }) {
  const ls = s.listings.filter((l) => l.sku.startsWith(productId));
  if (!ls.length) return <p className="mt-3 text-xs text-[var(--quiet)]">Not listed anywhere yet.</p>;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {ls.map((l) => (
        <Pill key={l.listing_id} tone={l.status === "live" ? "green" : "gray"}>
          {CHANNEL[l.channel] ?? l.channel} · {l.status.replace("_", " ")}{l.price ? ` · $${l.price}` : ""}
        </Pill>
      ))}
    </div>
  );
}
