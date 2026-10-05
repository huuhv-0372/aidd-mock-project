"""The schedule charts as they reach a slide — shapes, not just a model.

`test_schedule_timelines.py` pins the READING (which table is which chart);
this pins the DRAWING: that a schedule chapter's three tables come out as the
template's own timeline designs instead of grids, that every row of the source
survives into the picture, and that an ordinary table still gets a grid.
"""
from __future__ import annotations

import pytest

pytest.importorskip('pptx')

from lib.profile_parser import parse_profile  # noqa: E402
from lib.renderer import PPTXRenderer  # noqa: E402
from lib.timeline_data import build_chart  # noqa: E402
from lib.timeline_layouts import draw_chart_in_box  # noqa: E402

DOC = '''# Proposal

## Agenda

1. Implementation Schedule

## 8. Implementation Schedule

Six one-month phases from May to October 2026.

### 8.1. Phase overview

| Phase | Duration | Months | Focus |
|---|---|---|---|
| Ramp-up | 1 month | 2026/05 | Spec refinement, architecture, contract |
| Core Development | 1 month | 2026/06 | API foundation, home and profile screens |
| Peak Development | 1 month | 2026/07 | All metric screens, data pipeline |
| Stabilization | 1 month | 2026/08 | Bug fix, deep QA regression, release docs |

### 8.2. Resource plan

| # | Position | 2026/05 | 2026/06 | 2026/07 | 2026/08 | Total (MM) |
|---|---|---|---|---|---|---|
| 1 | Project Success Manager | 1.00 | 1.50 | 1.50 | 1.00 | 5.00 |
| 2 | Lead QA | 0.50 | 1.00 | 1.50 | 1.50 | 4.50 |
| | **Monthly total** | **1.50** | **2.50** | **3.00** | **2.50** | **9.50** |

### 8.3. Key milestones

| Milestone | Target date | Exit criterion |
|---|---|---|
| Kick-off | 2026/05/01 | Contract signed, team assigned |
| Spec lock | 2026/05/31 | Specs signed off by the client |
| Feature complete | 2026/07/31 | All screens working on real hardware |
| Handover | 2026/08/30 | All deliverables signed off |
'''


@pytest.fixture(scope='module')
def deck(tmp_path_factory, template_path):
    from pptx import Presentation

    profile = parse_profile(DOC)
    out = PPTXRenderer().render_from_profile(
        profile, str(template_path), 'timelines',
        str(tmp_path_factory.mktemp('timelines')),
        extra_slides=list(profile.auto_extra_slides))
    return Presentation(str(out))


def _walk(shapes):
    for shape in shapes:
        yield shape
        if 'GROUP' in str(shape.shape_type):
            yield from _walk(shape.shapes)


def _said_on(slide) -> str:
    """Everything the slide says — shapes AND table cells."""
    parts = []
    for shape in _walk(slide.shapes):
        if shape.has_text_frame:
            parts.append(shape.text_frame.text)
        if shape.has_table:
            parts += [cell.text for row in shape.table.rows for cell in row.cells]
    return ' '.join(parts)


def _slide_holding(deck, needle: str):
    for slide in deck.slides:
        if needle in _said_on(slide):
            return slide
    pytest.fail(f'no slide says {needle!r}')


def test_the_phase_table_becomes_a_band_of_phases_not_a_grid(deck):
    slide = _slide_holding(deck, 'Ramp-up')
    assert not any(shape.has_table for shape in _walk(slide.shapes)), \
        'the phases are drawn, not tabulated'
    said = ' '.join(shape.text_frame.text for shape in _walk(slide.shapes)
                    if shape.has_text_frame)
    for phase in ('Ramp-up', 'Core Development', 'Peak Development', 'Stabilization'):
        assert phase in said, phase
    # The axis names every month the phases cover.
    assert '2026/05' in said and '08' in said


def test_the_resource_matrix_becomes_lanes_and_a_totals_band(deck):
    slide = _slide_holding(deck, 'Project Success Manager')
    assert not any(shape.has_table for shape in _walk(slide.shapes))
    said = ' '.join(shape.text_frame.text for shape in _walk(slide.shapes)
                    if shape.has_text_frame)
    assert 'Monthly total' in said, 'the totals row keeps its own band'
    assert '· 5' in said, "a role's own total rides on its name"
    for effort in ('1.5', '0.5', '3'):
        assert effort in said, effort


def test_the_milestones_become_a_dated_timeline(deck):
    slide = _slide_holding(deck, 'Kick-off')
    said = ' '.join(shape.text_frame.text for shape in _walk(slide.shapes)
                    if shape.has_text_frame)
    assert '05/01' in said and '08/30' in said, 'each marker keeps its date'
    for criterion in ('Contract signed', 'All deliverables signed off'):
        assert criterion in said, criterion


