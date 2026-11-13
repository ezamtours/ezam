# EZAM V8.29 — Final Dashboard Deployment

This ZIP contains the approved functional V8.29 owner dashboard update plus two missing files required by the current EZAM GitHub Pages build. It intentionally does **not** include `index.html`, `assets/js/config.js`, or your Supabase keys, so the public website and backend connection are not replaced.

## Install

1. Download and extract this ZIP.
2. Open https://github.com/ezamtours/ezam .
3. Upload the extracted **owner.html**, **admin-login.html**, and **assets/** folder contents directly into the repository root. Preserve the full folder paths below; don't create a nested folder called `EZAM_V8_29_FINAL_GITHUB_DEPLOY`.
4. Replace the corresponding files, then commit to the `main` branch.
5. Open https://github.com/ezamtours/ezam/actions and check the latest GitHub Pages deployment is successful.
6. Open https://ezamtours.github.io/ezam/admin-login.html and sign in as an approved owner/admin.

## Exact paths

- `owner.html` (updated)
- `admin-login.html` (updated)
- `assets/js/admin.js` (updated)
- `assets/js/dashboard-v8-29.js` (new)
- `assets/css/ezam-dashboard-v8-29.css` (new)
- `assets/css/ezam-hero-polish-v8-25.css` (restored because the live repo referenced it but did not contain it)
- `assets/images/hero-philippines.webp` (restored to satisfy the existing GitHub Pages fallback-image check)

## What works

- Owner dashboard with improved package-status icons and the logo layout fix
- Lead Command Center: new in 24h, unassigned open, hot open, and leads to review after 48h
- Lead quick filters, priority queue, refresh now, optional 90-second refresh
- Full-width international time cards, removing the decorative flight path
- My Profile: profile name (owner account, according to existing RLS policy), account information, password change
- Appearance: Light / Dark / System, compact / balanced / comfortable density, standard / larger text
- Preferences saved per browser via localStorage

## Security and verification

- The UI reads data through the website's current `EZAMData` Supabase client and honors its row-level policies. No new service-role key or database schema change is involved.
- Real access requires a verified owner/admin account in Supabase and the `public.profiles` table with secure RLS; local preview data is not production data.
- Password changes require a real authenticated Supabase user and may need reauthentication based on project settings.
- The dashboard has been statically checked for local asset references and JavaScript syntax. Live deployment and backend operations still must be verified after the GitHub commit; a successful archive test is not proof of production success.
- The Palawan fallback file is the existing original fallback, not a new photo-quality replacement.
