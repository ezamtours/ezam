# EZAM Tours & Travel Services

Complete public website, admin login and owner dashboard source for GitHub Pages. The site requires Supabase for secure backend functionality.

**To deploy, follow [`START-HERE.md`](START-HERE.md).**

### Repository structure
- `index.html` — public travel website (includes nine real customer reviews)
- `admin-login.html` — owner/admin login
- `owner.html` — dashboard
- `assets/css/` — website, dashboard and typography stylesheets
- `assets/js/` — website, dashboard, auth and Supabase frontend scripts
- `assets/images/` — local travel photos, customer review photos and official EZAM logos
- `assets/icons/` — Facebook, Instagram and TikTok icons
- `.github/workflows/deploy.yml` — GitHub Pages deployment
- `backend/` — SQL schema, Supabase setup notes and Edge Function source (needs review)

Do not put passwords or secret/service-role keys into this public repository.
