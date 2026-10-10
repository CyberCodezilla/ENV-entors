# 🗺️ HeatFlood Guardian — Complete API & Routes Documentation

> **Master Architecture & Integration Reference**  
> **Region:** AWS `ap-south-1` (Mumbai)  
> **Stage:** `prod`

---

## 📍 Deployed Live Infrastructure & URLs

| Component | AWS Resource / URL | Details |
|---|---|---|
| **Frontend Web App** | [http://heatflood-frontend-663972508924.s3-website.ap-south-1.amazonaws.com](http://heatflood-frontend-663972508924.s3-website.ap-south-1.amazonaws.com) | AWS S3 Static Website Hosting |
| **Backend API Gateway** | `https://jpiub1heok.execute-api.ap-south-1.amazonaws.com/prod` | AWS API Gateway HTTP API v2 |
| **Cognito User Pool** | `ap-south-1_1OFVAK83s` | Amazon Cognito Auth |
| **Cognito App Client** | `2lujrf79hedrp17ojn6ng8gaj2` | Public OAuth 2.0 / SRP Client |
| **Cognito User Group** | `Moderators` | RBAC Group for Incident Moderation |
| **AWS WAF WebACL** | `heatflood-webacl-prod` | Regional WAF IP Rate-Limiting |
| **DynamoDB Incidents** | `heatflood-incidents-prod` | TTL Enabled, GSI `geohash-createdAt-index` |
| **DynamoDB Hotspots** | `heatflood-hotspots-prod` | Pre-seeded Mumbai flood hotspots |
| **SSM Parameter Store** | `/heatflood/mapbox-token` | Encrypted Mapbox API Secret Token |

---

## 📡 API Endpoints Reference

### 1. `POST /routes/analyse`
Analyses up to 3 candidate routes between origin and destination, calculating segment-level flood risk, heat risk, data confidence, and overall recommendation rankings.

- **Auth:** Public (`NONE`)
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "origin": { "lat": 19.1120, "lon": 72.8320 },
  "destination": { "lat": 19.1380, "lon": 72.8550 },
  "mode": "walking",
  "departureTime": "2026-10-08T10:00:00Z",
  "heatSensitive": true,
  "isReplay": false
}
```

#### Response Example (`200 OK`)
```json
{
  "requestId": "E4b_ojsThcwEJRA=",
  "processedAt": "2026-10-08T10:00:00.000Z",
  "isReplay": false,
  "scenarioId": null,
  "routes": [
    {
      "routeId": "mapbox-route-0",
      "rank": 1,
      "distanceM": 5282.9,
      "durationSec": 3745.7,
      "geometry": "...",
      "maxFloodRisk": 1,
      "weightedFloodExposure": 0,
      "weightedHeatExposure": 27,
      "overallFloodLevel": "low",
      "overallHeatLevel": "low",
      "overallConfidenceLevel": "moderate",
      "isHardBlocked": false,
      "blockReason": null,
      "topReasons": [],
      "disclaimer": "This recommendation is based on available evidence and may not reflect current road conditions."
    }
  ],
  "hasConfidentRecommendation": true,
  "noConfidentRouteReason": null,
  "weather": {
    "apparentTemperatureC": 33.6,
    "relativeHumidityPct": 70,
    "precipitationMm": 0,
    "observedAt": "2026-10-08T10:00:00Z",
    "fetchedAt": "2026-10-08T10:00:00Z",
    "isStale": false,
    "staleThresholdMinutes": 30
  },
  "dataFreshness": {
    "weatherAgeMinutes": 5,
    "hotspotsLoadedAt": "2026-10-08T10:00:00Z"
  },
  "mlAvailable": false,
  "alternativesAvailable": true
}
```

---

### 2. `GET /status`
Fetches current environmental risk status for a specific geographic coordinate.

- **Auth:** Public (`NONE`)
- **Query Parameters:**
  - `lat` (number, required): e.g. `19.1120`
  - `lon` (number, required): e.g. `72.8320`

#### Response Example (`200 OK`)
```json
{
  "lat": 19.1120,
  "lon": 72.8320,
  "areaFloodLevel": "low",
  "areaHeatLevel": "moderate",
  "confidenceLevel": "high",
  "activeHazardsCount": 0,
  "lastUpdated": "2026-10-08T10:00:00Z"
}
```

---

### 3. `POST /incidents`
Submits a new crowd-sourced or official hazard report.

- **Auth:** Amazon Cognito Bearer Token (`Authorization: Bearer <cognito-jwt>`)
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "latitude": 19.1180,
  "longitude": 72.8370,
  "type": "waterlogging",
  "depthCategory": "knee",
  "observedAt": "2026-10-08T10:00:00Z",
  "idempotencyKey": "report-1728384000-abc1234"
}
```

