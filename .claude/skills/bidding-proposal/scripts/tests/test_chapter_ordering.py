"""A chapter lands where the document put it, under the name the document gave it.

The deck used to decide both by accident. An appendix subsection took the
section that happened to precede it in the walk, so `2.1` was anchored to
chapter 1 and printed ahead of its own chapter's divider. An anchor pointing at
a template slide the prune pass had dropped fell all the way back to the end of
the deck, which is how `4. Scope of Work` — a whole chapter — ended up after the
terms and conditions. And a divider was named by matching the template's wording
against the AGENDA, so an English proposal got the TEMPLATE's chapter names.

These tests pin the three signals that replaced the guessing: the chapter a
subsection belongs to, the slides a section still has, and the chapter a divider
structurally introduces.
"""
from __future__ import annotations

import pytest

pytest.importorskip('pptx')

from lib.profile_parser import parse_profile  # noqa: E402
from lib.renderer import PPTXRenderer  # noqa: E402
from lib.templates.svn import SECTION_TO_SLIDES  # noqa: E402

DOC = """---
sections:
  "Executive Summary": appendix
  "Agenda": agenda
  "1. System Overview": container
  "1.1. Background": appendix
  "1.2. Current Challenges": project_background.current_issues
  "2. Benefits of the Proposed Solution": container
  "2.1. System Flow": appendix
  "2.2. Key Benefits": benefits
  "3. Scope of Work": container
  "3.1. Responsibility Split": appendix
  "3.2. In Scope": appendix
  "3.3. Delivery Options": benefits
---

## Executive Summary

A short summary of the whole proposal.

## Agenda

1. System Overview
2. Benefits of the Proposed Solution
3. Scope of Work

## 1. System Overview

### 1.1. Background

- The client has hardware but no application.

### 1.2. Current Challenges

- Integration is unverified.

## 2. Benefits of the Proposed Solution

### 2.1. System Flow

- Data moves from the ring to the app.

### 2.2. Key Benefits

#### Reduced cost

Automation removes manual entry.

## 3. Scope of Work

### 3.1. Responsibility Split

- Sun* builds the app.

### 3.2. In Scope

- All thirty-six screens.

### 3.3. Delivery Options

Two options, A and B.
"""


@pytest.fixture(scope='module')
def profile():
    return parse_profile(DOC)


def _extra(profile, title_starts: str) -> dict:
    return next(e for e in profile.auto_extra_slides
                if e['title'].startswith(title_starts))


# --- which chapter an appendix subsection belongs to -----------------------

def test_a_subsection_ahead_of_its_chapters_section_anchors_before_it(profile):
    """`2.1` precedes `2.2` in the document, so it precedes it in the deck."""
    entry = _extra(profile, '2.1.')
    assert entry['anchor_section'] == 'benefits'
    assert entry['anchor_edge'] == 'before'


def test_a_subsection_after_its_chapters_section_still_anchors_after_it(profile):
    entry = _extra(profile, '1.1.')
    assert entry['anchor_section'] == 'project_background'
    assert entry['anchor_edge'] == 'before', '1.1 comes before 1.2 in the document'


def test_every_appendix_subsection_anchors_inside_its_own_chapter(profile):
    """Not to whatever section the walk happened to pass last.

    Chapter 3's subsections all resolve against `benefits` — the section its
    own `3.3` reaches — rather than being scattered behind chapter 2's slides
    or, as the pruned-anchor fallback used to do, dropped at the end of the
    deck behind the terms and conditions.
    """
    for title in ('3.1.', '3.2.'):
        assert _extra(profile, title)['anchor_section'] == 'benefits'


def test_every_appendix_slide_records_the_chapter_it_came_from(profile):
    assert _extra(profile, '3.1.')['chapter'] == 'Scope of Work'
    assert _extra(profile, '2.1.')['chapter'] == 'Benefits of the Proposed Solution'


def test_a_chapter_written_before_the_agenda_never_reaches_the_deck(profile):
    """The AGENDA is the contents page, and it says where the proposal starts.

    An executive summary ahead of it is front matter for a reader of the
    DOCUMENT: it repeats, in advance, the chapters that follow. On a slide it
    announces a chapter the contents page never lists.
    """
    titles = [e['title'] for e in profile.auto_extra_slides]
    assert not any(t.startswith('Executive Summary') for t in titles)


# --- which chapter a section came out of -----------------------------------

def test_each_section_records_its_chapter_not_its_subsection(profile):
    assert profile.section_chapters['benefits'] == 'Benefits of the Proposed Solution'
    assert profile.section_headings['benefits'] == 'Key Benefits', 'both are kept'


def test_a_divider_is_named_from_the_chapter_its_slides_belong_to(profile):
    # Divider 9 introduces slides 10-13; `benefits` owns 12 and 13.
    assert PPTXRenderer._chapter_of_divider(9, profile) == \
        'Benefits of the Proposed Solution'


def test_a_divider_whose_chapter_never_reached_the_deck_names_nothing(profile):
    assert PPTXRenderer._chapter_of_divider(51, profile) == ''


# --- an anchor survives its section losing a slide -------------------------

class _Anchors(PPTXRenderer):
    """Just the anchor resolution, over a made-up prune result."""

    def __init__(self, first_positions, section_order):
        self._first_positions = first_positions
        self._section_order = section_order


