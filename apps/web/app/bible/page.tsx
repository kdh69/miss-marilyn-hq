import { redirect } from "next/navigation";
import { canSee, viewer } from "@/lib/viewer";
import { AddCanon, CanonEntry, type CanonView } from "@/components/CanonEntry";
import { CANON_KIND as KIND_LABEL } from "@/lib/labels";
import { Card, Empty, PageHeader } from "@/components/ui";
import { driveId, getSnapshot } from "@/lib/data";

/**
 * Miss M's Bible: how every recurring character, place and thing always looks (the `canon` tab).
 * The team prints it in every brief, so a change here reaches the next picture and the next book.
 */
export default async function Bible() {
  const [s, v] = await Promise.all([getSnapshot(), viewer()]);
  if (!canSee(v.view, "/bible")) redirect("/");
  const files = new Map(s.assets.map((a) => [a.asset_id, driveId(a.file_url)]));
  const title = (id: string) => s.products.find((p) => p.product_id === id)?.title ?? id;
  const books = s.products.filter((p) => !["retired", "archived"].includes(p.status)).map((p) => ({ id: p.product_id, title: p.title }));

  const entries: CanonView[] = (s.canon ?? []).map((c) => ({
    id: c.canon_id, kind: c.kind, name: c.name, look: c.look, notes: c.notes, referenceIds: c.reference_ids,
    scope: !c.applies_to || c.applies_to === "series" ? "Whole series" : c.applies_to.split(",").map((x) => title(x.trim())).join(", "),
    retired: c.status === "retired",
    updated: c.updated_by ? `changed by ${c.updated_by === "mom" ? "Clara" : c.updated_by === "kyle" ? "Kyle" : "the team"}${c.updated_at ? ` ${c.updated_at.slice(0, 10)}` : ""}` : "",
    pictures: c.reference_ids.split(/[\s,]+/).filter(Boolean)
      .map((id) => ({ id, file: files.get(id) ?? (s._sample ? `sample-art-${(id.length % 8) + 1}` : "") }))
      .filter((p) => p.file).map((p) => ({ id: p.id, src: `/api/asset/${p.file}` })),
  }));
  const kinds = Object.keys(KIND_LABEL);
  const active = entries.filter((e) => !e.retired);
  const retired = entries.filter((e) => e.retired);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Miss M's Bible"
        sub="How Miss Marilyn's world always looks, so every page and every book feels like the same series. The team draws from these words and pictures every time; change them here and the next pictures follow." />
      {v.canWrite && <Card title="Something new?"><AddCanon books={books} /></Card>}
      {kinds.map((k) => {
        const list = active.filter((e) => e.kind === k);
        return list.length > 0 && (
          <Card key={k} title={KIND_LABEL[k]}>
            <div className="flex flex-col divide-y divide-black/5">
              {list.map((e) => <CanonEntry key={e.id} c={e} canEdit={v.canWrite} />)}
            </div>
          </Card>
        );
      })}
      {!active.length && <Card><Empty>Nothing in the bible yet.</Empty></Card>}
      {retired.length > 0 && (
        <Card title="Not used any more">
          <div className="flex flex-col divide-y divide-black/5">
            {retired.map((e) => <CanonEntry key={e.id} c={e} canEdit={v.canWrite} />)}
          </div>
        </Card>
      )}
    </div>
  );
}
