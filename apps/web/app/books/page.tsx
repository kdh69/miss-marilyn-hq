import Link from "next/link";
import { viewer } from "@/auth";
import { NewBook } from "@/components/NewBook";
import { Empty, PageHeader, Pill, StageTrack } from "@/components/ui";
import { bookPages, bookStage, getSnapshot, needsYou } from "@/lib/data";
import { PRODUCT_STATUS } from "@/lib/labels";

/** The shelf: every book, with a badge where something needs her. */
export default async function Books() {
  const [s, v] = await Promise.all([getSnapshot(), viewer()]);
  const items = needsYou(s, v.view);
  const books = s.products.filter((p) => p.status !== "retired");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Books"
        sub={items.length ? <>Tap a book to write. <Link href="/" className="text-orange-700 underline">{items.length} thing{items.length > 1 ? "s" : ""} need{items.length > 1 ? "" : "s"} you</Link>.</> : "Tap a book to read and write its pages."}
        action={<NewBook canWrite={!!v.real} />}
      />
      {s._sample && <p className="px-1 text-xs text-[var(--quiet)]">Sample data — the Sheet isn't connected yet.</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {books.map((p) => {
          const st = bookStage(s, p.product_id);
          const cover = bookPages(s, p.product_id).find((x) => x.art_id)?.art_id;
          const mine = items.filter((n) => n.productId === p.product_id).length;
          return (
            <Link key={p.product_id} href={`/books/${p.product_id}`} className="glass flex gap-4 rounded-3xl p-4 transition hover:bg-white/70 md:p-5">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 to-violet-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {cover && <img src={`/api/asset/${cover}`} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-lg font-semibold">{p.title}</p>
                  {mine > 0 && <Pill tone="accent">Needs you · {mine}</Pill>}
                </div>
                <p className="text-sm text-[var(--quiet)]">{v.view === "kyle" ? `${p.product_id} · ${p.status}` : PRODUCT_STATUS[p.status] ?? p.status}{st.pages ? ` · ${st.yours} of ${st.pages} pages in your words` : ""}</p>
                <div className="mt-3"><StageTrack index={st.index} /></div>
                <p className="mt-2 text-sm">{st.now}</p>
              </div>
            </Link>
          );
        })}
      </div>
      {!books.length && <Empty>No books yet. Start one above.</Empty>}
    </div>
  );
}
