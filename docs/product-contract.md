# HeatFlood Guardian — Product Contract

> Frozen on Day 1. No changes without team sign-off.

---

## Pilot Area

- **Zone:** Andheri West / Versova corridor, Mumbai
- **Boundary box:** `[72.8200, 19.1000, 72.8700, 19.1450]` (lng_min, lat_min, lng_max, lat_max)
- **Requests outside boundary:** Return `OUTSIDE_PILOT_ZONE` error; do not score risk.

## Travel Modes

| Mode | Mapbox Profile | Notes |
|---|---|---|
| Walking | `walking` | Primary mode for MVP |
| Driving | `driving-traffic` | Add only after walking flow is complete |

## Route Alternatives

Mapbox may return 0, 1, or 2 alternatives. The API and UI **must** handle each case:
- 0 or 1 routes: State "no alternative route was returned" — do not fabricate a line.
- Up to 3 candidates: Score all, rank, display.

## Risk Bands

| Level | Display label | Colour + icon |
|---|---|---|
| 0–30 | Low concern | Green + shield |
| 31–60 | Moderate concern | Amber + warning |
| 61–85 | High concern | Orange + alert |
| 86–100 | Blocked / Critical | Red + X |

## Confidence Bands

| Score | Display label |
|---|---|
| 0–40 | Limited data |
| 41–70 | Moderate evidence |
| 71–100 | Good evidence |

## Hard-Block Definition

A route segment is hard-blocked **only** when one of the following is active:
1. Official road closure (source: trusted authority).
2. Moderator-verified `impassable` incident report that has not expired.
3. Electrical-hazard report verified by moderator.

A single **unverified** community report does **not** block a route. It raises flood risk and lowers confidence.

## Report Lifecycle

```
pending → corroborated (2+ independent nearby reports)
       → verified (moderator action)
       → rejected (moderator action)
       → resolved (condition no longer active)
       → expired (TTL elapsed without re-confirmation)
```

## Evidence Source Authority (highest → lowest)

1. Official closure / trusted sensor observation
2. Moderator-verified active incident
3. Two or more independent nearby community reports
4. One unverified community report
5. Static historical hotspot
6. Weather-derived flood susceptibility

## Claims the App Is Allowed to Make

- "This route has lower estimated flood exposure."
- "Recent nearby reports indicate possible waterlogging."
- "The weather feed is 18 minutes old."
- "No route can be recommended confidently."
- "This recommendation is based on weather, hotspot, and community evidence."

## Claims the App Must Never Make

- "This route is safe."
- "No flooding exists here."
- "This model predicts floods accurately."
- "This report is verified as true."
- "This route will prevent heat illness."
- "Rainfall at the weather grid means this street is flooded."

## Report Expiry TTL

| Source type | Default TTL |
|---|---|
| Unverified community report | 2 hours |
| Corroborated community report | 4 hours |
| Moderator-verified active | Until resolved or manually expired |
| Historical hotspot | Permanent (static fixture) |

## Timestamp Handling

- All storage and API responses: **UTC ISO 8601**.
- All UI display: **Asia/Kolkata (IST)**.
- Open-Meteo `precipitation` is the **preceding-hour sum**; `apparent_temperature` is instantaneous. Never compare them as if they cover the same interval.

## Live vs Replay

- Demo scenario data must be **physically separate** from live incidents in DynamoDB.
- Every replay screen must display a visible **"Historical/demo scenario"** banner.
- Replay scenarios must work even if all external APIs are unavailable.

## Disclaimer (required on every route result)

> "This recommendation is based on available evidence and may not reflect current road conditions. Never enter floodwater. Check official guidance before travel."

## Feedback Loop

- "Is this report still present?" feedback on verified incidents.
- "Did this recommendation help?" after a completed trip.
- Feedback stored with timestamp; not used to auto-adjust route decisions.

## Not in Scope (MVP)

- Full-city navigation or turn-by-turn directions.
- Automated emergency dispatch.
- LLM or generative AI deciding route eligibility.
- Precise water-depth prediction.
- Satellite or radar flood segmentation.
- Real-time IoT sensor network built from scratch.
