import { redirect } from "next/navigation";
import { Approval } from "@/components/NeedsYou";
import { StepBook } from "@/components/StepBook";
import { StepShell, pickBook } from "@/components/StepShell";
import { Card, Pill } from "@/components/ui";
import { bookPages, getSnapshot, stepAsk, stepTask } from "@/lib/data";
import { canSee, viewer } from "@/lib/viewer";

/**
 * Step 5 — Full book review. Read the finished book start to finish, then give the final OK.
 * That OK is what lets it go to Amazon (nothing publishes without it).
 */
export default async function Review({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const [{ book }, s, v] = await Promise.all([searchParams, getSnapshot(), viewer()]);
  if (!canSee(v.view, "/review")) redirect("/");
  const id = pickBook(s, "review", book);
  if (!id) return <StepShell step="review" s={s} view={v.view} />;

  const pages = bookPages(s, id);
  const left = pages.filter((p) => !p.text_final).length;
  const drawn = pages.filter((p) => p.art_id).length;
  const ask = stepAsk(s, id, "review");
  const built = stepTask(s, id, "build")?.status === "done";
  const checks = [
    { ok: pages.length > 0 && left === 0, text: left ? `${left} page${left > 1 ? "s" : ""} still in the draft's words` : "Every page is in your words" },
    { ok: pages.length > 0 && drawn === pages.length, text: `${drawn} of ${pages.length} pages have their picture` },
    { ok: built, text: built ? "Layout and cover are approved" : "Layout and cover aren't approved yet" },
  ];

  return (
    <StepShell step="review" s={s} view={v.view} selected={id}>
      <Card>
        <ul className="flex flex-col gap-1.5">
          {checks.map((c) => (
            <li key={c.text} className="flex items-center gap-2 text-[15px]">
              <Pill tone={c.ok ? "good" : "accent"}>{c.ok ? "✓" : "!"}</Pill>{c.text}
            </li>
          ))}
        </ul>
        {ask ? (
          <div className="mt-3"><Approval item={ask} labels={{ yes: "Yes, it's ready — publish", changes: "Not yet — ask for changes" }} /></div>
        ) : (
          <p className="mt-3 text-sm text-[var(--quiet)]">When the team has the final files ready, your final OK goes here. Nothing is published without it.</p>
        )}
      </Card>
      <StepBook s={s} id={id} view={v.view} canWrite={v.canWrite} title="Read it start to finish" />
    </StepShell>
  );
}
