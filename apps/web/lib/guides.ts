/**
 * Where and how Clara posts each thing by hand: one guide per channel, written for her, step by
 * step. The bots write the words (listings and content rows); these say where each one goes.
 * Safe for client components. Stores change their screens now and then: keep the steps about what
 * to fill in, not about exact button positions.
 */
export type Guide = { name: string; where: { label: string; url: string }; steps: string[]; tip?: string };

export const GUIDES: Record<string, Guide> = {
  KDP: {
    name: "Amazon (KDP paperback)",
    where: { label: "Open KDP Bookshelf", url: "https://kdp.amazon.com/en_US/bookshelf" },
    steps: [
      "Sign in to kdp.amazon.com with the Miss Marilyn business account. On the Bookshelf, tap + Create, then Paperback.",
      "Paperback Details: Language English. Copy in the Title, Subtitle, Series and Author from this page, one box at a time.",
      "Description: tap Copy next to Description and paste it into the big box.",
      "Publishing rights: choose \"I own the copyright and I hold the necessary publishing rights\".",
      "Primary audience: Sexually explicit images or title: No. Reading age: use the Reading age in Details below.",
      "Categories: tap Choose categories and pick the ones listed below (up to three).",
      "Keywords: there are seven boxes. Copy each keyword below into its own box. Then Save and Continue.",
      "Paperback Content: Print ISBN: Get a free KDP ISBN (unless Details say otherwise). Ink and paper: Premium color, white paper. Trim size: 8.5 x 8.5 in. Bleed: Bleed (PDF only). Cover finish: as in Details.",
      "Manuscript: Upload the inside-of-the-book PDF (Files below). Book cover: Upload a cover you already have, then the cover PDF.",
      "AI-generated content: answer Text and Images exactly as in Details below.",
      "Book preview: Launch Previewer, page through to check it, then Approve. Save and Continue.",
      "Rights & Pricing: All territories. Primary marketplace Amazon.com. Type the Price below in the US box; the others fill in. Tick the terms and tap Publish Your Paperback Book.",
      "Amazon checks it (up to 72 hours). When it shows on Amazon, open it, copy the link from the address bar and tap \"It's live\" below.",
    ],
    tip: "Order one printed proof first if you want to hold it before it goes on sale (Paperback Content → Request a proof).",
  },
  ETSY: {
    name: "Etsy (digital download)",
    where: { label: "Open Etsy Shop Manager", url: "https://www.etsy.com/your/shops/me/tools/listings" },
    steps: [
      "In Etsy Shop Manager, go to Listings and tap + Add a listing.",
      "Photos: add the mockup pictures (Files below). The first one is what shoppers see in search.",
      "Title: copy it from this page. About this listing: I did · A finished product · made recently. Category: as in Details.",
      "Type: Digital files (nothing gets shipped).",
      "Description: copy it in. Price: as below. Quantity: 999.",
      "Digital files: upload the PDFs (up to 5 files, 20 MB each).",
      "Tags: copy each tag below into the tags box (13 in all). Materials: as in Details.",
      "Publish. Etsy charges $0.20 per listing. Then open the listing, copy its link and tap \"It's live\" below.",
    ],
  },
  INSTAGRAM: {
    name: "Instagram",
    where: { label: "Open Instagram", url: "https://www.instagram.com/" },
    steps: [
      "Save the picture or video from this card (tap Save picture, or press and hold it and choose Save).",
      "Open Instagram on the Miss Marilyn account. Tap + and pick Post, Reel or Story (the type is on the card).",
      "Choose the saved picture or video. For a carousel, tap Select multiple and pick them in order.",
      "Tap Copy caption here and paste it. Then Copy hashtags and paste them at the end.",
      "Reels: add the sound in the tips if there is one. Stories: add a Link sticker with the link.",
      "Share. Then open the post, tap ⋯ → Copy link, paste it below and tap Posted.",
    ],
    tip: "Links in Instagram captions can't be tapped. The bio link carries it (Edit profile → Links).",
  },
  FACEBOOK: {
    name: "Facebook page",
    where: { label: "Open Facebook", url: "https://www.facebook.com/" },
    steps: [
      "Save the picture or video from this card.",
      "Open Facebook and switch to the Miss Marilyn page (tap your picture, then the page).",
      "Tap What's on your mind?, add the picture or video, then paste the caption (it already has the link).",
      "Paste the hashtags at the end and tap Post.",
      "Tap the post's time to open it, copy the link from Share → Copy link, paste it below and tap Posted.",
    ],
    tip: "Only share into groups that allow promotion, and never more than one group a day.",
  },
  PINTEREST: {
    name: "Pinterest",
    where: { label: "Open Pinterest", url: "https://www.pinterest.com/pin-creation-tool/" },
    steps: [
      "Save the picture from this card.",
      "Open Pinterest on the business account. Tap + and choose Pin.",
      "Upload the picture. Title: Copy title here. Description: the caption, then the hashtags.",
      "Link: copy the link from this card. Board: the one in the tips.",
      "Publish. Open the pin, tap Share → Copy link, paste it below and tap Posted.",
    ],
    tip: "Pins keep working for months, so a steady one a day beats several at once.",
  },
  TIKTOK: {
    name: "TikTok",
    where: { label: "Open TikTok", url: "https://www.tiktok.com/upload" },
    steps: [
      "Save the video from this card.",
      "Open TikTok on the Miss Marilyn account. Tap + then Upload, and pick the video.",
      "Add the sound named in the tips (Add sound), and any on-screen text the tips mention.",
      "Paste the caption, then the hashtags. Post.",
      "Open the video, tap Share → Copy link, paste it below and tap Posted.",
    ],
    tip: "Links in TikTok captions can't be tapped. Point people to the link in the bio.",
  },
};

export const guideFor = (channel = "") => GUIDES[channel.toUpperCase()];
