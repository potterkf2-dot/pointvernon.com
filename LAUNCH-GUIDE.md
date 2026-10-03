# Release checklist

1. Run `python3 scripts/validate_site.py` and `node scripts/analytics-consent.test.cjs`.
2. Preview `docs/` and review changed pages at 390 and 1366 pixels.
3. Merge the reviewed branch, then set GitHub Pages to `main:/docs`.
4. Apply the Cloudflare rules in HOSTING-SECURITY.md and purge replaced URLs.
5. Confirm maintenance-file URLs return 404; test redirects, error status, images and consent.
6. Inspect priority pages in Search Console and submit the deployed sitemap to search engines.

Do not claim the source-folder move has fixed the live file exposure until deployment and live 404 checks pass.
