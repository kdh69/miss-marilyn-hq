# Knowledge library
Last reviewed: 2026-11-11

The dated record of what is known about making these books well: how to keep characters on-model,
how to word prompts, which image models to use and what they cost, what print needs, how to review.
Each agent reads the files for its job before every task. The idea, the format and the first
entries come from Kyle's video repo (videograph), where the same library drives the video pipeline.

It sits beside the other records and doesn't replace them:

| Where | Holds |
|---|---|
| `lessons` tab in MM Core | Short rules. Every brief prints the ones that apply; they are requirements |
| [playbook.md](../playbook.md) | What real runs showed: costs, timings, costly mistakes |
| [docs/brand/](../brand/) | The series bible and style guide: what the books are |
| `apps/backend/rubrics/` | The checklist per task type: what a reviewer fails work for |
| `docs/knowledge/` | Why, with the evidence: every claim labelled and dated |

## Rules

- Read the files for your job (table below) before every task and follow their Rules sections. [proven, checked 2026-11-11] [TEAM.md](../TEAM.md)
- Where our own runs conflict with outside advice or with videograph, follow our runs. [videograph, checked 2026-11-08]
- Never record a guess as proven: say it is unproven and name what would settle it. [videograph, checked 2026-11-04]
- Never spend without a stated cap; confirm any price marked check-live on the vendor's page before raising one. [videograph, checked 2026-11-08]
- After every real run the critic proposes the entries its results support, with the run's date. [proven, checked 2026-11-11] [critic](../../.claude/agents/critic.md)
- Where a mistake can be prevented in code, fix it there with a test instead of only writing it down. [videograph, checked 2026-11-08]

## Files and who reads them

| File | Covers | Read by |
|---|---|---|
| [illustration.md](illustration.md) | Reference sheets, drafts before finals, prompt wording, drift between pages | illustrator, quality-checker, qc, orchestrator, critic |
| [models.md](models.md) | The image models: prices, limits, how they fail | illustrator, orchestrator, critic |
| [story.md](story.md) | The page plan, word counts, writing for Clara to rewrite | producer, quality-checker, qc, critic |
| [print.md](print.md) | What KDP needs from pages, PDFs and the cover, as our checks enforce it | builder, illustrator, lister, quality-checker, qc |
| [review.md](review.md) | How to review: checks before eyes, the contact sheet, calibrating to the owner | quality-checker, qc, critic, orchestrator |
| [marketing.md](marketing.md) | Marketing plans, weekly posts, voice, what we may claim | marketer, quality-checker, qc, critic |
| [research.md](research.md) | What Scout finds, how to source and date it | scout, orchestrator, critic |

## Format

`npm run knowledge` parses these files, so follow the format exactly.

1. Line 1 is the `#` title. Line 2 is `Last reviewed: YYYY-MM-DD`, the day someone last checked the whole file.
2. Each file has a `## Rules` section of 5 to 12 rules an agent must follow.
3. Every factual claim is a bullet (or a table row) that ends with a tag: `[label, checked YYYY-MM-DD]`, optionally followed by source links.
4. A figure nobody has confirmed on the vendor's live page carries `(check live)` just before its tag.
5. Plain English, no marketing tone, each file under about 150 lines.
6. Never invent a source, a price or a number.

## Labels

- **proven**: measured in this repo's own runs, or read in this repo's code or Sheet on the check date. Cite the task, the file or the handoff.
- **videograph**: measured in Kyle's video repo, mostly with the same image models. Strong leads; a book run that confirms one turns it into proven, and one that contradicts it wins.
- **official**: vendor documentation and policy pages, with the date the page was read.
- **unproven**: everything else, including plans, inference and advice from outside. Names the run or test that would settle it.

A result from one sample is still proven, but says "one sample". `npm run knowledge` lists every
claim not re-checked in 60 days; re-check it or remove it.
