# Multi-Rig FOV Planner

Plan astrophotography framing with **several telescope + camera combinations overlaid on the same target at once**.

- Search any object by name (M31, NGC 7000, "Pelican Nebula") or coordinates (`20 58 47 +44 20` or `314.7 44.3`)
- Object details from SIMBAD: type, coordinates, apparent size, magnitude
- One colored frame per rig, each with its own rotation, reducer factor and mosaic (cols × rows, overlap %)
- Per-rig FOV, image scale (″/px), sampling vs. your seeing, and whether the target fits
- Altitude chart for any night, with twilight shading and hours above 30° in astronomical darkness
- Conditions for any place: search by name or coordinates, or use your device location, and save one place as the default
- Night forecast from [Open-Meteo](https://open-meteo.com/): hourly cloud (low/mid/high), humidity, dew risk, wind gusts and dust/haze (aerosol optical depth)
- Seeing estimate in arcseconds from a layered turbulence model (Dewan / Tatarskii) using temperature and wind at 16 pressure levels (1000–100 hPa): zenith, free-air (above 1 km) and on-target (corrected for altitude), plus the main turbulent layer, jet-stream wind (300–200 hPa) and cooling rate. The rig sampling check can use the forecast seeing
- 7Timer ASTRO chart, plus links to meteoblue and Clear Outside
- Sky surveys: DSS2, Pan-STARRS, 2MASS, H-alpha, Mellinger — with a "Faint detail" slider that stretches the survey to bring out faint nebulosity
- My images: overlay your own plate-solved images (JPG/PNG + astrometry.net `wcs.fits` or ASTAP `.wcs`, or a FITS, mono or RGB, which is auto-stretched; unsolved FITS are placed approximately from RA/DEC + focal length + pixel size with a rotation slider). Stored in your browser and shown automatically when that part of the sky is in view, with opacity and flip controls
- Editable equipment list. Rigs and settings are saved in your browser.

Single file (`index.html`), no build step. Uses [Aladin Lite v3](https://aladin.cds.unistra.fr/AladinLite/) from jsDelivr.

## Host on GitHub Pages

1. Create a new public repository, e.g. `fov-planner`.
2. Upload `index.html` (and this README) to the repository root.
3. Go to **Settings → Pages**, set Source to **Deploy from a branch**, then pick branch `main` and folder `/ (root)`.
4. After a minute the site is live at `https://<your-username>.github.io/fov-planner/`.

Link straight to a target with a hash: `.../fov-planner/#NGC%207000`.

## Notes

- Rotation is the position angle of the sensor's short axis, measured east of north (0° = long side runs east–west).
- Frames follow the view center by default. Drag the sky to compose, or untick the option to keep them pinned.
- SIMBAD often has no size for large nebulae. A few common ones have built-in approximate sizes, and you can type a size for any target.
