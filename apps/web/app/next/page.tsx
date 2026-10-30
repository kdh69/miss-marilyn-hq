import { redirect } from "next/navigation";
import { viewer } from "@/lib/viewer";

/** Moved: this lives under the new tabs now. */
export default async function Moved() {
  const v = await viewer();
  redirect(v.view === "family" ? "/" : v.view === "kyle" ? "/progress" : "/todo");
}
