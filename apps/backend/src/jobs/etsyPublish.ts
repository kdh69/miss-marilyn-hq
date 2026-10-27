/**
 * Job 4 — Publish on approval, Etsy first (spec §9 job 4). NOT BUILT YET.
 *
 * When an etsy_listing task is `approved`:
 *  - stop if listings.external_id is already set (no duplicate listings)
 *  - create a draft digital listing, upload printable files + images, activate
 *  - write external_id, live_url, published_at; listing → live, task → done
 *  - log the listing fee as a `listing_fees` cost row (Clara's Approve authorizes it)
 *  - any error → listing `error`, task `escalated`, notify Kyle; never retry activation blindly
 * Fallback until Etsy API access is approved: build an Etsy packet and send Clara
 * a "Publish on Etsy" item instead.
 */
import type { Core } from "@mm/core";

export async function etsyPublish(_core: Core): Promise<void> {
  // Intentionally a no-op until ETSY_API_KEY exists. Approved etsy_listing tasks wait at `approved`.
}
