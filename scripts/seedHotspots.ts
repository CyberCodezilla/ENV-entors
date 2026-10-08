/**
 * Seed script: loads data/hotspots.json into DynamoDB heatflood-hotspots table.
 * Run once after `sam deploy`:
 *   npx ts-node scripts/seedHotspots.ts
 *
 * Set AWS_REGION and AWS_PROFILE (or use instance role in Lambda).
 */
import { DynamoDBClient, PutItemCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import * as fs from 'fs';
import * as path from 'path';

const TABLE = process.env.HOTSPOTS_TABLE ?? 'heatflood-hotspots';
const REGION = process.env.AWS_REGION ?? 'ap-south-1';

interface HotspotRecord {
  hotspotId: string;
  name: string;
  lat: number;
  lon: number;
  radiusM: number;
  type: string;
  notes: string;
  source: string;
}

async function main() {
  const client = new DynamoDBClient({ region: REGION });

  // Verify table exists
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE }));
    console.log(`✓ Table ${TABLE} found in ${REGION}`);
  } catch {
    console.error(`✗ Table ${TABLE} not found. Run 'sam deploy' first.`);
    process.exit(1);
  }

  const dataPath = path.join(__dirname, '..', 'data', 'hotspots.json');
  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as { hotspots: HotspotRecord[] };

  let success = 0;
  let failed = 0;

  for (const hotspot of raw.hotspots) {
    try {
      await client.send(new PutItemCommand({
        TableName: TABLE,
        Item: marshall({
          ...hotspot,
          seededAt: new Date().toISOString(),
          isDemo: false,
        }),
      }));
      console.log(`  ✓ Seeded: ${hotspot.hotspotId} (${hotspot.name})`);
      success++;
    } catch (err) {
      console.error(`  ✗ Failed: ${hotspot.hotspotId}`, err);
      failed++;
    }
  }

  console.log(`\nDone. ${success} seeded, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main();
