"""A schedule table becomes a chart, and only a schedule table does.

Three tables state a plan — phases, a role-by-month matrix, dated milestones —
and as tables all three make the reader hold six columns of months in their head
to see what a chart shows at once. The template draws all three; these tests pin
the reading that lets the renderer do the same.

The refusals matter equally. Anything that is not a schedule must come through
unrecognised and keep its table, or an ordinary two-column table with a date in
it would be redrawn as a timeline of nothing.
"""
from __future__ import annotations

import pytest

from lib.timeline_data import (
    Month, QUARTER_THRESHOLD, build_chart, parse_date, parse_month,
)

PHASES = [
    {'Phase': 'Ramp-up', 'Duration': '1 month', 'Months': '2026/05',
     'Focus': 'Spec refinement and architecture'},
    {'Phase': 'Core Dev', 'Duration': '1 month', 'Months': '2026/06',
     'Focus': 'API foundation and home screens'},
    {'Phase': 'Release', 'Duration': '1 month', 'Months': '2026/07',
     'Focus': 'UAT execution and handover'},
]

RESOURCES = [
    {'#': '1', 'Position': 'PSM', '2026/05': '1.00', '2026/06': '1.50',
     '2026/07': '0.50'},
    {'#': '2', 'Position': 'Lead QA', '2026/05': '0.50', '2026/06': '1.00',
     '2026/07': '1.50'},
    {'#': '', 'Position': '**Monthly total**', '2026/05': '**1.50**',
     '2026/06': '**2.50**', '2026/07': '**2.00**'},
]

MILESTONES = [
    {'Milestone': 'Kick-off', 'Target date': '2026/05/01',
     'Exit criterion': 'Contract signed'},
    {'Milestone': 'Spec lock', 'Target date': '2026/05/31',
     'Exit criterion': 'Specs signed off'},
    {'Milestone': 'Handover', 'Target date': '2026/07/30',
     'Exit criterion': 'Deliverables accepted'},
]


# --- reading dates ---------------------------------------------------------

@pytest.mark.parametrize('text', ['2026/05', '2026-5', '2026年5月', ' 2026.05 '])
def test_a_month_is_read_however_it_is_written(text):
    assert parse_month(text) == Month(2026, 5)


def test_a_thirteenth_month_is_not_a_month():
    assert parse_month('2026/13') is None


def test_a_month_is_not_mistaken_for_a_date():
    assert parse_date('2026/05') is None


def test_a_date_keeps_its_day():
    assert parse_date('2026/05/31') == (Month(2026, 5), 31)


# --- which chart a table becomes ------------------------------------------

def test_a_column_of_months_reads_as_phases():
    chart = build_chart(PHASES)
    assert chart.kind == 'phases'
    assert [b.label for b in chart.bars] == ['Ramp-up', 'Core Dev', 'Release']


def test_the_phase_detail_comes_from_the_WORDIEST_column():
    """`Duration` is a longer word than `Focus` and says almost nothing."""
    chart = build_chart(PHASES)
    assert chart.detail_label == 'Focus'
    assert chart.bars[0].detail == 'Spec refinement and architecture'


def test_month_headers_read_as_a_resource_matrix():
    chart = build_chart(RESOURCES)
    assert chart.kind == 'resources'
    assert [label for label, _ in chart.rows] == ['PSM', 'Lead QA']


def test_a_totals_row_is_held_apart_from_the_roles():
    """Drawn as a role it would carry every other role's effort a second time."""
    chart = build_chart(RESOURCES)
    assert chart.totals[0] == 'Monthly total'
    assert chart.totals[1] == [1.5, 2.5, 2.0]
    assert all('total' not in label.lower() for label, _ in chart.rows)


def test_a_row_number_column_is_never_taken_as_the_name():
    assert [label for label, _ in build_chart(RESOURCES).rows] == ['PSM', 'Lead QA']


def test_a_column_of_dates_reads_as_milestones():
    chart = build_chart(MILESTONES)
    assert chart.kind == 'milestones'
    assert [m.label for m in chart.markers] == ['Kick-off', 'Spec lock', 'Handover']
    assert chart.markers[1].day == 31


def test_the_milestone_criterion_survives_into_the_model():
    assert build_chart(MILESTONES).markers[0].detail == 'Contract signed'


# --- the axis --------------------------------------------------------------

def test_the_axis_covers_every_month_between_the_ends():
    """A timeline with a hole in it is not a timeline."""
    sparse = [
        {'Task': 'Start', 'When': '2026/01'},
        {'Task': 'Finish', 'When': '2026/06'},
    ]
    months = build_chart(sparse).months
    assert [m.month for m in months] == [1, 2, 3, 4, 5, 6]


def test_the_axis_crosses_a_year_boundary_without_losing_a_month():
    spanning = [
        {'Task': 'Start', 'When': '2025/11'},
        {'Task': 'Finish', 'When': '2026/02'},
    ]
    months = build_chart(spanning).months
    assert [(m.year, m.month) for m in months] == [
        (2025, 11), (2025, 12), (2026, 1), (2026, 2)]


