# Asset manifest

Generated from `apps/web/public/img/editorial/credits.json`, which the fetch scripts write at download time. Re-generate after `scripts/fetch-imagery.mjs` or `scripts/fetch-commons.mjs`.

**Total image payload** 24.7 MB. Rendered at responsive sizes through `next/image`; the raw files are never served directly.

## Licensing rule applied

Only licences permitting **commercial use and modification**. No-derivatives (ND) works were deliberately rejected, because CSS cropping is arguably a derivative — three BY-ND images were found and replaced.

## Advocate portraits — 368 files

Official photographs published by each State Bar Council, downloaded during ingestion and served from our own origin rather than hotlinked (two reasons: hotlinking leaks every visitor's IP to the regulator's CDN, and it makes our pages depend on their uptime). The original URL is retained in `professional.photo_source_url` as provenance. **Not listed individually here** — each profile page links its own source.

Where no sourced photograph exists, the UI renders a monogram. It never substitutes a stock face for a real named advocate.

## Editorial, court and texture imagery — 28 files

| File | Creator | Licence | Purpose | Size |
|---|---|---|---|---|
| `/img/courts/court-bombay-hc.jpg` | Aleksandr Zykov from Russia | CC BY-SA 2.0 | Court imagery | 208 kB |
| `/img/courts/court-calcutta-hc.jpg` | Biswarup Ganguly | CC BY 3.0 | Court imagery | 237 kB |
| `/img/courts/court-karnataka-hc.jpg` | Rehman Abubakr | CC BY-SA 4.0 | Court imagery | 396 kB |
| `/img/courts/court-madras-hc.jpg` | Kalyan07kumar | CC BY-SA 4.0 | Court imagery | 168 kB |
| `/img/courts/court-punjab-hc.jpg` | Shanmugamp7 | CC BY-SA 3.0 | Court imagery | 180 kB |
| `/img/courts/hero-madras-hc-towers.jpg` | Kalyan07kumar | CC BY-SA 4.0 | Hero | 200 kB |
| `/img/courts/interior-chamber.jpg` | Elliott, Joseph E., creator | Public domain | Editorial | 151 kB |
| `/img/editorial/city-delhi.jpg` | laszlo-photo | BY 2.0 | Editorial | 215 kB |
| `/img/editorial/city-mumbai.jpg` | Vidur Malhotra | PDM 1.0 | Editorial | 212 kB |
| `/img/editorial/court-building.jpg` | motiqua | BY 2.0 | Court imagery | 87 kB |
| `/img/editorial/documents-signing.jpg` | chrismear | BY 2.0 | Editorial | 127 kB |
| `/img/editorial/hero-chambers.jpg` | jafsegal (Thanks for the 4,5 milli | BY 2.0 | Hero | 107 kB |
| `/img/editorial/law-books.jpg` | Barnaby | BY 2.0 | Editorial | 289 kB |
| `/img/editorial/meeting-office.jpg` | AMagill | BY 2.0 | Editorial | 124 kB |
| `/img/editorial/pa-arbitration.jpg` | Unknown | CC0 1.0 | Practice-area tile | 202 kB |
| `/img/editorial/pa-banking.jpg` | Terry Kearney | CC0 1.0 | Practice-area tile | 192 kB |
| `/img/editorial/pa-consumer.jpg` | AuthenticEccentric | BY 2.0 | Practice-area tile | 280 kB |
| `/img/editorial/pa-corporate.jpg` | jonathan mcintosh | BY 2.0 | Practice-area tile | 193 kB |
| `/img/editorial/pa-criminal.jpg` | Unknown | BY 4.0 | Practice-area tile | 82 kB |
| `/img/editorial/pa-family.jpg` | Mike Cattell | BY 2.0 | Practice-area tile | 234 kB |
| `/img/editorial/pa-ip.jpg` | juhansonin | BY 2.0 | Practice-area tile | 139 kB |
| `/img/editorial/pa-labour.jpg` | sv1ambo | BY 2.0 | Practice-area tile | 437 kB |
| `/img/editorial/pa-property.jpg` | Unknown | CC0 1.0 | Practice-area tile | 128 kB |
| `/img/editorial/pa-tax.jpg` | Images_of_Money | BY 2.0 | Practice-area tile | 267 kB |
| `/img/editorial/pa-tech.jpg` | Javier Salinas | CC0 1.0 | Practice-area tile | 208 kB |
| `/img/textures/detail-arch.jpg` | Dosseman | CC BY-SA 4.0 | Section texture | 148 kB |
| `/img/textures/detail-column.jpg` | Wilfredor | CC BY-SA 4.0 | Section texture | 311 kB |
| `/img/textures/texture-paper.jpg` | Kevin Walsh from Preston Brook, En | CC BY 2.0 | Section texture | 206 kB |

## Rejected assets, and why

| Asset | Reason rejected |
|---|---|
| Figure cutouts from the Envato kit (3 of 4) | Extraction dragged in overlay cards; would have shipped visibly dirty alpha |
| `advocate-portrait.png` (kit cutout, retained but unused in hero) | Source region only 141×158 px — too soft at hero scale |
| A Calcutta High Court photo returned for a "Delhi High Court" query | Mislabelling a real institution would be a false factual claim |
| MP High Court "photo" | Blurred postcard reproduction, not a photograph |
| "Law library" result | A 1930 magazine cover, not a photograph |
| Supreme Court frame | Hazy; replaced by Madras HC towers |
| Delhi High Court building | **No usable image exists on Commons** — only press photos of identifiable politicians, which would imply association. Slot ships empty rather than wrong. |

## Fonts

Four families, self-hosted at build time by `next/font` — zero runtime third-party requests.

| Family | Weights | Role |
|---|---|---|
| Plus Jakarta Sans | 700, 800 | Display and headings |
| Hanken Grotesk | 400, 500, 600 | Body and UI |
| JetBrains Mono | 500 | Metadata, references, money |
| Newsreader | 400, 600 (+italic) | Display serif for stated positions |

## Attribution surface

Every credited asset is rendered at `/credits` with creator, licence and a link to the original.
