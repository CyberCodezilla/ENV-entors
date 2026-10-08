# 🌊 HeatFlood Guardian

> **Mumbai Pilot · Andheri West / Versova**
>
> Real-time flood and heat-aware route analysis for pedestrians and commuters.  
> Built for the 5-day AWS hackathon — Sept 2026.

---

## What it does

HeatFlood Guardian analyses up to 3 candidate walking/driving routes and scores every segment for:

- **Flood risk** — live precipitation (Open-Meteo), historic hotspots (DynamoDB), and community incident reports
- **Heat risk** — apparent temperature + humidity → wet-bulb stress index
- **Confidence** — degrades automatically when data is stale or sparse

Output: ranked routes with a per-segment risk breakdown, a map overlay, and 3 pre-built replay scenarios (heat / flood / compound) for live demo without requiring real rain.

---

## Architecture

```
Browser (Next.js 14)
  │
  │  POST /routes/analyse
  │  GET  /incidents?bbox=...
  │  POST /incidents
  │  GET  /demo/scenarios/:id
  │  GET  /health
  ▼
AWS API Gateway (HTTP API)
  │
  ├── Lambda: analyseRoutes  ──► Mapbox Directions API
  │                          ──► Open-Meteo (weather)
  │                          ──► DynamoDB: incidents + hotspots
  │
  ├── Lambda: createIncident ──► DynamoDB: incidents (write)
  ├── Lambda: listIncidents  ──► DynamoDB: incidents (read, bbox filter)
  ├── Lambda: getDemoScenario ─► data/scenarios/*.json (bundled)
  └── Lambda: health         ──► { status: ok }

DynamoDB
  ├── heatflood-incidents-{stage}  (TTL, geohash GSI)
  └── heatflood-hotspots-{stage}   (static, seeded once)

SSM Parameter Store
  └── /heatflood/mapbox-token  (SecureString)
```

---

## Project structure

```
aws-env/
├── apps/web/              Next.js 14 frontend
│   └── src/
│       ├── app/page.tsx   Main page
│       └── components/    Map, RouteCard, MapTooltip, MobileDrawer, …
├── lambda/src/
│   ├── handlers/          analyseRoutes, createIncident, listIncidents,
│   │                      getDemoScenario, getStatus, health
│   ├── engine/            segmentScorer, routeRanker, floodRisk, heatRisk
│   ├── adapters/          mapbox, openMeteo, dynamodb
│   └── utils/             hotspotCache, logger
├── shared/src/            Zod schemas, shared types, scoring constants
├── data/
│   ├── hotspots.json      Pre-seeded flood hotspot locations
│   └── scenarios/         heat.json, flood.json, compound.json
├── infrastructure/
│   └── template.yaml      AWS SAM template (5 Lambdas, 2 DynamoDB, HTTP API)
├── scripts/seedHotspots.ts
├── tests/
│   ├── unit/              Zod validation, scoring logic, scenario fixtures
│   └── e2e/               Health-check smoke test
├── docs/DEPLOY.md
├── Makefile
└── .env.example
```

---

## Quick start (local dev)

### Prerequisites

- Node.js 20+, npm 10+
- AWS CLI + SAM CLI
- Mapbox account (public token + secret token)

### 1. Clone and install

```bash
git clone https://github.com/yashhh-23/aws-env.git
cd aws-env
npm install --workspaces
```

### 2. Store Mapbox secret in SSM

```bash
aws ssm put-parameter \
  --name "/heatflood/mapbox-token" \
  --value "sk.YOUR_SECRET_TOKEN" \
  --type SecureString --region ap-south-1
```

### 3. Build + deploy

```bash
make build
make deploy          # creates CloudFormation stack in ap-south-1
make seed            # seeds hotspots into DynamoDB
```

Copy the `ApiUrl` from the SAM output.

### 4. Run frontend

```bash
cp .env.example apps/web/.env.local
# Fill in NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_MAPBOX_TOKEN
cd apps/web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo scenarios (judge walkthrough)

Click the **heat / flood / compound** buttons in the header. No real rain required.

| Scenario | Weather injected | Incidents | Expected UI |
|---|---|---|---|
| `heat` | 42.1°C feels-like, 85% humidity | None | Routes show 🔴 High Heat; sidebar shows WeatherBanner |
| `flood` | 28.4 mm/hr rain | 1 official_closure + 2 corroborated | 1 route ⛔ Blocked; amber + red markers on map |
| `compound` | 38.5°C + 2.1 mm residual rain | 3 incidents (2 verified, 1 corroborated) | ⛔ NoRouteState — "No safe route can be recommended" |

---

## Running tests

```bash
# Unit tests (no network required)
make test

# E2E smoke test (requires deployed API)
export API_URL=https://YOUR_API.execute-api.ap-south-1.amazonaws.com/prod
make test-e2e
```

---

## API reference

### `POST /routes/analyse`

```json
{
  "origin":      { "lat": 19.112, "lon": 72.832 },
  "destination": { "lat": 19.138, "lon": 72.855 },
  "mode":        "walking",
  "departureTime": "2026-09-30T07:00:00Z",
  "heatSensitive": false,
  "isReplay": false
}
```

Response includes `routes[]` (ranked), `weather`, `dataFreshness`, `hasConfidentRecommendation`.

### `POST /incidents`

Report a community hazard. Rate-limited to 5/hour per IP.

### `GET /incidents?bbox=lngMin,latMin,lngMax,latMax`

Returns active incidents visible in the map viewport.

### `GET /demo/scenarios/:id`

Returns fixture payload for `id ∈ {heat, flood, compound}`.

### `GET /health`

Returns `{ status: "ok", timestamp, version }`.

---

## Known limitations

1. **Pilot zone only** — coordinates outside Andheri West / Versova will return routes but with minimal hotspot/incident data support.
2. **No ML model** — scoring is deterministic (rule-based). SageMaker integration is out of scope for the 5-day sprint.
3. **Mapbox dependency** — route geometry requires a valid Mapbox secret token. If the token is missing or quota exceeded, `analyseRoutes` returns `ROUTING_UNAVAILABLE`.
4. **Weather freshness** — Open-Meteo updates hourly. Between updates, `dataFreshness.weatherAgeMinutes` may reach ~55 min; the WeatherBanner shows a staleness warning at 30 min.
5. **Single-report confidence** — a single community report raises flood score but does NOT block a route. Two corroborating reports required for `corroborated` status.
6. **No auth** — community reports are rate-limited by IP only. Sock-puppet flooding is mitigated by corroboration thresholds, not identity.
7. **DynamoDB cold scan** — `listIncidents` uses a full scan with TTL filter for simplicity. For production, migrate to a geohash-based query on the GSI.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Mapbox GL JS |
| API | AWS API Gateway (HTTP API), AWS Lambda (Node.js 20, arm64) |
| Compute | AWS SAM for IaC + local testing |
| Database | Amazon DynamoDB (on-demand, TTL, GSI) |
| Secrets | AWS SSM Parameter Store |
| Weather | Open-Meteo (free, no key) |
| Routing | Mapbox Directions API |
| Language | TypeScript (strict) throughout |
| Testing | Vitest |
| Deployment | SAM CLI + Vercel (frontend) |

---

## Team

Built by **Yash Dedhia** · Mumbai, Maharashtra  
5-day AWS hackathon sprint · September 2026
