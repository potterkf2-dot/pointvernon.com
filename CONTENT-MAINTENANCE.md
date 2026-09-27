# Content maintenance schedule

This schedule applies to the public Point Vernon Guide. A review records the source checked and the reviewer’s date. It does not turn an unverified observation into a published fact.

| Content type | Routine review | Triggered review | Primary source |
| --- | --- | --- | --- |
| Events and recurring activities | Weekly | Organiser cancellation, venue or time change | Official organiser; Council event calendar |
| Food and other businesses | Monthly | Closure, move, rebrand or service change | Business-owned website or social account |
| Translink services and fares | Monthly | Service notice or timetable change | Translink |
| Dog rules and boundaries | Every three months | Local-law, map or on-site sign change | Fraser Coast Regional Council |
| Park and public facilities | Every three months | Works, closure or documented on-ground report | Fraser Coast Regional Council |
| Tides, weather and warnings | Do not copy as static live data | Every visit or activity plan | Maritime Safety Queensland; Bureau of Meteorology |
| Fishing and marine rules | Every three months | Regulation or zoning change | Queensland Government; marine park authority |
| Whale-season guidance | Before each season | Government guidance change | Queensland Government |
| Property and planning links | Every three months | Planning scheme, disclosure or mapping change | Queensland Government; Fraser Coast Regional Council |
| Emergency and reporting contacts | Every three months | Agency or telephone change | Responsible agency |
| History and cultural material | When new evidence is available | Primary-source correction or approved cultural review | Council heritage register; libraries; relevant Butchulla-led source |

## Required review record

For every volatile-content edit, record:

- page address;
- date checked;
- public source address;
- exact claim reviewed;
- whether an on-ground inspection is still required; and
- next routine review date.

Do not publish a changed event date, facility, access claim, business detail, safety rule or transport statement without a current source.

## Update the relevant guide

The owner retired the public updates diary and Atom feed on 27 September 2026. Make useful changes directly on the relevant guide: event and nearby attraction notices belong on `/whats-on/`, transport changes on `/getting-around/`, and service changes on `/local-help/`. Keep maintenance logs outside the public site. Do not recreate `/updates/`, its feed, navigation links or dated maintenance posts. `/updates/` is only a noindex legacy redirect to `/whats-on/`. Remove expired specifics rather than building an event archive.

## Sitemap dates

After a substantive page edit, update its visible `<time datetime="YYYY-MM-DD">` value and its structured-data `dateModified` value where present. Then run `perl scripts/sync-sitemap-lastmod.pl` and `perl scripts/sync-sitemap-lastmod.pl --check`. Do not give every sitemap URL the deployment date.

## Visitor-focused navigation — 27 September 2026

Keep the directory focused on the 31 local guides. About, photo credits and privacy remain in the footer. Editorial standards are consolidated in `/about/`; `/editorial-policy/` is a noindex legacy redirect only and must stay out of navigation and the sitemap. Do not reintroduce a technical public photo file register or a separate editorial-policy page. Preserve significant image-editing disclosures and existing commercial/privacy commitments.

## AdSense application — 28 September 2026

The owner authorised an AdSense application. Public pages contain the account verification meta tag for `ca-pub-1569993121551986`; `/ads.txt` contains Google’s supplied seller record. These do not load ad scripts or display advertisements. Preserve verification while the application is pending. Approval, account setup, consent handling, advertising disclosures and banner placement must be completed before serving ads. Do not add Auto ads or behavioural advertising through routine maintenance.

## Coastal design system — 28 September 2026

Preserve the shared coastal identity: the decorative wave/sun mark, panoramic homepage, cream guide headers, forest-green navigation, responsive contents and restrained photo layouts. The final coastal block in `assets/css/style.css` defines the current design. Shared stylesheet version is `20260928-coastal-v3`; keep the synchroniser and validator aligned when changing it. Existing system fonts and approved local photographs avoid extra third-party requests. Design-only changes do not imply a new factual review date.
