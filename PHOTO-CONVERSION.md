# Photograph conversion recipe

The website has no build step. This script is a separate Mac utility for turning the approved full-size photographs into files ready for the site’s `/images/` folder.

## Install once

macOS already includes `sips`. Install the two encoders with Homebrew:

```sh
brew install webp libavif
```

The script uses Google’s `cwebp` and libavif’s `avifenc`. Their maintained references are [Google’s cwebp documentation](https://developers.google.com/speed/webp/docs/cwebp) and the [libavif command-line documentation](https://github.com/AOMediaCodec/libavif/blob/main/doc/avifenc.1.md).

## Prepare the originals

1. Put the approved full-resolution originals in one folder.
2. Rename each original to the filename in `PHOTO-SHOT-LIST.md`. The script accepts JPEG, HEIC, PNG and TIFF extensions; the stem before the extension must match `photo-manifest.tsv` exactly.
3. Keep this folder as the untouched master archive. The script only reads it.
4. Make sure the website `/images/` folder is empty. The script deliberately refuses to mix a new set with old files.

## Run once

From the repository root:

```sh
./scripts/build-images.sh "/path/to/full-size-originals" "./images"
```

The script checks that all 74 originals are present and that no filename is ambiguous. It then centre-crops and produces:

- AVIF, WebP and JPEG at 1600, 1000 and 640 pixels wide for every subject;
- a 1200×630 social crop in all three formats for every hero;
- an 800-pixel 4:3 or square card crop where the shot list requests one;
- no output wider than 1600 pixels.

With the complete manifest, a successful run processes 74 originals into 783 derivative files.

It progressively lowers encoder quality to aim for these limits:

| Use | AVIF | WebP | JPEG |
|---|---:|---:|---:|
| Hero | 120 KB | 180 KB | 250 KB |
| Inline | 60 KB | 90 KB | 125 KB |
| Card | 70 KB | 105 KB | 150 KB |
| Social | 200 KB | 200 KB | 200 KB |

If a complex photograph remains over target at the quality floor, the script keeps it and prints a size warning. Inspect that image rather than accepting a visibly damaged automatic conversion.

## Final visual check

Centre cropping cannot know where the important subject is. Before committing:

- inspect every hero at 1600×900 and 1200×630;
- inspect every requested square or 4:3 card crop;
- confirm the horizon is level and important details are not cut off;
- check colour against the original, particularly green-grey water and sunset skies;
- add the approved credit wording to the page HTML and `/photo-credits/`;
- confirm alternative text describes the photograph that is actually being published.

If a centre crop fails, make a new full-size source crop under the same filename and run the script again into an empty output folder.
