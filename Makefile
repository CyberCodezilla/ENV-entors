.PHONY: install build deploy seed local test

install:
	npm install --workspaces

build:
	cd lambda && npm run build

deploy: build
	cd infrastructure && sam deploy \
		--stack-name heatflood-guardian \
		--region ap-south-1 \
		--capabilities CAPABILITY_IAM \
		--parameter-overrides Stage=prod \
		--resolve-s3 \
		--no-fail-on-empty-changeset

seed:
	cd lambda && npx ts-node ../scripts/seedHotspots.ts

local:
	cd infrastructure && sam local start-api --port 3001 &
	cd apps/web && npm run dev

test:
	npx vitest run tests/unit

test-e2e:
	API_BASE_URL=$(API_URL) npx vitest run tests/e2e
