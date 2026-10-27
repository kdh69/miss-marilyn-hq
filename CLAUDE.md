# Notes for Claude Code

Read the README first, then the spec it links (sections 2–7, 9, 9b are the build contract).

Rules that hold everywhere:
- `packages/core/schema.json` is the source of truth for tabs, headers, dropdowns, ID columns
  and legal status transitions. Change the schema, not hard-coded strings, then re-run
  `npm run sheet:setup`.
- Read and write rows **by header name**, never by column letter or row number. Find rows by ID.
- Every task status change writes a `log` row (`Core.log`). The backend owns every status after
  `ready_for_qc`; bots own `todo → ready_for_qc`. `isLegalTransition` encodes spec §6.
- Use `Core.update`, which refuses if `updated_at` moved since the snapshot; on `false`, skip
  the row this tick rather than overwriting a bot's write.
- Nothing publishes, spends money or creates accounts without Clara's Approve in `mom_queue`.
- The control panel only ever writes Clara's answers to `mom_queue`; the backend applies them.
- Times: ISO 8601 UTC in cells; the daily spend cap resets on the New York day.

Commands: `npm run typecheck`, `npm run backend` (one tick, needs .env),
`npm run web`, `python3 -I apps/backend/preflight/preflight.py interior file.pdf`.

Next up, in order: wire preflight into the gatekeeper for interior_layout / cover_wrap /
kdp_packet; Google sign-in for the panel (allowlist = config `panel_allowed_emails`);
"Done" follow-ups in momSync; remaining rubrics; image downscale for QC.
