# HeatFlood Guardian — Deployment Checklist (Day 4)

## Pre-requisites

- [ ] AWS CLI configured (`aws configure` with `ap-south-1`)
- [ ] AWS SAM CLI installed (`sam --version`)
- [ ] Node.js 20+ and npm 10+
- [ ] Mapbox account with two tokens:
  - **Public token** (`pk.*`) — for the frontend map
  - **Secret token** (`sk.*`) — for the backend Directions API

---

## Step 1: Store Mapbox secret in SSM Parameter Store

```bash
aws ssm put-parameter \
  --name "/heatflood/mapbox-token" \
  --value "sk.YOUR_SECRET_MAPBOX_TOKEN" \
  --type SecureString \
  --region ap-south-1
```

## Step 2: Build Lambda

```bash
make build
# or: cd lambda && npm run build
```

## Step 3: Deploy with SAM

```bash
make deploy
# SAM will:
#   - Create S3 bucket for deployment artefacts
#   - Deploy CloudFormation stack: heatflood-guardian
#   - Create incident/hotspot/scenario tables, Lambda functions, HTTP API Gateway, EventBridge bus/rule, and Step Functions workflow
```

Note the `ApiUrl` output — you will need it for Step 5.

## Step 4: Seed hotspots

```bash
export HOTSPOTS_TABLE=heatflood-hotspots-prod
make seed
```

Expected output: `21 seeded, 0 failed` (or however many rows are in data/hotspots.json).

## Step 5: Configure frontend

```bash
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local:
#   NEXT_PUBLIC_API_BASE_URL=https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com/prod
#   NEXT_PUBLIC_MAPBOX_TOKEN=pk.YOUR_PUBLIC_TOKEN
```

## Step 6: Run frontend locally

```bash
cd apps/web && npm run dev
# Open http://localhost:3000
```

## Step 7: Deploy frontend (AWS S3 Static Web Hosting)

1. Ensure static export is enabled in `apps/web/next.config.mjs` (`output: 'export'`).
2. Build the static export:
```bash
cd apps/web
npm run build
```
3. Create and configure an S3 bucket for web hosting:
```bash
export BUCKET_NAME=heatflood-frontend-YOUR_ACCOUNT_ID
aws s3 mb s3://$BUCKET_NAME --region ap-south-1
aws s3api delete-public-access-block --bucket $BUCKET_NAME --region ap-south-1
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document 404.html --region ap-south-1
# Don't forget to apply a public read bucket policy to allow s3:GetObject
```
4. Sync the build output:
```bash
aws s3 sync out s3://$BUCKET_NAME --delete --region ap-south-1
```

## Step 8: Smoke test

```bash
export API_URL=https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com/prod
make test-e2e
```

Expected: all e2e tests pass.

---

## Teardown

```bash
aws cloudformation delete-stack --stack-name heatflood-guardian --region ap-south-1
```

Note: DynamoDB tables have `DeletionPolicy: Retain` — delete them manually if needed.
