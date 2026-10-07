# HeatFlood Guardian

A hyperlocal, explainable travel-decision assistant for combined heat and waterlogging risk in Mumbai.

> **"Before leaving, compare routes by heat exposure and reported waterlogging, understand why each route is risky, and know when the available evidence is too weak to recommend travel."**

---

## Architecture

```
Next.js (Amplify) → API Gateway → Lambda → DynamoDB
                                        ↳ Mapbox Directions
                                        ↳ Open-Meteo Weather
                                        ↳ SageMaker AI (Day 5, optional)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Mapbox GL JS |
| API | Amazon API Gateway HTTP API |
| Backend | AWS Lambda, Node.js 20, TypeScript |
| Database | Amazon DynamoDB |
| Auth | Amazon Cognito (moderator only) |
| Hosting | AWS Amplify Hosting |
| Weather | Open-Meteo (free, no key) |
| Routing | Mapbox Directions API |
| Monitoring | Amazon CloudWatch |
| ML (optional) | SageMaker AI + XGBoost (Day 5) |

## Five-Day Plan

| Day | Goal |
|---|---|
| 1 | Contracts, schemas, deployed skeleton |
| 2 | Rule-based risk engine, real routes and weather |
| 3 | Reports, incident lifecycle, evidence UI |
| 4 | Moderation, hardening, ML handoff |
| 5 | Optional SageMaker XGBoost integration |

## Key Principles

- Lambda is **always** the final decision-maker
- ML may add a shadow signal only — it cannot override verified closures
- Risk and confidence are **separate** calculations
- "No route can be recommended confidently" is a valid, required outcome
- Never display "safe route" — only "lower estimated risk"

## Project Structure

```
├── apps/
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared TypeScript schemas, types and constants
├── infrastructure/   # AWS SAM template
├── lambda/           # Lambda handlers
├── docs/             # Product contract, feature schema, ML handoff docs
├── tests/
│   └── fixtures/     # Deterministic replay scenarios
└── data/             # Hotspot GeoJSON and training data manifest
```

## Getting Started

```bash
# Install dependencies
npm install

# Run frontend locally
cd apps/web && npm run dev

# Deploy backend (requires AWS CLI configured)
cd infrastructure && sam build && sam deploy --guided
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_API_BASE_URL=
SAGEMAKER_ENABLED=false
SAGEMAKER_ENDPOINT_NAME=
MAPBOX_TOKEN=
```

See `docs/product-contract.md` for pilot area, accepted claims, and scope limits.
