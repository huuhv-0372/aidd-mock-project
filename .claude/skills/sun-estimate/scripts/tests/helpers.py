from __future__ import annotations

import copy
import json
from pathlib import Path

FIXTURES = Path(__file__).parent / "fixtures"


def fixture(name: str = "issues.json") -> dict:
    with (FIXTURES / name).open(encoding="utf-8") as handle:
        return json.load(handle)


def sized_payload(size: int) -> dict:
    payload = fixture()
    templates = payload["issues"][:-1]
    issues = []
    for index in range(size):
        issue = copy.deepcopy(templates[index % len(templates)])
        issue["issueRef"] = f"demo/generated#{index + 1}"
        issue["url"] = f"https://github.com/demo/generated/issues/{index + 1}"
        issues.append(issue)
    payload["issues"] = issues
    payload["parents"] = []
    payload["representatives"] = []
    payload["corrections"] = []
    payload["calibrationRules"] = []
    if not issues:
        payload["run"]["calibrationStatus"] = "skipped"
        payload["caveats"] = ["No issues matched."]
    return payload


def mark_representatives(payload: dict, refs: list[str]) -> dict:
    payload = copy.deepcopy(payload)
    payload["representatives"] = [
        {"sourceType": "github", "issueRef": ref, "selectionReasons": ["all-issues"]}
        for ref in refs
    ]
    for issue in payload["issues"]:
        if issue["issueRef"] in refs:
            issue.setdefault("calibration", {})["isRepresentative"] = True
            issue["calibration"]["selectionReasons"] = ["all-issues"]
    return payload
