import { redirect } from "next/navigation";

/** Illustrations moved into Words & pictures (/script): the words and the pictures on one screen. */
export default async function Illustrations({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const { book } = await searchParams;
  redirect(book ? `/script?book=${encodeURIComponent(book)}` : "/script");
}
