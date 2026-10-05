from __future__ import annotations

import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.calibration import apply_calibration
from core.render_html import RenderError, render_html, write_report
from core.representatives import select_representatives
from helpers import fixture, sized_payload


class HtmlTests(unittest.TestCase):
    @staticmethod
    def _skipped(payload):
        return apply_calibration(select_representatives(payload), skip=True)

    @staticmethod
    def _parent(issue_ref, title, issue_type="user-story", parent_ref=None):
        return {
            "sourceType": "github", "issueRef": issue_ref,
            "url": f"https://github.com/demo/app/issues/{issue_ref.rsplit('#', 1)[-1]}",
            "title": title, "labels": [], "issueType": issue_type,
            "parentRef": parent_ref,
            "provenance": {
                "retrievedVia": "fixture", "detailStatus": "full",
                "fields": ["title"], "notes": [],
            },
        }

    def test_normal_empty_and_large_reports_have_required_sections(self):
        for payload in (self._skipped(fixture()), sized_payload(0), self._skipped(sized_payload(205))):
            with self.subTest(size=len(payload["issues"])):
                document = render_html(payload)
                for section in ("summary", "methodology", "calibration-audit", "issues", "provenance", "caveats"):
                    self.assertIn(f'id="{section}"', document)
                self.assertNotIn("fetch(", document)
                self.assertNotIn("eval(", document)
        self.assertIn("Không có issue", render_html(sized_payload(0)))

    def test_malicious_content_is_text_json_safe_and_secret_redacted(self):
        document = render_html(fixture("malicious-content.json"), fingerprints=("never-embed-this",))
        self.assertNotIn("github_pat_abcdefghijklmnopqrstuvwxyz123456", document)
        self.assertNotIn("never-embed-this", document)
        self.assertNotIn("<img src=x", document)
        self.assertNotIn("href=\"javascript:", document)
        match = re.search(r'<script id="report-data" type="application/json">(.*?)</script>', document, re.S)
        embedded = json.loads(match.group(1))
        self.assertEqual(1, len(embedded["issues"]))
        self.assertNotIn("body", embedded["issues"][0])

    def test_write_creates_one_html_and_refuses_collision(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "reports" / "sun-estimate.html"
            payload = self._skipped(fixture())
            written = write_report(payload, output)
            self.assertEqual(output.resolve(), written)
            self.assertEqual([output], [item for item in Path(temp).rglob("*") if item.is_file()])
            with self.assertRaises(FileExistsError):
                write_report(payload, output)

    def test_output_must_be_explicit_html_under_reports(self):
        with tempfile.TemporaryDirectory() as temp:
            for output in (Path(temp) / "result.html", Path(temp) / "reports" / "result.json"):
                with self.assertRaises(RenderError):
                    write_report(self._skipped(fixture()), output)

    def test_non_empty_pending_run_is_not_renderable(self):
        with self.assertRaises(RenderError):
            render_html(fixture())

    def test_report_has_filters_sort_units_summary_and_provenance(self):
        document = render_html(self._skipped(fixture()))
        for element_id in ("discipline", "work-type", "confidence", "calibration", "search"):
            self.assertIn(f'id="{element_id}"', document)
        self.assertIn('data-sort="finalSwp"', document)
        self.assertIn("Provenance", document)
        # unit toggle: SWP <-> hours with an adjustable reference rate
        for element_id in ("u-swp", "u-h", "rate"):
            self.assertIn(f'id="{element_id}"', document)
        self.assertIn('data-swp=', document)
        # executive summary with uncertainty range
        self.assertIn("Tóm tắt estimate", document)
        self.assertIn("Khoảng bất định", document)

    def test_calibration_audit_is_embedded(self):
        payload = select_representatives(sized_payload(1))
        row = payload["issues"][0]
        feedback = [{
            "representative": {"sourceType": row["sourceType"], "issueRef": row["issueRef"]},
            "approvedScope": 2, "approvedComplexity": row["initialComplexity"],
            "issueSpecific": True, "rationale": "Approved wider scope.",
        }]
        document = render_html(apply_calibration(payload, feedback))
        self.assertIn("Điều chỉnh của người dùng", document)
        self.assertIn("1 SWP → 2 SWP", document)
        self.assertIn("chỉ issue này", document)

    def test_representative_lookup_keys_on_source_type_and_ref(self):
        # A kpi-insight run may mix trackers whose bare issueRef strings collide;
        # the representatives table must join on (sourceType, issueRef).
        payload = sized_payload(2)
        payload["run"]["sourceFamily"] = "kpi-insight"
        real, decoy = payload["issues"]
        decoy["sourceType"] = "jira"
        decoy["issueRef"] = real["issueRef"]
        decoy["url"] = None
        decoy["title"] = "Decoy title from another tracker"
        document = render_html(self._skipped(payload))
        section = document.split('id="calibration-audit"', 1)[1].split('id="provenance"', 1)[0]
        self.assertIn(real["title"], section)
        self.assertIn("Decoy title from another tracker", section)

    def test_parent_groups_risk_tables_and_totals_stay_separate(self):
        payload = sized_payload(6)
        rows = payload["issues"]
        rows[0]["parentRef"] = "demo/story#100"
        rows[1]["parentRef"] = "demo/story#100"
        rows[2]["labels"] = sorted(set(rows[2]["labels"]) | {"team:frontend"})
        rows[3]["labels"] = sorted(set(rows[3]["labels"]) | {"type:qabug"})
        rows[4]["labels"] = sorted(set(rows[4]["labels"]) | {"type:testdesign"})
        payload["parents"] = [
            self._parent("demo/story#100", "Login story"),
            self._parent("demo/epic#200", "Unbroken epic", "epic"),
        ]
        document = render_html(self._skipped(payload))
        # issues render grouped by parent container plus a standalone group
        for element_id in ("group-1-rows", "standalone-rows", "parent-rows"):
            self.assertIn(f'id="{element_id}"', document)
        tbody = {key: re.search(rf'<tbody(?: data-rows)? id="{key}">(.*?)</tbody>', document, re.S).group(1)
                 for key in ("group-1-rows", "standalone-rows", "parent-rows")}
        self.assertIn(rows[0]["issueRef"].rsplit("#", 1)[-1], tbody["group-1-rows"])
        self.assertIn(rows[3]["issueRef"].rsplit("#", 1)[-1], tbody["standalone-rows"])
        self.assertIn("Login story", tbody["parent-rows"])
        self.assertIn("Unbroken epic", tbody["parent-rows"])
        self.assertIn("needs-breakdown", tbody["parent-rows"])
        # a childless container surfaces in the risk section, never in totals
        self.assertIn('id="risks"', document)
        self.assertIn("Breakdown container", document)
        # team-load table appears once a team:* label exists, with the unlabeled warning
        self.assertIn('id="team-rows"', document)
        self.assertIn("(chưa gán team)", document)
        embedded = json.loads(re.search(r'<script id="report-data" type="application/json">(.*?)</script>', document, re.S).group(1))
        story = next(item for item in embedded["parents"] if item["issueRef"] == "demo/story#100")
        expected_story = sum(item["finalSWP"] for item in embedded["issues"] if item["parentRef"] == "demo/story#100")
        self.assertEqual(expected_story, story["finalSWP"])
        self.assertEqual("needs-breakdown", next(item for item in embedded["parents"] if item["issueRef"] == "demo/epic#200")["aggregationStatus"])
        self.assertIn("Theo loại issue", document)
        self.assertIn("subtotal riêng", document)
        # exclusions line names the needs-breakdown container in the summary
        self.assertIn("chưa bao gồm", document)

    def test_scope_banner_and_estimate_diff_render(self):
        payload = sized_payload(3)
        payload["run"]["selection"] = {
            "includeClosed": True,
            "reestimateExisting": True,
            "statusRule": "issue-state",
            "existingEstimateCheck": "unavailable",
            "filters": {"sprints": ["Sprint 12"], "milestones": [], "labels": []},
            "excluded": {"byStatus": 7},
        }
        rows = payload["issues"]
        rows[0]["existingEstimate"] = {"standardWorkPoint": 8, "estimatedHours": None, "source": "kpi"}
        rows[1]["existingEstimate"] = {"standardWorkPoint": rows[1].get("initialSWP", 2), "estimatedHours": 4, "source": "board"}
        document = render_html(self._skipped(payload))
        self.assertIn('id="scope"', document)
        self.assertIn("closed=included", document)
        self.assertIn("Sprint 12", document)
        self.assertIn("byStatus: 7", document)
        self.assertIn("vẫn estimate", document)
        self.assertIn("Đối chiếu estimate hiện có — 1 issue", document)
        self.assertIn(rows[0]["issueRef"], document)
        # matching estimate (rows[1]) must NOT be in the diff table
        diff_section = re.search(r"Đối chiếu estimate hiện có(.*?)</table>", document, re.S).group(1)
        self.assertNotIn(rows[1]["issueRef"], diff_section)

    def test_no_banner_or_diff_without_selection_or_divergence(self):
        document = render_html(self._skipped(sized_payload(2)))
        self.assertNotIn('id="scope"', document)
        self.assertNotIn("Đối chiếu estimate hiện có", document)

    def test_nested_parent_rollup_stays_out_of_direct_totals(self):
        payload = sized_payload(3)
        rows = payload["issues"]
        rows[0]["parentRef"] = "demo/story#100"
        payload["parents"] = [
            self._parent("demo/story#100", "Child story", parent_ref="demo/epic#200"),
            self._parent("demo/epic#200", "Parent epic", "epic"),
        ]
        document = render_html(self._skipped(payload))
        embedded = json.loads(re.search(r'<script id="report-data" type="application/json">(.*?)</script>', document, re.S).group(1))
        by_ref = {item["issueRef"]: item for item in embedded["parents"]}
        self.assertEqual(rows[0]["finalSWP"], by_ref["demo/story#100"]["finalSWP"])
        self.assertEqual(rows[0]["finalSWP"], by_ref["demo/epic#200"]["finalSWP"])
        # the all-work-item total renders as a convertible SWP span
        self.assertIn(f'data-swp="{sum(i["finalSWP"] for i in embedded["issues"])}"', document)

    def test_parent_ref_survives_normalization(self):
        payload = sized_payload(2)
        payload["issues"][1]["parentRef"] = "demo/story#100"
        payload["parents"] = [self._parent("demo/story#100", "Story")]
        document = render_html(self._skipped(payload))
        embedded = json.loads(re.search(r'<script id="report-data" type="application/json">(.*?)</script>', document, re.S).group(1))
        by_ref = {i["issueRef"]: i for i in embedded["issues"]}
        self.assertEqual("demo/story#100", by_ref[payload["issues"][1]["issueRef"]]["parentRef"])
        self.assertIsNone(by_ref[payload["issues"][0]["issueRef"]]["parentRef"])

    def test_link_allowlist_supports_backlogtool_and_blocks_unknown_hosts(self):
        backlog = sized_payload(1)
        backlog["run"]["sourceFamily"] = "backlog"
        backlog["issues"][0]["sourceType"] = "backlog"
        backlog["issues"][0]["issueRef"] = "DEMO-1"
        backlog["issues"][0]["url"] = "https://demo.backlogtool.com/view/DEMO-1"
        backlog_document = render_html(self._skipped(backlog))
        self.assertIn('href="https://demo.backlogtool.com/view/DEMO-1"', backlog_document)

        unknown = sized_payload(1)
        unknown["issues"][0]["url"] = "https://example.com/issues/1"
        unknown_document = render_html(self._skipped(unknown))
        self.assertNotIn('href="https://example.com/issues/1"', unknown_document)


if __name__ == "__main__":
    unittest.main()
