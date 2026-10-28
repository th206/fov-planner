# Multi-Rig FOV Planner

**[Try it out at fovplanner.com](https://fovplanner.com/)**

Plan astrophotography with **several telescope + camera combinations overlaid on the same target at once**, and find out which targets actually suit *your* equipment, tonight, under *your* sky.

## Framing

- Search any object by name (M31, NGC 7000, "Pelican Nebula", LDN 1622) or coordinates (`20 58 47 +44 20` or `314.7 44.3`)
- One colored frame per rig, each with its own rotation, reducer/barlow factor and mosaic (cols × rows, overlap %)
- Per-rig field of view, image scale (″/px) and sampling check against your seeing (or the forecast seeing)
- Fit check for every rig: how much of the frame the target fills, or how much of the target one frame covers and what mosaic you need
- Target details (type, size, magnitude, max altitude, best season) in a collapsible panel; sizes for large nebulae come from a curated catalog

## Tonight's targets, filtered for your rigs

- ~2,200 objects ranked for the chosen night and place: galaxies, nebulae, Lynds bright (LBN) and dark (LDN) nebulae, optically visible supernova remnants, planetary nebulae and clusters
- **Targets too small for a rig are hidden**; big ones show the mosaic they need (up to the panel limit you set)
- Usable dark hours above your minimum altitude, peak altitude, and Moon distance; galaxies, dark nebulae and clusters can count only moon-free hours
- Aware of each rig's filter: galaxies and clusters still show for narrowband/dual-band rigs, marked **swap filter** with the broadband filter to use from your own list; broadband rigs count moonlight on everything
- When nothing matches, it says why (too small, too low, or too little moon-free time)
- Pick a target from the dropdown to load it; for mosaics the rig's grid and rotation are set for you

## Filters

- Add your filters under Equipment: type (narrowband Hα / OIII / SII or a full set, LRGB set, dual-band, light-pollution, UV/IR cut), size (1.25″ to 50 mm) and optional bandwidth
- **Filter suggestion per rig and target**: colour cameras get dual-band, light-pollution or UV/IR-cut filters; mono cameras get narrowband or LRGB, choosing the right lines for the target (Hα for HII regions, Hα + OIII for supernova remnants, OIII + Hα for planetary nebulae)
- Vignetting check: warns when a filter is too small for the sensor and tells you which size the sensor needs

## Conditions

- Any place: search by name or coordinates, use your device location, and save one place as the default
- **Sky brightness and Bortle class** for the location, from the Light Pollution Atlas, with an alert above Bortle 5
- **Moon**: phase, illumination, rise/set, next Full and New Moon, and a two-week strip — tap a night to plan it
- **Wind for guiding**: give each telescope a wind limit under Equipment (an estimate from its size is used until you do). The forecast marks every hour ✓ / ~ / ✕ for each telescope in use, and the summary says how many dark hours each one can guide through
- Gusts are the strongest of four forecasts (chosen model plus ECMWF, ICON and GFS); wind at 80–120 m warns when gusts may come down to a "calm" ground
- **Airport wind check**: the measured wind at the nearest airport is compared with the forecast for the same hour; if the forecast is running low, tonight's gusts are scaled up to match
- **Observed now**: the latest report from the nearest airport within 150 km (METAR, via the [Iowa Environmental Mesonet](https://mesonet.agron.iastate.edu/)): measured visibility, cloud and its height, rain, thunderstorms, dust or fog, and wind, decoded into plain words
- Hourly night forecast from [Open-Meteo](https://open-meteo.com/): cloud (low/mid/high), humidity, dew risk, wind gusts, rain chance and amount, storm risk (CAPE instability), and transparency from dust/haze (aerosol optical depth) plus visibility; a note after daytime rain explains its effect on transparency and seeing
- Choose the forecast model (best match, ECMWF, ICON or GFS), and compare total cloud from all three side by side: a "models disagree" flag shows when the forecast is uncertain
- **Seeing estimate** in arcseconds from a layered turbulence model (Dewan / Tatarskii) using temperature and wind at 16 pressure levels (1000–100 hPa): zenith, free-air (above 1 km) and on-target, plus the main turbulent layer, jet-stream wind and cooling rate
- 7Timer ASTRO chart, plus links to meteoblue and Clear Outside (and Qatar Met / QMD for locations in Qatar)
- Altitude chart for any night, with twilight shading

## Sky imagery

- Surveys: **NSNS narrowband** ([OIII]·Hα·[SII] color, Hα, [OIII]) and **IPHAS Hα** to see faint nebulae and supernova remnants, plus DSS2, Pan-STARRS, 2MASS, Mellinger and wide-field Hα
- **Auto** mode: narrowband for nebulae, DSS color for galaxies and clusters
- "Faint detail" slider to stretch the survey and bring out faint nebulosity

## My images

- Overlay your own plate-solved images: JPG/PNG + astrometry.net `wcs.fits` or ASTAP `.wcs`, or a FITS (mono or RGB, optionally with a separate `wcs.fits`)
- Linear FITS data is auto-stretched; stretched data is shown as-is; unsolved FITS are placed approximately from RA/DEC + focal length + pixel size, with a rotation slider
- Stored in your browser and shown automatically whenever that part of the sky is in view, with opacity and flip controls

## Your data

- Equipment, rigs, filters, settings, default location and images are saved **only in your own browser** — nothing is uploaded, and other users never see or change your setup
- Export / Import a backup file (optionally with images) to keep a copy, move to another device, or share your setup with friends
- Anonymous usage statistics via GoatCounter (no cookies, no personal data)

## Credits

- Object catalog: [OpenNGC](https://github.com/mattiaverga/OpenNGC) (CC-BY-SA 4.0) and the Sharpless (1959) catalog; Lynds dark (LDN) and bright (LBN) nebulae and Green's Galactic SNR catalogue (2025, optically visible remnants only) loaded live from [VizieR](https://vizier.cds.unistra.fr/) and cached for 90 days
- Object details: [SIMBAD](https://simbad.cds.unistra.fr/) (CDS)
- Sky viewer: [Aladin Lite v3](https://aladin.cds.unistra.fr/AladinLite/) (CDS); DSS2 and 2MASS images fall back to the [ESA Sky](https://sky.esa.int/) mirror, and name lookups to the SIMBAD mirror at Harvard (CfA), when CDS is down
- Narrowband imagery: Northern Sky Narrowband Survey by Stefan Ziegenbalg ([CC BY-NC-SA 4.0](http://www.simg.de/nebulae3/dr0_2/)); IPHAS DR2 Hα
- Light pollution: [Light Pollution Atlas](https://djlorenz.github.io/astronomy/lp/) by David Lorenz (Bortle class is an approximation from sky brightness)
- Weather and air quality: [Open-Meteo](https://open-meteo.com/); airport observations: [Iowa Environmental Mesonet](https://mesonet.agron.iastate.edu/) (Iowa State University); astronomical forecast chart: [7Timer!](https://www.7timer.info/)

Single file (`index.html`), no build step. Hosted on Cloudflare Pages.

## Notes

- Rotation is the position angle of the sensor's short axis, measured east of north (0° = long side runs east–west).
- Frames follow the view center by default. Drag the sky to compose, or untick the option to keep them pinned.
- Set the **Sensor** type (mono / color) for each camera under Equipment if its name doesn't make it obvious — filter suggestions depend on it.
- Catalog sizes for some large faint nebulae are approximate; you can type a size for any target.
- After an update, press Ctrl+F5 (or reopen the page on a phone) if you still see the old version.
