"use client";
import { useTransition } from "react";
import { setSystemStatus } from "@/app/actions";
import { btn } from "./ui";

export function PauseButton({ halted }: { halted: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(async () => void (await setSystemStatus(halted ? "RUN" : "HALT")))}
      className={halted ? btn.primary : btn.secondary}>
      {halted ? "Resume the bots" : "Pause the bots"}
    </button>
  );
}
