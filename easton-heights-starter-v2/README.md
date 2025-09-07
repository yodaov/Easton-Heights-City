# Easton Heights City — battle royale (Starter v2)

English UI with the structure you described:
- Title + short description
- Party creation with **+ Add character**
- Two prefabs: **Yodaov** (Genius, Caveman) and **Tiquinho** (Attractive, Strong)
- Traits as toggle buttons; gender switch; delete button (keeps minimum 2)
- **Play ▶** goes to a message feed (Next / Auto-play)
- Packs loader (packs.json or file picker)

Engine fixes:
- Relationship gating on chosen participants (no noisy mismatch logs)
- Supports `requiresTraitsAny`, `forbidsTraitsAny`, `itemsAny` (A-focused)
- Replaces `{ITEM}` by A's item or class alias
