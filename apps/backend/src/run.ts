/**
 * One scheduled tick (GitHub Actions, every 30 min). Order matters:
 * spend guard → integrity → QC → Clara's answers → publishing.
 * KDP preflight (job 3) runs as a separate Python step before this.
 */
import { Core } from "@mm/core";
import { integrityCheck, qcGate, spendGuard } from "./jobs/gatekeeper";
import { momSync } from "./jobs/momSync";
import { etsyPublish } from "./jobs/etsyPublish";

async function main() {
  const core = await Core.load();
  const { halted, qcBudgetLeft } = await spendGuard(core);
  await integrityCheck(core);
  if (halted) {
    console.log("system_status is HALT — integrity check only.");
    return;
  }
  await qcGate(core, qcBudgetLeft);
  await momSync(core);
  await etsyPublish(core);
  console.log("tick complete");
}

main().catch((e) => {
  console.error(e?.response?.data ?? e);
  process.exit(1);
});
