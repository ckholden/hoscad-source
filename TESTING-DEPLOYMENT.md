# HOSCAD — Testing Deployment Guide

This guide covers deploying HOSCAD to a **separate GitHub Pages repo** for testing in
environments where `holdenportal.com` may be blocked by corporate network filters.

**Test URL**: `https://ckholden.github.io/hoscad`

---

## Why a Separate Repo?

The main site (`holdenportal.com`) is hosted from the `ckholden/Holden-nerd-portal` repo
with a `CNAME` file that redirects all `ckholden.github.io` traffic to `holdenportal.com`.
This means `ckholden.github.io/hoscad` would redirect to the blocked domain.

A separate repo (`ckholden/hoscad`) has no CNAME, so GitHub Pages serves it directly at
`ckholden.github.io/hoscad` — a `github.io` domain that corporate filters rarely block.

---

## One-Time Setup

### Step 1: Create the GitHub Repo

```bash
# From any directory
gh repo create ckholden/hoscad --public --description "HOSCAD - Hospital CAD / EMS Tracking System (Test Deployment)"
```

Or create it manually at https://github.com/new:
- **Repository name**: `hoscad`
- **Visibility**: Public (required for free GitHub Pages)
- **Do NOT** add a README, .gitignore, or license (we'll push files directly)

### Step 2: Clone and Add Files

```bash
cd "C:\Users\chris\desktop\projects"
git clone https://github.com/ckholden/hoscad.git hoscad-deploy
cd hoscad-deploy
```

### Step 3: Copy Frontend Files

```bash
# Copy all frontend files from the source
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\index.html"          .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\styles.css"          .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\app.js"              .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\api.js"              .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\radio.html"          .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\radio.js"            .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\sw.js"               .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\manifest.json"       .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\manifest-radio.json" .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\download.png"        .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\download.jpg"        .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\icon-cadradio.svg"   .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\alert-tone.mp3"      .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\tone-urgent.wav"     .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\tone-alert.wav"      .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\tone-change.wav"     .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\tone-note.wav"       .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\tone-message.wav"    .
```

### Step 4: Initial Commit and Push

```bash
git add .
git commit -m "Initial HOSCAD test deployment"
git push origin main
```

### Step 5: Enable GitHub Pages

1. Go to https://github.com/ckholden/hoscad/settings/pages
2. Under **Source**, select **Deploy from a branch**
3. Set branch to **main**, folder to **/ (root)**
4. Click **Save**
5. Wait 1-2 minutes for GitHub Pages to build

**Do NOT add a CNAME file** — this is what keeps it on `ckholden.github.io`.

### Step 6: Verify

Visit: https://ckholden.github.io/hoscad

You should see the HOSCAD login screen. Test with existing credentials.

---

## Updating the Test Deployment

After making changes to the source files in `hoscad-frontend/`:

```bash
cd "C:\Users\chris\desktop\projects\hoscad-deploy"

# Copy updated files
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\app.js"    .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\radio.js"  .
cp "C:\Users\chris\desktop\projects\hoscad\hoscad-frontend\sw.js"     .
# (add any other changed files)

# Commit and push
git add .
git commit -m "Update HOSCAD test deployment"
git push origin main
```

GitHub Pages propagates within 1-2 minutes. The service worker auto-update
(checks every 5 minutes) will pick up changes without manual refresh.

---

## Important Notes

- **Same backend**: The test deployment uses the same Google Apps Script backend
  and API URL as the production site. All data is shared.
- **Same Firebase**: CADRadio connects to the same Firebase project (`holdenptt-ce145`).
  Radio activity on the test site is heard on production and vice versa.
- **No CNAME**: Do not add a CNAME file to this repo. That would redirect
  `ckholden.github.io` to a custom domain, defeating the purpose.
- **Public repo**: GitHub Pages requires public repos on free plans. The frontend
  code is client-side only — no secrets are exposed. The API URL is already
  visible in the browser network tab on any deployment.
- **Cache busting**: The service worker registers with `updateViaCache: 'none'`
  and auto-reloads when a new version is detected. Users don't need to
  manually clear cache after updates.

---

## Deployment URLs Summary

| Environment | URL | Repo |
|-------------|-----|------|
| **Production** | https://holdenportal.com/hoscad | `ckholden/Holden-nerd-portal` (`/hoscad` dir) |
| **Legacy** | https://holdenportal.com/tccad | `ckholden/Holden-nerd-portal` (`/tccad` dir) |
| **Test (unblocked)** | https://ckholden.github.io/hoscad | `ckholden/hoscad` (root) |
| **CADRadio** | https://holdenportal.com/cadradio | `ckholden/Holden-nerd-portal` (`/cadradio` dir) |
| **Backend API** | Google Apps Script Web App | `backend-deploy/` via clasp |
