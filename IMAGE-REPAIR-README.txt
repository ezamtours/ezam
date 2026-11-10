EZAM V8.23 — IMAGE REPAIR (GitHub Pages)
========================================
Problem: Several image assets referenced by the live website are absent from
assets/images/ on the GitHub repository. The old HTML also relies on
third-party Pexels URLs that can fail, so images then fall back to other files
that are missing too.

FIX:
1. Extract this ZIP.
2. In github.com/ezamtours/ezam, upload index.html and the entire assets/images/
   content, using the same directory paths shown in this archive.
3. Replace index.html in the repository root.
4. Commit to main and wait for GitHub Pages' latest Actions deployment.
5. Hard refresh the website (Command+Shift+R on Mac).

IMPORTANT: The ZIP intentionally contains ONLY the changed index.html and the
images required by the public site. Do not delete your existing assets/css,
assets/js, admin-login.html, owner.html, .github, or backend files.

Quick checks after deployment:
https://ezamtours.github.io/ezam/assets/images/ezam-official-2026-on-light.png
https://ezamtours.github.io/ezam/assets/images/journey-choose-v2.webp
https://ezamtours.github.io/ezam/assets/images/card-south-korea.webp
https://ezamtours.github.io/ezam/assets/images/card-bali.webp
https://ezamtours.github.io/ezam/assets/images/ezam-review-raymond.webp
https://ezamtours.github.io/ezam/assets/images/ezam-review-cj.webp

If any check displays 404, the file is still not at that exact repo path.
Supabase setup is unrelated to this static image repair.
