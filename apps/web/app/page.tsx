import { redirect } from "next/navigation";
import { viewer } from "@/auth";

/** Home is Books for Clara and the Inbox for Kyle. */
export default async function Home() {
  const v = await viewer();
  redirect(v.view === "kyle" ? "/inbox" : "/books");
}
