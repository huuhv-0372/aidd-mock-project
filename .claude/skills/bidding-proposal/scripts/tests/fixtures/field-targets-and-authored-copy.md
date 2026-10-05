---
sections:
  "1. System Overview": container
  "1.1. Project Background": appendix
  "1.2. Current Challenges": project_background.current_issues
  "1.3. Primary Objective": project_background.objectives
slides:
  schedule.description:
    - Requirements locked by end of month one
    - Closed beta build ready for the hardware milestone
---

# Ring Companion App — Development Proposal

**Prepared for**: Meridian Wearables
**Date**: 2026-06-01

## Agenda

1. System Overview
2. Schedule

## 1. System Overview

### 1.1. Project Background

Meridian is building a wellness ring with several on-device sensors. The ring
produces high-throughput data, well above what a typical consumer wearable
emits, and no companion application exists to receive it yet.

This build is for internal verification only and will not be published.

### 1.2. Current Challenges

| Challenge | Description |
|---|---|
| Integration unverified | Ring firmware and the application must be proven to work together at real throughput, on real hardware, before any wider rollout is considered |
| Throughput pipeline | Multi-sensor streams at high frequency need a tuned ingestion and storage path that neither drops samples nor exhausts device battery |
| Wellness positioning | GDPR-equivalent personal data protection applies in full, while medical device certification and its obligations deliberately do not |
| Hardware timeline | Delivery must match the ring's own readiness date, which is fixed by manufacturing and cannot move to accommodate software slippage |
| Algorithms on the server | The application must integrate cleanly with the existing algorithm server rather than re-implementing any validated computation itself |
| Consumer release later | Decisions taken now should not block the eventual consumer version, but are not required to carry it either |

### 1.3. Primary Objective

The purpose of the application is to test the hardware and confirm the ring
functions correctly.

Concrete success indicators:

1. Data from all ring sensors reaches the application without loss.
2. Connectivity stays stable under realistic daily usage.
3. Every algorithm receives correct input and returns the expected output.

## 2. Schedule

The programme runs across two quarters, with a closed beta at the midpoint and
a verification window before the hardware milestone. Each phase closes on a
demonstrated build rather than on a date.

| Milestone | Target |
|---|---|
| Requirements locked | Month 1 |
| Closed beta | Month 4 |
