---
title: "Viết Kudos (feature #12) + Widget menu + Thể lệ, mở từ Homepage / Hệ thống giải / Sun* Kudos"
description: "Modal Viết Kudo (ihQ26W78P2) kèm Add link, dropdown hashtag, upload ảnh, ẩn danh, @ + tên; Widget mở menu nhanh (Sv7DFwBw1h) và panel Thể lệ (b1Filzi9i6); RPC create_kudo + tìm Sunner + Storage."
status: completed
priority: P1
effort: 7h
branch: main
tags: [feature, ui, momorph, database, i18n]
blockedBy: []
blocks: []
created: 2026-10-19
work_type: feature
test_policy: e2e-red-first
spec_waived: "SDD mode disabled (takumi.sddMode: off)"
---

# Viết Kudos (#12)

MoMorph (fileKey `9ypp4enmFmdK3YAFJLIu6C`): Viết Kudo `ihQ26W78P2` · Thể lệ UPDATE `b1Filzi9i6` · FAB `_hphd32jN2` (đóng) / `Sv7DFwBw1h` (mở) · Add link `OyDLDuSGEa` · Dropdown hashtag `p9zO-c4a4x`.
Inputs: [clarifications.md](clarifications.md) (authoritative), `plans/momorph-specs/{viet-kudo-ihQ26W78P2,the-le-update-b1Filzi9i6,floating-action-button-*,addlink-box-OyDLDuSGEa,dropdown-list-hashtag-p9zO-c4a4x}/`.
Nền: DB #11 (`supabase/migrations/20261015100000_create_kudos.sql`, `plans/261015-1010-sun-kudos-live-board/database-design.md`).

**Trạng thái: in-review (2026-10-20), lý do duy nhất: phase 04 và 05 còn in-review, chưa so Figma (xem "Điều kiện còn lại").** Phase 08 (vòng sửa review, A1–A14 + Low) đã completed: lint 0 · tsc 0 · unit 538 · E2E 195/195 · review SEALED 9, criticalCount 0 · evidence gate hard exit 0 · riskGate ký (hoang.van.huu). Docs đã cập nhật. Còn chờ: commit (cần user duyệt), thử trên Cloudflare thật và các mục ở "Việc còn lại".

## Cách mở Viết Kudo trên 3 màn (đã chốt)

```
Homepage / Hệ thống giải / Sun* Kudos
  Widget [✎ / S] ──click──▶ menu nhanh: [Thể lệ] [Viết KUDOS] (✕ đỏ)
                                  │            │
                                  ▼            ▼
                     Panel Thể lệ (drawer phải)  Modal Viết Kudo
                     [Đóng] [Viết KUDOS] ──────▶ Modal Viết Kudo
  Chỉ Sun* Kudos: pill A.1 "Hôm nay, bạn muốn…" ──▶ Modal Viết Kudo
  Khách (chỉ Homepage public): menu + Thể lệ xem được; "Viết KUDOS" = link /login
```

- Một `KudosComposerProvider` (client) bọc `main` + widget của 3 page: `openComposer()`, `openRules()`. Modal + panel dùng `<dialog>` gốc. Modal nạp bằng `next/dynamic({ ssr:false })` → Tiptap không vào Worker (0 khớp trong `worker.js`).

## Quyết định kiến trúc

- **Ghi qua RPC `create_kudo`** (`security definer`, `search_path=''`): sender = `auth.uid()`, kiểm tài khoản, người nhận ≠ mình, danh hiệu 1–100, nội dung 1–5000, 1–5 hashtag, ≤5 ảnh không trùng, alias chỉ khi ẩn danh. Một transaction: `kudos` + `kudo_hashtags` + `kudo_images`.
- **Tìm Sunner qua RPC `kudos_search_sunners(p_query, p_limit, p_name_only)`** (không dấu, bỏ chính mình, ≤10, không trả email). Ô Người nhận khớp tên + email; `@` + tên (ở Người nhận lẫn editor) chỉ khớp tên; chuỗi trống trả 10 Sunner đầu. Bản 2 tham số cũ bị drop.
- **Ảnh**: `kudo-images/{uuid}.{ext}` tên phẳng, không chứa uid; sở hữu kiểm bằng `storage.objects.owner_id = auth.uid()` (policy + `create_kudo`). Server Action: zod → `getClaims()` → sniff magic bytes + bỏ metadata → upload → RPC; RPC lỗi thì xoá ảnh đã up.
- **Editor**: Tiptap v3, lưu Markdown con (`**b**`, `_i_`, `~~s~~`, `1.`, `>`, `[t](https://…)`, `@[Tên](uuid)`), serializer tự viết. Board vẫn hiện plain text.
- Mọi input validate zod (`lib/validation/write-kudo.ts`); lỗi server chỉ trả thông điệp chung.

