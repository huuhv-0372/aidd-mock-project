"""How a table's height is divided between its rows before anything is cut.

Two rules, both learned from a real proposal:

  * a row that needs two lines cannot use four, and the two it does not need
    belong to the row that ran out. Equal shares cut two assumptions off
    mid-sentence while the three below them sat half empty;
  * the division is per PAGE, not per table. A 33-row feature list was charged
    1/33 of one slide's height, so every cell was cut to a single line — 1,490
    characters thrown away to make room the split pass was going to make anyway.
"""
from __future__ import annotations

import pytest

pytest.importorskip('pptx')

from lib.renderer import PPTXRenderer  # noqa: E402


def test_a_short_row_hands_its_unused_lines_to_a_long_one():
    assert PPTXRenderer._share_lines([1, 1, 9], 12) == [1, 1, 9]


def test_every_row_keeps_at_least_one_line():
    assert PPTXRenderer._share_lines([4, 4, 4], 2) == [1, 1, 1]


def test_nothing_is_left_on_the_table():
    allowance = PPTXRenderer._share_lines([8, 8, 1], 12)
    assert sum(allowance) == 12
    assert allowance[2] == 1, 'the row that needs one line gets one line'
    assert abs(allowance[0] - allowance[1]) <= 1, \
        'two equally long rows are cut within a line of each other'


def test_a_budget_larger_than_the_need_changes_nothing():
    assert PPTXRenderer._share_lines([2, 3], 40) == [2, 3]


def test_pages_are_budgeted_one_at_a_time():
    """Six rows, two to a page: each pair divides one page's twelve lines."""
    allowance = PPTXRenderer()._share_lines_per_page([9, 1, 9, 1, 6, 6], 12, 2)
    assert allowance == [9, 1, 9, 1, 6, 6]


def test_a_row_is_not_charged_for_rows_it_never_shares_a_slide_with():
    """The feature-list case: 33 rows, 7 to a page, one page's budget each."""
    needs = [3] * 33
    per_table = PPTXRenderer._share_lines(needs, 11)
    per_page = PPTXRenderer()._share_lines_per_page(needs, 11, 7)
    assert set(per_table) == {1}, 'the whole table against one slide starves it'
    assert min(per_page) >= 1 and max(per_page) >= 2, per_page
    assert sum(per_page) >= 1.5 * sum(per_table), 'paging must buy the rows real room'
