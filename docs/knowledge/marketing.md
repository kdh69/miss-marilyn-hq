# Marketing: plans, weekly posts, voice
Last reviewed: 2026-11-11

For the Marketer, the Quality Checker, Claude's QC and the critic. Clara posts every item by hand from
the panel's Social page, so a plan has to fit her time and every row has to be ready to paste.
The checklists are `apps/backend/rubrics/marketing_plan.md` and `social.md`.

## Rules

- Write one marketing plan per book before any posts: goals, audience, 3-5 pillars, one platform row each for Instagram, Facebook, Pinterest and TikTok, launch rows (before, launch week, after), hashtags per platform, and at least two kpi rows. [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/marketing_plan.md)
- The plan is `plans` rows, not a Doc: `plan_id` `MP-<product_id>-<nn>`, `product_id`, `task_id`, `section`, `channel`, `title`, `detail`, `sort`, status `draft`; Clara reads and approves it on the panel's Launch page. Pillars lead with the real cat. Each platform row gives posts per week, best days and times, formats and what each post links to. [proven, checked 2026-11-11]
- Pace the whole plan at about 15 minutes a day of Clara's time, launch week excepted. [proven, checked 2026-11-11] [handoff](../HANDOFF.md)
- A week of posts (`social_batch`) is one product and one week, follows the approved plan's platform rows and pace, and has one `content` row per post: `content_id` `C-<nnnn>`, `scheduled_for` as YYYY-MM-DD, status `draft`, and the asset IDs also in the task's `output_asset_ids`. It starts only from a plan with status `approved`. [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/social.md)
- Every post is ready to paste: channel, type, date, hook, body, hashtags, asset IDs, one line in `notes` for the thing Clara needs (Pinterest board, sound, alt text), and a link. [proven, checked 2026-11-11] [marketer](../../.claude/agents/marketer.md)
- Every link carries `utm_source=<channel>`, `utm_medium=social`, `utm_campaign=<product_id>`. [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/social.md)
- Speak to parents and gift-givers, never to children. Lead with the real cat and Clara's own photos and videos where they fit. [proven, checked 2026-11-11] [marketer](../../.claude/agents/marketer.md)
- Make no claim we can't back: no "bestselling", "#1", awards or "teaches reading". [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/marketing_plan.md)
- No photos or videos of children, no real customers' names, no paid ads, no unlicensed audio. [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/social.md)
- Hashtags never name another brand, book, character or author; at most 15 on one platform. [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/marketing_plan.md)
- Use only QC-passed art that belongs to the product being posted, or a `social_image` made from it. [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/social.md)

- The Orchestrator creates one `marketing_plan` task per book (when the book reaches Building, or a request starts "Marketing plan:"; if the book already has one it puts that task_id on the request) and one `social_batch` task per "Social idea:" request for the dates it names, never two open for one book. [proven, checked 2026-11-11]

## Why these

- Listing and marketing joined the flow on 2026-11-01: the Marketer writes the plan and a week of posts at a time, Clara posts by hand, and the backend autopilot asks for the plan at Building and for the next week (`config!social_autopilot`). [proven, checked 2026-11-11] [handoff](../HANDOFF.md)
- Posts and live-listing marks are `requests` notes ("Posted C-0012 <link>", "Live <listing_id> <link>") that the backend's marketing job applies. [proven, checked 2026-11-11] [handoff](../HANDOFF.md)

## Where the rest lives

- L-0018 (Lister: every store field in the `listings` row, one per SKU per channel) is a listing rule, not a marketing one; see the Lister's agent file and `apps/backend/rubrics/`. The lessons L-0017 to L-0020 were compared with this file on 2026-11-11. [proven, checked 2026-11-11]

- The post ID shape `C-<nnnn>` changes when spec S1 lands: it becomes `C-<task id without the dash>-<nn>`, counted within the task (`C-T0043-01`), so several Marketers can work at once; the panel's "Posted <id> <link>" mark takes any ID. Until then use `C-<nnnn>`. [official, checked 2026-11-11] [spec](../specs/S1-hardening.md)

## Open questions

- Which platform brings the first buyers, and what a post costs Clara in minutes in practice: no book has launched. The kpi rows and Book 1's numbers settle it. [unproven, checked 2026-11-11]
- Best posting days and times per platform: the rubric requires them in every platform row, so a plan gives them, but each is outside advice until Book 1's numbers show it; the Marketer should label them as a starting guess. [unproven, checked 2026-11-11]
