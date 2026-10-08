from __future__ import annotations
import json
from pathlib import Path

# The official Open Government Data catalog entry is tracked here for provenance.
# The portal exposes a zip/catalog download, whose exact asset URL can change. This script records the source metadata;
# fetch_real_data.py remains the reproducible API acquisition path.
CATALOG_URL = 'https://ap.data.gov.in/catalog/rainfall-dataset-mumbai-suburban-maharashtra'
OUT = Path(__file__).resolve().parents[1] / 'data' / 'raw' / 'sources.json'

def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        'official_mumbai_rainfall_catalog': CATALOG_URL,
        'provider': 'Maharashtra Revenue and Forest Department / Mumbai Suburban District Collector Office',
        'status': 'source-registered',
        'note': 'Use the portal download when available. Do not scrape CAPTCHA pages automatically.'
    }, indent=2))
    print(OUT)

if __name__ == '__main__': main()
