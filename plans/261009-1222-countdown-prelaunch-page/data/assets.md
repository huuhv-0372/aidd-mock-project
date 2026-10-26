# Asset Manifest

Mapping `nodeId → asset file path`. Multiple nodeIds may point to the same file (dedup by node name). The path is a PLAN — the file may still be downloading in the background. Paths are **import-ready** (prefix `/images/countdown`).

| Node ID | File path | Filename | Status |
|---------|-----------|----------|--------|
| `2268:35129` | `/images/countdown/countdown-background.png` | `countdown-background.png` | ✓ |
