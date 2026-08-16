# Point Vernon Guide

An independent, practical guide to Point Vernon on the Fraser Coast in Queensland, Australia.

The site separates exploration, visitor planning, events, resident information and property research. It covers beaches and foreshore conditions, maps and access, walking and cycling, fishing, whale watching, parks, food, accommodation, accessibility, local history and reliable official sources.

## Publishing principles

- Australian English and plain-language guidance
- primary public sources wherever possible
- cautious safety and access wording
- no paid placement, affiliate links or advertising
- opt-in Google Analytics 4 measurement that is off by default, with Analytics and advertising storage still denied when allowed
- locally taken or permissioned photographs, with contributors credited

Send corrections, photographs, event listings and complaints to [hello@pointvernon.com](mailto:hello@pointvernon.com). Please do not include sensitive personal information unless it is necessary.

## Updating the site

The website is plain static HTML and CSS. Update the source files directly, preserve the root `CNAME` file, and keep `sitemap.xml` current when pages are added or removed.

See `CONTENT-MAINTENANCE.md`, `VERIFICATION-LIST.md`, `HOSTING-SECURITY.md`, `SEARCH-LAUNCH-CHECKLIST.md`, `PHOTO-SHOT-LIST.md` and `LAUNCH-GUIDE.md` for maintenance and publishing notes.

## Photograph workflow

The site uses approved local photographs where they are available and keeps a documented workflow for adding more.

- `PHOTO-SHOT-LIST.md` groups 74 unique subjects into practical outings.
- `photo-manifest.tsv` defines the crop and derivative set for each subject.
- `PHOTO-CONVERSION.md` explains the one-command Mac conversion process.
- `scripts/build-images.sh` creates AVIF, WebP and JPEG variants without adding a website build step.
- `templates/content-page-with-photo.html.example` contains the hero preload, responsive `<picture>`, credit and contributed-photo schema patterns.
- `PHOTO-PERMISSIONS-REGISTER.csv.example` is the private tracking-sheet structure; copy it outside the public repository before adding contact details.
- `/photo-credits/` records public credits; private permission emails and contributor contact details must be kept outside this public repository.
