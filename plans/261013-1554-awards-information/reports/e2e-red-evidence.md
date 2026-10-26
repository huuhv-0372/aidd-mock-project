# E2E RED evidence: Awards Information (phase 01)

Screen: Hệ thống giải, MoMorph zFYDgyj_pD. Policy: e2e-red-first. Web only.

## RED record

- **redTestFiles:** `tests/e2e/awards-information.spec.ts`, `tests/e2e/awards-information-nav.spec.ts`
- **Support files:** `tests/e2e/support/authed-session.ts` (signIn, AUTHED, PAST, pathOf), `tests/e2e/support/awards-contract.ts` (expected awards, activeSlugs, openAwards)
- **redCommand:** `npm run test:e2e -- tests/e2e/awards-information.spec.ts tests/e2e/awards-information-nav.spec.ts`
- **redExitCode:** 1 (real process status, captured with `echo $?` after the run)
- **Pass/fail:** 24 tests, 1 passed, 23 failed, 0 skipped. Run time 9.1 min (most of it is 120s test timeouts on missing locators).
- **Passing:** ID-1 (anonymous `/awards-information` on the past server redirects to `/login`). The plan allowed this.
- **redFailure (first real failure):** `ID-0 authenticated direct URL renders the page title`:
  `expect(locator).toBeVisible() failed. Locator: getByRole('heading', { name: 'Hệ thống giải thưởng SAA 2025', level: 1 }). Error: element(s) not found`.
  Other failures are the same kind: `getByRole('navigation', { name: 'Danh mục giải thưởng' })` link not found (ID-9, ID-11), `getByTestId('kudos-section')` not found (ID-12/14), `getByTestId('awards-keyvisual')` not visible (ID-3), `awards-nav-item` text list mismatch (ID-5), `award-section` cards missing (ID-6, ID-7), `awards-nav` box missing (375 cases), `activeSlugs` returning `[]` (ID-13, scroll-spy, hash landing).
- **Infra check:** no webServer, port, build, or fake-server error. `next build` compiled. Both `3100-3103` and `54398` were free before the run, and no LISTENING sockets remained after it.

Full log: `.../scratchpad/red-run.log` (session scratch, not committed).

## Selector contract (for phases 02, 03, 04)

- Header: `getByRole('banner')`. The `Awards Information` link has `aria-current="page"`. `About SAA 2025` and `Sun* Kudos` do not.
- Footer: `getByRole('contentinfo')`. Widget: `getByTestId('widget-button')`.
- Hero: `getByTestId('awards-keyvisual')` is the `<img>`, alt `Keyvisual Sun* Annual Award 2025`.
- Title: `getByTestId('awards-title')` contains `Sun* annual awards 2025`. `getByRole('heading', {level:1, name:'Hệ thống giải thưởng SAA 2025'})`. Subtitle font-size is below h1 font-size.
- Nav: `getByRole('navigation', {name:'Danh mục giải thưởng'})`, testid `awards-nav`. This element is the horizontal scroller at 375 (`overflow-x` auto or scroll, `scrollWidth > clientWidth`).
- Nav items: `getByTestId('awards-nav-item')` x6, each `<a href="#<slug>">`, labels `Top Talent, Top Project, Top Project Leader, Best Manager, Signature 2025 - Creator, MVP`. The active item has `aria-current="true"`. Only one item at a time. Inactive items have no `aria-current`.
- Cards: `[data-testid="award-section"][id="<slug>"]` x6. Slugs: `top-talent, top-project, top-project-leader, best-manager, signature-2025-creator, mvp`. Each has an h2 title and `award-image` (`<img>`, 336x336 at 1440 within 1px), `award-quantity`, and `award-prize` (one element per prize line).
- Expected values (numeric parts, from `specs.csv`): Top Talent `10 Đơn vị` / `7.000.000 VNĐ`; Top Project `02 Tập thể` / `15.000.000 VNĐ`; Top Project Leader `03 Cá nhân` / `7.000.000 VNĐ`; Best Manager `01 Cá nhân` / `10.000.000 VNĐ`; Signature `01` / `5.000.000 VNĐ` and `8.000.000 VNĐ`; MVP (title `MVP (Most Valuable Person)`) `01` / `15.000.000 VNĐ`.
- Kudos: `getByTestId('kudos-section')` contains `Phong trào ghi nhận` and `Sun* Kudos`. Link `Chi tiết` has href `/sun-kudos`.
- 404: direct `/sun-kudos` returns HTTP 404. Heading `Không tìm thấy trang`. Link `Về trang chủ` has href `/`.
- Scroll band: after a nav click the section top sits in `[40, 540]` px of a 900px viewport. Reduced-motion click must land within 1.5s.
- Hash: unknown hash or `location.hash = '#nope'` gives no `pageerror`, `scrollY` 0, first item active.

## Concerns for the GREEN phase (04)

1. Figma node tree was not read. The MoMorph MCP tools were not available in this session, so every expected value comes from `specs.csv`. Figma wins on any mismatch; check the copy in 02 or 04.
2. The MVP card sits at the bottom of the page. The band `[40, 540]` for `mvp` (ID-11, ID-9) may be unreachable if the footer and kudos block are short. If so, widen the band for that slug and log it here. Do not weaken the other assertions.
3. Run time is 9.1 min for this RED run, mostly 120s timeouts on missing locators. GREEN should be quicker. Do not add fixed sleeps to shorten it.
4. The phase asked for the spec to stay under 200 lines. The spec was split into two files (109 and 137 lines), and the helpers into `support/`. No existing spec was edited.

## Checks

- `npx tsc --noEmit`: exit 0
- `npm run lint`: exit 0 (repo-wide)
- Existing specs and `playwright.config.ts`: untouched

## Phase 04 contract fix (logged)

- `tests/e2e/support/awards-contract.ts` top-talent quantity `/\b10\s*Đơn vị/` -> `/\b10\s*Cá nhân/`. Reason: Figma text node `mm:I313:8467;214:3532` reads "10 Cá nhân" (also visible in the MoMorph frame image); plan rule "Figma wins on any mismatch". specs.csv / test-case ID-6 say "Đơn vị" — spec-vs-Figma drift, not a weakened assertion.
