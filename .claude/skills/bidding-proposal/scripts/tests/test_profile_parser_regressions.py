"""Regressions for parser defects that only showed on non-reference documents.

Each test asserts the SPECIFIC wrong value the bug produced, so a fixture that
stops reproducing fails loudly instead of passing vacuously.
"""
from __future__ import annotations

import pytest

from lib.profile_parser import parse_cover_date, parse_profile


# --- B2: addressee detection -------------------------------------------------

def test_addressee_ignores_shiyou_in_prose(fixtures_dir):
    """`様` inside 仕様 / 多様 must not be read as an honorific.

    The bug matched `様` as a substring, took the document's FIRST sentence
    instead of its addressee line, then stripped the character with a global
    `str.replace` — putting `本書は要件仕および多な運用パターン…` on the cover.
    """
    profile = parse_profile((fixtures_dir / 'duplicate-sections-and-honorifics.md')
                            .read_text(encoding='utf-8'))
    assert profile.cover.company == '株式会社テストクライアント'
    assert '仕' not in profile.cover.company  # the mangled form's fingerprint


@pytest.mark.parametrize('line, expected', [
    ('### 株式会社スタイルポート 御中', '株式会社スタイルポート'),
    ('### Kính gửi Quý công ty Styleport', 'Styleport'),
    ('### 東京物流株式会社 御中', '東京物流株式会社'),
    ('本書は要件仕様および多様な運用パターンを整理したものです。', ''),
    ('システムの仕様について', ''),
])
def test_addressee_anchoring(line, expected):
    """Suffix honorifics (JP) and prefix honorifics (VI) both resolve; prose does not."""
    profile = parse_profile(f'# T\n\n{line}\n\n## Features\n\nx\n')
    assert profile.cover.company == expected


def test_explicit_cover_section_keeps_preamble_date():
    """A `## Cover` giving only Company must not erase the preamble's date.

    The fill ran BEFORE the section loop, so `_handle_cover` overwrote the whole
    CoverSection and the date went with it.
    """
    profile = parse_profile(
        '# T\n\n### 株式会社エス 御中\n\n2026.06.01\n\n'
        '## Cover\n\n### Company\n明示された会社\n'
    )
    assert profile.cover.company == '明示された会社'  # explicit section wins
    assert profile.cover.date == '2026.06.01'        # preamble fills the gap


def test_cover_written_before_the_agenda_still_reaches_slide_one():
    """gen-md.py emits `## Cover` first and `## Agenda` second.

    The pre-agenda drop took position as proof a chapter was front matter, so
    it threw away the cover of the pipeline's OWN markdown: company came back
    empty and slide 1 shipped the 'SVN Proposal Menu' placeholder. A chapter
    that resolves to a real section key is kept wherever the document put it.
    """
    profile = parse_profile(
        '# T\n\n## Cover\n\n### Company\nAcme Corp\n\n### Date\n2026.01.02\n\n'
        '## Agenda\n\n1. Project Background\n\n'
        '## Project Background\n\nThe client has no application.\n'
    )
    assert profile.cover.company == 'Acme Corp'
    assert profile.cover.date == '2026.01.02'


def test_unresolved_front_matter_chapters_are_still_dropped():
    """Keeping the cover must not reprieve the executive summary beside it.

    `Executive Summary` and `Revision History` name no section, so they stay
    off the deck — the contents page never lists them.
    """
    profile = parse_profile(
        '# T\n\n## Cover\n\n### Company\nAcme Corp\n\n'
        '## Executive Summary\n\nThe proposal, in advance.\n\n'
        '## Revision History\n\n- v1 first issue\n\n'
        '## Agenda\n\n1. Project Background\n\n'
        '## Project Background\n\nThe client has no application.\n'
    )
    assert profile.cover.company == 'Acme Corp'
    titles = [entry['title'] for entry in profile.auto_extra_slides]
    assert not any(t.startswith(('Executive Summary', 'Revision History'))
                   for t in titles), titles


@pytest.mark.parametrize('text, expected', [
    ('2026年3月15日', '2026.03.15'),
    ('2026 年 3 月 15 日', '2026.03.15'),
    ('2026.03.15', '2026.03.15'),
    ('2026/03/15', '2026.03.15'),
    ('2026-03-15', '2026.03.15'),
    ('March 15, 2026', ''),
])
def test_cover_date_notations(text, expected):
    assert parse_cover_date(text) == expected


