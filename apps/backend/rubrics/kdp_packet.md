# QC rubric — kdp_packet

Compare against the products row, the assets rows for this book (rights_source of every asset),
pages.text_final, the final interior and cover files, config, and the Scout research rows cited.

Blocking:
- Fields missing or out of KDP order: title, subtitle, series, author, description, keywords,
  categories, AI-content answers, ISBN choice, trim, bleed, paper/ink, price, file links
- Title, subtitle, series or author differs from the cover wrap
- Description over 4,000 characters, or makes claims we can't back (awards, "bestselling", educational outcomes)
- Not exactly 7 keywords, or a keyword uses another author's name, title, character or brand
- More than 3 categories
- AI-content images answer is "no" while any image asset in the book has rights_source AI
- AI-content text answer is "no" unless every page's text_final is the owner's own writing
  (owner-rewritten text counts as human; any page text used as generated counts as AI)
- Trim not 8.5 x 8.5 in, bleed not "yes", or paper/ink not premium colour
- File links missing, or pointing to versions that aren't the latest QC-passed files
- Research rows used for keywords or price not cited by ID
Minor: description reads as keyword-stuffed or flat when read aloud by a parent; price vs research.
