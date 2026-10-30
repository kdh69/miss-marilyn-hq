import { redirect } from "next/navigation";
import { viewer } from "@/auth";

/** Moved: this lives under the new tabs now. */
export default async function Moved() {
  const v = await viewer();
  redirect(v.view === "kyle" ? "/system#accounts" : "/todo#accounts");
}
