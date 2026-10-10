# Hosting, security and caching

GitHub Pages publishes `main:/docs`; Cloudflare supplies edge caching, redirects and response headers. The redirect and caching settings below were applied in Cloudflare on 4 October 2026. Repository files alone do not apply dashboard settings.

## Redirects

Permanent 301 redirects send `/updates`, `/updates/` and `/updates.xml` to `/whats-on/`, and `/editorial-policy` and `/editorial-policy/` to `/about/`. Both apex and www hosts match. The two HTML stubs remain as fallbacks if Cloudflare is bypassed. Keep canonical HTTPS and trailing-slash redirects.

## Caching

The public HTML rule matches the 36 sitemap paths with no query string. Edge and browser caches respect the origin cache-control lifetime (currently 600 seconds); a missing cache-control header bypasses caching. Status codes 400 and higher are not stored. Other paths and query requests do not match this rule. Purge changed page URLs when an immediate release refresh is needed.

The versioned asset rule matches `/assets/` URLs whose query begins `v=`. Edge and browser lifetimes are one year; query strings remain part of the cache key. Status codes 400 and higher are not stored at the edge. Every asset change must change its version. Unversioned images retain their existing cache behaviour; do not assign them an immutable one-year lifetime.

## Security headers

Keep HSTS, nosniff, X-Frame-Options DENY, strict-origin-when-cross-origin and the existing Permissions-Policy. The following Content Security Policy was checked in report-only mode against navigation, guide search and both analytics choices, then enforced on 4 October 2026:

```
default-src 'self'; base-uri 'self'; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com; object-src 'none'; script-src 'self' https://www.googletagmanager.com; script-src-attr 'none'; style-src 'self'; upgrade-insecure-requests
```

JSON-LD is data, not executable JavaScript; it is not a reason to permit arbitrary inline scripts. Recheck menus, guide search, images and both GA4 consent choices when changing scripts. No advertising script or frame domains are allowed. The static AdSense verification meta tag and ads.txt file require no additional CSP permissions. Before serving ads, separately configure advertising consent, update the public privacy explanation and validate the required Google script, frame, image and connection domains; never widen CSP just to complete site verification.

Public mailto anchors use Cloudflare’s `email_off` comments to preserve usable links without scripts and allow their consent-gated click measurement. Global email obfuscation does not need to be disabled. Review DMARC with the actual mail provider; begin with monitoring and assess legitimate senders before enforcement.

## Release checks

Old working-file URLs must return real 404 responses. The 404 page must return status 404. All five retired route variants must return 301. Recheck headers, HTML cache hits, consent behaviour and public images. Keep security.txt contact, policy and expiry current.
