# S7: where its videograph paths are now

On 20 Nov 2026 the videograph repo (Kyle's private video repo) became two folders: `app/` (everything that makes the videos)
and `channels/` (one folder per channel). [S7](S7-videograph-channel.md) was written before that and names the old
places. Read it with this table. Nothing in this repo's code reads these paths.

| S7 says (in videograph) | Now |
|---|---|
| how a channel is laid out: `docs/<channel>/` | `channels/<channel>/`, always three folders: `videos/` (the finished videos and nothing else), `making/<video>/` (script, cut files, notes; every draft in `cuts/`), `about/` (plan, brand, characters, research), with a README to start from |
| the channel folder `docs/miss-marilyn/` (`README.md`, `plan.md`, `HANDOFF.md`) | `channels/miss-marilyn/about/` |
| `docs/miss-marilyn/characters/` | `channels/miss-marilyn/about/characters/` |
| `docs/miss-marilyn/episodes/` | `channels/miss-marilyn/making/` |
| a finished trailer or clip | `channels/miss-marilyn/videos/` (filled by `npm run videos` from the newest final in `making/<video>/cuts/`) |
| `formats/mm-book-trailer.json` | `app/config/formats/mm-book-trailer.json` |
| a channel's settings | `app/config/channels/<channel>.json` |
| the knowledge files (consistency, prompting, audio), the playbook | `app/docs/knowledge/` (the playbook is `playbook.md` there) |
| the social clips doc | `app/docs/tools/guides/social-clips.md` |
| the handoff | `app/docs/HANDOFF.md` |

The channel exists there already: `channels/miss-marilyn/README.md`, then `about/plan.md` (a draft, 12 Nov).
The full table for videograph: `app/docs/history/layout-2026-11-20.md` in that repo.
