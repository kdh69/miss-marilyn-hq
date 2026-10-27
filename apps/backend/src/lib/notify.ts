/**
 * Notify Kyle about HALTs, escalations and reverted changes.
 * v1: GitHub Actions log + a ::warning annotation (shows on the run summary and,
 * with notifications on, emails you). Swap for Resend/ntfy later if you want push.
 */
export async function notifyKyle(message: string): Promise<void> {
  console.log(`::warning title=MM backend::${message.replace(/\n/g, " ")}`);
}
