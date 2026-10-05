"""Condensing: shape text to the box, never cut a sentence, never invent one.

The condenser is the tier the pipeline was missing — the one that decides what a
fixed-size box actually says, instead of pouring a chapter in until it is full.
These tests pin the two rules it may never break, and the order it steps down
through when the full text will not fit.
"""
from __future__ import annotations

from lib.content_condenser import (
    DEFAULT_BULLET,
    condense,
    count_items,
    describe,
    emitted_items,
    split_headline,
)
from lib.markdown_primitives import parse_prose, promote_lists_to_paragraphs

# A generous budget: everything fits, nothing should be touched.
ROOMY = dict(max_chars=10_000, chars_per_line=200, max_lines=100)
# The slide-4 left column, roughly: ~49 latin chars a line, 15 lines.
SLIDE4 = dict(max_chars=735, chars_per_line=49, max_lines=15)


def test_text_that_fits_is_returned_untouched():
    text = 'One short paragraph.\n\nAnd a second one.'
    assert condense(text, **ROOMY) == text


def test_empty_in_empty_out():
    assert condense('', **ROOMY) == ''
    assert condense('   ', **ROOMY) == ''


def test_condensing_only_ever_selects_never_invents():
    """Every word out came in. The condenser is not a summarizer."""
    items = [f'Point number {i} says something specific and verifiable.' for i in range(1, 9)]
    text = '\n\n'.join(items)
    out = condense(text, max_chars=200, chars_per_line=40, max_lines=4)
    body = out.replace(DEFAULT_BULLET, '')
    for line in body.split('\n'):
        if line.strip():
            assert line.strip() in text, f'invented text: {line!r}'


def test_multiple_points_become_bullets():
    text = '\n\n'.join(f'Point {i} is here and it runs on for a while.' for i in range(1, 7))
    out = condense(text, max_chars=300, chars_per_line=45, max_lines=6)
    assert out.startswith(DEFAULT_BULLET)
    assert out.count(DEFAULT_BULLET) >= 2


def test_a_single_paragraph_is_never_bulleted():
    """A list of one reads as a mistake."""
    text = ' '.join(['This is one long flowing paragraph with no breaks in it.'] * 12)
    out = condense(text, max_chars=120, chars_per_line=40, max_lines=3)
    assert DEFAULT_BULLET not in out


def test_a_sentence_is_never_cut_in_half():
    """The rule that outranks fitting: no clause ends mid-thought."""
    text = '\n\n'.join([
        'First sentence is complete. Second sentence of the first point is here.',
        'Second point is also a whole sentence that ends properly.',
        'Third point likewise ends with a full stop.',
    ])
    out = condense(text, max_chars=90, chars_per_line=30, max_lines=3)
    assert '…' not in out
    for line in out.split('\n'):
        stripped = line.replace(DEFAULT_BULLET, '').strip()
        if stripped:
            assert stripped[-1] in '.。．!?！？:', f'cut mid-sentence: {stripped!r}'


def test_first_sentences_are_tried_before_points_are_dropped():
    """Shortening every point beats losing one."""
    text = '\n\n'.join(
        f'Point {i} headline. Point {i} has a much longer elaboration that follows it.'
        for i in range(1, 5)
    )
    out = condense(text, max_chars=200, chars_per_line=45, max_lines=4)
    assert out.count(DEFAULT_BULLET) == 4, 'all four points should survive as headlines'
    assert 'much longer elaboration' not in out


def test_an_impossible_budget_returns_a_whole_sentence_not_a_fragment():
    text = 'A sentence far longer than the box will ever hold, complete and unbroken.'
    out = condense(text, max_chars=10, chars_per_line=5, max_lines=1)
    assert out.strip().endswith('.')
    assert '…' not in out


def test_raw_and_emitted_counts_are_measured_separately():
    """This is what lets the renderer say how many points did not fit.

    Raw chapter text separates its points with blank lines; a condensed result
    separates them with single newlines. One function guessing between the two
    got the count wrong the moment the glyph changed — which it does, because a
    box that bullets its own paragraphs is handed no glyph at all.
    """
    raw = '\n\n'.join(f'Point {i}.' for i in range(1, 7))
    assert count_items(raw) == 6
    assert emitted_items('\n'.join(f'{DEFAULT_BULLET}Point {i}.' for i in range(1, 5))) == 4
    assert emitted_items('\n'.join(f'Point {i}.' for i in range(1, 5))) == 4, 'no glyph'
    assert count_items('') == 0 and emitted_items('') == 0


