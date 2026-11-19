# Multi-Rig FOV Planner

**[Try it out at fovplanner.com](https://fovplanner.com/)**

Plan astrophotography with **several telescope + camera combinations overlaid on the same target at once**, and find out which targets actually suit *your* equipment, tonight, under *your* sky.

## Layout

- Five tabs, one job each: **Frame** (search, target, rigs), **Tonight** (night verdict, visibility, target list, comets), **Sky** (location, Moon, 7-night outlook, forecast), **Gallery** (public gallery plus private browser-only images) and **Gear** (equipment, settings, backup)
- On phones the tabs sit at the bottom and the sky map stays on screen while you adjust rigs; on desktop the panel widens for Tonight and Sky
- Rig cards are one line each (field of view, image scale, fit and filter tags); tap a rig to open its settings

## Tonight at a glance

- A plain **GO / MAYBE / NO-GO** answer at the top of Tonight and Conditions: based on the sky alone (cloud, rain, seeing overhead, and wind against your most wind-tolerant rig). GO needs 3 h+ of good sky in a row, MAYBE a shorter or marginal window; the loaded target only adds how much of that window it is usable. Shown with sunset, astronomical night, sunrise and the Moon-free stretch

- One line per rig with the best window of the night, e.g. "good 22:00–03:00 (5 h) · clear · seeing 1.4″ · wind OK", or the main reason there is none (cloud, rain, wind, seeing, or the target too low)
- Uses the loaded target's altitude, cloud, rain, the worst-case gusts against each telescope's wind limit, and the seeing estimate

## Upcoming sky events

- Tonight tab: the next four months of major meteor showers (IMO working list, peaks from solar longitude, ±a few hours) and New/Full Moons. Each shower shows the peak time, the best hour from your site with the radiant's height, the Moon, and a rough rate you might see (ZHR reduced for radiant height, your Bortle class and moonlight). Tap an event to plan that night; while another night is chosen, Tonight and Conditions show *planning …* with a ↩ Tonight button, and the page always starts on tonight

## Comets

- Comets brighter than about magnitude 12 that are up during darkness, from the Minor Planet Center's current orbits (refreshed daily); positions are computed in the browser (checked against Skyfield/DE421 to better than 0.1′)
- Shows predicted magnitude, hours up, distances, how fast the comet moves, and the longest sub-exposure on each rig before it trails
- Search a comet by designation or name (e.g. 12P, C/2025 R2, Tsuchinshan)

## Framing

- Search any object by name (M31, NGC 7000, "Pelican Nebula", LDN 1622) or coordinates (`20 58 47 +44 20` or `314.7 44.3`)
- One colored frame per rig, each with its own rotation, reducer/barlow factor and mosaic (cols × rows, overlap %)
- Per-rig field of view, image scale (″/px) and sampling check against your seeing (or the forecast seeing)
- Fit check for every rig: how much of the frame the target fills, or how much of the target one frame covers and what mosaic you need
- Target details (type, size, magnitude, max altitude, best season) in a collapsible panel; sizes for large nebulae come from a curated catalog

- **Share framing**: one link opens the same target with your frames (rotation, mosaics) drawn dashed for a friend, who can add them to their own rigs
- **Coordinates** for capture software (ASIAIR, N.I.N.A., Ekos, SharpCap): J2000 centre, rotation and every mosaic panel, as text to copy or a CSV file

- **Rig comparison** for the loaded target: image scale and sampling for the forecast seeing, field, framing or mosaic panels, expected detail (seeing + diffraction + pixels), relative exposure time and pixels across the target, with the trade-offs explained in words
- **Off-axis guider**: set prism size, offset, side and guide camera per rig; the prism footprint is drawn on the map and Gaia DR3 stars inside it are counted, with a suggested camera rotation when no good guide star is in reach

## Tonight's targets, filtered for your rigs

- ~2,200 objects ranked for the chosen night and place: galaxies, nebulae, Lynds bright (LBN) and dark (LDN) nebulae, optically visible supernova remnants, planetary nebulae and clusters
- **Targets too small for a rig are hidden**; big ones show the mosaic they need (up to the panel limit you set)
- Usable dark hours above your minimum altitude, peak altitude, and Moon distance; galaxies, dark nebulae and clusters can count only moon-free hours
- Aware of each rig's filter: galaxies and clusters still show for narrowband/dual-band rigs, marked **swap filter** with the broadband filter to use from your own list; broadband rigs count moonlight on everything
- When nothing matches, it says why (too small, too low, or too little moon-free time)
- Targets you have already imaged are marked ✓ imaged and ranked lower: your Private images count for everyone on their own device; the public gallery counts only on the owner's unlocked devices
- Pick a target from the dropdown to load it; for mosaics the rig's grid and rotation are set for you

## Bright passes (ISS, Tiangong)

- Predicted from current orbital elements (CelesTrak, cached 12 h; SGP4 via satellite.js): every pass that is sunlit while your sky is dark, with times, height and direction. A pass that comes within your frame (allowing ~1° for element errors) is flagged, and its half-hour is marked in the trail strip

## Places

- Save several observing sites and switch between them from the list under the location; horizons are stored per site. *My location* warns when the device only knows its position roughly (laptops locate themselves from the network, which can put a dark site in the city)

## Local horizon (trees, buildings)

- Sky tab → **Horizon**: enter how high obstructions reach in eight directions, or import an *azimuth altitude* skyline file (N.I.N.A. `.hrz`, Stellarium). Saved per observing site (within 5 km), so a flat site stays flat
- The altitude chart shades the obstruction in the target's direction through the night and reports hours clear of it (and hours lost). Tonight's picks, comets and the forecast verdict count only clear time; the *On target* row shows `tree` when it is hidden

## Wish list

- *☆ Wish list* on the target card saves the target with its framing (view centre and each rig's rotation). The Wish list card on the Tonight tab lists them sorted by usable hours on the chosen night (pick another night in the Moon strip), with times and best month. Tap one to load it and see its altitude curve, *Frame ▸* to open it on the map with the saved framing, ✕ to remove. Each target can carry a note (✎ in the list, or the note box on the target card when it is on the list), saved as you type. Saved in this browser and included in backups

## Measuring on the map

- *⟷ Measure* in the map toolbar: tap two points to get the angular distance (° ′ ″), the position angle east of north, ΔRA and ΔDec, and the distance in pixels on each active rig. A tap near a catalogued object snaps to it; otherwise it snaps to the brightest nearby Gaia star (when the catalogue answers). Tap again to start a new measurement; ✕ or Esc stops

## Several photos of one field

- When two or more of your photos cover the view centre (e.g. M74 from two rigs), the map shows one at a time: step through them with ◀ ▶ in the map toolbar (or the [ and ] keys), or press *all* to stack them as before

## What's in the frame?

- Frame tab → *What's in the frame?* lists everything catalogued inside the frames at the current view centre: the built-in catalogue (with LDN/LBN/SNR when loaded) and a SIMBAD search for nebulae, remnants, planetaries, clusters and galaxies, shown by the names imagers use (NGC, Sh2, LBN, HB …). Tap one to load it
- It also shows when the field is up: usable hours tonight (dark, above your minimum altitude, clear of your horizon) with times, the best months, and a 12-month strip of usable hours mid-month; each listed object gets its own hours for tonight

## Filters

- Add your filters under Equipment: type (narrowband Hα / OIII / SII or a full set, LRGB set, dual-band, light-pollution, UV/IR cut), size (1.25″ to 50 mm) and optional bandwidth
- **Filter suggestion per rig and target**: colour cameras get dual-band, light-pollution or UV/IR-cut filters; mono cameras get narrowband or LRGB, choosing the right lines for the target (Hα for HII regions, Hα + OIII for supernova remnants, OIII + Hα for planetary nebulae)
- Vignetting check: warns when a filter is too small for the sensor and tells you which size the sensor needs

## Conditions

- Any place: search by name or coordinates, use your device location, and save one place as the default
- **Sky brightness and Bortle class** for the location, from the Light Pollution Atlas, with an alert above Bortle 5
- **7-night outlook** in the style of Clear Outside: cloud for every hour 16:00–07:00, darkness and Moon bars, clear dark hours per night and the best night of the week; tap a night to open its detailed forecast
- **Moon**: phase, illumination, rise/set, next Full and New Moon, and a two-week strip — tap a night to plan it
- **Wind for guiding**: give each telescope a wind limit under Equipment (an estimate from its size is used until you do). The forecast marks every hour ✓ / ~ / ✕ for each telescope in use, and the summary says how many dark hours each one can guide through
- Gusts are the strongest of four forecasts (chosen model plus ECMWF, ICON and GFS); wind at 80–120 m warns when gusts may come down to a "calm" ground
- **Airport wind check**: the measured wind at the nearest airport is compared with the forecast for the same hour; if the forecast is running low, tonight's gusts are scaled up to match
- **Observed now**: the latest report from the nearest airport within 150 km (METAR, via the [Iowa Environmental Mesonet](https://mesonet.agron.iastate.edu/)): measured visibility, cloud and its height, rain, thunderstorms, dust or fog, and wind, decoded into plain words
- Hourly night forecast from [Open-Meteo](https://open-meteo.com/): cloud (low/mid/high), humidity, dew risk, wind gusts, rain chance and amount, storm risk (thunderstorms the model forecasts, or unstable air with real rain or cloud chances), and transparency from dust/haze (aerosol optical depth) plus visibility; a note after daytime rain explains its effect on transparency and seeing
- Choose the forecast model (best match, ECMWF, ICON or GFS), and compare total cloud from all three side by side: a "models disagree" flag shows when the forecast is uncertain
- **Seeing estimate** in arcseconds from a layered turbulence model (Dewan / Tatarskii) using temperature and wind at 16 pressure levels (1000–100 hPa): zenith, free-air (above 1 km) and on-target, plus the main turbulent layer, jet-stream wind and cooling rate
- The hourly table shows the essentials (cloud, rain, storms, seeing, transparency, gusts per telescope, dew); cloud layers, the three models, jet stream, cooling, humidity and dust sit under **More detail**
- 7Timer ASTRO chart, plus links to meteoblue and Clear Outside (and Qatar Met / QMD for locations in Qatar)
- Altitude chart for any night, with twilight shading
- **Satellite trails** estimate: the chance that a sub of your chosen length gets a trail, every half hour through the night, from today's constellation sizes and whether satellites in your target's direction are still sunlit

## Sky imagery

- Surveys: **NSNS narrowband** ([OIII]·Hα·[SII] color, Hα, [OIII]) and **IPHAS Hα** to see faint nebulae and supernova remnants, plus DSS2, Pan-STARRS, 2MASS, Mellinger and wide-field Hα
- **Auto** mode: narrowband for nebulae, DSS color for galaxies and clusters
- "Faint detail" slider to stretch the survey and bring out faint nebulosity
- **Dust** overlay (IRAS 100 µm far-infrared): dark nebulae are dust clouds, so they glow here and show their real shape; turns on by itself for dark nebulae (LDN, Barnard)

## Gallery

- Your processed images online at fovplanner.com, with title, target, dates, location, Bortle, telescope, camera, filters, integration, processing and notes
- Plate-solved images show on the sky map wherever that part of the sky is in view, so the gallery doubles as a reference layer for faint and dark nebulae
- Upload a JPG/PNG export or a FITS file; add its `.wcs` / `wcs.fits`, or let the planner plate-solve it on astrometry.net (1–5 minutes)
- **Reference images** by other photographers (public-domain or openly licensed, e.g. NASA, ESA, ESO, CC BY) can be added with their credit, licence and source link, shown on the card and detail page; filter the gallery by My photos / Reference
- Everyone can view; only the owner (with the upload key) can add, edit or delete. Setup: see `SETUP-GALLERY.md`

## My images

- Overlay your own plate-solved images: JPG/PNG + astrometry.net `wcs.fits` or ASTAP `.wcs`, or a FITS (mono or RGB, optionally with a separate `wcs.fits`)
- Linear FITS data is auto-stretched; stretched data is shown as-is; unsolved FITS are placed approximately from RA/DEC + focal length + pixel size, with a rotation slider
- Stored in your browser and shown automatically whenever that part of the sky is in view, with opacity and flip controls

## Sky images (tile cache)

- On fovplanner.com the DSS2, 2MASS and IRIS sky images load through the site's own Cloudflare cache (`/hips/…` in worker.js). A tile is fetched once from whichever source is up (CDS Strasbourg → ESA Madrid → IRSA Caltech → CDS backup) and then kept at the nearest Cloudflare data centre for 30 days, so repeat views are fast and the map keeps working when CDS is down. A source that fails is skipped for 5 minutes
- Each tile counts as one Worker request (free plan: 100,000 a day)

## Catalogue fallbacks

- The built-in catalogue has all 313 Sharpless objects (minus those already listed under an NGC/IC/Messier name); the planetary nebulae among them (Sh2-200, Sh2-188, Sh2-216, Sh2-274 Medusa, Sh2-290 Abell 31 …) are typed as planetaries, using SIMBAD's classification. VizieR falls back from CDS to the Harvard and Cape Town (IDIA) mirrors, and a mirror's error page counts as a failure
- Tonight's list says when objects that fit are hidden by the *Min fill* setting
- Planetary nebulae have their own *Min fill* (default 3%): their faint outer halos are much larger than catalogue sizes

- VizieR queries (Gaia guide stars, dark/bright nebulae, SNRs) fall back from CDS to the Harvard CfA mirror; the last 20 Gaia fields are kept on the device, so the guide-star check works offline at the site

## Optics check (Gear)

- Drop in one raw FITS sub: the planner measures hundreds of stars on your device and reports **sensor tilt** (star size across the frame), **back-focus spacing** (radial or tangential stretching in the corners) and **guiding/wind/flexure** (the same stretch everywhere), with a 3×3 star-size map, a whisker plot and a history per rig
- **Which tilt screw:** a one-time daylight card test per camera maps the plot to the camera body (clock positions seen from the back, USB port at 12), optionally naming your tilt plate's adjusters. A second sub taken after nudging focus inward shows which side sits too far from the telescope and which way to turn. This test works wherever focus was set.

## Sync across devices (Gear tab)

- Pick a **sync name** (e.g. `orion-hunter`) and a **6-digit PIN**, and press *Connect*. A new name saves this device's setup under it; on every other computer, phone or browser, enter the same name and PIN once and that device loads your setup. From then on they share one setup: equipment, rigs, filters, places, horizons, wish list with notes, camera sides, optics history and settings
- Changes are uploaded a few seconds after you make them; a device picks up newer changes when it opens or comes back to the foreground (an open page offers *Load it* rather than reloading under you). If two devices change things at nearly the same time, the later save wins
- From name + PIN the browser derives a proof (sent to the server) and an encryption key (never sent): settings are encrypted with AES-GCM before they leave the device and stored in the site's R2 bucket under a hash of the name (`sync/…`, worker.js `/api/sync/`), so the server can't read them. After 5 wrong PINs a name is locked for 15 minutes, then for longer each time. Wrong PIN and "name taken" look the same from outside. Names must be 5+ characters, and common ones (including the example) are refused; before a device loads a synced setup it shows what is in it (telescopes, cameras, rigs, wish list, last saved), so a stranger who picked the same name and PIN would see it isn't theirs. Private images are not synced (use Export with images)

## Live site sensors

- Gear → *Site sensors* → *Create site feed* gives a feed id and a device key. A device at the site (the CheapoDC dew controller, later the anemometer) POSTs a small JSON reading every minute or two to `/api/site/<id>` with the key in an `x-site-key` header; worker.js keeps the latest values and 48 hours of history in R2 (`site/…`), storing only a hash of the key
- Sky → *At your site now* shows temperature, dew point, dew gap (warns ≤ 4 °C, red ≤ 2 °C), humidity, heater power, IR sky temperature (sky minus air: below −18 °C clear, −10…−18 haze/thin cloud, above −10 cloudy) and wind, with 12-hour sparklines; it refreshes every minute while open
- Accepted fields: t, rh, dp, out, sp, sky, skyd, wind, gust, wdir, p, lux, sqm, v, rssi, plus a short `dev` name. Firmware add-on for CheapoDC 2.3.x: `cheapodc-sitefeed/CDCSiteFeed.h` with install steps in `SITEFEED-INSTALL.md`

## Your data

- Contact: contact@fovplanner.com (iCloud custom domain). On the page the address is assembled only when the Contact link is tapped, so it isn't in the HTML for spam robots

- Equipment, rigs, filters, settings, default location and images are saved **only in your own browser** — nothing is uploaded, and other users never see or change your setup
- One address: settings live per web address, so `www.fovplanner.com` and the old github.io copy hand their settings to `fovplanner.com` once (merged if both have a setup) and then redirect. Private images stay at the old address until exported (`?stay` opens it)
- Export / Import a backup file (optionally with images) to keep a copy, move to another device, or share your setup with friends
- Anonymous usage statistics via GoatCounter (no cookies, no personal data)

## Credits

- Object catalog: [OpenNGC](https://github.com/mattiaverga/OpenNGC) (CC-BY-SA 4.0) and the Sharpless (1959) catalog; Lynds dark (LDN) and bright (LBN) nebulae and Green's Galactic SNR catalogue (2025, optically visible remnants only) loaded live from [VizieR](https://vizier.cds.unistra.fr/) and cached for 90 days
- Object details: [SIMBAD](https://simbad.cds.unistra.fr/) (CDS)
- Sky viewer: [Aladin Lite v3](https://aladin.cds.unistra.fr/AladinLite/) (CDS); DSS2 and 2MASS images fall back to the [ESA Sky](https://sky.esa.int/) mirror, and name lookups to the SIMBAD mirror at Harvard (CfA), when CDS is down
- Narrowband imagery: Northern Sky Narrowband Survey by Stefan Ziegenbalg ([CC BY-NC-SA 4.0](http://www.simg.de/nebulae3/dr0_2/)); IPHAS DR2 Hα
- Light pollution: [Light Pollution Atlas](https://djlorenz.github.io/astronomy/lp/) by David Lorenz (Bortle class is an approximation from sky brightness)
- Comet orbits: [Minor Planet Center](https://www.minorplanetcenter.net/)
- Weather and air quality: [Open-Meteo](https://open-meteo.com/); airport observations: [Iowa Environmental Mesonet](https://mesonet.agron.iastate.edu/) (Iowa State University); astronomical forecast chart: [7Timer!](https://www.7timer.info/)

The page is a single file (`index.html`), no build step. Hosted on Cloudflare Workers; `worker.js` adds the gallery API (images in Cloudflare R2).

## Notes

- Rotation is the position angle of the sensor's short axis, measured east of north (0° = long side runs east–west).
- Frames follow the view center by default. Drag the sky to compose, or untick the option to keep them pinned.
- Set the **Sensor** type (mono / color) for each camera under Equipment if its name doesn't make it obvious — filter suggestions depend on it.
- Catalog sizes for some large faint nebulae are approximate; you can type a size for any target.
- After an update, press Ctrl+F5 (or reopen the page on a phone) if you still see the old version.
