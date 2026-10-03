# Hosting, security and caching

GitHub Pages publishes `main:/docs`; Cloudflare supplies edge caching, redirects and response headers. The changes below require dashboard configuration. Repository files alone do not apply them.

## Redirects

Add permanent 301 redirects: `/updates/` and `/updates.xml` to `/whats-on/`; `/editorial-policy/` to `/about/`. Remove the two HTML fallback stubs after the rules work. Keep canonical HTTPS and trailing-slash redirects.

## Caching

Cache public HTML at the edge with a short lifetime, for example one hour, and purge changed pages on release. Match asset paths `/assets/*` and `/images/*`, independent of the query version. Use one year for immutable, versioned asset URLs; change the filename/version or purge when replacing an image at the same URL. Keep error responses and operational endpoints out of the HTML rule. Confirm MISS then HIT on repeated requests, and the intended browser lifetime.

## Security headers

Keep HSTS, nosniff, X-Frame-Options DENY, strict-origin-when-cross-origin and the existing Permissions-Policy. Test this candidate Content Security Policy in report-only mode before enforcement:

```
default-src 'self'; base-uri 'self'; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com; object-src 'none'; script-src 'self' https://www.googletagmanager.com; script-src-attr 'none'; style-src 'self'; upgrade-insecure-requests
```

JSON-LD is data, not executable JavaScript; it is not a reason to permit arbitrary inline scripts. Validate menus, guide search, images and both GA4 consent choices before enforcing. No advertising script or frame domains are allowed.

Turn off email address obfuscation to keep mailto links usable without scripts and allow their consent-gated click measurement. Review DMARC with the actual mail provider; begin with monitoring and assess legitimate senders before enforcement.

## Release checks

Old working-file URLs must return real 404 responses. The 404 page must return status 404. The three redirect URLs must return 301. Recheck headers, HTML cache hits, consent behaviour and public images. Keep security.txt contact, policy and expiry current.
