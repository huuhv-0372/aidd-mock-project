from __future__ import annotations

import copy
import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.schema import (
    ContractError, SWP_MATRIX, axes_for_swp, derive_swp, normalize_candidates,
    validate_payload,
)
from helpers import fixture, mark_representatives, sized_payload


class SchemaTests(unittest.TestCase):
    @staticmethod
    def _parent(ref, issue_type="user-story", parent_ref=None):
        return {
            "sourceType": "github", "issueRef": ref, "url": None,
            "title": ref, "labels": [], "issueType": issue_type,
            "parentRef": parent_ref,
            "provenance": {
                "retrievedVia": "fixture", "detailStatus": "full",
                "fields": ["title"], "notes": [],
            },
        }

    def test_all_36_matrix_cells_are_frozen(self):
        expected = (
            (1, 1, 2, 2, 3, 5), (2, 3, 3, 4, 6, 10),
            (3, 4, 5, 6, 9, 15), (5, 6, 8, 10, 15, 25),
            (8, 10, 12, 16, 24, 40), (13, 16, 20, 26, 39, 65),
        )
        self.assertEqual(expected, SWP_MATRIX)
    def test_fixture_and_run_sizes_validate_with_exact_formula(self):
        for size in (0, 1, 5, 12, 100, 101, 205):
            with self.subTest(size=size):
                result = validate_payload(fixture() if size == 12 else sized_payload(size))
                self.assertEqual(size, len(result["issues"]))
                self.assertTrue(all(row["initialSWP"] == derive_swp(row["initialScope"], row["initialComplexity"]) for row in result["issues"]))
                self.assertTrue(all(row["finalSWP"] == derive_swp(row["finalScope"], row["finalComplexity"]) for row in result["issues"]))

    def test_order_is_natural_and_independent_of_worker_completion(self):
        payload = sized_payload(101)
        expected = [row["issueRef"] for row in validate_payload(payload)["issues"]]
        random.Random(7).shuffle(payload["issues"])
        actual = [row["issueRef"] for row in validate_payload(payload)["issues"]]
        self.assertEqual(expected, actual)
        self.assertEqual("demo/generated#2", actual[1])
        self.assertEqual("demo/generated#10", actual[9])

    def test_signatures_are_canonicalized_in_vocabulary_order(self):
        payload = fixture()
        payload["issues"][0]["scopeSignature"] = ["cross-layer", "multi-component"]
        result = validate_payload(payload)
        row = next(item for item in result["issues"] if item["issueRef"] == "demo/app#1")
        self.assertEqual(["multi-component", "cross-layer"], row["scopeSignature"])

    def test_rejects_boolean_band_and_formula_mismatch(self):
        for field, value in (("initialScope", True), ("initialSWP", 99), ("finalSWP", 99)):
            with self.subTest(field=field):
                payload = fixture()
                payload["issues"][0][field] = value
                with self.assertRaises(ContractError):
                    validate_payload(payload)

    def test_rejects_duplicate_assessments_unknown_signature_and_mixed_source(self):
        duplicate = fixture()
        duplicate["issues"].append(copy.deepcopy(duplicate["issues"][0]))
        unknown = fixture()
        unknown["issues"][0]["scopeSignature"] = ["free-form"]
        mixed = fixture()
        mixed["issues"][0]["sourceType"] = "backlog"
        for payload in (duplicate, unknown, mixed):
            with self.assertRaises(ContractError):
                validate_payload(payload)

    def test_axes_for_swp_resolves_every_cell_and_prefers_least_movement(self):
        # Every valid SWP value must resolve to a cell that re-derives it.
        for scope_index, row in enumerate(SWP_MATRIX):
            for complexity_index, cell in enumerate(row):
                scope, complexity = axes_for_swp(cell, (1, 2, 3, 5, 8, 13)[scope_index], (0, 1, 2, 3, 5, 8)[complexity_index])
                self.assertEqual(derive_swp(scope, complexity), cell)
        # Same value as initial → axes stay exactly initial (zero movement).
        self.assertEqual(axes_for_swp(6, 3, 3), (3, 3))
        # Ambiguous value 3 (S3×C0, S2×C1, S1×C5): from S3×C1 (=4) the nearest
        # cell moves one Complexity band, keeping Scope.
        self.assertEqual(axes_for_swp(3, 3, 1), (3, 0))
        # From S2×C0 (=2), choosing 3 moves one Complexity band, not Scope.
        self.assertEqual(axes_for_swp(3, 2, 0), (2, 1))
        # A non-cell value is a contract violation.
        with self.assertRaises(ContractError):
            axes_for_swp(7, 3, 3)

    def test_rejects_exclusive_signatures_and_weak_evidence_overconfidence(self):
        exclusive_scope = fixture()
        exclusive_scope["issues"][0]["scopeSignature"] = ["single-component", "multi-component"]
        exclusive_complexity = fixture()
        exclusive_complexity["issues"][0]["complexitySignature"] = ["routine", "stateful"]
        overconfident = fixture()
        legacy = next(item for item in overconfident["issues"] if item["issueRef"] == "demo/legacy#9")
        legacy["confidence"] = "medium"
        for payload in (exclusive_scope, exclusive_complexity, overconfident):
            with self.assertRaises(ContractError):
                validate_payload(payload)

    def test_split_requires_both_terminal_axes_and_explicit_reason(self):
        payload = fixture()
        payload["issues"][0]["splitRecommended"] = True
        payload["issues"][0]["splitReason"] = "Too wide"
        with self.assertRaises(ContractError):
            validate_payload(payload)
        terminal_without_split = fixture()
        terminal_without_split["issues"][-1]["splitRecommended"] = False
        terminal_without_split["issues"][-1]["splitReason"] = None
        result = validate_payload(terminal_without_split)
        row = next(item for item in result["issues"] if item["issueRef"] == "demo/platform#12")
        self.assertEqual(65, row["initialSWP"])

    def test_candidate_dedupe_retains_richest_evidence(self):
        base = fixture()["issues"][0]
        candidate = {key: copy.deepcopy(base[key]) for key in ("sourceType", "issueRef", "url", "title", "body", "labels", "project", "period", "provenance")}
        sparse = copy.deepcopy(candidate)
        sparse["body"] = None
        sparse["labels"] = ["extra"]
        sparse["url"] = None
        sparse["project"] = None
        sparse["period"] = None
        sparse["provenance"]["detailStatus"] = "metadata-only"
        result = normalize_candidates([sparse, candidate])
        self.assertEqual(1, len(result))
        self.assertEqual(candidate["body"], result[0]["body"])
        self.assertEqual(["extra", "ui"], result[0]["labels"])
        self.assertEqual("full", result[0]["provenance"]["detailStatus"])
        self.assertEqual(candidate["url"], result[0]["url"])
        self.assertEqual(candidate["project"], result[0]["project"])

    def test_function_and_activity_metadata_are_preserved_and_validated(self):
        payload = sized_payload(1)
        payload["issues"][0]["functionRef"] = "AUTH-LOGIN"
        payload["issues"][0]["activityType"] = "performance-test"
        row = validate_payload(payload)["issues"][0]
        self.assertEqual("AUTH-LOGIN", row["functionRef"])
        self.assertEqual("performance-test", row["activityType"])

        payload["issues"][0]["activityType"] = "made-up"
        with self.assertRaises(ContractError):
            validate_payload(payload)

    def test_parent_rollup_is_plain_sum_without_matrix_resnap(self):
        payload = fixture()
        payload["issues"] = [copy.deepcopy(payload["issues"][0]), copy.deepcopy(payload["issues"][4])]
        for issue in payload["issues"]:
            issue["parentRef"] = "demo/story#100"
        payload["parents"] = [
            self._parent("demo/story#100", parent_ref="demo/epic#200"),
            self._parent("demo/epic#200", "epic"),
        ]
        result = validate_payload(payload)
        parents = {item["issueRef"]: item for item in result["parents"]}
        self.assertEqual(7, parents["demo/story#100"]["finalSWP"])
        self.assertEqual(7, parents["demo/epic#200"]["finalSWP"])
        self.assertNotIn(7, {value for row in SWP_MATRIX for value in row})

    def test_task_parent_is_structural_and_derived_from_children(self):
        payload = sized_payload(1)
        payload["issues"][0]["parentRef"] = "pec-internal-mng#18"
        payload["parents"] = [
            self._parent("pec-internal-mng#18", "task", "demo/story#100"),
            self._parent("demo/story#100"),
        ]

        result = validate_payload(payload)

        self.assertEqual(1, len(result["issues"]))
        parents = {parent["issueRef"]: parent for parent in result["parents"]}
        task_parent = parents["pec-internal-mng#18"]
        story = parents["demo/story#100"]
        self.assertEqual("task", task_parent["issueType"])
        self.assertEqual("derived", task_parent["aggregationStatus"])
        self.assertEqual([payload["issues"][0]["issueRef"]], task_parent["childRefs"])
        self.assertEqual(result["issues"][0]["finalSWP"], task_parent["finalSWP"])
        self.assertEqual(["pec-internal-mng#18"], story["childRefs"])
        self.assertEqual(task_parent["finalSWP"], story["finalSWP"])

    def test_unbroken_parent_has_no_score_and_parent_cannot_be_directly_scored(self):
        payload = sized_payload(1)
        payload["parents"] = [self._parent("demo/story#100")]
        parent = validate_payload(payload)["parents"][0]
        self.assertEqual("needs-breakdown", parent["aggregationStatus"])
        self.assertIsNone(parent["finalSWP"])

        invalid = sized_payload(1)
        invalid["parents"] = [self._parent("demo/story#100") | {"initialScope": 3}]
        with self.assertRaises(ContractError):
            validate_payload(invalid)

    def test_parent_cycles_are_rejected(self):
        payload = sized_payload(1)
        payload["parents"] = [
            self._parent("demo/story#100", parent_ref="demo/epic#200"),
            self._parent("demo/epic#200", "epic", parent_ref="demo/story#100"),
        ]
        with self.assertRaises(ContractError):
            validate_payload(payload)

    def test_rejects_unreviewed_final_status_and_invalid_representative_audit(self):
        unreviewed = fixture()
        unreviewed["run"]["calibrationStatus"] = "accepted"

        mismatched_reasons = mark_representatives(fixture(), ["demo/api#3"])
        mismatched_reasons["representatives"][0]["selectionReasons"] = ["different"]

        refs = [item["issueRef"] for item in fixture()["issues"][:6]]
        too_many = mark_representatives(fixture(), refs)

        for payload in (unreviewed, mismatched_reasons, too_many):
            with self.assertRaises(ContractError):
                validate_payload(payload)

    def test_representative_reasons_are_owned_by_deterministic_selector(self):
        payload = mark_representatives(sized_payload(1), ["demo/generated#1"])
        payload["representatives"][0]["selectionReasons"] = ["canonical-full-set"]
        payload["issues"][0]["calibration"]["selectionReasons"] = ["canonical-full-set"]
        with self.assertRaises(ContractError) as caught:
            validate_payload(payload)
        self.assertEqual("unknown-selection-reason", caught.exception.code)


if __name__ == "__main__":
    unittest.main()
