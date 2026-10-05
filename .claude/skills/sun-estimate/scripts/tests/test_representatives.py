from __future__ import annotations

import copy
import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.representatives import select_representatives
from helpers import fixture, sized_payload


class RepresentativeTests(unittest.TestCase):
    def test_sizes_select_at_most_five_unique_rows(self):
        for size in (0, 1, 5, 12, 100, 101, 205):
            with self.subTest(size=size):
                payload = fixture() if size == 12 else sized_payload(size)
                result = select_representatives(payload)
                refs = [(item["sourceType"], item["issueRef"]) for item in result["representatives"]]
                self.assertEqual(min(size, 5), len(refs))
                self.assertEqual(len(refs), len(set(refs)))

    def test_selection_is_stable_under_shuffle(self):
        payload = fixture()
        expected = select_representatives(payload)["representatives"]
        random.Random(31).shuffle(payload["issues"])
        self.assertEqual(expected, select_representatives(payload)["representatives"])

    def test_roles_include_extremes_boundary_or_outlier_and_low_confidence(self):
        result = select_representatives(fixture())
        reasons = {reason for item in result["representatives"] for reason in item["selectionReasons"]}
        self.assertTrue({"minimum", "lower-median", "maximum", "lowest-confidence"}.issubset(reasons))
        self.assertTrue({"outlier", "split-boundary"} & reasons)
        refs = {item["issueRef"] for item in result["representatives"]}
        self.assertIn("demo/legacy#9", refs)
        self.assertIn("demo/platform#12", refs)

    def test_five_or_fewer_select_all_without_padding(self):
        result = select_representatives(sized_payload(5))
        self.assertTrue(all(item["selectionReasons"] == ["all-issues"] for item in result["representatives"]))

    def test_low_confidence_tie_prefers_ambiguous_evidence(self):
        payload = sized_payload(12)
        rows = {item["issueRef"]: item for item in payload["issues"]}
        rows["demo/generated#2"]["confidence"] = "low"
        rows["demo/generated#2"]["evidenceStatus"] = "EXTRACTED"
        rows["demo/generated#3"]["confidence"] = "low"
        rows["demo/generated#3"]["evidenceStatus"] = "AMBIGUOUS"
        selected = select_representatives(payload)["representatives"]
        low = next(item for item in selected if "lowest-confidence" in item["selectionReasons"])
        self.assertEqual("demo/generated#3", low["issueRef"])


if __name__ == "__main__":
    unittest.main()
