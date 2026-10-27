/**
 * Alerts. Everything raised during a tick is collected and sent as ONE email to Kyle
 * at the end (no inbox flood), via Resend when RESEND_API_KEY + NOTIFY_FROM are set.
 * Always also printed as a GitHub Actions ::warning so it shows on the run page.
 */
const pending: string[] = [];

export async function notifyKyle(message: string): Promise<void> {
  pending.push(message);
  console.log(`::warning title=MM backend::${message.replace(/\n/g, " ")}`);
}

export async function flushKyle(): Promise<void> {
  if (!pending.length) return;
  const to = process.env.KYLE_EMAIL;
  const lines = pending.splice(0);
  if (!to) return;
  const panel = process.env.PANEL_URL ? `\n\nOpen the panel: ${process.env.PANEL_URL}` : "";
  await sendEmail(to, `Miss Marilyn HQ: ${lines.length} alert${lines.length > 1 ? "s" : ""}`, lines.map((l) => `• ${l}`).join("\n") + panel);
}

export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM;
  if (!key || !from) {
    console.log(`(email not sent — Resend not configured) ${subject}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text, ...(html ? { html } : {}) }),
  });
  if (!res.ok) console.log(`::warning title=Email failed::${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.ok;
}
