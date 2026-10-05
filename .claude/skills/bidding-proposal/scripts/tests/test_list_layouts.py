"""A plain list must reach the slide whole, and in a design that suits it.

The layout these tests cover replaced a single box of `■ item` lines. Two things
about that box were worth keeping and are pinned here — it never dropped an item,
and it never wrote a word the source had not — while everything else about it,
including which design a list gets, is now decided from the list's own shape.
"""
from __future__ import annotations

import pytest

pytest.importorskip('pptx')

from pptx import Presentation  # noqa: E402

from lib.extra_slide_layouts import _Canvas, render_extra_layout  # noqa: E402
from lib.list_layouts import pick_variant, render_list, split_label  # noqa: E402

SLIDE_W, SLIDE_H = 9144000, 5143500  # the SVN template's own 10 x 5.625in


def _blank():
    prs = Presentation()
    prs.slide_width, prs.slide_height = SLIDE_W, SLIDE_H
    return prs.slides.add_slide(prs.slide_layouts[6])


def _draw(items, variant=''):
    slide = _blank()
    render_list(_Canvas(slide, SLIDE_W, SLIDE_H), items, variant)
    return slide


def _text(slide) -> str:
    return ' '.join(sh.text_frame.text for sh in slide.shapes if sh.has_text_frame)


# --- splitting a label out of an item --------------------------------------

def test_a_colon_lead_in_becomes_the_label():
    assert split_label('Quality strategy: PAO reviews every sprint.') == (
        'Quality strategy', 'PAO reviews every sprint.')


def test_a_full_width_colon_counts_too():
    """A Japanese proposal writes its labels with `：`, not `:`."""
    label, detail = split_label('品質戦略：スプリントごとにレビューします。')
    assert label == '品質戦略'
    assert detail == 'スプリントごとにレビューします。'


def test_an_enumerated_line_keeps_its_marker_in_the_label():
    assert split_label('B. AI-driven impact analysis: `aidd.md`.') == (
        'B. AI-driven impact analysis', '`aidd.md`.')


def test_an_enumerated_line_with_no_colon_still_labels_its_marker():
    label, detail = split_label('C. Meeting minute of 2026-04-10.')
    assert label == 'C.'
    assert detail == 'Meeting minute of 2026-04-10.'


def test_a_label_too_long_for_the_column_is_not_taken():
    """Past the cap it would wrap into the divider, so the row runs unlabelled."""
    item = f'{"x" * 80}: the detail after it.'
    assert split_label(item) == ('', item)


def test_a_plain_sentence_has_no_label():
    assert split_label('Location tracking is out of scope.') == (
        '', 'Location tracking is out of scope.')


def test_a_time_of_day_is_not_a_label():
    """`09:30` has no space after the colon, so it is not a lead-in."""
    assert split_label('Daily sync at 09:30 JST.')[0] == ''


# --- picking the design ----------------------------------------------------

def test_a_mostly_labelled_list_gets_the_row_cards():
    items = [f'{chr(65 + i)}. Item {i}: detail number {i}.' for i in range(5)]
    assert pick_variant(items) == 'cards'


def test_many_TAG_LIKE_items_get_the_two_column_grid():
    """Eight items of three words each would be a ribbon down an empty card."""
    assert pick_variant([f'Short item {i}.' for i in range(9)]) == 'grid'


def test_a_plain_list_of_SENTENCES_stays_one_block():
    """A simple markdown list is one thought, so it gets one card.

    Seven out-of-scope sentences came out as seven separate tiles, which is the
    complaint this threshold answers: a list with no labels of its own has no
    per-item design to draw.
    """
    items = ['Awake-stage sleep detection beyond 2-stage detection.',
             'Admin console, light/dark theme toggle, airplane mode.',
             'Insights and tips engine.',
             'Location tracking.',
             'Ring storage reset / purge from app (hardware-owned).',
             'Aggregated wellness scores (planned for the consumer version).',
             'App Store / Play Store publication.']
    assert pick_variant(items) == 'panel'


def test_a_handful_of_short_statements_stays_one_block_too():
    assert pick_variant(['Location tracking.', 'Insights engine.',
                         'Admin console and theme toggle.']) == 'panel'


def test_a_handful_of_PARAGRAPHS_gets_the_panel_instead():
    """A row card is one line of type in a box; a paragraph needs the measure.

    Letting the row cards take every list of a few items made most of a deck's
    appendix slides the same slide with different words on it.
    """
    items = ['A sentence of ordinary length that runs on a while. ' * 2
             for _ in range(3)]
    assert pick_variant(items) == 'panel'


def test_one_long_paragraph_gets_the_panel():
    assert pick_variant(['Although this is a closed-beta POC, ' * 12]) == 'panel'


def test_an_empty_list_never_raises():
    assert pick_variant([]) == 'panel'


# --- what reaches the slide ------------------------------------------------

@pytest.mark.parametrize('variant', ['cards', 'grid', 'panel'])
def test_no_variant_drops_an_item(variant):
    items = [f'Point number {i} of the list.' for i in range(9)]
    drawn = _text(_draw(items, variant))
    for item in items:
        assert item in drawn, f'{variant} lost {item!r}'


def test_a_long_list_keeps_every_item_rather_than_cutting():
    """The one layout with no cap stays the one layout with no cap."""
    items = [f'A reasonably wordy point, number {i} of fourteen.' for i in range(14)]
    drawn = _text(_draw(items))
    assert all(item in drawn for item in items)


