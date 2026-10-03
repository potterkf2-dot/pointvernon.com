# Point Vernon Guide

An independent static guide to Point Vernon, Queensland. The public website is entirely in `docs/`. Maintenance notes, photo registers, scripts and templates remain outside that publishing folder.

## Publishing

After merging the repair branch, set GitHub **Settings > Pages > Deploy from a branch > main > /docs**. Keep `docs/CNAME` and `docs/.nojekyll`. Check that old maintenance-file URLs return 404 after deployment and clear stale edge copies.

Local preview: `python3 -m http.server 8766 --directory docs`.
Validation: `python3 scripts/validate_site.py` and `node scripts/analytics-consent.test.cjs`.

## Analytics and advertising

GA4 is opt-in. A compact prompt offers Allow analytics and Decline; Privacy settings in the footer reopens it. GA4 remains unloaded before consent. Advertising, Google Signals and ad personalisation are disabled. No ads, paid placements, sponsors or affiliate links are published. No AdSense tag or ads.txt is included.

## Maintenance

Use Australian English, supported facts and photographs with permission. Give each changed page one update date, update its structured data and sitemap date, and change the asset version when its contents change. Avoid notices with expiry dates unless removal is arranged. See HOSTING-SECURITY.md, VERIFICATION-LIST.md and PHOTO-SHOT-LIST.md for follow-up work.
