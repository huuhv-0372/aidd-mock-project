from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.calibration import CalibrationConflict, apply_calibration
from core.schema import ContractError
from helpers import fixture, mark_representatives, sized_payload


def correction(ref: str, scope: int, complexity: int, *, issue_specific: bool = False) -> dict:
    return {
        "representative": {"sourceType": "github", "issueRef": ref},
        "approvedScope": scope,
        "approvedComplexity": complexity,
        "issueSpecific": issue_specific,
        "rationale": "Team calibration.",
    }


class CalibrationTests(unittest.TestCase):
    def _api_pair(self) -> dict:
        return mark_representatives(fixture(), ["demo/api#3"])

    def test_exact_stratum_scope_step_propagates_and_other_rows_do_not_change(self):
        payload = self._api_pair()
        initial = {row["issueRef"]: (row["initialScope"], row["initialComplexity"]) for row in payload["issues"]}
        result = apply_calibration(payload, [correction("demo/api#3", 3, 2)])
        rows = {row["issueRef"]: row for row in result["issues"]}
        self.assertEqual((3, 2, 5), (rows["demo/api#3"]["finalScope"], rows["demo/api#3"]["finalComplexity"], rows["demo/api#3"]["finalSWP"]))
        self.assertEqual((3, 2, 5), (rows["demo/api#4"]["finalScope"], rows["demo/api#4"]["finalComplexity"], rows["demo/api#4"]["finalSWP"]))
        for ref, axes in initial.items():
            if ref not in {"demo/api#3", "demo/api#4"}:
                self.assertEqual(axes, (rows[ref]["finalScope"], rows[ref]["finalComplexity"]))
        self.assertEqual("cal-001", rows["demo/api#4"]["calibration"]["matchedRuleId"])

    def test_axis_independence_and_issue_specific_scope(self):
        result = apply_calibration(self._api_pair(), [correction("demo/api#3", 3, 2, issue_specific=True)])
        rows = {row["issueRef"]: row for row in result["issues"]}
        self.assertEqual((3, 2), (rows["demo/api#3"]["finalScope"], rows["demo/api#3"]["finalComplexity"]))
        self.assertEqual((2, 2), (rows["demo/api#4"]["finalScope"], rows["demo/api#4"]["finalComplexity"]))
        self.assertEqual([], result["calibrationRules"])

    def test_parent_rollup_is_rederived_after_representative_change(self):
        payload = self._api_pair()
        for issue in payload["issues"]:
            issue["parentRef"] = "demo/story#100"
        payload["parents"] = [{
            "sourceType": "github",
            "issueRef": "demo/story#100",
            "url": "https://github.com/demo/story/issues/100",
            "title": "API user story",
            "labels": ["type:story"],
            "issueType": "user-story",
            "state": "open",
            "status": None,
            "sprints": [],
            "milestones": [],
            "project": "1",
            "period": None,
            "parentRef": None,
            "provenance": copy.deepcopy(payload["issues"][0]["provenance"]),
        }]

        result = apply_calibration(payload, [correction("demo/api#3", 3, 2)])

        parent = result["parents"][0]
        self.assertEqual("derived", parent["aggregationStatus"])
        self.assertEqual(
            sum(issue["initialSWP"] for issue in result["issues"]),
            parent["initialSWP"],
        )
        self.assertEqual(
            sum(issue["finalSWP"] for issue in result["issues"]),
            parent["finalSWP"],
        )
        self.assertGreater(parent["finalSWP"], parent["initialSWP"])

    def test_accept_all_and_skip_keep_arithmetic(self):
        payload = self._api_pair()
        accepted = apply_calibration(payload, [correction("demo/api#3", 2, 2)])
        skipped = apply_calibration(payload, skip=True)
        self.assertEqual("accepted", accepted["run"]["calibrationStatus"])
        self.assertEqual("skipped", skipped["run"]["calibrationStatus"])
        for result in (accepted, skipped):
            self.assertTrue(all(row["finalSWP"] == row["initialSWP"] for row in result["issues"]))

    def test_empty_run_stays_skipped_without_representative_feedback(self):
        result = apply_calibration(sized_payload(0), [])
        self.assertEqual("skipped", result["run"]["calibrationStatus"])
        self.assertEqual([], result["representatives"])
        self.assertEqual([], result["issues"])

    def test_same_stratum_conflict_is_typed_and_never_last_write_wins(self):
        payload = mark_representatives(fixture(), ["demo/api#3", "demo/api#4"])
        with self.assertRaises(CalibrationConflict) as caught:
            apply_calibration(payload, [correction("demo/api#3", 3, 2), correction("demo/api#4", 5, 2)])
        self.assertEqual(1, len(caught.exception.conflicts))
        self.assertEqual([], caught.exception.partial_payload["calibrationRules"])

    def test_same_stratum_complementary_axis_deltas_merge(self):
        payload = mark_representatives(fixture(), ["demo/api#3", "demo/api#4"])
        result = apply_calibration(
            payload,
            [correction("demo/api#3", 3, 2), correction("demo/api#4", 2, 3)],
        )
        self.assertEqual((1, 1), (
            result["calibrationRules"][0]["scopeBandDelta"],
            result["calibrationRules"][0]["complexityBandDelta"],
        ))

    def test_feedback_must_cover_every_representative(self):
        payload = mark_representatives(fixture(), ["demo/api#3", "demo/api#4"])
        with self.assertRaises(ContractError) as caught:
            apply_calibration(payload, [correction("demo/api#3", 2, 2)])
        self.assertEqual("missing-feedback", caught.exception.code)

    def test_saturation_is_bounded_and_audited(self):
        payload = self._api_pair()
        target = next(row for row in payload["issues"] if row["issueRef"] == "demo/api#4")
        target["initialScope"] = target["finalScope"] = 13
        target["initialSWP"] = target["finalSWP"] = 20
        result = apply_calibration(payload, [correction("demo/api#3", 3, 2)])
        target = next(row for row in result["issues"] if row["issueRef"] == "demo/api#4")
        self.assertEqual(13, target["finalScope"])
        self.assertTrue(target["calibration"]["saturated"])
        self.assertEqual("cal-001", target["calibration"]["matchedRuleId"])

    def test_invalid_band_and_supplied_spoint_are_rejected(self):
        invalid = correction("demo/api#3", 4, 2)
        supplied = correction("demo/api#3", 3, 2)
        supplied["approvedSWP"] = 5
        for item in (invalid, supplied):
            with self.assertRaises(ContractError):
                apply_calibration(self._api_pair(), [item])


if __name__ == "__main__":
    unittest.main()
