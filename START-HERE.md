# EZAM Tours & Travel Services — Complete Fresh GitHub Deployment

**This is one self-contained deployment package. Do not mix it with any previous EZAM ZIP or upload a ZIP directly to GitHub.**

## 1. New GitHub repository
1. Create a PUBLIC repository named `ezam` under the `ezamtours` GitHub account.
2. Keep **Add README = Off**, **.gitignore = None**, and **License = None** during creation. This package already includes those files.
3. Extract this ZIP onto your computer.
4. Open the extracted folder. Upload ALL of its contents into the **repository root** (not into a new wrapper folder). Include hidden `.github` and `.nojekyll` files.
5. IMPORTANT: All photos must be in `assets/images/` — never in a separate top-level `images/` folder.
6. Commit to `main`.
7. In GitHub repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
8. Under **Actions**, confirm `Deploy EZAM Complete Website to GitHub Pages` succeeds.

## 2. Live page addresses
- Website: https://ezamtours.github.io/ezam/
- Login: https://ezamtours.github.io/ezam/admin-login.html
- Dashboard: https://ezamtours.github.io/ezam/owner.html

## 3. Verify site assets
Check the following URLs (they should show images/styles, NOT 404 pages):
- https://ezamtours.github.io/ezam/assets/css/styles.css
- https://ezamtours.github.io/ezam/assets/css/ezam-typography-v8-22.css
- https://ezamtours.github.io/ezam/assets/images/ezam-official-2026-on-light.png
- https://ezamtours.github.io/ezam/assets/images/journey-choose-v2.webp
- https://ezamtours.github.io/ezam/assets/images/ezam-review-raymond.webp

If the website still looks unstyled, verify `assets/css/` is INSIDE `assets/` in the GitHub repository. Hard-refresh (Shift+Reload), then check the Pages deployment job.

## 4. Supabase activation (SEPARATE STEP)
The website will deploy even if Supabase is not configured, but secure login, inquiries and package publishing are NOT active until a dedicated EZAM Supabase project is created.
- Backend SQL and setup instructions: `backend/ezam_schema.sql` and `backend/SETUP-SUPABASE.md`.
- Public project URL and publishable key go in `assets/js/config.js`. Never put a Supabase secret/service-role key or database password in any public file.
- Before using with real customer data, review/harden the included Row Level Security (RLS) policies, admin invitations, and anti-spam protections.

## 5. Notes about photos
This bundle includes the existing EZAM image library locally, so the website doesn't depend on a third-party CDN for its current hero and card photos. The separate V8.24 photo-update preview linked to external Unsplash/Pexels images and is deliberately not the source of the production photo URLs here. The original local hero images may still require a later photography refresh for sharpness; this package prioritizes a fully functioning and dependable deployment.

## 6. Pages publishing boundary
The GitHub Actions workflow publishes only the public HTML, assets and required site metadata. The `backend/` SQL and Edge Function source remain in the GitHub repository for Supabase setup, but are not part of the Pages artifact.
