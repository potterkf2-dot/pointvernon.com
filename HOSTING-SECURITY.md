# Hosting, security and caching

The site is served by GitHub Pages behind Cloudflare. Cloudflare supplies the response headers and the cache rule that GitHub Pages cannot configure.

## Live configuration

The following configuration was promoted from report-only to enforced and verified on 22 August 2026:

- `Strict-Transport-Security: max-age=31536000`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()`
- the Content Security Policy below.

The Cloudflare response-header rule applies to all responses. The site HTML also declares the same referrer policy as a safe fallback.

Do not add HSTS `includeSubDomains` or `preload` until every subdomain is confirmed HTTPS-only.

## Enforced Content Security Policy

```text
default-src 'self'; base-uri 'self'; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com; object-src 'none'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; script-src-attr 'none'; style-src 'self'; upgrade-insecure-requests
```

`'unsafe-inline'` is presently required for the page-specific JSON-LD blocks. It does not permit inline event-handler attributes because `script-src-attr 'none'` is set. A later build can generate and deploy per-page JSON-LD hashes; only then remove `'unsafe-inline'`.

If an external newsletter form is added, extend `form-action` only for the selected provider's exact HTTPS endpoint. Do not use a wildcard.

## Cache rule

The current source references these explicitly versioned assets:

- `/assets/css/style.css?v=20260908-design-v2`
- `/assets/js/privacy.js?v=20260908-ga4-repair-v1`

The existing edge rule matches the exact path and version query. Each JavaScript repair receives a new URL on every HTML page, so older cached scripts cannot mask the repair. The 8 September 2026 Analytics repair uses the version above; until that URL is added to any long-cache rule, it uses the normal origin cache lifetime. Recheck live response headers after changing cache rules. Every future CSS or JavaScript change must update the relevant version on every page; the source validator checks that references remain consistent.

Images retain the shorter origin cache lifetime because their public URLs are not currently versioned.

## Verification

After the live rules were deployed, repeated public checks returned the enforced `Content-Security-Policy` header, `CF-Cache-Status: HIT`, and `Cache-Control: max-age=31536000` for both versioned assets. The opt-in Analytics script, structured data, images and custom 404 continued to load without browser errors.

The repository also publishes `/.well-known/security.txt`. Revisit its `Expires` value before 22 August 2027 and keep the contact address monitored.
