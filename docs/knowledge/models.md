# Image models
Last reviewed: 2026-11-11

What `npm run bot -- <role> image` calls, what it costs and how it fails. The models and the fal.ai
plumbing are the ones Kyle's video repo (videograph) uses for its reference images. The first pictures were made from this repo on 2026-11-11 (one draft, seven finals); what that
confirmed is marked proven below.

## Rules

- Every paid picture goes through `image`, never a direct call: it checks the caps first and writes the costs row. [proven, checked 2026-11-11] [bot.ts](../../apps/backend/src/bot.ts)
- Use `kind=draft` while the composition is still open and `kind=page` only for a picture you expect to keep. [proven, checked 2026-11-11] [picture-book.json](../../formats/picture-book.json)
- On `Forbidden`, stop after one attempt and tell Kyle: it usually means the fal account has no credit. [videograph, checked 2026-11-04]
- On an empty result, try once more unchanged before rewording. [videograph, checked 2026-11-04]
- The costs rows are estimates from list prices. Compare a week's rows with the fal dashboard before trusting them. [videograph, checked 2026-11-06]
- Change a model, a resolution or a cap in `formats/picture-book.json`, not in a prompt or an agent file. [proven, checked 2026-11-11] [picture-book.json](../../formats/picture-book.json)

## What each kind uses

| Kind | Model | Size asked for | Price | Tag |
|---|---|---|---|---|
| `sheet` (character sheet) | Nano Banana Pro | 2K, 3:2 | $0.15 | (check live) [official, checked 2026-10-18] |
| `draft` (page draft) | Nano Banana 2 | 1K, 1:1 | $0.08 | (check live) [official, checked 2026-10-18] |
| `page`, `cover` (print) | Nano Banana Pro | 4K, 1:1, then cropped to 2588 x 2625 px | $0.30 | (check live) [official, checked 2026-10-18] |

- A full book at print size is 24 pages x $0.30 = $7.20 if every page lands first time, and 24 drafts are $1.92. [unproven, checked 2026-11-11]
- A task may spend $6 and a day `config!daily_bot_cap_usd` ($15); `image` refuses the call that would pass either. [proven, checked 2026-11-11] [gates.ts](../../apps/backend/src/lib/gates.ts)

## Limits and behaviour

- Nano Banana Pro takes up to 5 reference images and Nano Banana 2 up to 14, through the `/edit` endpoint. [official, checked 2026-10-18]
- Print size needs the 4K setting: 2K is 2048 px wide and a page with bleed is 2588. `image` won't enlarge a smaller result. [proven, checked 2026-11-11] [image.ts](../../apps/backend/src/lib/image.ts)
- A 4K, 1:1 result from Nano Banana Pro is large enough that `image` crops and resizes it to 2588 x 2625 px without enlarging (`fitted_to_page: true`); a draft (Nano Banana 2, 1K) is 1024 x 1024. [proven, checked 2026-11-11] [playbook](../playbook.md)
- Live fal runs from a cloud session needed `queue.fal.run`, `fal.run`, `rest.fal.ai` and the fal media hosts on the environment's allowed list, and `FAL_KEY` set as an environment variable; no first-call failures. [proven, checked 2026-11-11] [playbook](../playbook.md)
- Outputs carry Google's invisible SynthID watermark. [official, checked 2026-10-18]
- Google may refuse pictures of children. The books have no humans, so this shouldn't arise; a refusal can come back as an empty result. [official, checked 2026-10-18]
- Failed fal jobs aren't billed. [official, checked 2026-10-18]
- In videograph, 9 reference images took about 3 minutes in total. [videograph, checked 2026-11-04]
- `no_media_generated` hit Nano Banana 2 on the same prompt twice and worked the third time. [videograph, checked 2026-11-04]
- GPT Image 2 (edit) through fal is videograph's fallback when Google refuses; it isn't wired in here. [videograph, checked 2026-10-19]

- Nano Banana Pro at 4K held steady across 7 finals at $0.30 each (estimate): no refusals, no empty results, no `Forbidden`. [proven, checked 2026-11-11] [playbook](../playbook.md)

## Privacy

- Every request sends `X-Fal-Store-IO: 0`, so fal keeps no history of it. [proven, checked 2026-11-11] [image.ts](../../apps/backend/src/lib/image.ts)
- Reference images are downscaled to 1536 px and sent inside the request as data, so no copy is stored on fal's CDN. Only Miss M's and Gussie's photos and the team's own art are ever sent; never a photo of a person. [proven, checked 2026-11-11] [image.ts](../../apps/backend/src/lib/image.ts)
- fal's Nano Banana `/edit` endpoints accept references as data URIs: seen working with 2 to 4 references on drafts and finals. [proven, checked 2026-11-11] [playbook](../playbook.md)
- The costs rows are still estimates; the eight pictures of the first sweep are written as $2.18. Compare with fal's dashboard. [unproven, checked 2026-11-11]
- `image` writes a recipe file beside every picture: prompt, reference IDs, endpoint, size, attempt, fal's request ID. [proven, checked 2026-11-11] [bot.ts](../../apps/backend/src/bot.ts)
