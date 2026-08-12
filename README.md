# Point Vernon Guide

An independent, practical guide to Point Vernon on the Fraser Coast in Queensland, Australia.

The site covers beaches and foreshore conditions, Gatakers Bay, walking and cycling, fishing, whale watching, parks, food, local history, visiting information and reliable places to check current events.

## Publishing principles

- Australian English and plain-language guidance
- primary public sources wherever possible
- cautious safety and access wording
- no paid placement, affiliate links or advertising
- Google Analytics 4 measurement with a plain-language privacy explanation
- locally taken or permissioned photographs, with contributors credited

Send corrections, photographs, event listings and complaints to [hello@pointvernon.com](mailto:hello@pointvernon.com). Please do not include sensitive personal information unless it is necessary.

## Updating the site

The website is plain static HTML and CSS. Update the source files directly, preserve the root `CNAME` file, and keep `sitemap.xml` current when pages are added or removed.

See `VERIFICATION-LIST.md`, `PHOTO-SHOT-LIST.md` and `LAUNCH-GUIDE.md` for the maintenance and publishing notes.

## Photograph workflow

The interim site is deliberately text-only until approved local photographs are available.

- `PHOTO-SHOT-LIST.md` groups 74 unique subjects into practical outings.
- `photo-manifest.tsv` defines the crop and derivative set for each subject.
- `PHOTO-CONVERSION.md` explains the one-command Mac conversion process.
- `scripts/build-images.sh` creates AVIF, WebP and JPEG variants without adding a website build step.
- `templates/content-page-with-photo.html.example` contains the hero preload, responsive `<picture>`, credit and contributed-photo schema patterns.
- `PHOTO-PERMISSIONS-REGISTER.csv.example` is the private tracking-sheet structure; copy it outside the public repository before adding contact details.
- `/photo-credits/` records public credits; private permission emails and contributor contact details must be kept outside this public repository.