def test_an_anchor_uses_whichever_slide_of_its_section_survived():
    """`approach_comparison` owns 16 and 21; a deck that filled 16 keeps 16."""
    assert SECTION_TO_SLIDES['approach_comparison'] == [16, 21], 'premise'
    resolver = _Anchors({}, [])
    assert resolver._anchor_within_section(
        'approach_comparison', SECTION_TO_SLIDES, {16: 7}, 'after') == 7


def test_a_section_with_no_surviving_slide_reports_nothing():
    """So the caller can look further back rather than jump to the deck's end."""
    resolver = _Anchors({}, [])
    assert resolver._anchor_within_section(
        'approach_comparison', SECTION_TO_SLIDES, {5: 3}, 'after') is None


def test_an_orphaned_section_falls_back_to_the_nearest_earlier_one():
    resolver = _Anchors({}, ['features', 'approach_comparison', 'cost'])
    assert resolver._anchor_from_earlier_section(
        'cost', SECTION_TO_SLIDES, {5: 4}) == 4, 'features owns slide 5'


def test_a_before_anchor_lands_one_step_ahead_of_its_section():
    resolver = _Anchors({12: 9}, [])
    assert resolver._anchor_within_section(
        'benefits', SECTION_TO_SLIDES, {13: 10}, 'before') == 8


# --- A chapter anchored to the deck's front matter --------------------------
#
# On a proposal whose wording resolves only one chapter — the JP fixture, where
# `### 7.1 開発費用` is the single heading the vocabulary recognizes — every other
# chapter is anchored to the AGENDA. The agenda owns no content slide, so those
# anchors used to resolve to "nowhere" and the chapters were appended after the
# only section that had resolved: the deck opened with the price and then
# explained it.


def test_a_chapter_anchored_to_the_agenda_goes_ahead_of_the_filled_chapters():
    resolver = _Anchors({}, [])
    # cover, agenda, then the cost chapter: divider 51 announcing slide 56.
    wanted = [1, 2, 51, 56]
    assert resolver._divider_insert_position(
        {'anchor_section': 'agenda'}, wanted, SECTION_TO_SLIDES) == 2


def test_the_position_is_the_chapters_divider_not_its_content_slide():
    """Inserting between a divider and the table it announces splits a chapter."""
    resolver = _Anchors({}, [])
    assert resolver._first_chapter_position([1, 2, 51, 56], SECTION_TO_SLIDES) == 2
    # Without the divider in the deck, the content slide is where a chapter starts.
    assert resolver._first_chapter_position([1, 2, 56], SECTION_TO_SLIDES) == 2


def test_an_unknown_anchor_that_is_not_front_matter_still_goes_last():
    resolver = _Anchors({}, [])
    assert resolver._divider_insert_position(
        {'anchor_section': 'nothing_like_this'}, [1, 2, 56], SECTION_TO_SLIDES) == 3


CONTAINER_ONE_LIVE_SUBSECTION = """---
sections:
  "5. 開発スケジュールおよび成果物": container
---
# 運営支援システムのご提案

## 5. 開発スケジュールおよび成果物

### 全体スケジュール案

2026年12月着手、2027年9月稼働。

| 工程 | 担当 | 開始 | 終了 |
|---|---|---|---|
| P1 要件定義 | Sun* | 2026/12 | 2027/03 |
| P1 開発・テスト | Sun* | 2027/03 | 2027/08 |
"""


def test_a_container_with_ONE_live_subsection_still_names_its_divider(
        template_path, tmp_path):
    """A container is a container whether one subsection survives or two.

    Its divider takes the CONTAINER's name — the document has one chapter there,
    not two — and this must not depend on the document carrying an AGENDA: five
    of this suite's own fixtures have none, and the second retitling pass gives
    up when the agenda is empty. Deciding container-ness by group SIZE left the
    divider reading the template's own `実施スケジュール` while the very next
    slide was headed `全体スケジュール案`.
    """
    from pptx import Presentation

    from lib.profile_parser import parse_profile
    from lib.renderer import PPTXRenderer

    profile = parse_profile(CONTAINER_ONE_LIVE_SUBSECTION)
    assert '## AGENDA' not in CONTAINER_ONE_LIVE_SUBSECTION
    assert profile.section_containers.get('schedule') == '開発スケジュールおよび成果物', \
        'the parser must record which chapter lifted this section out'

    out = PPTXRenderer().render_from_profile(
        profile, str(template_path), 'container-one-sub', str(tmp_path),
        extra_slides=list(profile.auto_extra_slides))

    # A divider slide is the template's two-line chapter card: JP name over its
    # English gloss, and nothing else on the page.
    dividers = [
        [' '.join(shape.text_frame.text.split()) for shape in slide.shapes
         if shape.has_text_frame and shape.text_frame.text.strip()]
        for slide in Presentation(str(out)).slides if len(slide.shapes) <= 3
    ]
    flat = [text for card in dividers for text in card]
    assert '開発スケジュールおよび成果物' in flat, (
        f'no divider carries the container chapter name: {dividers}')
    assert '実施スケジュール' not in flat, (
        "a divider kept the template's own wording for a chapter the document "
        f'named itself: {dividers}')
