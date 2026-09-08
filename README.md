# Point Vernon Guide

An independent, practical guide to Point Vernon on the Fraser Coast in Queensland, Australia.

The site separates exploration, visitor planning, events, resident information and property research. It covers beaches and foreshore conditions, maps and access, walking and cycling, fishing, whale watching, parks, food, accommodation, accessibility, local history and reliable official sources.

## Publishing principles

- Australian English and plain-language guidance
- primary public sources wherever possible
- cautious safety and access wording
- no paid placement, affiliate links or advertising
- opt-in Google Analytics 4 measurement that is off by default; first-party Analytics storage is granted only after a visitor allows it, while advertising storage, signals and personalisation remain disabled
- locally taken or permissioned photographs, with contributors credited

Send corrections, photographs, event listings and complaints to [hello@pointvernon.com](mailto:hello@pointvernon.com). Please do not include sensitive personal information unless it is necessary.

## Updating the site

The website is plain static HTML and CSS. Update the source files directly, preserve the root `CNAME` file, and keep `sitemap.xml` current when pages are added or removed.

See `CONTENT-MAINTENANCE.md`, `PORTFOLIO-CONTENT-BOUNDARIES.md`, `VERIFICATION-LIST.md`, `HOSTING-SECURITY.md`, `SEARCH-LAUNCH-CHECKLIST.md`, `PHOTO-SHOT-LIST.md` and `LAUNCH-GUIDE.md` for maintenance and publishing notes.

Before publishing, run:

```sh
perl scripts/apply-audit-sitewide.pl
perl scripts/sync-sitemap-lastmod.pl
perl scripts/sync-sitemap-lastmod.pl --check
python3 scripts/validate_site.py
node scripts/analytics-consent.test.cjs
```

The first command keeps the shared update-feed and policy links consistent. The sitemap command reads each page’s visible modification date, updates only that URL’s `<lastmod>` value and fails when a public page is missing from the sitemap.

The source validator checks page metadata, heading order, image dimensions and alternative-text attributes, internal links (including absolute site URLs), breadcrumb destinations, consent controls and indexability. It also verifies the sitemap and shared asset versions. Run it after all edits and before publishing. The offline Analytics tests also check opt-in behaviour, blocked storage, consent withdrawal across tabs, duplicate tag protection, content groups and official-source classification.

## Photograph workflow

The site uses approved local photographs where they are available and keeps a documented workflow for adding more.

- `PHOTO-SHOT-LIST.md` groups 74 unique subjects into practical outings.
- `photo-manifest.tsv` defines the crop and derivative set for each subject.
- `PHOTO-CONVERSION.md` explains the one-command Mac conversion process.
- `scripts/build-images.sh` creates AVIF, WebP and JPEG variants without adding a website build step.
- `templates/content-page-with-photo.html.example` contains the hero preload, responsive `<picture>`, credit and contributed-photo schema patterns.
- `PHOTO-PERMISSIONS-REGISTER.csv.example` is the private tracking-sheet structure; copy it outside the public repository before adding contact details.
- `/photo-credits/` records public credits; private permission emails and contributor contact details must be kept outside this public repository.
