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
default-src 'self'; base-uri 'self'; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com; font-src 'self'; form-action 'self' https://buttondown.com; frame-ancestors 'none'; img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com; object-src 'none'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; script-src-attr 'none'; style-src 'self'; upgrade-insecure-requests
```

`'unsafe-inline'` is presently required for the page-specific JSON-LD blocks. It does not permit inline event-handler attributes because `script-src-attr 'none'` is set. A later build can generate and deploy per-page JSON-LD hashes; only then remove `'unsafe-inline'`.

The newsletter forms post directly to Buttondown's HTTPS subscription endpoint. CSP source expressions allow an origin rather than an endpoint path, so `form-action` admits only `https://buttondown.com` in addition to the site itself. The pages do not embed Buttondown scripts or frames.

## Cache rule

Cloudflare caches the two explicitly versioned assets below at the edge and in visitors' browsers for one year:

- `/assets/css/style.css?v=20260822-newsletter`
- `/assets/js/privacy.js?v=20260822-newsletter`

The rule matches both the exact path and exact version query. HTML retains its short origin-controlled cache lifetime. Every future CSS or JavaScript change must update the version string on every page before deployment; the source validator checks that the references remain consistent.

Images retain the shorter origin cache lifetime because their public URLs are not currently versioned.

## Newsletter delivery

Buttondown is configured as the email processor for the `pointvernon` newsletter. Subscriptions use double opt-in, subscriber cleanup and a welcome email. Optional open, click, transactional, UTM and archive-web tracking are disabled.

The managed sending domain `mail.pointvernon.com` is reserved in Buttondown. Activating it requires delegating that subdomain with two `NS` records; those DNS records must not be created until the durable delegation has been explicitly approved. Until then, the site subscription flow can operate using Buttondown's shared sender.

## Verification

After the live rules were deployed, repeated public checks returned the enforced `Content-Security-Policy` header, `CF-Cache-Status: HIT`, and `Cache-Control: max-age=31536000` for both versioned assets. The opt-in Analytics script, structured data, images and custom 404 continued to load without browser errors.

The repository also publishes `/.well-known/security.txt`. Revisit its `Expires` value before 22 August 2027 and keep the contact address monitored.