def test_a_long_project_groups_its_axis_into_quarters():
    """Past a year and a half the month columns are too narrow to label."""
    from lib.timeline_layouts import _Axis

    long_run = [{'Task': 'A', 'When': '2026/01'}, {'Task': 'B', 'When': '2027/12'}]
    chart = build_chart(long_run)
    assert len(chart.months) > QUARTER_THRESHOLD
    axis = _Axis(chart.months, 1.0, 10.0)
    assert axis.by_quarter
    assert axis.slots[0] == '2026 Q1' and len(axis.slots) == 8


def test_a_short_project_keeps_its_months():
    from lib.timeline_layouts import _Axis

    axis = _Axis(build_chart(PHASES).months, 1.0, 10.0)
    assert not axis.by_quarter and len(axis.slots) == 3


# --- what is NOT a schedule -----------------------------------------------

def test_an_ordinary_two_column_table_stays_a_table():
    assert build_chart([{'Component': 'React Native', 'Why': 'Shared codebase'},
                        {'Component': 'NestJS', 'Why': 'Team familiarity'}]) is None


def test_one_dated_row_is_not_a_timeline():
    assert build_chart([{'Event': 'Kick-off', 'Date': '2026/05/01'}]) is None


def test_a_free_text_column_mentioning_one_date_is_not_a_date_column():
    """All the cells have to parse, not most: one hit is a coincidence."""
    chart = build_chart([
        {'Item': 'Contract', 'Note': '2026/05/01'},
        {'Item': 'Kickoff', 'Note': 'to be agreed with the client'},
        {'Item': 'Review', 'Note': 'monthly'},
    ])
    assert chart is None


def test_two_month_columns_are_not_enough_for_a_matrix():
    assert build_chart([{'Role': 'QA', '2026/05': '1', '2026/06': '1'}]) is None


def test_an_empty_table_returns_nothing():
    assert build_chart([]) is None


# --- what one malformed or ordinarily-written cell used to cost -------------

def test_a_range_written_with_a_plain_hyphen_is_still_a_range():
    """`2026/06 - 2026/08` is how nearly everyone types a span.

    Only the typographic dashes were accepted, so the commonest spelling of a
    multi-month phase parsed as nothing and the whole plan fell back to a grid.
    """
    chart = build_chart([
        {'Phase': 'Discovery', 'Months': '2026/05', 'Focus': 'Requirements'},
        {'Phase': 'Build', 'Months': '2026/06 - 2026/08', 'Focus': 'Core dev'},
        {'Phase': 'UAT', 'Months': '2026/09', 'Focus': 'Acceptance'},
    ])
    assert chart is not None and chart.kind == 'phases'
    build = next(bar for bar in chart.bars if bar.label == 'Build')
    assert (build.start.month, build.end.month) == (6, 8)


def test_an_iso_month_is_not_split_on_its_own_hyphen():
    """`2026-05` spells ONE month with the same character a range uses.

    The hyphen counts only with whitespace around it, which is what keeps this
    cell from being read as two unparseable halves.
    """
    chart = build_chart([
        {'Phase': 'A', 'Months': '2026-05', 'Focus': 'x'},
        {'Phase': 'B', 'Months': '2026-06', 'Focus': 'y'},
    ])
    assert chart is not None
    first = chart.bars[0]
    assert (first.start.year, first.start.month) == (2026, 5)
    assert first.start == first.end


def test_a_short_first_row_does_not_delete_a_column_from_the_whole_table():
    """One missing trailing cell used to cost every row its detail column.

    Rows arrive as `dict(zip(headers, cells))`, so a row one cell short lacks
    that key entirely; reading the column set off row 0 alone made the table's
    last column invisible and every bar borrowed the Duration column instead.
    """
    chart = build_chart([
        {'Phase': 'Discovery', 'Duration': '1 month', 'Months': '2026/05'},
        {'Phase': 'Build', 'Duration': '1 month', 'Months': '2026/06',
         'Focus': 'Core dev work here'},
        {'Phase': 'Test', 'Duration': '1 month', 'Months': '2026/07',
         'Focus': 'QA and UAT'},
    ])
    assert chart is not None and chart.detail_label == 'Focus'
    assert [bar.detail for bar in chart.bars] == ['', 'Core dev work here', 'QA and UAT']


def test_a_resource_matrix_that_skips_a_month_stays_aligned_to_its_axis():
    """The axis is gap-filled; the row values must be indexed the same way.

    A role with no effort in one month is authored by omitting the column. The
    values were built from the columns PRESENT, so the drawing code's
    `zip(axis.months, values)` slid every later figure one month early and
    dropped the last one — a staffing chart with wrong numbers and no error.
    """
    chart = build_chart([
        {'Position': 'PSM', '2026/05': '1.00', '2026/07': '0.50', '2026/09': '1.00'},
        {'Position': 'Dev', '2026/05': '2.00', '2026/07': '2.00', '2026/09': '1.00'},
    ])
    assert chart is not None and chart.kind == 'resources'
    assert len(chart.months) == 5, 'May through September, gaps filled'
    for _, values in chart.rows:
        assert len(values) == len(chart.months)
    psm = dict(zip([(m.year, m.month) for m in chart.months], chart.rows[0][1]))
    assert psm[(2026, 7)] == 0.5, 'July keeps its own figure'
    assert psm[(2026, 9)] == 1.0, 'the last month is not dropped'
    assert psm[(2026, 6)] is None and psm[(2026, 8)] is None