def test_nothing_from_the_source_is_lost_to_the_picture(deck):
    """A chart may reshape a table; it may not quietly drop a row of it."""
    slide = _slide_holding(deck, 'Ramp-up')
    said = ' '.join(shape.text_frame.text for shape in _walk(slide.shapes)
                    if shape.has_text_frame)
    for focus in ('Spec refinement', 'API foundation', 'metric screens', 'deep QA'):
        assert focus in said, focus


def test_an_ordinary_table_is_still_drawn_as_a_table(tmp_path, template_path):
    """The refusal, end to end: a chapter of choices keeps its grid.

    Same appendix path the phase table takes — so what decides is the CONTENT,
    not which route the chapter travelled.
    """
    from pptx import Presentation

    doc = '''# Proposal

## Agenda

1. Component choices

## 12. Component choices

| Component | Choice | Why |
|---|---|---|
| Mobile | React Native | One codebase for both platforms |
| Backend | NestJS | Team familiarity |
| Cache | Valkey | Managed service |
'''
    profile = parse_profile(doc)
    out = PPTXRenderer().render_from_profile(
        profile, str(template_path), 'plain', str(tmp_path),
        extra_slides=list(profile.auto_extra_slides))
    slide = _slide_holding(Presentation(str(out)), 'React Native')
    assert any(shape.has_table for shape in _walk(slide.shapes)), \
        'nothing about this chapter is a timeline'


def test_a_chart_drawn_in_a_small_box_stays_inside_it(template_path):
    """The box belongs to the caller; the chart may not spill out of it."""
    from pptx import Presentation
    from pptx.util import Emu

    prs = Presentation(str(template_path))
    slide = prs.slides[0]
    before = len(slide.shapes._spTree)
    chart = build_chart([
        {'Phase': 'Ramp-up', 'Months': '2026/05', 'Focus': 'Spec refinement'},
        {'Phase': 'Build', 'Months': '2026/06', 'Focus': 'Implementation'},
    ])
    left, top, width, height = Emu(457200), Emu(1828800), Emu(8229600), Emu(1371600)
    draw_chart_in_box(slide, left, top, width, height, chart)
    drawn = [shape for shape in slide.shapes][before - 1:]
    assert drawn, 'the chart drew something'
    for shape in drawn:
        assert shape.left >= left - 1
        assert shape.top >= top - 1
        assert shape.left + shape.width <= left + width + 1, shape.name
        assert shape.top + shape.height <= top + height + 1, shape.name


GANTT_PLUS_SECOND_TABLE = """---
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
| ▲要件定義完了 | マイルストーン | 2027/03 | 2027/03 |

主要マイルストーンは以下の通りです。

| マイルストーン | 目標日 | 完了条件 |
|---|---|---|
| 要件確定 | 2026/10/31 | 貴社承認 |
| UAT開始 | 2027/02/01 | テスト環境提供 |

### 提出物

| 工程 | 成果物 |
|---|---|
| 要件定義 | 要件定義書 |
"""


def test_the_gantt_table_is_not_re_printed_beside_the_gantt_it_became(
        template_path, tmp_path):
    """A schedule chapter places TWO tables, and only one leaves rows behind.

    The `工程|担当|開始|終了` table becomes bars drawn inside slide 43's own
    frame, so nothing in the section still holds its rows to match against. The
    surplus router therefore called it unplaced and gave it a second slide — the
    whole schedule printed twice, on consecutive pages. The OTHER table is a
    real surplus and must still get its slide.
    """
    from pptx import Presentation

    profile = parse_profile(GANTT_PLUS_SECOND_TABLE)
    assert profile.schedule.gantt_rows, 'the fixture must produce a Gantt'

    # Judged by the ROWS an extra slide carries, not by its title: the title
    # comes from the `###` heading both tables sit under, so it cannot tell the
    # duplicate from the legitimate one.
    gantt_tasks = {row['task'] for row in profile.schedule.gantt_rows}
    for entry in profile.auto_extra_slides:
        printed = {cell for row in entry.get('rows') or [] for cell in row}
        assert not (printed & gantt_tasks), (
            f"extra slide {entry.get('title')!r} re-prints the Gantt's own rows")

    out = PPTXRenderer().render_from_profile(
        profile, str(template_path), 'gantt-plus-table', str(tmp_path),
        extra_slides=list(profile.auto_extra_slides))
    texts = []
    for slide in Presentation(str(out)).slides:
        for shape in slide.shapes:
            if shape.has_text_frame and shape.text_frame.text.strip():
                texts.append(' '.join(shape.text_frame.text.split()))
            if getattr(shape, 'has_table', False) and shape.has_table:
                for row in shape.table.rows:
                    texts.extend(' '.join(c.text.split()) for c in row.cells)
    assert texts.count('P1 要件定義') == 1, (
        'a phase name appears twice — the schedule was drawn on two slides')
    # The milestone table is itself a schedule, so its own slide draws it as a
    # milestone chart — the label carries its date, hence the substring test.
    assert any('要件確定' in text for text in texts), 'the second table lost its slide'