def test_promoted_list_items_survive_parse_prose():
    """The loss this phase fixes: a chapter's numbered points were discarded."""
    chapter = (
        'Concrete success indicators:\n'
        '\n'
        '1. Data from all ring sensors is received without loss.\n'
        '2. BLE connectivity is stable under realistic daily usage.\n'
        '3. All algorithms produce the expected output.\n'
    )
    assert 'all ring sensors' not in parse_prose(chapter), 'baseline: prose drops list items'
    promoted = parse_prose(promote_lists_to_paragraphs(chapter))
    assert 'all ring sensors' in promoted
    assert 'BLE connectivity' in promoted
    assert count_items(promoted) == 4, 'lead-in plus three indicators'


def test_a_flattened_table_row_shortens_to_its_label():
    """`label — elaboration` has no full stop; the dash is the headline boundary."""
    rows = '\n\n'.join([
        'Integration unverified — Firmware and app must be proven together at throughput',
        'Throughput pipeline — 200 Hz multi-sensor needs a tuned ingestion path',
        'Wellness positioning — GDPR-equivalent protection but not HIPAA certification',
    ])
    out = condense(rows, max_chars=180, chars_per_line=40, max_lines=3)
    assert out.count(DEFAULT_BULLET) == 3, 'no row should be dropped'
    assert 'Integration unverified' in out
    assert 'Firmware and app must be proven' not in out


def test_describe_never_rounds_a_loss_up_to_a_success():
    """The log line is the only account of what the slide stopped saying."""
    original = '\n\n'.join([
        'Point one — with an elaboration after the dash',
        'Point two — with an elaboration after the dash',
    ])
    reflowed = '\n'.join(f'{DEFAULT_BULLET}{p}' for p in original.split('\n\n'))
    assert 'in full' in describe(original, reflowed)

    trimmed = '\n'.join([f'{DEFAULT_BULLET}Point one', f'{DEFAULT_BULLET}Point two'])
    phrase = describe(original, trimmed)
    assert 'trimmed to headlines' in phrase
    assert 'in full' not in phrase, 'trimming detail must never read as lossless'

    dropped = f'{DEFAULT_BULLET}Point one'
    phrase = describe(original, dropped)
    assert '1 left off this slide' in phrase


def test_promotion_leaves_tables_and_image_refs_alone():
    """`parse_table` and `parse_image_ref` must still see the shapes they read."""
    content = '| A | B |\n|---|---|\n| 1 | 2 |\n\nImage: diagram.png\n\n- a bullet\n'
    out = promote_lists_to_paragraphs(content)
    assert '| A | B |' in out
    assert 'Image: diagram.png' in out
    assert '- a bullet' not in out and 'a bullet' in out


def test_a_dash_inside_a_sentence_is_not_a_headline_boundary():
    """Splitting there left the card's body starting `it is` — a broken sentence."""
    text = ('Sun* applies Claude Code and the Claude API across the lifecycle: '
            'This is not "AI assistance" — it is a default workflow with review gates. '
            'It delivers measurable effort reduction.')
    headline, body = split_headline(text)
    assert headline == ('Sun* applies Claude Code and the Claude API across the lifecycle')
    assert body.startswith('This is not "AI assistance"')
    assert body[0].isupper(), 'a card body must open a sentence, not continue one'


def test_a_colon_hands_the_headline_over_where_the_author_did():
    headline, body = split_headline('Two delivery options: Option A is fixed scope.')
    assert headline == 'Two delivery options'
    assert body == 'Option A is fixed scope.'


def test_a_colon_inside_a_sentence_keeps_the_sentence_whole():
    """`Note: 0.5 metres` continues in lower case — there is no label there."""
    headline, body = split_headline('Note: 0.5 metres of clearance. And a second sentence.')
    assert headline == 'Note: 0.5 metres of clearance.'
    assert body == 'And a second sentence.'


def test_a_labelled_table_row_still_splits_at_its_dash():
    headline, body = split_headline('Integration unverified — Firmware must be proven')
    assert headline == 'Integration unverified'
    assert body == 'Firmware must be proven'
