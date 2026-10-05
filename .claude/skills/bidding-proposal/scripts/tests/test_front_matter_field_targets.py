"""Front-matter targets that name one BOX of a section, and the `appendix` sentinel.

Slide 4 heads its two columns `現状の課題` and `目的・実現したいこと`. A proposal
routinely writes those as two separate chapters, and a mapping that can only
address SECTIONS cannot say which chapter fills which column — the first to
resolve claims the whole section and the second is locked out. These tests pin
the finer resolution that fixes it, and the sentinel that lets a chapter stand
down so a sibling can take the box.
"""
from __future__ import annotations

import pytest

pytest.importorskip('pptx')

from lib.profile_parser import parse_profile  # noqa: E402
from lib.profile_schema import FIELD_TARGETS, field_has_content  # noqa: E402
from lib.section_aliases import resolve_section_key  # noqa: E402


# The 1.1 / 1.2 / 1.3 shape this whole phase exists for: a background chapter,
# a challenges TABLE, and an objectives list — three chapters, two boxes.
DOC = '''---
sections:
  "1. System Overview": container
  "1.1. Project Background": appendix
  "1.2. Current Challenges": project_background.current_issues
  "1.3. Primary Objective": project_background.objectives
---

# Proposal

## 1. System Overview

### 1.1. Project Background

The client is building a wellness ring with multiple on-device sensors.

### 1.2. Current Challenges

| Challenge | Description |
|---|---|
| Integration unverified | Firmware and app must be proven together |
| Throughput pipeline | 200 Hz multi-sensor needs a tuned ingestion path |

### 1.3. Primary Objective

Verify that the ring functions correctly under realistic daily use.
'''


def _profile(md: str = DOC):
    return parse_profile(md)


def test_two_chapters_fill_the_two_boxes_of_one_section():
    """The regression this phase exists to kill."""
    bg = _profile().project_background
    assert 'Integration unverified' in bg.current_issues
    assert 'Verify that the ring functions correctly' in bg.objectives
    # And the background chapter that used to claim both boxes now holds neither.
    assert 'wellness ring with multiple' not in bg.current_issues
    assert 'wellness ring with multiple' not in bg.objectives


def test_appendix_sentinel_stands_a_chapter_down():
    """A chapter marked `appendix` reaches the deck, but claims no slide."""
    profile = _profile()
    titles = [e.get('title', '') for e in profile.auto_extra_slides]
    assert any('Project Background' in t for t in titles)


def test_a_table_only_chapter_becomes_lines_not_markdown_pipes():
    """A prose box must never render the grid it was handed."""
    issues = _profile().project_background.current_issues
    assert '|' not in issues
    assert '---' not in issues
    assert 'Integration unverified — Firmware and app must be proven together' in issues


def test_section_order_is_recorded_once_from_the_first_box_filled():
    """The slide keeps the position the document gave the chapter."""
    profile = _profile()
    assert profile.section_order.count('project_background') == 1


def test_section_heading_comes_from_the_chapter_that_filled_the_first_box():
    profile = _profile()
    assert profile.section_headings['project_background'] == 'Current Challenges'


def test_first_occupant_wins_per_box_not_per_section(capsys):
    """Two chapters may fill two boxes; neither may overwrite the other's."""
    md = DOC.replace(
        '  "1.3. Primary Objective": project_background.objectives',
        '  "1.3. Primary Objective": project_background.current_issues',
    )
    profile = parse_profile(md)
    assert 'Integration unverified' in profile.project_background.current_issues
    assert 'Verify that the ring' not in profile.project_background.current_issues
    assert 'already filled' in capsys.readouterr().out
    # Not overwritten AND not lost: the loser reaches an appendix slide.
    titles = [e.get('title', '') for e in profile.auto_extra_slides]
    assert any('Primary Objective' in t for t in titles)


def test_an_unknown_field_stops_the_run_and_names_the_valid_paths():
    md = DOC.replace('project_background.objectives', 'project_background.not_a_field')
    with pytest.raises(ValueError) as excinfo:
        parse_profile(md)
    message = str(excinfo.value)
    assert 'not_a_field' in message
    assert 'project_background.objectives' in message, 'must show what IS valid'


def test_an_unknown_section_in_a_field_path_stops_the_run():
    md = DOC.replace('project_background.objectives', 'nosuchsection.objectives')
    with pytest.raises(ValueError):
        parse_profile(md)


def test_structural_fields_are_not_addressable():
    """`table` / `rows` / `image_path` hold grids and paths, never raw markdown."""
    for section, fields in FIELD_TARGETS.items():
        assert 'table' not in fields
        assert 'rows' not in fields
        assert 'image_path' not in fields


def test_aliases_can_name_a_box_without_front_matter():
    """`現状の課題` names a column of slide 4, not the whole chapter."""
    assert resolve_section_key('現状の課題') == 'project_background.current_issues'
    assert resolve_section_key('1.3. Primary Objective') == 'project_background.objectives'
    # The whole-chapter wordings still resolve to the whole section.
    assert resolve_section_key('プロジェクト背景') == 'project_background'


def test_field_has_content_only_answers_for_real_targets():
    profile = _profile()
    assert field_has_content(profile, 'project_background.current_issues')
    assert not field_has_content(profile, 'project_background.not_a_field')
    assert not field_has_content(profile, 'nosuchsection.whatever')


def test_a_document_without_front_matter_is_untouched_by_any_of_this():
    """The Clio path has no front matter, and must parse exactly as before."""
    md = DOC.split('---\n', 2)[2]
    bg = parse_profile(md).project_background
    # Falls back to the paragraph split, as it always did: 1.1 claims the section.
    assert 'wellness ring with multiple' in bg.current_issues
