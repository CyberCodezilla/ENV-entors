# 🌊 HeatFlood Guardian

> **Mumbai Pilot · Andheri West / Versova**  
> Real-time flood and heat-aware route analysis for pedestrians and commuters.  
> Built natively on AWS (ap-south-1).

---

## 📍 Deployed Live Infrastructure & URLs

- **🌐 Frontend (AWS S3 Website):**  
  [http://heatflood-frontend-663972508924.s3-website.ap-south-1.amazonaws.com](http://heatflood-frontend-663972508924.s3-website.ap-south-1.amazonaws.com)

- **⚡ Backend API Gateway:**  
  `https://jpiub1heok.execute-api.ap-south-1.amazonaws.com/prod`

- **🔒 Amazon Cognito User Pool:**  
  - **User Pool ID:** `ap-south-1_1OFVAK83s`
  - **App Client ID:** `2lujrf79hedrp17ojn6ng8gaj2`
  - **RBAC Groups:** `Moderators`

- **🛡️ AWS WAF WebACL:**  
  - **WebACL Name:** `heatflood-webacl-prod`
  - **IP Rate Limit:** 300 requests / 5 min per client IP

---

## What it does

HeatFlood Guardian analyses up to 3 candidate walking/driving routes and scores every segment for:

- **Flood risk** — live precipitation (Open-Meteo), historic hotspots (DynamoDB), and community incident reports
- **Heat risk** — apparent temperature + humidity → wet-bulb stress index
- **Confidence** — degrades automatically when data is stale or sparse
- **ML Susceptibility** — SageMaker AI XGBoost susceptibility provider with automatic rule-engine fallback

Output: ranked routes with a per-segment risk breakdown, an interactive map overlay, and 3 pre-built replay scenarios (heat / flood / compound) for live demo without requiring real rain.

---

## Architecture

```
Browser (Next.js 14 App Router)
  │
  │  POST /routes/analyse
  │  GET  /incidents?bbox=...
  │  POST /incidents (Cognito Auth)
  │  GET  /demo/scenarios/:id
  │  GET  /health
  ▼
AWS API Gateway (HTTP API v2) ◄── protected by AWS WAF WebACL
  │
  ├── Lambda: analyseRoutes  ──► Mapbox Directions API
  │                          ──► Open-Meteo (weather)
  │                          ──► DynamoDB: incidents + hotspots
  │                          ──► SageMaker (Optional ML Provider)
  │
  ├── Lambda: createIncident ──► Cognito Authorizer ──► DynamoDB (write)
  ├── Lambda: listIncidents  ──► DynamoDB: GSI geohash-createdAt-index
  ├── Lambda: getDemoScenario ─► Static Scenario Fixtures
  └── Lambda: health         ──► { status: ok }

DynamoDB
  ├── heatflood-incidents-prod  (TTL enabled, GSI geohash-createdAt-index)
  └── heatflood-hotspots-prod   (Pre-seeded Mumbai flood hotspots)

SSM Parameter Store / Secrets Manager
  └── /heatflood/mapbox-token  (SecureString)
```

---

## Monorepo Structure

```
aws-env/
├── apps/web/              Next.js 14 frontend (Tailwind CSS, Mapbox GL JS)
│   └── src/
│       ├── app/page.tsx   Main application view
│       └── components/    Map, RouteCard, MapTooltip, MobileDrawer, DemoBanner, ...
├── lambda/src/
│   ├── handlers/          analyseRoutes, createIncident, listIncidents, getDemoScenario, health
│   ├── engine/            segmentScorer, routeRanker, floodRisk, heatRisk
│   ├── adapters/          mapbox, openMeteo, dynamodb, sagemaker
│   └── utils/             hotspotCache, logger
├── packages/shared/       Zod schemas, shared types, scoring constants
├── data/
│   ├── hotspots.json      Pre-seeded flood hotspot locations
│   └── scenarios/         heat.json, flood.json, compound.json
├── ml/                    Machine Learning module (XGBoost, SageMaker scripts)
├── infrastructure/
│   └── template.yaml      AWS SAM template (Cognito, WAF, Lambda, DynamoDB, HTTP API)
├── docs/
│   ├── API_AND_ROUTES.md  Master API, Routes & Endpoints documentation
│   └── DEPLOY.md          Deployment walkthrough
└── tests/
    └── unit/              TypeScript unit tests
```

---

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
git clone https://github.com/yashhh-23/aws-env.git
cd aws-env
npm install --workspaces
```

### 2. Configure Local Environment
Create `apps/web/.env.local`:
```ini
NEXT_PUBLIC_API_BASE_URL=https://jpiub1heok.execute-api.ap-south-1.amazonaws.com/prod
NEXT_PUBLIC_MAPBOX_TOKEN=pk.YOUR_MAPBOX_TOKEN
```

### 3. Run Frontend
```bash
cd apps/web
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## AWS SAM Deployment

```bash
# Build Lambda handlers and SAM template
npm run build --workspace=lambda
cd infrastructure
sam build

# Deploy to AWS ap-south-1
sam deploy --stack-name heatflood-guardian \
  --region ap-south-1 \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides "Stage=prod AllowedOrigins=*"
```

---

## Running Tests

```bash
# Run all TypeScript unit test suites (scoring, geo, schemas, risk engine)
npm test

# Run ML python feature unit tests
python -m pytest ml/tests/
```

---

## Complete Documentation & References

For complete API request/response schemas, frontend routes, security configuration, and machine learning pipelines, please refer to:
- 📖 **[API & Routes Master Guide](docs/API_AND_ROUTES.md)**
- 🤖 **[ML & SageMaker Integration Guide](ml/README.md)**
- 📊 **[Dataset & Feature Schema Specification](ml/data/README.md)**

---

## Team

Built by **Yash Dedhia** · Mumbai, Maharashtra  
AWS Hackathon Sprint
