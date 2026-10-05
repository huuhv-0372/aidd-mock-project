from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selection import select_candidates
from helpers import fixture


class SelectionTests(unittest.TestCase):
    @staticmethod
    def candidate(index=0):
        row = copy.deepcopy(fixture()["issues"][index])
        for field in (
            "primaryDiscipline", "workType", "scopeSignature", "complexitySignature",
            "initialScope", "initialComplexity", "initialSWP", "finalScope",
            "finalComplexity", "finalSWP", "confidence", "evidenceStatus",
            "rationale", "assumptions", "gaps", "supportingEvidence",
            "splitRecommended", "splitReason", "calibration",
        ):
            row.pop(field, None)
        return row

    def test_default_excludes_closed_and_existing_but_retains_unknown_state(self):
        open_item = self.candidate(0) | {"state": "open"}
        closed = self.candidate(1) | {"state": "closed"}
        existing = self.candidate(2) | {
            "state": "open",
            "existingEstimate": {"standardWorkPoint": 3, "estimatedHours": None, "source": "kpi"},
        }
        unknown = self.candidate(3) | {"state": "unknown"}
        result = select_candidates({"candidates": [open_item, closed, existing, unknown]})
        self.assertEqual(
            {open_item["issueRef"], unknown["issueRef"]},
            {item["issueRef"] for item in result["selectedIssues"]},
        )
        self.assertEqual("unavailable", result["selection"]["statusRule"])
        self.assertEqual(1, result["selection"]["excluded"]["byStatus"])
        self.assertEqual(1, result["selection"]["excluded"]["byExistingEstimate"])

    def test_force_aliases_both_flags_and_explicit_ref_bypasses_filters(self):
        closed = self.candidate(0) | {
            "state": "closed", "sprints": ["Other"],
            "existingEstimate": {"standardWorkPoint": 1, "estimatedHours": None, "source": "board"},
        }
        forced = select_candidates({"candidates": [closed], "options": {"force": True}})
        self.assertEqual(1, len(forced["selectedIssues"]))
        self.assertTrue(forced["selection"]["includeClosed"])
        self.assertTrue(forced["selection"]["reestimateExisting"])

        explicit = select_candidates({
            "candidates": [closed],
            "options": {"sprints": ["Sprint 12"], "explicitRefs": [closed["issueRef"]]},
        })
        self.assertEqual(1, len(explicit["selectedIssues"]))

    def test_filters_are_or_within_and_across_and_parent_chain_follows_child(self):
        child = self.candidate(0) | {
            "state": "open", "sprints": ["Sprint 12"], "milestones": ["M1"],
            "labels": ["api", "ready"], "parentRef": "demo/story#100",
        }
        story = self.candidate(1) | {
            "issueRef": "demo/story#100", "title": "Story", "labels": ["type:story"],
            "issueType": "user-story", "parentRef": "demo/epic#200",
        }
        epic = self.candidate(2) | {
            "issueRef": "demo/epic#200", "title": "Epic", "labels": ["type:epic"],
            "issueType": "epic",
        }
        result = select_candidates({
            "candidates": [child, story, epic],
            "options": {
                "sprints": ["Sprint 11", "Sprint 12"],
                "milestones": ["M1"], "labels": ["ready"],
            },
        })
        self.assertEqual([child["issueRef"]], [item["issueRef"] for item in result["selectedIssues"]])
        self.assertEqual(
            {"demo/story#100", "demo/epic#200"},
            {item["issueRef"] for item in result["selectedParents"]},
        )

    def test_bulk_keeps_standalone_parent_but_explicit_ticket_does_not(self):
        child = self.candidate(0) | {"state": "open", "parentRef": "demo/story#100"}
        story = self.candidate(1) | {
            "issueRef": "demo/story#100", "title": "Selected story",
            "labels": ["type:story"], "issueType": "user-story",
        }
        standalone = self.candidate(2) | {
            "issueRef": "demo/story#200", "title": "Unbroken story",
            "labels": ["type:story"], "issueType": "user-story",
        }
        candidates = [child, story, standalone]

        bulk = select_candidates({"candidates": candidates})
        self.assertEqual(
            {"demo/story#100", "demo/story#200"},
            {item["issueRef"] for item in bulk["selectedParents"]},
        )

        explicit = select_candidates({
            "candidates": candidates,
            "options": {"explicitRefs": [child["issueRef"]]},
        })
        self.assertEqual(
            {"demo/story#100"},
            {item["issueRef"] for item in explicit["selectedParents"]},
        )

    def test_bulk_parent_obeys_scope_filters_and_is_audited(self):
        standalone = self.candidate(1) | {
            "issueRef": "demo/story#200", "title": "Closed story",
            "labels": ["type:story"], "issueType": "user-story", "state": "closed",
        }
        result = select_candidates({"candidates": [standalone]})
        self.assertEqual([], result["selectedParents"])
        self.assertEqual(1, result["selection"]["excluded"]["byStatus"])

    def test_referenced_task_is_promoted_to_parent_without_double_counting(self):
        task_parent = self.candidate(0) | {
            "issueRef": "pec-internal-mng#18", "title": "BE fix bug",
            "issueType": "task", "state": "open",
        }
        child = self.candidate(1) | {
            "issueRef": "pec-internal-mng#19", "title": "Child bug",
            "issueType": "bug", "state": "open", "parentRef": "pec-internal-mng#18",
        }

        before_fetch = select_candidates({"candidates": [child]})
        self.assertEqual(["pec-internal-mng#18"], before_fetch["parentRefsToFetch"])

        result = select_candidates({"candidates": [task_parent, child]})

        self.assertEqual(["pec-internal-mng#19"], [item["issueRef"] for item in result["selectedIssues"]])
        self.assertEqual(["pec-internal-mng#18"], [item["issueRef"] for item in result["selectedParents"]])
        self.assertEqual("task", result["selectedParents"][0]["issueType"])
        self.assertEqual([], result["parentRefsToFetch"])


if __name__ == "__main__":
    unittest.main()
