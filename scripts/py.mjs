// node scripts/py.mjs <args> — runs Python by the name this OS uses (python3, or python on Windows).
// PYTHON overrides. Mirrors apps/backend/src/lib/python.ts for npm scripts.
import { spawnSync } from "node:child_process";

const python = process.env.PYTHON?.trim() || (process.platform === "win32" ? "python" : "python3");
const r = spawnSync(python, process.argv.slice(2), { stdio: "inherit" });
if (r.error) console.error(`Couldn't run ${python}: ${r.error.message}. Install Python 3 or set PYTHON in .env.`);
process.exit(r.status ?? 1);
