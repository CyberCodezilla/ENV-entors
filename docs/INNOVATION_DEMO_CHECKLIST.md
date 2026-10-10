# Innovation Demo Checklist

## Before judging

- [ ] Open the existing map and confirm route analysis and replay scenarios still work.
- [ ] Open `/command-center/` on desktop and mobile.
- [ ] Confirm the API status says connected; if not, disclose that the page is in local fallback mode.
- [ ] Run cloudburst, heat, blocked-road, and compound scenarios.
- [ ] Show before/after composite indices and all three ranked actions.
- [ ] Show source/provenance, generated timestamp, uncertainty, simulated label, and human-review warning.
- [ ] Toggle ML advisory outage and show deterministic fallback remains available.
- [ ] If AWS is deployed, verify a run is persisted and the workflow status becomes `PROCESSED`.
- [ ] Capture real p50/p95 latency, scenario test pass count, and current cost estimate with the measurement method documented.
- [ ] Record a short screen capture and export the architecture diagram from `innovation-architecture.mmd`.
- [ ] Confirm no secrets, credentials, or unnecessary personal data appear in screenshots/logs.

## Three-minute script

1. **0:00–0:25:** Show the original HeatFlood Guardian map and explain why a risk score alone is insufficient.
2. **0:25–1:10:** Open Command Center and run cloudburst; compare baseline and simulated impact.
3. **1:10–1:50:** Explain the ranked response actions and constraints; emphasize human verification.
4. **1:50–2:25:** Show provenance, timestamp, uncertainty, trace ID, and durable audit status.
5. **2:25–2:50:** Trigger ML advisory outage and demonstrate deterministic fallback.
6. **2:50–3:00:** Show measured test results and latency/cost evidence from your own deployed run.
