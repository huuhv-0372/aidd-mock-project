# Clarifications — Đa ngôn ngữ VI/EN

MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/hUyaaugye2 (Dropdown ngôn ngữ, fileKey `9ypp4enmFmdK3YAFJLIu6C`)
Specs: plans/momorph-specs/dropdown-ngon-ngu-hUyaaugye2/specs.csv · Test cases: homepage ID-10/24/25/26/58, login language rows.
EN source: `mcp__momorph__list_file_localizations(fileKey, sourceTexts)` — has `en` for Figma text incl. long award paragraphs.

## Session 2026-10-14

- Q: VN mode — Figma source strings that are English (e.g. nav "About SAA 2025") keep as is, or use MoMorph's `vi` entry ("Về SAA 2025")? → A: Keep Figma source. VI dictionary = current strings verbatim; VI UI must be pixel-identical to today. Only EN is new.
- Q: Strings with no MoMorph `en` entry (aria-labels, login error, tab titles, "Hệ thống giải", "Đơn vị", ...)? → A: Claude translates briefly, marks each with `/* not from Figma */` in the dictionary, and lists them in `reports/en-localizations.md` for BTC review.

## Defaults chosen by orchestrator (override if wrong)

- Architecture per plan.md: public URLs unchanged; cookie `NEXT_LOCALE` (`vi` default); `proxy.ts` rewrites to hidden `app/[locale]/` segment; 2 prerendered variants per page. No next-intl.
- MoMorph `en` entries are used verbatim even though `is_reviewed: false`.
- Proper names stay identical in both languages: "Sun* Kudos", "Top Talent", "Root Further", "SAA 2025", award names, "Sun* Annual Awards 2025".
- Countdown labels already English in Figma ("DAYS/HOURS/MINUTES") stay the same in both.
- Locale applies to every page incl. /countdown and /login and the 404 page, even where no selector is shown.
- No `jp`, no persistence in `profiles`.
- Dropdown per spec A.1/A.2: each option shows its flag (VN, UK) + code; trigger shows the current locale's flag + code.
- Test policy: e2e-red-first (state transition: language switch + persistence).
