# Accounts registry

Generated from `packages/core/schema.json` (the `accounts` tab seed). The live copy is the
**accounts** tab in MM Core and the panel's Accounts page — update status there. **No passwords anywhere**;
they live in the shared password manager. *Business Gmail* = Clara's; the *bot Gmail* is only for Grok.

| ID | Account | Owner | Purpose | Phase | 2-step | Used by |
| --- | --- | --- | --- | --- | --- | --- |
| A01 | Business Gmail | Clara | owns every store and social account | now | yes | all Clara's accounts |
| A02 | Bot Gmail | Kyle | Grok's Google connection; shared only on MM Core + MM Work | now | yes | Grok bots |
| A03 | Password manager | Clara + Kyle | shared vault for every login | now | yes | — |
| A04 | GitHub | Kyle | repo, scheduled backend, secrets | now | yes | backend |
| A05 | Google Cloud project | Clara + Kyle | service account + sign-in key | now | yes | backend, panel |
| A06 | Service account mm-backend | Kyle | backend and panel read/write the Sheet and Drive | now | — | backend, panel |
| A07 | OAuth client | Kyle | Google sign-in on Clara's panel | now | — | panel |
| A08 | Anthropic Console | Kyle | Claude QC API key, $20/month cap | now | yes | backend QC |
| A09 | Grok | Kyle | the 6 bots + Scout | now | yes | bots |
| A10 | Vercel | Kyle | hosts Clara's panel | now | yes | panel |
| A11 | LLC + EIN | Clara | legal entity, tax ID | phase 0 | — | — |
| A12 | Business bank + card | Clara | fees out, payouts in | phase 0 | yes | — |
| A13 | Domain registrar | Clara | brand domain, email sending | phase 0 | yes | Resend |
| A14 | Resend | Kyle | Kyle alerts + Clara's Sunday email | phase 1 | yes | backend notify |
| A15 | Amazon KDP | Clara | publish paperbacks | phase 0 | yes | KDP packet |
| A16 | Etsy shop | Clara | sell printables | phase 0 | yes | Etsy publish |
| A17 | Etsy developer app | Clara | backend publishes on her Approve | phase 0 | — | Etsy publish |
| A18 | Meta Business (FB + IG) | Clara | social pages | phase 1 | yes | Growth |
| A19 | Pinterest business | Clara | pins drive traffic | phase 1 | yes | Growth |
| A20 | Email list tool | Clara | list + lead magnet | phase 1 | yes | Growth |
| A21 | Social scheduler | Clara | schedules approved posts | phase 1 | yes | Growth |
| A22 | Meta + Pinterest developer apps | Clara | automatic posting | phase 2 | — | — |
| A23 | Printify or Printful | Clara | merch | phase 3 | yes | — |
| A24 | Shopify | Clara | own storefront | phase 3 | yes | — |
| A25 | Amazon Merch on Demand | Clara | merch on Amazon | phase 3 | yes | — |

**ISBN:** KDP's free ISBN lists Amazon as publisher; Bowker (~$125 for one, ~$295 for ten) puts the LLC on record. Decide before Ollie's KDP packet.