#### Response Example (`201 Created`)
```json
{
  "incidentId": "inc-98234-f812",
  "status": "pending_corroboration",
  "expiresAt": "2026-10-09T10:00:00Z"
}
```

---

### 4. `GET /incidents`
Fetches active incidents within a geographic bounding box for map viewport rendering. Optimized via DynamoDB `geohash-createdAt-index` GSI.

- **Auth:** Public (`NONE`)
- **Query Parameters:**
  - `bbox` (string, required): `lngMin,latMin,lngMax,latMax` (e.g. `72.81,19.09,72.88,19.15`)

#### Response Example (`200 OK`)
```json
{
  "incidents": [
    {
      "incidentId": "inc-98234-f812",
      "latitude": 19.1180,
      "longitude": 72.8370,
      "type": "waterlogging",
      "depthCategory": "knee",
      "status": "verified",
      "observedAt": "2026-10-08T10:00:00Z"
    }
  ],
  "count": 1,
  "fetchedAt": "2026-10-08T10:00:00Z"
}
```

---

### 5. `GET /demo/scenarios/{id}`
Returns pre-set historical fixture data for judge demonstration without requiring active rain.

- **Auth:** Public (`NONE`)
- **Path Parameters:**
  - `id`: `heat` | `flood` | `compound`

#### Response Example (`200 OK`)
```json
{
  "scenarioId": "heat",
  "_description": "Peak summer heat scenario: 42°C feels-like, 85% humidity.",
  "origin": { "lat": 19.1120, "lon": 72.8320 },
  "destination": { "lat": 19.1380, "lon": 72.8550 },
  "mode": "walking",
  "departureTime": "2026-07-18T08:00:00Z",
  "heatSensitive": true,
  "isReplay": true,
  "_weatherOverride": {
    "apparentTemperatureC": 42.1,
    "relativeHumidityPct": 85,
    "precipitationMm": 0,
    "forecastHourUtc": "2026-07-18T08:00:00Z"
  }
}
```

---

### 6. `GET /health`
Returns backend health status, region, version, and SageMaker integration state.

- **Auth:** Public (`NONE`)

#### Response Example (`200 OK`)
```json
{
  "status": "ok",
  "service": "heatflood-guardian",
  "timestamp": "2026-10-08T10:00:00Z",
  "version": "0.1.0",
  "region": "ap-south-1",
  "sagemakerEnabled": false
}
```

---

## 🎨 Frontend Structure & Routes

- **Root Route (`/`):** Next.js 14 App Router single-page application (`apps/web/src/app/page.tsx`).
- **Core Components:**
  - `Map.tsx`: Mapbox GL JS map integration with viewport geohash filtering.
  - `RouteCard.tsx`: Displays route risk pill badges, distance, travel duration, and risk score breakdown.
  - `DemoBanner.tsx`: Header warning banner indicating historical replay mode (`⏱️ DEMO SCENARIO`).
  - `WeatherBanner.tsx`: Live weather snapshot (`🌡️ Temperature`, `💧 Humidity`, `🌧️ Precipitation`).
  - `NoRouteState.tsx`: High-visibility emergency alert block (`⛔ No safe route can be recommended`).
  - `ReportIncidentModal.tsx`: User modal to report hazards directly from map click.
  - `MapLegend.tsx`: Bottom-right floating risk level and hazard marker legend.
  - `MapTooltip.tsx`: Interactive segment hover inspection box.

---

## 🔐 Security & Infrastructure Config

1. **Amazon Cognito User Pools:**
   - User Pool: `heatflood-user-pool-prod`
   - Groups: `Moderators` (administrative approval), `Reporters` (community users)
2. **AWS WAF Rate-Limiting:**
   - WebACL: `heatflood-webacl-prod`
   - IP Rate Limit: 300 requests / 5 minutes per client IP.
3. **CORS Policy:**
   - `Access-Control-Allow-Origin: *`
   - Allowed Methods: `GET, POST, OPTIONS`


## Innovation scenario API (additive)

- `POST /scenarios/run` — accepts a preset `scenarioId` (`cloudburst`, `heat`, `blocked-road`, or `compound`) and bounded scenario inputs; returns deterministic indices, ranked recommendations, provenance, uncertainty, trace ID, and audit/event status. Every result is labelled simulated and requires human review.
- `GET /scenarios/history` — returns the latest persisted scenario audit entries; if DynamoDB is unavailable, returns an explicit non-persistent status instead of failing the deterministic simulator.
- EventBridge publishes `HeatFloodScenarioAssessed` on the stage-specific event bus. A Step Functions workflow validates that the event is explicitly simulated and updates the audit row to `PROCESSED`, with bounded retries.
- `GET /command-center/` is the static frontend route. It uses the configured `NEXT_PUBLIC_API_BASE_URL`; when the API is unavailable, the page visibly falls back to a local deterministic simulation and states that the run was not durably audited.
