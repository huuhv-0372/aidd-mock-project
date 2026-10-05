"""Heading vocabulary: what a chapter is called, and what that costs when missed.

A chapter that resolves to nothing is not merely unstyled — it is taken apart.
`5. Estimation Assumptions` named a chapter the alias table did not list (it
listed the template divider's wording, `Estimated Assumptions`), so the parser
fell back to reading the chapter as a CONTAINER: `5.8. Infrastructure` claimed
the System Architecture slides on its way past, and the remaining eight
subsections each became an appendix slide of their own. Nine rows of a grid the
template had drawn for them turned into eight loose slides.

These tests pin the vocabulary — exact table then keyword tier — and the two
guards that keep the keyword tier from guessing: an ambiguous heading resolves to
nothing, and a caller that is not looking at a heading can turn it off.
"""
from __future__ import annotations

import pytest

from lib.section_aliases import heading_label, resolve_section_key  # noqa: E402


@pytest.mark.parametrize('heading,key', [
    # The regression itself, plus the wordings around it.
    ('5. Estimation Assumptions', 'assumptions'),
    ('Estimation assumptions (POC)', 'assumptions'),
    ('Assumptions & Prerequisites', 'assumptions'),
    ('4. 前提条件', 'assumptions'),
    # Chapters an English proposal writes that the JP-first table never listed.
    ('1.4. Feature List', 'features'),
    ('1.5. Non-Functional Requirements (NFR)', 'nfr_overview'),
    ('2. Benefits of the Proposed Solution', 'benefits'),
    ('2.2. Key Benefits', 'benefits'),
    ('5.3. Programming stack (proposed — to be agreed with Adrian)', 'software_stack'),
    ('7. Expected Deliverables', 'deliverables'),
    ('8. Implementation Schedule', 'schedule'),
    ('9. Cost', 'cost'),
])
def test_a_chapter_resolves_to_the_section_it_names(heading, key):
    assert resolve_section_key(heading) == key


@pytest.mark.parametrize('heading', [
    # Two keys at once. Guessing between them is worse than the caller's own
    # fallback, so an ambiguous heading resolves to neither.
    'Cost and delivery schedule',
    'Deliverables and implementation schedule',
    # No section owns these — they must stay appendix material rather than be
    # forced into the nearest slide.
    '10. General Terms and Conditions',
    '4. Scope of Work',
    '1.6. UI Mockup Design',
    'Appendices',
])
def test_a_heading_that_names_no_single_section_resolves_to_nothing(heading):
    assert resolve_section_key(heading) is None


def test_a_word_that_is_decisive_only_in_company_is_not_a_keyword():
    """`Infrastructure cost` is a cost table, not the architecture chapter.

    `infrastructure` is deliberately absent from the keyword rules for exactly
    this reason: the word is as much at home in a cost breakdown as in a system
    diagram, so only the unambiguous `system architecture` spelling resolves.
    """
    assert resolve_section_key('9.3. Infrastructure cost (AWS pass-through)') == 'cost'
    assert resolve_section_key('6. System Architecture') == 'infrastructure'


def test_the_keyword_tier_can_be_switched_off_for_text_that_is_not_a_heading():
    """`_is_title_of` asks this before OVERWRITING a shape — see renderer."""
    sentence = '費用の概要です。'
    breadcrumb = 'System Overview ｜ Feature List'
    assert resolve_section_key(sentence) == 'cost'
    assert resolve_section_key(sentence, keywords=False) is None
    assert resolve_section_key(breadcrumb, keywords=False) is None


def test_an_exact_alias_still_wins_over_the_keywords():
    """`Advantages` is the template's own word for the benefits chapter."""
    assert resolve_section_key('Advantages') == 'benefits'
    assert resolve_section_key('費用') == 'cost'


def test_a_row_label_drops_the_aside_the_title_keeps():
    heading = '5.3. Programming stack (proposed — to be agreed with Adrian)'
    assert heading_label(heading) == 'Programming stack'
    assert heading_label('5.1. Development approach') == 'Development approach'
    # Nothing to drop, nothing dropped.
    assert heading_label('機能一覧 — Feature List') == '機能一覧 — Feature List'
