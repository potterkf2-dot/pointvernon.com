# Hosting, security and caching actions

The site is currently served by GitHub Pages. Static HTML cannot set response headers such as Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options or Permissions-Policy, and it cannot change GitHub Pages’ cache policy.

## Required hosting action

Place a configurable CDN or reverse proxy in front of the site, or move to a host that permits response headers. Apply and test:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- a Content Security Policy that permits only the site’s own assets and the optional Google Analytics endpoints;
- a minimal `Permissions-Policy` denying unused browser capabilities; and
- long-lived immutable caching for versioned CSS, JavaScript and image assets while keeping HTML revalidation short.

Do not enable HSTS `preload` until every subdomain is confirmed HTTPS-only. Test the policy in report-only mode before enforcing it, and verify that opt-in Analytics, images, structured data and the 404 page still work.

The HTML already declares the same referrer policy as a safe fallback. That does not replace an HTTP response header.

## Enforced CSP target

The current public response uses a report-only policy, which does not block anything. After reviewing the CDN’s CSP reports, promote a tested policy to the enforced `Content-Security-Policy` header. A practical baseline for the current static site is:

```text
default-src 'self'; base-uri 'self'; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self' data: https://www.google-analytics.com; object-src 'none'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; script-src-attr 'none'; style-src 'self'; upgrade-insecure-requests
```

`'unsafe-inline'` is presently required for the page-specific JSON-LD blocks. It does not permit inline event-handler attributes because `script-src-attr 'none'` is set. A later build can generate and deploy per-page JSON-LD hashes; only then remove `'unsafe-inline'`. Keep the report-only header for a short comparison period, then remove it once the enforced header is stable.

The repository also publishes `/.well-known/security.txt`. Revisit its `Expires` value before 22 August 2027 and keep the contact address monitored.
