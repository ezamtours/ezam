# EZAM V8.26: Authentic hero photography

These are real travel photographs by named photographers, not AI-generated replacements. Photographs are downloaded at 3200px width by the `Deploy EZAM Complete Website to GitHub Pages` workflow. The resulting files are deployed alongside the HTML on GitHub Pages (self-hosted at runtime). The image bytes are NOT packaged inside this ZIP, because this execution environment cannot fetch the source originals. The deployment will fail rather than silently publish blurry local fallbacks if a source is unreachable.

**Photo license:** Unsplash License — https://unsplash.com/license (verify current terms and use requirements before deploying). Attribution is provided voluntarily.

| Destination | Photographer | Original page | Published on website as |
|---|---|---|---|
| Palawan, Philippines | Matthew Stephenson | https://unsplash.com/photos/a-beautiful-beach-lies-between-two-rocky-mountains-L_jCxEvAqmc | `assets/images/hero-philippines-real-3200.jpg` |
| Mount Fuji, Japan | Takashi Miyazaki | https://unsplash.com/photos/chureito-pagoda-and-mount-fuji-overlooking-a-japanese-town-_VCtujeQNSY | `assets/images/hero-japan-real-3200.jpg` |
| Seoul, South Korea | NK Lee | https://unsplash.com/photos/a-city-with-a-mountain-in-the-background-wp5KY3RjSGw | `assets/images/hero-south-korea-real-3200.jpg` |
| Singapore Marina Bay | K8 | https://unsplash.com/photos/marina-bay-sands-in-singapore-UCP7cfO3cew | `assets/images/hero-singapore-real-3200.jpg` |
| Lake Beratan, Bali | Guillaume Marques | https://unsplash.com/photos/brown-and-green-temple-near-body-of-water-under-blue-and-white-cloudy-sky-during-daytime-bnMPFPuSCI0 | `assets/images/hero-bali-real-3200.jpg` |

## Deploy

1. Upload this entire ZIP's extracted content to the root of `ezamtours/ezam`, including `.github/workflows/deploy.yml` and `scripts/fetch_hq_heroes.py`.
2. GitHub repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`, then go to Actions and verify **Fetch and verify authentic 3200px hero photos** succeeded.
4. Open `https://ezamtours.github.io/ezam/assets/images/hero-japan-real-3200.jpg` — it must display a sharp photograph. All five should similarly appear.
5. If the Action fails, read its log. Do NOT enable deploy from `main` branch source: the original source bundle retains the former low-quality images only as a contingency.

The actual original images are downloaded during the Pages build, not by your site visitor's browser. Every download must pass JPEG decoding, file-size and dimension checks. The GitHub Actions runner needs access to images.unsplash.com.

If you prefer to permanently commit the originals, on your Mac run `python3 scripts/fetch_hq_heroes.py` from the extracted folder (with internet access), then commit the five downloaded JPGs along with the code. In that case the build script reuses the existing verified JPGs.
