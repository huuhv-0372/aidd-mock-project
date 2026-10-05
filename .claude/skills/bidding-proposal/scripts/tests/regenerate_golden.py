#!/usr/bin/env python3
"""Rewrite the golden decks under `tests/fixtures/golden/`.

Run BY HAND, never from CI, and never as a reflex when `test_golden_decks.py`
goes red. A golden file's whole job is to make a change in rendered output
visible; a golden that regenerates itself whenever it disagrees with the code
protects nothing.

The loop is: read the diff the failing test printed, decide whether that change
is one you meant, and only then run this. The diff belongs in the pull request
alongside the change that caused it.

    python tests/regenerate_golden.py
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = TESTS_DIR.parent
sys.path.insert(0, str(SCRIPTS_DIR))
sys.path.insert(0, str(TESTS_DIR))

from conftest import render_and_extract  # noqa: E402

FIXTURES = TESTS_DIR / 'fixtures'
GOLDEN = FIXTURES / 'golden'
TEMPLATE = SCRIPTS_DIR.parent / 'templates' / 'SVN Proposal Menu.pptx'


def main() -> int:
    GOLDEN.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for fixture in sorted(FIXTURES.glob('*.md')):
            slides = render_and_extract(fixture, TEMPLATE, tmp)
            target = GOLDEN / f'{fixture.stem}.slides.json'
            target.write_text(json.dumps(slides, ensure_ascii=False, indent=2) + '\n',
                              encoding='utf-8')
            print(f'[ok] {target.name}: {len(slides)} slides')
    print('\nNow READ `git diff tests/fixtures/golden/` before committing.\n'
          'Every changed line is a change to what a client would see.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
