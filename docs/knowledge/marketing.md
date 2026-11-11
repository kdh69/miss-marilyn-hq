# Marketing: plans, weekly posts, voice
Last reviewed: 2026-11-11

For the Marketer, the Quality Checker, Claude's QC and the critic. Clara posts every item by hand from
the panel's Social page, so a plan has to fit her time and every row has to be ready to paste.
The checklists are `apps/backend/rubrics/marketing_plan.md` and `social.md`.

## Rules

- Write one marketing plan per book before any posts: goals, audience, 3-5 pillars, one platform row each for Instagram, Facebook, Pinterest and TikTok, launch rows (before, launch week, after), hashtags per platform, and at least two kpi rows. [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/marketing_plan.md)
- Pace the whole plan at about 15 minutes a day of Clara's time, launch week excepted. [proven, checked 2026-11-11] [handoff](../HANDOFF.md)
- A week of posts (`social_batch`) is one product and one week, follows the approved plan's platform rows and pace, and has one `content` row per post. [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/social.md)
- Every post is ready to paste: channel, type, date, hook, body, hashtags, asset IDs, one line in `notes` for the thing Clara needs (Pinterest board, sound, alt text), and a link. [proven, checked 2026-11-11] [marketer](../../.claude/agents/marketer.md)
- Every link carries `utm_source=<channel>`, `utm_medium=social`, `utm_campaign=<product_id>`. [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/social.md)
- Speak to parents and gift-givers, never to children. Lead with the real cat and Clara's own photos and videos where they fit. [proven, checked 2026-11-11] [marketer](../../.claude/agents/marketer.md)
- Make no claim we can't back: no "bestselling", "#1", awards or "teaches reading". [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/marketing_plan.md)
- No photos or videos of children, no real customers' names, no paid ads, no unlicensed audio. [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/social.md)
- Hashtags never name another brand, book, character or author; at most 15 on one platform. [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/marketing_plan.md)
- Use only QC-passed assets that belong to the product being posted. [proven, checked 2026-11-11] [rubric](../../apps/backend/rubrics/social.md)

## Why these

- Listing and marketing joined the flow on 2026-11-01: the Marketer writes the plan and a week of posts at a time, Clara posts by hand, and the backend autopilot asks for the plan at Building and for the next week (`config!social_autopilot`). [proven, checked 2026-11-11] [handoff](../HANDOFF.md)
- Posts and live-listing marks are `requests` notes ("Posted C-0012 <link>", "Live <listing_id> <link>") that the backend's marketing job applies. [proven, checked 2026-11-11] [handoff](../HANDOFF.md)

## Open questions

- Which platform brings the first buyers, and what a post costs Clara in minutes in practice: no book has launched. The kpi rows and Book 1's numbers settle it. [unproven, checked 2026-11-11]
- Best posting days and times per platform: any figure in a plan is outside advice until Book 1's numbers show it. [unproven, checked 2026-11-11]
- The lessons L-0017 to L-0020 (Orchestrator, Lister, marketing_plan, social_batch) live in the `lessons` tab and weren't read for this file; the next session with Sheet keys should compare and add anything missing. [unproven, checked 2026-11-11]
