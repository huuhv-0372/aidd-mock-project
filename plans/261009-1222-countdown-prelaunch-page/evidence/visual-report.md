# Visual validation — SCR001 Countdown (qualitative, model-vision)

> Replaces the tester's first report: that run captured a **404 page** (server started without
> `EVENT_START_AT`, gate open → `/countdown` → `/login` → 404) yet reported PASS. Re-captured by the
> orchestrator with render assertions (heading + countdown testids must exist before screenshot).

- Route: `/countdown` on `next start -p 3200`, `EVENT_START_AT` = now + 5h20m30s (+07:00) to mirror the design state 00/05/20.
- setupSteps: none · visualState: initial
- Script: `evidence/visual-capture.mjs` (exit 0)
- Reference: `data/preview.png` (1512×1077) · Actual: `data/actual.png` (1512×1077), `data/actual-768.png`, `data/actual-375.png`

## Measured (1512×1077)
| Element | Actual | Figma (from preview) |
|---|---|---|
| DAYS unit left | 434 | ≈434 |
| HOURS unit left | 669 | ≈669 |
| MINUTES unit left | 904 | ≈904 |
| Units top | 387 | ≈387 |
| h1 top | 315 | ≈318 |
| Fonts loaded | Montserrat, digitalNumbers | Montserrat, 7-segment |

## Categories
| Category | Result | Observed differences |
|---|---|---|
| FONT | PASS | none visible |
| BORDER RADIUS | PASS | digit boxes rounded, glass gradient + #FFEA9E border match |
| ALIGNMENT | PASS | title centered; row centered; labels left-aligned under digits as in Figma |
| SPACING | PASS | unit x-positions match to the pixel; h1 ~3px higher |
| ASSET | PASS | background + dark cover gradient match |

Displayed minutes `19` vs design `20`: ~1 min elapsed between server start and capture — expected countdown behaviour, not a mismatch.

## Responsive (D002)
| Viewport | scrollWidth | One row | Labels clipped (scrollWidth > clientWidth) |
|---|---|---|---|
| 1512×1077 | 1512 | yes | no |
| 768×1024 | 768 | yes | no |
| 375×812 | 375 | yes | no (MINUTES 86/86px — tight but not clipped) |

No material mismatch.
