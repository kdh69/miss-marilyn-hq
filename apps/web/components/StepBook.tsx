import { BookWorkspace } from "@/components/BookWorkspace";
import { Card } from "@/components/ui";
import { bookPages, type Snapshot } from "@/lib/data";

/** The book itself, page by page (picture + her words), as on the book page. Used by Building and Review. */
export function StepBook({ s, id, view, canWrite, title = "The book, page by page" }: { s: Snapshot; id: string; view: "mom" | "kyle" | "family"; canWrite: boolean; title?: string }) {
  const requests = s.requests.filter((r) => r.product_id === id).reverse();
  return (
    <Card title={title}>
      <BookWorkspace productId={id} pages={bookPages(s, id)} requests={requests} viewer={view} canEdit={canWrite} technical={view === "kyle"} />
    </Card>
  );
}
