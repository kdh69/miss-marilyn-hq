/**
 * One scheduled tick (GitHub Actions, every 30 min). Order matters:
 * spend guard → integrity → QC (with KDP preflight) → Clara's answers → messages
 * → publishing → housekeeping. Each job is isolated: one failure is reported and
 * the rest still run. The process exits non-zero if anything failed, so the
 * Actions run shows red and GitHub emails you.
 */
import { Core } from "@mm/core";
import { integrityCheck, qcGate, spendGuard } from "./jobs/gatekeeper";
import { momSync, processRequests } from "./jobs/momSync";
import { etsyPublish } from "./jobs/etsyPublish";
import { messageAlerts, weeklyBackup, weeklyDigest } from "./jobs/housekeeping";
import { flushKyle, notifyKyle } from "./lib/notify";

const failures: string[] = [];

async function step(name: string, fn: () => Promise<unknown>) {
  const t = Date.now();
  try {
    await fn();
    console.log(`✓ ${name} (${Date.now() - t} ms)`);
  } catch (e) {
    const msg = (e as { response?: { data?: unknown } })?.response?.data ?? (e as Error)?.message ?? e;
    failures.push(name);
    console.error(`✗ ${name}:`, msg);
    await notifyKyle(`Backend step "${name}" failed: ${JSON.stringify(msg).slice(0, 200)}`);
  }
}

async function main() {
  const core = await Core.load();
  let halted = false;
  let qcBudgetLeft = false;

  await step("spend guard", async () => ({ halted, qcBudgetLeft } = await spendGuard(core)));
  await step("integrity check", () => integrityCheck(core));
  if (halted) console.log("system_status is HALT — skipping QC and publishing.");
  else {
    await step("QC gate", () => qcGate(core, qcBudgetLeft));
    await step("Clara sync", () => momSync(core));
    await step("messages", () => processRequests(core));
    await step("Etsy publish", () => etsyPublish(core));
  }
  await step("message alerts", () => messageAlerts(core));
  await step("weekly digest", () => weeklyDigest(core));
  await step("weekly backup", () => weeklyBackup(core));
  await flushKyle().catch((e) => console.error("alert email failed:", e));
  if (failures.length) process.exit(1);
}

main().catch(async (e) => {
  console.error("tick could not start:", e?.response?.data ?? e);
  await notifyKyle(`Backend tick could not start: ${String(e?.message ?? e).slice(0, 200)}`);
  await flushKyle().catch(() => {});
  process.exit(1);
});
