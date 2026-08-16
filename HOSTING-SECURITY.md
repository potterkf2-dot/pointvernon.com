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