# --- Cover: an English proposal's own front matter ---------------------------

_ENGLISH_PREAMBLE = (
    '# Heathring Wellness Ring App — Development Proposal\n\n'
    '**Prepared for**: Evering\n'
    '**Prepared by**: Sun Asterisk Inc. (Sun*)\n'
    '**Document version**: 1.1\n'
    '**Date**: 2026-04-19\n\n'
    '## Executive Summary\n\nx\n'
)


def test_english_proposal_fills_the_cover():
    """`Prepared for:` + an ISO date must reach slide 1.

    The bug: neither notation was read, so a proposal naming its client on line
    3 still shipped the template's `SVN Proposal Menu` / `2025.04.04`.
    """
    profile = parse_profile(_ENGLISH_PREAMBLE)
    assert profile.cover.company == 'Evering'
    assert profile.cover.date == '2026.04.19'


def test_prepared_by_never_reaches_the_cover():
    """The vendor's line sits next to the client's — it must not win.

    A `for`/`to` alternation loose enough to match `Prepared by` would put
    `Sun Asterisk Inc. (Sun*)` on the cover as the addressee.
    """
    profile = parse_profile(_ENGLISH_PREAMBLE)
    assert 'Sun Asterisk' not in profile.cover.company


@pytest.mark.parametrize('line, expected', [
    ('**Prepared for**: Evering', 'Evering'),
    ('Client: Acme Corp', 'Acme Corp'),
    ('To: Acme Corp', 'Acme Corp'),
    ('**Prepared by**: Sun Asterisk Inc.', ''),
    ('Prepared for the closed beta, the app is scoped to verification.', ''),
    ('This document is for internal review.', ''),
])
def test_addressee_label_is_anchored_and_needs_a_colon(line, expected):
    """The label is a field name at line start, not a word in a sentence."""
    profile = parse_profile(f'# T\n\n{line}\n\n## Features\n\nx\n')
    assert profile.cover.company == expected


def test_unfilled_cover_warns(capsys):
    """Falling back to the placeholder must be audible, not silent."""
    parse_profile('# T\n\nNo addressee, no date here.\n\n## Features\n\nx\n')
    out = capsys.readouterr().out
    assert 'WARNING: cover company and date not found' in out
    assert '--cover-company --cover-date' in out


# --- B3: duplicate section collision ----------------------------------------

def test_duplicate_heading_keeps_first_and_routes_second(fixtures_dir):
    """`## 機能一覧` then `## 機能一覧表` — both resolve to `features`.

    The second used to overwrite the first outright, deleting a whole table.
    """
    profile = parse_profile((fixtures_dir / 'duplicate-sections-and-honorifics.md')
                            .read_text(encoding='utf-8'))
    assert [row['No'] for row in profile.features.table] == ['1', '2']
    assert '機能一覧表' in [entry['title'] for entry in profile.auto_extra_slides]


def test_identical_headings_both_survive():
    """A dict keyed by heading text dropped the first block before any section
    logic could see it."""
    profile = parse_profile(
        '# T\n\n## 機能一覧\n\n| No | 名 |\n|---|---|\n| 1 | A |\n\n'
        '## 機能一覧\n\n| No | 名 |\n|---|---|\n| 9 | B |\n'
    )
    assert [row['No'] for row in profile.features.table] == ['1']
    assert len(profile.auto_extra_slides) == 1


# --- Phase 06: front-matter section mapping ---------------------------------

def test_sections_mapping_reaches_bespoke_slides(fixtures_dir):
    """An ordinary JP proposal reaches almost nothing on its own wording; with a
    mapping every chapter must reach its section.

    Almost, not nothing: `### 7.1 開発費用` carries 費用 and the keyword tier
    resolves it, so the cost chapter finds its slide unaided. The point of the
    mapping is the other six chapters, which no vocabulary can guess.
    """
    unmapped = parse_profile((fixtures_dir / 'generic-jp-ordinary-wording.md')
                             .read_text(encoding='utf-8'))
    mapped = parse_profile((fixtures_dir / 'generic-jp-with-sections-mapping.md')
                           .read_text(encoding='utf-8'))

    assert unmapped.section_order == ['agenda', 'cost']
    assert len(unmapped.auto_extra_slides) >= 6, 'the rest still fall to appendix'
    for key in ('project_background', 'features', 'benefits', 'approach_comparison',
                'assumptions', 'infrastructure', 'schedule', 'cost'):
        assert key in mapped.section_order, key
    assert mapped.auto_extra_slides == []


