# PointVernon.com launch guide

The package is ready for a plain GitHub Pages deployment. Authentic local photography can be added as it becomes available. Follow the publishing and domain sequence in this guide because GitHub recommends adding and verifying a custom domain before directing public DNS to it.

The interim site is intentionally text-only. The former artwork has been removed from the repository; do not restore it while waiting for approved photographs.

## 1. Launch inputs completed

The launch build contains no unfinished fact, contact, Analytics or image markers. Google Analytics 4 is configured with a plain-language privacy explanation, and corrections use hello@pointvernon.com. `VERIFICATION-LIST.md` records future improvements and checks.

## 2. Create the GitHub Pages repository

1. Sign in to the GitHub account or organisation that will own the site.
2. Use the public `potterkf2-dot/pointvernon.com` repository created for the site.
3. Upload the contents of the website package to the top level of the repository. `index.html`, `CNAME` and `.nojekyll` should sit at the repository root, not inside another folder.
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**, select the main branch and the root folder, then save.
6. Wait for the temporary `github.io` address to publish and test several pages, images and the 404 page.

Official reference: [Configuring a publishing source for GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 3. Verify the domain in GitHub

Before changing the public website records, verify `pointvernon.com` in the owning GitHub account or organisation. GitHub will display a unique TXT record for the domain. Add that exact TXT record in the DNS manager, wait for it to resolve, complete GitHub’s verification step and keep the TXT record in place.

Official reference: [Verifying a custom domain for GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)

## 4. Add the custom domain in the repository

In **Settings → Pages**, enter `pointvernon.com` under **Custom domain** and save. The package already contains a root `CNAME` file with that exact value; confirm GitHub has not replaced it with something different.

GitHub warns against pointing DNS at Pages before adding the custom domain in the repository, because an unclaimed subdomain can create a takeover risk.

## 5. Point GoDaddy DNS to GitHub Pages

Only change DNS if the domain is actually using GoDaddy nameservers. If it uses another nameserver provider, make the equivalent changes there.

For the apex domain (`pointvernon.com`), GitHub currently documents these four A records:

| Type | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

For `www.pointvernon.com`, add one CNAME record:

| Type | Name | Value |
|---|---|---|
| CNAME | `www` | `potterkf2-dot.github.io` |

The `www` CNAME points to the GitHub account’s Pages hostname, not the repository name.

Before saving:

- remove only records that conflict with these exact `@` A records or the `www` CNAME;
- preserve email records such as MX and unrelated TXT records;
- do not add a wildcard record such as `*.pointvernon.com`;
- retain the GitHub verification TXT record;
- take a screenshot or export of the existing DNS zone so changes can be reversed.

Official references: [GitHub’s custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) and [GoDaddy DNS record management](https://www.godaddy.com/help/manage-dns-records-680).

## 6. Wait, verify and enable HTTPS

DNS can take up to 24 hours to propagate. When both domain variants reach the site:

1. Confirm `https://pointvernon.com` loads the correct homepage.
2. Confirm `https://www.pointvernon.com` redirects to the chosen canonical address.
3. In GitHub Pages settings, enable **Enforce HTTPS** when the option becomes available.
4. Test deep links such as `/gatakers-bay/`, `/privacy/`, `sitemap.xml` and a deliberately invalid URL.
5. Confirm there are no browser security or mixed-content warnings.

Official reference: [Securing a GitHub Pages site with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

## 7. Final public review

- Check the site on a phone and desktop using keyboard and touch.
- Confirm all final photographs are licensed, compressed and correctly described.
- Confirm each contributed photograph is credited beside the image and in `/photo-credits/`.
- Recheck business, transport, park, fishing and event details against their sources.
- Test the monitored email address.
- Confirm the live privacy statement matches the tools actually enabled.
- Submit `https://pointvernon.com/sitemap.xml` to the preferred search-console account if one will be used.

DNS values in this guide were checked against GitHub’s official documentation on 11 August 2026. Recheck the linked GitHub page immediately before changing DNS because platform addresses and workflows can change.