## Phases

| # | Phase | Owner | Effort KH | Status |
|---|-------|-------|-----------|--------|
| 01 | [E2E RED gate + fake create/search/storage](phase-01-e2e-red-gate.md) | tester | 1h | completed (70/70 RED đúng lý do; 95 test cũ xanh) |
| 02 | [Track B: migration create_kudo, search, Storage](phase-02-track-b-database-write-rpc-and-storage.md) | implementer | 1h | completed (verify 16/16 PASS trên Supabase thật; lần chạy thứ 2 chưa ghi) |
| 03 | [Track B: zod, Server Actions, serializer, ảnh](phase-03-track-b-actions-validation-serializer.md) | implementer | 1.25h | completed (unit 501, tsc 0, lint 0) |
| 04 | [Track A: Widget menu + panel Thể lệ](phase-04-track-a-widget-menu-and-rules-panel.md) | momorph-ui-implementer | 1h | completed (đã merge trong `ba028d0`, issue #9; E2E 15/15; còn mở: chưa so bố cục Figma `Sv7DFwBw1h`, `b1Filzi9i6`) |
| 05 | [Track A: modal Viết Kudo, Add link, hashtag, ảnh](phase-05-track-a-write-kudo-modal.md) | momorph-ui-implementer | 1.5h | completed (đã merge trong `ba028d0`, issue #9; `ihQ26W78P2` đã audit 17 giá trị; còn mở: 4 frame phụ) |
| 06 | [Tích hợp 3 màn, i18n, GREEN, visual, review, docs](phase-06-integration-green-review-docs.md) | implementer + tester | 1.25h | completed (E2E 183, review SEALED 9, riskGate ký) |
| 07 | [@ + tên: mention trong nội dung, tiền tố @ ở Người nhận](phase-07-at-mention-name-search.md) | implementer | — (ngoài kế hoạch) | completed (unit 501, E2E 183; migration + verify B5 PASS thật) |
| 08 | [Sửa theo review 2026-10-20 (A1–A14 + Low)](phase-08-review-fix-round-261020.md) | implementer L + U → tester → reviewer | — (ngoài kế hoạch) | completed: unit 538, E2E 195/195, review SEALED 9, evidence gate hard exit 0, riskGate ký |

Việc còn mở sau khi merge (không chặn; cập nhật 2026-10-26: chưa ai làm):
- **04**: so ảnh `reports/visual/` (menu, Thể lệ) với frame `Sv7DFwBw1h`, `b1Filzi9i6`; ghi lệch hoặc xác nhận vào `reports/visual-check.md`. Hiện chỉ copy VI được đối chiếu, không có so bố cục/pixel.
- **05**: so `OyDLDuSGEa` (Add link) và `p9zO-c4a4x` (chiều cao/hướng dropdown); đo lại `5c7PkAibyD`, `p9vFVBE_tc`, `QIMJNgFb8K` khi có ảnh (đang đoán); đo lại x ô Danh hiệu sau sửa `min-w-[142px]` (chưa đo lại). `ihQ26W78P2`: audit `reports/figma-fidelity-viet-kudo.md`, 17 giá trị đã sửa.

Thứ tự: `01 → (02→03 || 04 || 05) → 06 → 07`. Không agent nào chạy `npm run build`/`test:e2e` khi Track A/B song song — chỉ phase 06 trở đi.

## Effort: kế hoạch vs thực tế

Kế hoạch 7h (tổng 6 phase; phase 07 phát sinh thêm; Track A/B song song). Thực tế đo được: **9h26m50s** đồng hồ, từ 12:47:50 (ts đầu tiên trong `raw-temper-runs.json`) đến 22:14:40 ICT (ts cuối, dọn port sau final-2). Ts UTC của vòng polish (`07:27:46Z`) đã đổi sang 14:27:46 ICT.
Trong đó có khoảng trống 17:00:30 → 20:38:35 (3h38m05s) không có ts: chờ người dùng thử SQL thật / review / sửa, không tách được. Trừ khoảng trống: 5h48m45s. Lệch kế hoạch: +2h27m (đồng hồ) hoặc −1h11m (trừ khoảng trống).
Cận trên: từ 10:22 (giờ trong tên thư mục plan, không phải ts bằng chứng) đến 22:14 là 11h52m, gồm lập plan, phase 01 RED, implement song song. RED/implement không có ts nên không tách giờ từng phase. Dự toán ban đầu của #12 là 3h; plan nới lên 7h vì gộp Widget menu + Thể lệ + ảnh/editor/mention, rồi thêm 4 vòng fix + phase 07 + fidelity pass.

## Bằng chứng

- **2026-10-20, vòng sửa review (phase 08), code đóng băng 12:42–13:12 ICT**: lint 0 · tsc 0 · vitest 39 file / 538 · `npm run test:e2e` 195/195 (6.8m, 0 flaky) · write-kudo + write-kudo-resilience `--repeat-each=5` 425/425, 0 flaky · OpenNext build exit 0 · wrangler dry-run gzip 2220.64 KiB (trần 3072) · 0 tiptap trong worker · port sạch · không có file env. Review: `reports/review-code-261020-commits-f7f7266-to-223a6dc.md`.
- **Đính chính 183/183 (2026-10-19)**: con số này không tái lập được. Trước vòng sửa, review chạy E2E 181/183: `write-kudo.spec.ts:263` flaky (3/5 lần idle), `countdown-prelaunch-gate` test-6 lỗi do tải, không liên quan. Bằng chứng hiện tại là 195/195 và repeat 425/425.
- `evidence/temper-results.json` (final-2, 22:00–22:14, code đóng băng): lint 0 · tsc 0 · vitest 37 file / 501 · `next build` + Playwright 183/183 (4.4m, 0 flaky, 0 ECONNRESET) · `write-kudo.spec.ts --repeat-each=2` 146/146 · OpenNext build exit 0 · Worker gzip 2220.10 KiB (trần 3072).
- Lịch sử (`evidence/raw-temper-runs.json`): unit 404 → 450 → 499 → 501; full E2E 165 → 173 (fix round 3) → 183. Lỗi trên đường: ID-26 (lỗi test), guest widget strict-mode (sửa bằng `openWidgetMenu`), ECONNRESET trên fake (`keepAliveTimeout` 30s; nguyên nhân suy luận, chưa chứng minh bằng repro riêng).
- SQL + Storage thật (`reports/db-verify-result.md`, 2026-10-19): migration chạy thành công, verify 16/16 PASS gồm S2, B5, B6, B7a–d; gửi Kudo có ảnh + Kudo ẩn danh qua đăng nhập Google (dev server), cả hai hiện đầu All Kudos, Kudo ẩn danh không lộ người gửi; object `{uuid}.jpg`, `owner_id` = uid phiên.
- workerd local (OpenNext preview) 5 × ~4.9 MB JPEG có metadata: 1 Kudo, 0 lỗi 1101/500/memory, metadata JPEG đã bỏ; peak 416.5 MB (workerd local không ép trần 128 MB).
- Review: `reports/review-pass-1` REWORK 6 (1 Critical C1) → fix-round-1 7 → fix-round-2/3/4/5 REWORK 8 (criticalCount 0) → `evidence/inspection-verdict.json` **SEALED 9**, criticalCount 0, riskGate `humanSignedOff: true` (hoang.van.huu, 2026-10-19), sau fix PluginKey của mention. Evidence gate `--stage hard` SEALED exit 0 theo controller; log lệnh không nằm trong repo.
- RED (`reports/e2e-red-evidence.md`): 70 fail / 0 pass; GREEN (`reports/e2e-green-evidence.md`).
- Visual: `reports/visual-check.md` (53 ảnh `reports/visual/`, so định tính) + `reports/figma-fidelity-viet-kudo.md` (audit `ihQ26W78P2`, 11 ảnh `reports/visual/fidelity/`, đo `getBoundingClientRect`, 1 giá trị chưa đo lại).
- Chưa có bằng chứng: Worker thật trên Cloudflare (5 × 5 MB); so Figma các frame ở phase 04/05.

## Việc còn lại (owner · điều kiện xong)

1. ~~SQL thật~~ — xong (verify 16/16). ~~Kudo thật~~ — xong (1 ảnh + 1 ẩn danh gửi riêng, không phải 2 ảnh + ẩn danh cùng lúc; nơi gửi không ghi). ~~Re-review + evidence gate~~ — xong, SEALED 9. ~~riskGate~~ — xong.
2. ~~Evidence gate `--stage hard` + riskGate ký lại cho vòng sửa 2026-10-20~~ — xong: gate "SEALED (hard)" exit 0; `evidence/inspection-verdict.json` `riskGate.humanSignedOff: true` (hoang.van.huu).
3. Commit `feat(kudos)` (gồm vòng sửa 2026-10-20) · hoang.van.huu duyệt, controller không tự commit · xong khi: lint + `npm test` xanh (538 unit, 195 E2E), file untracked (`components/kudos-compose/`, `lib/kudos/*`, `supabase/*`, tests mới, `public/images/kudos/rules/`) vào đúng commit, không có `.dev.vars`/env.
4. Deploy + gửi Kudo 5 ảnh × ~5 MB trên Cloudflare sau release · hoang.van.huu · xong khi: không lỗi memory/1101/500; nếu lỗi thì hạ giới hạn ảnh/tổng và ghi `clarifications.md`. Cùng lượt: chạy migration lần 2 ở môi trường khác để chứng minh idempotent.
5. So Figma phase 04/05 · controller · xong khi: theo "Điều kiện còn lại" ở trên, ghi vào `reports/visual-check.md`; xong thì chuyển 04, 05 sang completed.
6. Chuỗi EN tự dịch · BTC · xong khi: duyệt `reports/en-localizations.md` (gồm 4 chuỗi mới của vòng sửa: quá dài, không tải được hashtag, Thử lại, giá trị không hợp lệ).
7. ~~Sửa docs: docs ghi zod chặn mọi link xấu là sai~~ — xong (doc-writer): `README.md`, `docs/codebase-summary.md`, `docs/system/permissions.md`, `docs/project-changelog.md` (mục 2026-10-20). Đã sửa: claim zod chặn link, rollback ảnh, strip metadata; thêm ghi chú email-probe.
8. Các Low hoãn: xem "Deferred", không chặn commit.

## Deferred / follow-ups (đã chấp nhận, không chặn commit)

- L3: SQL không kiểm link target trong content (board render plain text; renderer Markdown sau này phải lọc khi đọc).
- L4: mention id không phải uuid trong serializer → cả lần gửi lỗi chung.
- L5: khách bấm widget fallback (Suspense) trước khi hydrate mở modal thay vì `/login`.
- Email-domain relevance: khớp email xếp chung với khớp tên, đoạn domain ngắn có thể đẩy tên khớp ra khỏi 10 kết quả đầu (sửa: xếp tên trước, hoặc chỉ khớp phần local khi không có `@`).
- B5 không kiểm thứ tự exact-email-first (fixture không có email chứa email khác).
- Chữ gõ trong editor weight 500 (Figma chỉ có placeholder 700): owner chốt giữ để nút B còn thấy.
- "+ Image" ẩn khi đủ 5 ảnh (Figma vẽ hiện): owner chốt theo spec; E2E ID-19 ghim hành vi này.
- Giới hạn 5 MB/ảnh giữ nguyên: owner chốt 2026-10-19 sau khi thử thật bị chặn ảnh > 5 MB.
- EN: hàng Legend của bảng Hero xuống dòng ở 1440 ("More than 20 people send you Kudos", lệch 26px); VI một dòng.
- Dropdown hashtag cao 332px ở 1440×900, đáy 1073 > đáy nhìn thấy 881, phải cuộn modal (375 đã vừa: 30dvh); chờ so `p9zO-c4a4x`.
- Footer Hủy/Gửi chưa ghim (modal cao 996 > 900 ở 900 high); audit `ihQ26W78P2` ghi dialog Figma cũng cao 1012, nên khớp thiết kế.
- Frame `5c7PkAibyD`, `p9vFVBE_tc`, `QIMJNgFb8K` không có ảnh: màu lỗi `#CF1322`, ô biệt danh, dropdown người nhận, chip hashtag, check hashtag, trạng thái pressed/disabled, mention chip là đoán (`reports/track-a-copy-phase-05.md`).
- EN tự dịch chờ BTC duyệt (`reports/en-localizations.md`): nhãn toolbar, lỗi, hint Danh hiệu, mô tả Super Hero, `Rules`/`Close`; sửa lỗi gõ của Figma EN ("NATION KUDOS", giftNote).
- "Tiêu chuẩn cộng đồng" trỏ `STANDARDS_PATH`, 404 tới khi có plan riêng; frame `xms7csmDhD` chưa làm.
- Tim cộng cho người gửi (đã chốt 2026-10-19) — làm ở #13, không đụng ở đây.
- Validator link còn lọt (mở rộng L3): link lồng ngoặc, autolink `<javascript:…>`, reference-style, target nuốt link. Phải sửa trước khi có renderer Markdown. Docs đang nói zod chặn mọi link xấu là sai (việc 7 ở trên).
- Ảnh orphan: không có sweep. Vòng sửa A4 giữ ảnh khi kết quả không rõ (mạng, lỗi không có mã), nên orphan nhiều hơn. Còn một kẽ: lỗi có mã từ gateway sau commit vẫn xoá ảnh (chưa kiểm chứng).
- Chưa có idempotency key khi gửi Kudo.
- Body limit 26 MB toàn cục, kể cả khách (quy tắc Cloudflare); `create_kudo` chưa có rate limit theo người gửi.
- Upload Storage trực tiếp bypass bỏ metadata và đặt tên phẳng; chưa có quota.
- `kudos_search_sunners` khớp chuỗi con trên email: có thể dò email qua kết quả tìm.
- Bỏ metadata JPEG dùng deny-list, chưa allow-list.
- Mention `@`: danh sách chưa có ARIA combobox.
- Kéo chọn thả chuột ngoài backdrop đóng modal; modal chưa khoá cuộn nền.
- Quá 5 ảnh bị bỏ im lặng ở client.
- Fake RPC không allow-list tham số; E2E chưa bấm "+ Image" qua file chooser; chưa E2E mobile và EN.
- Italic `_` còn sót trên card (có sẵn trước vòng này).
- Tách file (vượt 200 dòng, CLAUDE.md): `write-kudo.spec.ts` ~830 dòng, `write-kudo-fixtures.mjs` 249 dòng.

## Scope drift

- Widget menu + panel Thể lệ thêm vào #12: dự toán ban đầu 3h, plan 7h (ID-54 của Homepage bị hoãn sang đây). Chi phí: phase 04, 15 test E2E, 6 icon export từ Figma. Cắt được nếu cần ép về 3h: `@mention`, Add link, ảnh.
- **Phase 07 "@ + tên"** (người dùng yêu cầu sau thử thật): đổi chữ ký RPC thành `kudos_search_sunners(p_query, p_limit, p_name_only)`, drop overload cũ, đổi grant/rollback/verify (S3, B3, B5), `searchSunners(query, { nameOnly })`, hàng "không tìm thấy", Esc đóng danh sách, sửa PluginKey riêng cho mention (search không bắn lại sau khi thoát). Chi phí: migration + verify chạy lại ở Supabase thật, E2E 173 → 183 và unit 499 → 501 (gộp phase 07, case blur và mention-exit, không tách riêng được), 1 vòng review + fix PluginKey (RED-first).
- **Tìm người nhận theo email** (thử thật: gõ email không ra gợi ý → Gửi bị khoá): RPC khớp thêm email (vẫn không trả email), hàng "Không tìm thấy Sunner phù hợp", lỗi "Hãy chọn người nhận trong danh sách gợi ý", rời ô huỷ lượt tìm đang chờ. Chi phí: fix round 3, chạy lại migration + verify, E2E 165 → 173.
- **Fidelity pass `ihQ26W78P2`** (yêu cầu "đúng 100% font/cỡ chữ"): 17 giá trị lệch sửa (letter-spacing, geometry, radius, font dấu `*` = Noto Sans JP thêm vào `app/[locale]/layout.tsx` + token `--font-noto-sans-jp`). Chi phí: 1 font preload=false, E2E chạy lại, không đổi assertion.
- Bỏ metadata ảnh JPEG/PNG/WebP (không có trong plan; review M3 + các vòng sau): JPEG APP1/APP11/APP13/COM + phần sau EOI, PNG eXIf/tEXt/iTXt/zTXt/tIME/caBX, WebP EXIF/XMP/C2PA, giữ Orientation. Chi phí: 3 file `strip-*` + `exif-orientation.ts` + test, unit +95 (404 → 499), kiểm workerd 5 × 4.9 MB, Worker +1.51 KiB gzip.
- Đổi thiết kế ảnh sau review C1: `{uid}/{uuid}` → `{uuid}.{ext}` + policy `owner_id`, thêm policy SELECT/DELETE theo owner. Chi phí: sửa migration/rollback/verify; verify B7a–d chạy hành vi thật.
- Add link: VI theo Figma ("Thêm đường dẫn", "Nội dung", "URL"), EN theo spec CSV ("Add link", "Text", "Link"). Chi phí: `ADD_LINK` trong `kudos-contract.ts` + 6 test đổi tên truy cập (không đổi assertion).
- Test: ID-26 gõ "Nguyễn Văn An" thay "An"; `openWidgetMenu` helper; fake `keepAliveTimeout=30s`. Đều sửa đồng bộ/hạ tầng test, không nới assertion.
- Ảnh feed chỉ nhận origin = `NEXT_PUBLIC_SUPABASE_URL` hoặc `/images/`; body Server Action và proxy nâng lên 26mb trong `next.config.ts`.
- ID-56 (Gửi luôn bật) bỏ vì mâu thuẫn quyết định disable; TC_THELE_GUI_003 / FUN_005 N/A.
- **Vòng sửa review 2026-10-20 (phase 08)**: 14 Accept (A1–A14) từ review `f7f7266→223a6dc`, rồi 2 vòng sửa thêm. Vòng 1: 4 Low (Esc bị popup ngoài modal nuốt, đây là hồi quy từ A5; copy lỗi server; `trimEnd` serializer; hashtag retry focus/stale guard). Vòng 2: Esc theo dialog modal trên cùng; `wrap()` cắt tuyến tính. Rejected: test slice-mutant (cần export chỉ để test). Chi phí: 3 vòng implementer, 3 lượt review; unit 501 → 538 (37 → 39 file); E2E 183 → 195 (+ `write-kudo-resilience.spec.ts`); thêm 2 file test unit mới; 4 chuỗi VI/EN mới. Đổi hành vi: nội dung > 5000 ký tự báo lỗi ở ô nội dung và khoá Gửi (trước là lỗi chung); ảnh chỉ xoá khi RPC từ chối có mã hoặc lỗi trước khi gọi RPC; `kudoPlainText` không còn xoá Markdown tự gõ có delimiter lồng nhau (editor không ảnh hưởng).

## Rủi ro

- Mở:
  - Trần 128 MB isolate chưa thử trên Worker deploy (5 × 5 MB; owner chấp nhận 2026-10-19, workerd local OK nhưng không ép trần).
  - Bucket public read: URL ảnh không đoán được nhưng ai có URL đều xem.
  - Chuỗi EN chưa duyệt (kể cả 4 chuỗi mới).
  - Pixel Figma phase 04/05 chưa so hết.
  - Migration chưa chạy lần 2 (idempotency).
  - Validator link còn lọt (Deferred). Docs đã sửa (việc 7), nhưng lỗ hổng code vẫn mở.
  - Orphan ảnh tăng theo thiết kế A4; chưa có sweep.
  - Body 26 MB và create_kudo không rate limit; upload Storage trực tiếp chưa có quota.
- Đóng (2026-10-20, vòng sửa):
  - ReDoS trước auth: 20k ký tự = 5.5 s → unit < 50 ms (A1).
  - E2E flaky `write-kudo.spec.ts:263` (A2): repeat 425/425, 0 flaky.
  - Esc bị nuốt bởi popup ngoài modal (hồi quy A5): sửa ở vòng 1–2.
  - Lỗi tải hashtag im lặng (A6); nội dung > 5000 không báo lỗi (A7); hardBreak mất delimiter (A3); `Object.hasOwn` (A14).
  - Xoá ảnh khi kết quả RPC không rõ (A4): đổi thành giữ ảnh; rủi ro còn lại là orphan (mở ở trên).
  - Fake lệch SQL ở người gọi (A8).
- Đóng (trước 2026-10-20): C1 lộ người gửi ẩn danh qua đường dẫn ảnh; M2 DoS khách POST action (getClaims trước sniff); M1 bản sao byte ảnh; EXIF/XMP/IPTC/C2PA; owner_id Storage + owner role qua RLS (B7a–d, S2 PASS thật); fake lệch SQL thật (verify thật + thử thật, lộ lỗi email đã sửa); mention bắn search liên tục (PluginKey); ECONNRESET fake; stale server E2E (netstat sạch mọi lần).

## Rollback

Revert commit của plan. DB: `supabase/rollbacks/20261019110000_create_kudo_write_down.sql` (drop 2 RPC, policy Storage cả hai thế hệ, bucket nếu rỗng). Kudo đã tạo nằm trong bảng có sẵn từ #11, không bị ảnh hưởng khi revert code.

## Liên quan

- Homepage plan `261012-1549-homepage-saa`: ID-54 (menu Widget) được giao cho plan này và đã giao xong.
