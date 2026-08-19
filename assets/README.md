# Local image assets

Drop-in folder for imagery that is **not** fetched by a script.

```
assets/
  hero/         hero figures — transparent PNG, subject facing camera, ≥1200px tall
  figures/      secondary cut-outs used in card treatments
  backgrounds/  textures and section backgrounds
```

## How these reach the site

`npm run assets:sync` copies everything here into
`apps/web/public/img/local/`, normalises it (max 1600px, PNG alpha preserved,
JPEG re-encoded at q82) and writes `manifest.json` so the app can list what is
available. Re-run it after adding a file.

## The hero figure

The hero looks for, in order:

1. `assets/hero/advocate.png` — your own cut-out. **Put the robed advocate PNG
   you supplied here** and it is used immediately.
2. Any other `.png` in `assets/hero/`.
3. A licensed court photograph, as a fallback.

Transparent PNG, subject roughly centred, generous headroom. 1200×1400 or larger.

## Licensing

Anything placed here is assumed to be licensed by the project owner. Images the
build fetches itself (Wikimedia Commons, Openverse) record their licence and
author automatically and appear at `/credits`. Files dropped here do not — if
they need attribution, add a line to `assets/CREDITS.md`.
