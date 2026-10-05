"""A box drawing read back into boxes — and refused when it is not one.

Rendering the fenced block as a monospace picture kept it legible, but it stayed
a picture of characters: hairlines one pixel wide, type sized to the longest
row. The corners of a box drawing are unambiguous, so the structure can be
recovered and drawn properly instead.

The refusal matters as much as the parse. A half-understood diagram redrawn with
confidence asserts a shape the document never had, so anything this cannot read
must come back empty and leave the monospace picture in place.
"""
from __future__ import annotations

import pytest

from lib.ascii_box_parser import edges, parse

TWO_BOXES = """\
┌──────────┐      ┌──────────┐
│  Client  │ ───► │  Server  │
└──────────┘      └──────────┘"""

NESTED = """\
┌────────────────────────────────┐
│  Cloud                         │
│                                │
│  ┌──────────────────────────┐  │
│  │ Public Subnet            │  │
│  └────────────┬─────────────┘  │
│               │                │
│  ┌────────────▼─────────────┐  │
│  │ Private Subnet           │  │
│  │  API Service             │  │
│  └──────────────────────────┘  │
│                                │
│  Storage: S3                   │
└────────────────────────────────┘"""


def _titles(boxes):
    return [b.title for b in boxes]


# --- what it finds ---------------------------------------------------------

def test_two_side_by_side_boxes_are_both_found():
    assert _titles(parse(TWO_BOXES)) == ['Client', 'Server']


def test_a_nested_box_is_returned_under_its_parent_not_beside_it():
    (cloud,) = parse(NESTED)
    assert cloud.title == 'Cloud'
    assert _titles(cloud.children) == ['Public Subnet', 'Private Subnet']


def test_nesting_goes_to_the_NEAREST_enclosing_box():
    outer = """\
┌──────────────────────┐
│ Outer                │
│  ┌────────────────┐  │
│  │ Middle         │  │
│  │  ┌──────────┐  │  │
│  │  │ Inner    │  │  │
│  │  └──────────┘  │  │
│  └────────────────┘  │
└──────────────────────┘"""
    (top,) = parse(outer)
    (middle,) = top.children
    assert middle.title == 'Middle'
    assert _titles(middle.children) == ['Inner']


def test_a_containers_own_text_excludes_what_its_children_say():
    (cloud,) = parse(NESTED)
    assert 'Storage: S3' in cloud.lines
    assert not any('Private Subnet' in line for line in cloud.lines)


def test_a_leaf_keeps_every_line_it_holds():
    (cloud,) = parse(NESTED)
    private = cloud.children[1]
    assert private.lines == ['Private Subnet', 'API Service']


def test_an_inline_arrow_becomes_one_glyph_every_font_carries():
    """`──►` inside a box's text is drawn with rules that no longer line up."""
    block = """\
┌────────────────────────────┐
│ CI/CD: GitHub ──► CodeBuild│
└────────────────────────────┘
┌────────────────────────────┐
│ second box                 │
└────────────────────────────┘"""
    (first, _) = parse(block)
    assert first.lines == ['CI/CD: GitHub → CodeBuild']


# --- what it refuses -------------------------------------------------------

def test_plain_prose_is_not_a_diagram():
    assert parse('Just some words.\nAnd some more.') == []


def test_a_single_box_is_not_worth_redrawing():
    assert parse('┌─────┐\n│ One │\n└─────┘') == []


def test_an_unclosed_rectangle_is_not_reported_as_one():
    """Corners without their closing pair are not a box, and not a guess."""
    broken = """\
┌──────────┐      ┌──────────┐
│  Client          │  Server  │
└──────────┘      └──────────┘"""
    assert len(parse(broken)) < 2


def test_an_empty_block_returns_nothing():
    assert parse('') == []


# --- arrows ----------------------------------------------------------------

def test_a_horizontal_arrow_is_read_in_its_own_direction():
    boxes = parse(TWO_BOXES)
    found = edges(TWO_BOXES, boxes)
    assert any(s.title == 'Client' and t.title == 'Server' and d == 'right'
               for s, t, d, _ in found)


def test_a_vertical_arrow_between_nested_boxes_is_found():
    (cloud,) = parse(NESTED)
    found = edges(NESTED, [cloud])
    assert any(s.title == 'Public Subnet' and t.title == 'Private Subnet'
               for s, t, _, _ in found)


def test_an_arrows_annotation_travels_with_it():
    block = """\
┌──────────┐
│  App     │
└────┬─────┘
     │ HTTPS
     ▼
┌──────────┐
│  API     │
└──────────┘"""
    boxes = parse(block)
    found = edges(block, boxes)
    assert any(label == 'HTTPS' for *_, label in found)


def test_an_arrow_is_never_reported_twice_between_one_pair():
    found = edges(TWO_BOXES, parse(TWO_BOXES))
    pairs = [(s.title, t.title) for s, t, _, _ in found]
    assert len(pairs) == len(set(pairs))


def test_a_label_that_is_just_the_target_box_name_is_dropped():
    """The scan reads rightwards, and the next box's own text lies that way."""
    found = edges(TWO_BOXES, parse(TWO_BOXES))
    assert all(label != 'Server' for *_, label in found)
