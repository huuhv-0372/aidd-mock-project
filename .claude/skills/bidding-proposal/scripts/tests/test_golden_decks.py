"""Golden decks — every fixture's rendered output, pinned slide by slide.

The unit tests each pin one rule. This file pins the RESULT: what the deck says
and how many slides it takes. It is the only thing that can catch a change whose
effect nobody predicted — including the invariant this whole body of work rests
on, that a document without front matter (the shape `gen-md.py` emits, i.e. the
Clio path) renders exactly as it did before any of it.

A red test here is not a failing assertion to be silenced. It is a diff of what
a client would see. Read it, decide whether you meant it, and only then run
`python tests/regenerate_golden.py`.
"""
from __future__ import annotations

import json

import pytest

pytest.importorskip('pptx')

from conftest import render_and_extract  # noqa: E402

# A document with no front matter takes the pre-existing path end to end, so
# its golden is the standing proof that this work left the Clio path alone.
#
# `english-proposal` and `generic-jp-with-sections-mapping` are deliberately NOT
# here: both carry front matter, so both take the new path. The witnesses have
# to be documents that do not.
CLIO_SHAPED_FIXTURES = {
    'appendix-chapter-borrows-a-design',
    'duplicate-sections-and-honorifics',
    'generic-jp-ordinary-wording',
    'overflow-forces-divider-shift',
}


def _fixtures(fixtures_dir):
    return sorted(fixtures_dir.glob('*.md'))


def _diff(expected: dict, actual: dict) -> str:
    """A human-readable account of what changed, not a bare inequality."""
    lines = []
    if len(expected) != len(actual):
        lines.append(f'slide count: {len(expected)} -> {len(actual)}')
    for key in sorted(set(expected) | set(actual), key=int):
        want, got = expected.get(key), actual.get(key)
        if want == got:
            continue
        if want is None:
            lines.append(f'slide {key}: ADDED {got[:2]}')
        elif got is None:
            lines.append(f'slide {key}: REMOVED {want[:2]}')
        else:
            for i in range(max(len(want), len(got))):
                a = want[i] if i < len(want) else '<missing>'
                b = got[i] if i < len(got) else '<missing>'
                if a != b:
                    lines.append(f'slide {key} shape {i}:\n      - {a[:110]}\n      + {b[:110]}')
    return '\n    '.join(lines)


def test_every_fixture_has_a_golden(fixtures_dir, golden_dir):
    """A fixture with no golden is a fixture nothing is watching."""
    missing = [f.stem for f in _fixtures(fixtures_dir)
               if not (golden_dir / f'{f.stem}.slides.json').exists()]
    assert missing == [], (
        f'no golden for: {missing}. Run `python tests/regenerate_golden.py`.')


@pytest.mark.parametrize('stem', [
    'appendix-chapter-borrows-a-design',
    'duplicate-sections-and-honorifics',
    'english-proposal',
    'field-targets-and-authored-copy',
    'generic-jp-ordinary-wording',
    'generic-jp-with-sections-mapping',
    'overflow-forces-divider-shift',
])
def test_rendered_deck_matches_its_golden(stem, fixtures_dir, golden_dir,
                                          template_path, tmp_path):
    expected = json.loads((golden_dir / f'{stem}.slides.json').read_text('utf-8'))
    actual = render_and_extract(fixtures_dir / f'{stem}.md', template_path, tmp_path)
    assert actual == expected, (
        f'\n{stem} renders differently than its golden:\n    {_diff(expected, actual)}\n\n'
        f'If you meant this, run `python tests/regenerate_golden.py` and put the '
        f'diff in the pull request.')


@pytest.mark.parametrize('stem', sorted(CLIO_SHAPED_FIXTURES))
def test_a_document_without_front_matter_takes_the_untouched_path(stem, fixtures_dir):
    """Guards the guard: these fixtures must stay front-matter-free.

    Their goldens are the proof that the shaping work changed nothing for
    `gen-md.py`-shaped markdown. Adding front matter to one would switch it onto
    the new path and quietly retire that proof.
    """
    text = (fixtures_dir / f'{stem}.md').read_text('utf-8')
    assert not text.startswith('---\n'), (
        f'{stem} gained front matter — it can no longer stand for the Clio path')
