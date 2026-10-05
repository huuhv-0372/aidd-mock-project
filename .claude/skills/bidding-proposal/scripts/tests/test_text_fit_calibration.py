"""Body-text fit: capacity measured in the text's own script, remainder-only overflow.

Companion to `test_cover_fit_calibration.py`, which pins the cover's width model.
This file pins what the BODY boxes do with that same model: a latin paragraph is
not cut at a CJK-width ceiling, and when a cut is genuinely needed the appendix
slide carries what was left behind rather than a copy of what was kept.
"""
from __future__ import annotations

import pytest

pytest.importorskip('pptx')

from lib.renderer import PPTXRenderer  # noqa: E402


class _Box:
    """Minimal stand-in for a pptx shape: the renderer only reads width/height."""

    _EMU = 914400

    def __init__(self, w_inch: float, h_inch: float):
        self.width = int(w_inch * self._EMU)
        self.height = int(h_inch * self._EMU)


# The slide-4 left column (`現状の課題` body, Google Shape;762;p4), read off the
# shipped template. Every number below is that box.
SLIDE4_BODY = (4.15, 2.99)
BODY_PT = 10

# The paragraph that used to be cut here: §1.1 of the Heathring proposal, 451
# latin characters. It overflowed a 435-character CJK-width ceiling by 16 and
# lost its closing 131-character sentence to an appendix slide that then
# reprinted the other 320.
LATIN_451 = (
    'Evering is developing a smart wellness ring that measures a broad spectrum of '
    'physiological signals through multiple on-device sensors (PPG, thermistor, '
    'accelerometer, etc.). The ring produces high-throughput sensor data (>200 Hz '
    'across multiple streams), which is an order of magnitude above typical consumer '
    'wearables. To validate end-to-end data flow prior to a public consumer release, '
    'Evering requires a companion smartphone application that can:'
)


def test_em_width_rule_is_shared_with_the_cover_model():
    """One definition of character width, used by cover fit and body fit alike."""
    assert PPTXRenderer._em_width('あ') == 1.0
    assert PPTXRenderer._em_width('a') == PPTXRenderer._LATIN_EM_WIDTH
    # _text_width_in is the cover's model; it must now be _em_width summed.
    text = 'Sun* あ'
    expected = sum(PPTXRenderer._em_width(c) for c in text) * 24 / 72
    assert PPTXRenderer._text_width_in(text, 24) == pytest.approx(expected)


def test_unsampled_estimate_keeps_the_historical_cjk_behaviour():
    """An `_estimate_max_chars` call with no sample measures as it always did.

    This is what keeps every untouched caller — and every Japanese deck — on
    exactly the numbers they rendered before the script-aware model existed.
    """
    r = PPTXRenderer()
    box = _Box(*SLIDE4_BODY)
    assert r._avg_em_width('') == 1.0
    assert r._estimate_max_chars(box, font_pt=BODY_PT) == 435


def test_latin_sample_reports_the_capacity_the_box_really_has():
    """Latin sets ~0.6em, so the same box holds ~1.7x what the CJK model said."""
    r = PPTXRenderer()
    box = _Box(*SLIDE4_BODY)
    cjk_only = r._estimate_max_chars(box, font_pt=BODY_PT)
    latin = r._estimate_max_chars(box, font_pt=BODY_PT, sample=LATIN_451)
    assert latin > cjk_only
    assert latin >= len(LATIN_451), 'the paragraph that was being cut must now fit'


def test_the_451_char_paragraph_is_no_longer_truncated():
    """The regression this phase exists to kill, stated as one assertion."""
    r = PPTXRenderer()
    role = _role('current_issues', 'project_background.current_issues')
    kept, truncated = r._fit_text_to_shape(_Box(*SLIDE4_BODY), LATIN_451, role)
    assert not truncated
    assert kept == LATIN_451
    assert r._overflow_extras == {}, 'no appendix slide should have been queued'


def test_lines_are_counted_per_paragraph_not_as_one_run():
    """Three short paragraphs occupy three lines, not the one their length implies."""
    assert PPTXRenderer._lines_needed('a' * 30, 30) == 1
    assert PPTXRenderer._lines_needed('aaa\n\nbbb\n\nccc', 30) == 3
    assert PPTXRenderer._lines_needed('', 30) == 1


