#!/usr/bin/env python3
"""Submit the published sitemap URLs after deployment; no credential is required."""
import json
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
root = Path(__file__).resolve().parent.parent
key = (root / 'INDEXNOW-KEY').read_text().strip()
urls = [n.text for n in ET.parse(root / 'docs/sitemap.xml').findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
headers = {'User-Agent': 'PointVernonReleaseCheck/1.0'}
# Confirm the deployed key first so an early submission cannot use an absent key.
key_request = urllib.request.Request('https://pointvernon.com/' + key + '.txt', headers=headers)
with urllib.request.urlopen(key_request, timeout=20) as response:
    if response.read().decode().strip() != key:
        raise SystemExit('Published key differs; deploy the key file before submitting.')
payload = {'host': 'pointvernon.com', 'key': key, 'keyLocation': 'https://pointvernon.com/' + key + '.txt', 'urlList': urls}
request = urllib.request.Request('https://api.indexnow.org/indexnow', data=json.dumps(payload).encode(), headers={**headers, 'Content-Type': 'application/json'}, method='POST')
with urllib.request.urlopen(request, timeout=30) as response:
    print('IndexNow submission HTTP', response.status, 'for', len(urls), 'URLs. Indexing is not guaranteed.')
