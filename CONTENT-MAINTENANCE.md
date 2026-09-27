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