def test_split_returns_the_remainder_not_the_whole_text():
    """`kept` + `rest` reconstruct the source; `rest` never repeats `kept`."""
    text = 'First sentence here. Second sentence here. Third sentence here.'
    kept, rest = PPTXRenderer._split_at_sentence(text, max_chars=45)
    assert kept == 'First sentence here. Second sentence here.'
    assert rest == 'Third sentence here.'
    assert kept not in rest
    # The kept half is exactly what the old single-value helper still returns.
    assert PPTXRenderer._truncate_at_sentence(text, max_chars=45) == kept


def test_short_text_splits_to_no_remainder():
    assert PPTXRenderer._split_at_sentence('short', max_chars=99) == ('short', '')


def test_hard_cut_still_reconstructs_the_source():
    """No sentence boundary in budget: `kept` carries the ellipsis, `rest` the tail."""
    text = 'x' * 100
    kept, rest = PPTXRenderer._split_at_sentence(text, max_chars=40)
    assert kept == 'x' * 40 + '…'
    assert rest == 'x' * 60


def test_small_remainder_keeps_the_full_text_where_autofit_can_absorb_it():
    """A trailing sentence is not worth a slide — and dropping it is not on offer."""
    r = PPTXRenderer()
    role = _role('current_issues', 'project_background.current_issues')
    # 20 sentences of CJK: far past the box, but the split leaves a short tail.
    text = 'これはとても長い日本語の文章です。' * 20
    box = _Box(4.15, 0.8)
    kept, truncated = r._fit_text_to_shape(box, text, role)
    if not truncated:
        assert kept == text
        assert r._overflow_extras == {}


# Distinct sentences, so "did the remainder repeat the kept half" is a question
# about the split rather than about repeated wording.
NUMBERED_SENTENCES = ' '.join(
    f'This is distinct sentence number {i:02d} of the sample paragraph.'
    for i in range(1, 41)
)


def test_overflow_queue_holds_the_remainder_only():
    """The appendix slide must not reprint what the slide above it already said."""
    r = PPTXRenderer()
    role = _role('current_issues', 'project_background.current_issues')
    kept, truncated = r._fit_text_to_shape(_Box(4.15, 1.0), NUMBERED_SENTENCES, role)
    assert truncated
    queued = r._overflow_extras[('project_background', 'current_issues')]
    assert len(queued) == 1
    # Each entry carries the template slide that could not hold the text, so a
    # remainder from a slide the prune pass drops can be dropped with it.
    slide_num, rest = queued[0]
    assert slide_num == r._filling_slide_num
    assert len(rest) >= PPTXRenderer._MIN_OVERFLOW_APPENDIX_CHARS
    # The two halves partition the source: no sentence is on both slides, and
    # none is lost between them.
    assert kept + ' ' + rest == NUMBERED_SENTENCES
    assert 'sentence number 01' in kept and 'sentence number 01' not in rest
    assert 'sentence number 40' in rest and 'sentence number 40' not in kept


def test_compound_bodies_never_rely_on_autofit():
    """Compound cells have no autofit net, so they truncate-and-queue instead.

    The template's compound cells carry ~0.23" of inset against boxes as short
    as 0.13"; normAutofit goes negative there and some renderers shrink the text
    to invisibility. `can_autofit=False` is what keeps the sentence recoverable.
    """
    r = PPTXRenderer()
    role = _role('benefits', 'benefits.items')
    kept, truncated = r._fit_text_to_shape(
        _Box(4.15, 1.0), NUMBERED_SENTENCES, role, can_autofit=False)
    assert truncated
    assert kept != NUMBERED_SENTENCES
    assert r._overflow_extras, 'the remainder must be recoverable from an appendix slide'


def _role(name: str, source_path: str):
    from lib.templates.base import ContentKind, ShapeFindStrategy, ShapeRole
    return ShapeRole(
        name=name, cardinality=1, kind=ContentKind.TEXT, source_path=source_path,
        find_strategy=ShapeFindStrategy.BY_INDEX, find_params={'index': 0},
    )
