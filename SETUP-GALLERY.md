# Turning on the Gallery (one-time, about 15 minutes)

The gallery stores your images in Cloudflare R2 (free up to 10 GB) and plate-solves them with astrometry.net.
Do the steps in this order: the bucket must exist before the new files reach GitHub, or the deploy fails.

## 1. Create the storage bucket
1. Cloudflare dashboard → **R2 Object Storage**. If asked, enable R2 (Cloudflare may ask for a payment method; usage within the free tier costs nothing).
2. **Create bucket** → name it exactly `fovplanner-gallery` → location *Automatic* → **Create bucket**.

## 2. Get an astrometry.net API key
1. Sign in (free) at **nova.astrometry.net**.
2. Open your **Dashboard → My Profile** and copy your **API key**.

## 3. Upload the new files to the repo
Upload to the root of `th206/fov-planner` (Add file → Upload files → Commit):
- `index.html`, `worker.js`, `wrangler.jsonc`, `README.md`, `SETUP-GALLERY.md`
- `.assetsignore`: GitHub's uploader can hide dot-files, so open the existing `.assetsignore` → ✏ Edit → replace its text with the new one → Commit.

Wait for the green tick (Cloudflare redeploys in about a minute). If the deploy fails, open the build log in
Cloudflare → Workers & Pages → fovplanner → Deployments; the usual cause is a bucket name that doesn't match `fovplanner-gallery`.

## 4. Add the two secrets
Cloudflare → **Workers & Pages → fovplanner → Settings → Variables and Secrets → + Add**:

| Type | Name | Value |
|---|---|---|
| Secret | `UPLOAD_KEY` | a long password only you know (make one in your password manager) |
| Secret | `ASTROMETRY_KEY` | the astrometry.net API key from step 2 |

Click **Deploy** after adding them. Secrets stay in place across future GitHub deploys.

## 5. Unlock uploads on your devices
fovplanner.com → **Gallery** tab → **Owner: unlock uploads** → paste your `UPLOAD_KEY`.
Do this once on each device you upload from. Visitors can view the gallery but cannot upload, edit or delete.

## Notes
- Upload a JPG/PNG export (the planner keeps a copy up to 4096 px plus a thumbnail) or a FITS file. TIFF: export a JPG for now.
- If you have a plate solution (`.wcs` from ASTAP, `wcs.fits` from astrometry.net, or WCS in the FITS header), select it together with the image: it goes on the sky map straight away.
- Otherwise leave **Plate-solve** ticked and fill in the target and rig, so astrometry.net knows where to look and the image scale. Solving takes 1–5 minutes. Submissions are marked private on astrometry.net.
- The old github.io copy has no gallery (it has no server).
