/**
 * One-time: get GOOGLE_OWNER_REFRESH_TOKEN so uploads and backups are created as
 * the Drive folder owner (service accounts can't own uploaded files in a free-Gmail Drive).
 *
 * Before running:
 *  - AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET in .env (the panel's OAuth client)
 *  - add http://localhost:5179/oauth2callback to that client's Authorized redirect URIs
 *  - OAuth consent screen set to "In production" (Testing-mode tokens expire after 7 days;
 *    an unverified app is fine for the two of you — click through the warning once)
 *
 * Run: npm run google:authorize   → sign in as the account that owns "Miss Marilyn Business"
 */
import http from "node:http";
import { google } from "googleapis";

const PORT = 5179;
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;
const id = process.env.AUTH_GOOGLE_ID;
const secret = process.env.AUTH_GOOGLE_SECRET;
if (!id || !secret) {
  console.error("Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in .env first.");
  process.exit(1);
}

const client = new google.auth.OAuth2(id, secret, REDIRECT);
const url = client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: ["https://www.googleapis.com/auth/drive"] });

http
  .createServer(async (req, res) => {
    if (!req.url?.startsWith("/oauth2callback")) return void res.end();
    const code = new URL(req.url, REDIRECT).searchParams.get("code");
    try {
      const { tokens } = await client.getToken(code ?? "");
      res.end("Done — you can close this tab and go back to the terminal.");
      console.log("\nAdd this to .env, GitHub secrets and Vercel env:\n");
      console.log(`GOOGLE_OWNER_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    } catch (e) {
      res.end("Failed — see terminal.");
      console.error(e);
    }
    process.exit(0);
  })
  .listen(PORT, () => console.log(`Open this URL and sign in as the Drive folder owner:\n\n${url}\n`));