def test_front_matter_is_stripped_before_cover_and_header(fixtures_dir):
    """Front matter must not leak into the preamble the cover reads."""
    profile = parse_profile((fixtures_dir / 'generic-jp-with-sections-mapping.md')
                            .read_text(encoding='utf-8'))
    assert profile.cover.company == '東京物流株式会社'
    assert 'sections' not in profile.cover.company


def test_invalid_section_key_is_rejected():
    """A typo'd key would otherwise look exactly like a mapping that worked."""
    with pytest.raises(ValueError) as excinfo:
        parse_profile('---\nsections:\n  "X": features_table\n---\n# T\n\n## Features\n\nx\n')
    assert 'features_table' in str(excinfo.value)
    assert 'Valid keys' in str(excinfo.value)


def test_document_without_front_matter_is_unchanged():
    """The mapping is an override; absent it, behavior is exactly as before."""
    profile = parse_profile('# T\n\n## Features\n\n説明\n')
    assert profile.section_order == ['features']


# --- Which table a chapter's own slide gets ----------------------------------

def test_a_chapters_own_table_beats_a_breakdown_nested_under_it():
    """§9.1 states two priced options, then breaks one down under `####`.

    Taking the largest table in the subsection put the breakdown on the cost
    slide — under the option table's heading — and sent the prices to an
    appendix. The subsection's own table is what the chapter is about.
    """
    doc = """# P

## 9. Cost

Two options are priced below.

### 9.1. Development cost — two options

| Option | Total MM | Cost |
|---|---|---|
| A. Standard | 30.45 | ¥30,450,000 |
| B. Hybrid | 26.00 | ¥26,000,000 |

#### 9.1.1. Domains where AI reduces effort

| Domain | Reduction |
|---|---|
| QA test cases | -55% |
| Automated E2E | -60% |
| Backend CRUD | -50% |
| Screen scaffolding | -40% |
| Spec drafting | -35% |
"""
    cost = parse_profile(doc).cost
    assert cost.title == 'Development cost — two options'
    assert list(cost.rows[0].keys())[:2] == ['Option', 'Total MM']
    assert cost.description == 'Two options are priced below.'


def test_a_subsection_with_no_table_of_its_own_still_uses_its_breakdown():
    doc = """# P

## 9. Cost

### 9.1. Development cost

#### 9.1.1. By phase

| Phase | Cost |
|---|---|
| Build | ¥10,000,000 |
"""
    cost = parse_profile(doc).cost
    assert [row['Phase'] for row in cost.rows] == ['Build']


# --- Markdown must never reach a slide --------------------------------------

def test_a_benefit_card_gets_its_matrix_as_prose_not_as_pipes():
    """§2.2 `Key Benefits` is a two-column matrix; the card is one box."""
    doc = """# P

## 2. Benefits of the Proposed Solution

### 2.1. Key Benefits

| Dimension | Benefit |
|---|---|
| Hardware validation | First end-to-end verification of the pipeline |
| Time-to-market | Structured 6-month delivery plan |
"""
    benefits = parse_profile(doc).benefits
    assert len(benefits) == 1
    assert benefits[0].title == 'Key Benefits'
    assert '|' not in benefits[0].content
    assert 'Hardware validation — First end-to-end verification' in benefits[0].content


def test_a_bullets_slide_carries_no_inline_markup():
    """`- **Model**: Quasi-delegation contract` printed its own asterisks."""
    from lib.extra_slide_classifier import build_extra_slide_entry

    entry = build_extra_slide_entry('General Terms and Conditions', subsections={
        '10.1. Contract': '- **Model**: Quasi-delegation contract.\n'
                          '- **Billing**: Monthly, in arrears.',
        '10.2. Effort accounting': 'Effort is billed as **person-months**.',
        '10.3. Scope management': 'Changes go through a **change request**.',
        '10.4. Warranty': 'Thirty days from **handover**.',
        '10.5. Confidentiality': 'The **NDA** already signed governs.',
        '10.6. Governing law': 'Japanese law, **Tokyo** courts.',
        '10.7. Exit criteria': 'Sign-off on the **UAT** report.',
    })
    text = ' '.join(str(value) for value in entry.values())
    assert '**' not in text, text
    assert '- ' not in text
