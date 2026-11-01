import type { Row } from "@mm/core";
import { Art } from "./BookWorkspace";
import { CopyButton, CopyField } from "./Copy";
import { MarkDone } from "./Marketing";
import { Pill } from "./ui";
import { guideFor } from "@/lib/guides";
import { CHANNEL, CONTENT_TYPE, LISTING_STATUS, PLAN_SECTION } from "@/lib/labels";

/** How to post on a channel: where to go, then the steps, folded until she opens it. */
export function HowTo({ channel, open = false }: { channel: string; open?: boolean }) {
  const g = guideFor(channel);
  if (!g) return null;
  return (
    <details open={open} className="rounded-2xl bg-violet-500/5 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-violet-700">How to post on {g.name}</summary>
      <a href={g.where.url} target="_blank" className="mt-2 inline-block text-sm font-semibold text-violet-600 underline">{g.where.label} ↗</a>
      <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-snug">
        {g.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      {g.tip && <p className="mt-2 text-sm text-[var(--quiet)]">Tip: {g.tip}</p>}
    </details>
  );
}

/** One store listing (Amazon, Etsy): every field ready to paste, the files, how to post, "It's live". */
export function ListingCard({ l, files, mark, productId, canWrite }: {
  l: Row; files: { label: string; url: string }[]; mark?: { link: string }; productId: string; canWrite: boolean;
}) {
  const live = l.status === "live" || !!mark;
  const ready = ["approved", "publishing"].includes(l.status);
  const kdp = l.channel === "KDP";
  return (
    <section className="glass flex flex-col gap-3 rounded-3xl p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{guideFor(l.channel)?.name ?? CHANNEL[l.channel] ?? l.channel}</h2>
        <Pill tone={live ? "good" : ready ? "accent" : "quiet"}>{live ? "Live" : LISTING_STATUS[l.status] ?? l.status}</Pill>
      </div>
      {!ready && !live && <p className="text-sm text-[var(--quiet)]">This is the draft. It's ready to post once it passes its check and you give the book its final OK.</p>}
      <div>
        <CopyField label="Title" value={l.title} />
        <CopyField label="Subtitle" value={l.subtitle} />
        <CopyField label="Series" value={l.series} />
        <CopyField label="Author" value={l.author} />
        <CopyField label="Description" value={l.description} />
        <CopyField label={kdp ? "Keywords" : "Tags"} value={l.keywords} lines hint={kdp ? "One per box, seven boxes." : "Thirteen tags, each in the tags box."} />
        <CopyField label="Categories" value={l.categories} lines />
        <CopyField label="Details" value={l.details} lines hint="Copy takes just the answer after the colon." />
        <CopyField label="Price (USD)" value={l.price} />
      </div>
      {(files.length > 0 || l.packet_url) && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => <a key={f.url} href={f.url} target="_blank" className="rounded-full bg-black/5 px-4 py-2 text-sm font-semibold">⬇ {f.label}</a>)}
          {l.packet_url && <a href={l.packet_url} target="_blank" className="rounded-full bg-black/5 px-4 py-2 text-sm">The full packet ↗</a>}
        </div>
      )}
      <HowTo channel={l.channel} open={ready && !live} />
      <MarkDone what="Live" id={l.listing_id} productId={productId} done={live} doneLink={mark?.link || l.live_url} canWrite={canWrite && ready} />
    </section>
  );
}

/** One social post, ready to post by hand: the picture, every piece of text with Copy, the tips, "Posted". */
export function PostCard({ c, media, mark, bookTitle, canWrite, compact = false }: {
  c: Row; media?: { id: string; video: boolean; name: string }; mark?: { link: string }; bookTitle?: string; canWrite: boolean; compact?: boolean;
}) {
  const posted = c.status === "posted" || !!mark;
  const ready = ["approved", "scheduled"].includes(c.status);
  const caption = [c.body, c.hashtags].filter(Boolean).join("\n\n");
  const all = [c.channel === "PINTEREST" ? "" : c.hook, caption, c.channel === "INSTAGRAM" || c.channel === "TIKTOK" ? "" : c.link_url].filter(Boolean).join("\n\n");
  return (
    <article className={`glass flex flex-col gap-3 rounded-3xl p-4 ${posted ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="accent-2">{CHANNEL[c.channel] ?? c.channel}</Pill>
        <Pill>{CONTENT_TYPE[c.content_type] ?? c.content_type}</Pill>
        {bookTitle && <span className="text-xs text-[var(--quiet)]">{bookTitle}</span>}
        <span className="ml-auto">{posted ? <Pill tone="good">Posted</Pill> : !ready && <Pill>Waiting for your OK</Pill>}</span>
      </div>
      <div className={compact ? "flex gap-3" : "grid gap-3 md:grid-cols-[minmax(0,240px)_1fr]"}>
        {media && (
          <div className={compact ? "w-20 shrink-0" : ""}>
            <div className="overflow-hidden rounded-2xl">
              {media.video
                // eslint-disable-next-line jsx-a11y/media-has-caption
                ? <video src={`/api/asset/${media.id}`} controls playsInline className="aspect-square w-full bg-black object-cover" />
                : <Art id={media.id} brief={c.hook} />}
            </div>
            {!compact && <a href={`/api/asset/${media.id}?download=1`} className="mt-2 inline-block text-sm font-semibold text-violet-600 underline">Save {media.video ? "video" : "picture"}</a>}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">{c.hook}</p>
          {!compact && (
            <div className="mt-2">
              {c.channel === "PINTEREST" && <CopyField label="Pin title" value={c.hook} />}
              <CopyField label="Caption" value={c.body} />
              <CopyField label="Hashtags" value={c.hashtags} />
              <CopyField label="Link" value={c.link_url} hint={c.channel === "INSTAGRAM" || c.channel === "TIKTOK" ? "Not tappable in captions here; it goes in the bio link." : undefined} />
              {c.notes && <p className="mt-1 rounded-xl bg-orange-500/10 p-3 text-sm text-orange-900"><b>Tips:</b> {c.notes}</p>}
            </div>
          )}
        </div>
      </div>
      {!compact && (
        <>
          {ready && !posted && <div><CopyButton text={all} label="Copy everything" /></div>}
          <HowTo channel={c.channel} />
          {ready && <MarkDone what="Posted" id={c.content_id} productId={c.product_id} done={posted} doneLink={mark?.link || c.posted_url} canWrite={canWrite} />}
        </>
      )}
    </article>
  );
}

/** The marketing plan, section by section. */
export function PlanView({ rows, approved }: { rows: Row[]; approved: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Pill tone={approved ? "good" : "quiet"}>{approved ? "Approved" : "Draft — waiting for its check and your OK"}</Pill>
      {PLAN_SECTION.map(([key, label]) => {
        const items = rows.filter((r) => r.section === key);
        if (!items.length) return null;
        return (
          <div key={key}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--quiet)]">{label}</h3>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {items.map((r) => (
                <li key={r.plan_id} className="rounded-xl bg-white/70 px-3 py-2 text-[15px]">
                  <span className="font-semibold">{r.channel ? `${CHANNEL[r.channel] ?? r.channel}: ` : ""}{r.title}</span>
                  {r.detail && <span className="block whitespace-pre-wrap text-sm text-[var(--quiet)]">{r.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