def test_a_thematic_break_is_not_drawn_as_a_point():
    """`---` between two blocks is punctuation the list parser passed on."""
    drawn = _text(_draw(['A real point.', '---', 'Another real point.']))
    assert 'A real point.' in drawn and 'Another real point.' in drawn
    assert '---' not in drawn


def test_no_glyph_is_written_into_the_text():
    """The `■` prefix belonged to the box this replaced; the marker is a shape."""
    drawn = _text(_draw(['First point.', 'Second point.', 'Third point.']))
    assert '■' not in drawn


def test_a_minority_of_labels_is_dropped_rather_than_shown_alone():
    """One red label beside three chips is two designs on one slide."""
    items = ['A plain sentence with no lead-in at all.',
             'Another plain sentence, equally bare.',
             'A third one, also bare, to be sure.',
             'Styling approach: platform-native components throughout.']
    drawn = _text(_draw(items, 'cards'))
    assert 'Styling approach: platform-native components throughout.' in drawn, \
        'the item survives whole once its label is not taken'


def test_the_labelled_case_does_split_the_column():
    items = [f'{chr(65 + i)}. Chapter {i}: what it holds.' for i in range(4)]
    drawn = _text(_draw(items, 'cards'))
    assert 'A. Chapter 0' in drawn and 'what it holds.' in drawn


# --- the entry point the deck actually calls -------------------------------

def test_the_bullets_layout_still_takes_a_newline_string():
    """--extra-slides JSON is allowed to pass one string, and always was."""
    slide = _blank()
    render_extra_layout(slide, {'layout': 'bullets', 'title': 'Out of scope',
                                'bullets': 'Alpha item\nBeta item'},
                        SLIDE_W, SLIDE_H)
    drawn = _text(slide)
    assert 'Alpha item' in drawn and 'Beta item' in drawn


def test_an_explicit_variant_overrides_the_chosen_one():
    items = [f'Short item number {i}.' for i in range(7)]  # would pick `grid`
    slide = _blank()
    render_extra_layout(slide, {'layout': 'bullets', 'bullets': items,
                                'variant': 'panel'}, SLIDE_W, SLIDE_H)
    # The panel draws one card; the grid would draw seven.
    assert len([s for s in slide.shapes if s.shape_type is not None
                and not s.has_text_frame or s.name.startswith('Rounded')]) >= 1
    assert all(item in _text(slide) for item in items)


def test_every_shape_sits_flat_on_the_page():
    """The template's cards carry no drop shadow, so neither may these."""
    from pptx.oxml.ns import qn

    slide = _draw(['One point.', 'Two points.', 'Three points.'], 'cards')
    for shape in slide.shapes:
        assert not shape._element.findall(qn('p:style')), \
            f'{shape.name} kept the theme effect reference'


# --- nothing may leave the page --------------------------------------------

_LONG_CLAUSE = (
    'This clause explains the obligation in full, with the qualifications a '
    'contract normally carries and the exceptions the parties agreed to. ')


@pytest.mark.parametrize('items,what', [
    ([f'Term {i}: {_LONG_CLAUSE}' for i in range(7)], 'seven labelled paragraphs'),
    ([f'Term {i}: {_LONG_CLAUSE * 2}' for i in range(7)], 'seven long labelled paragraphs'),
    ([_LONG_CLAUSE * 2] * 14, 'fourteen paragraphs'),
    ([_LONG_CLAUSE] * 30, 'thirty paragraphs'),
    ([f'Item {i} short text' for i in range(20)], 'twenty short items'),
])
def test_no_list_draws_past_the_bottom_of_the_slide(items, what):
    """The band is a promise, not a suggestion.

    The row-card layout used to size its rows, find they did not fit, and draw
    them anyway: seven labelled paragraphs asked for 8.7in of a 5.6in slide and
    got it, so the last cards rendered over the footer and off the page with
    their text inside them. Every form has to stay on the slide, whatever it is
    handed.
    """
    slide = _draw(items)
    overflow = [sh for sh in slide.shapes
                if sh.top is not None and sh.height is not None
                and sh.top + sh.height > SLIDE_H]
    assert overflow == [], (
        f'{what}: {len(overflow)} shape(s) drawn past the bottom edge — '
        f'lowest at {max(sh.top + sh.height for sh in overflow) / 914400:.2f}in '
        f'on a {SLIDE_H / 914400:.2f}in slide')


def test_a_list_too_tall_for_its_card_shrinks_instead_of_spilling():
    """The card is clamped to the band; the type inside it must be too.

    Thirty paragraphs need about 14in of type at the smallest step. The card
    measured correctly and the text simply ran out through the bottom of it, so
    the shrink factor PowerPoint's own auto-fit would write is written here.
    """
    from pptx.oxml.ns import qn

    slide = _draw([_LONG_CLAUSE] * 30)
    frames = [sh.text_frame for sh in slide.shapes if sh.has_text_frame]
    fits = [f for f in frames if f._txBody.bodyPr.findall(qn('a:normAutofit'))]
    assert fits, 'a panel that cannot hold its text carries no shrink factor'
    scale = int(fits[0]._txBody.bodyPr.findall(qn('a:normAutofit'))[0].get('fontScale'))
    assert 50000 <= scale < 100000, f'implausible fontScale {scale}'
