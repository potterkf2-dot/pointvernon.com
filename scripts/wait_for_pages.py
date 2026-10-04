#!/usr/bin/env python3
"""Wait for the Pages deployment of this exact release before notifying search."""
import json
import os
import time
import urllib.request

repository = os.environ['GITHUB_REPOSITORY']
commit = os.environ['GITHUB_SHA']
headers = {'User-Agent': 'PointVernonReleaseCheck/1.0', 'Accept': 'application/vnd.github+json'}
if os.environ.get('GITHUB_TOKEN'):
    headers['Authorization'] = 'Bearer ' + os.environ['GITHUB_TOKEN']
url = f'https://api.github.com/repos/{repository}/actions/runs?head_sha={commit}&per_page=100'
for attempt in range(40):
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as response:
        runs = json.load(response)['workflow_runs']
    deployments = [run for run in runs if run['name'] == 'pages build and deployment' and run['head_branch'] == 'main']
    if deployments:
        latest = max(deployments, key=lambda run: run['id'])
        if latest['status'] == 'completed':
            if latest['conclusion'] != 'success':
                raise SystemExit('Pages deployment did not succeed; skipping IndexNow.')
            print('Pages deployment succeeded for', commit)
            break
    print('Waiting for Pages deployment, check', attempt + 1, flush=True)
    time.sleep(15)
else:
    raise SystemExit('Timed out waiting for this release to deploy; retry the workflow after deployment.')
