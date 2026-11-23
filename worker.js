// fovplanner.com server: the static site (index.html) plus a small gallery API.
// Images live in the R2 bucket bound as GALLERY; uploads need the UPLOAD_KEY secret;
// plate solving goes through nova.astrometry.net with the ASTROMETRY_KEY secret;
// AI session plans go through the Claude API with the ANTHROPIC_KEY secret (see planApi).

const JSON_H = { 'content-type': 'application/json; charset=utf-8' };
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { ...JSON_H, ...extra } });
const NOVA = 'https://nova.astrometry.net';
const MAX_IMAGE = 30 * 1024 * 1024;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (p === '/api/gallery' || p.startsWith('/api/gallery/')) return await galleryApi(req, env, url);
      if (p.startsWith('/g/')) return await serveFile(req, env, p.slice(1));
      if (p === '/api/solve' || p.startsWith('/api/solve/')) return await solveApi(req, env, url);
      if (p.startsWith('/t/')) return await serveTemp(env, p.slice(3));
      if (p.startsWith('/hips/')) return await hipsTile(req, p);
      if (p.startsWith('/api/sync/')) return await syncApi(req, env, p);
      if (p === '/api/site' || p.startsWith('/api/site/')) return await siteApi(req, env, p, url);
      if (p === '/api/plan' || p.startsWith('/api/plan/')) return await planApi(req, env, p);
    } catch (e) {
      return json({ error: e.message || String(e) }, e.status || 500);
    }
    return env.ASSETS.fetch(req);
  },
};

// Sky-survey tiles (HiPS) through Cloudflare's edge cache. The surveys never change, so a tile fetched once is kept
// at the nearest Cloudflare data centre for a month: later views load from there instead of from Strasbourg, Madrid or
// Pasadena, and the map keeps working when one of them is down. Upstreams are tried in order.
const HIPS = {
  dss: ['https://alasky.cds.unistra.fr/DSS/DSSColor', 'https://skies.esac.esa.int/DSSColor', 'https://irsa.ipac.caltech.edu/data/hips/CDS/DSS2/color', 'https://alaskybis.cds.unistra.fr/DSS/DSSColor'],
  '2mass': ['https://alasky.cds.unistra.fr/2MASS/Color', 'https://skies.esac.esa.int/2MASSColor', 'https://irsa.ipac.caltech.edu/data/hips/CDS/2MASS/Color', 'https://alaskybis.cds.unistra.fr/2MASS/Color'],
  iris: ['https://alasky.cds.unistra.fr/IRISColor', 'https://skies.esac.esa.int/IRISColor', 'https://alaskybis.cds.unistra.fr/IRISColor'],
};
const hipsBad = new Map();   // upstream host → time it last failed (kept per Worker instance): skip it for 5 minutes
async function hipsTile(req, p) {
  const m = p.match(/^\/hips\/(dss|2mass|iris)\/((?:Norder\d{1,2}\/(?:Dir\d+\/)?(?:Npix\d+|Allsky)\.(?:jpg|png))|properties|Moc\.fits)$/);
  if (!m || req.method !== 'GET') return new Response('Not found', { status: 404 });
  const [, survey, rest] = m, cache = caches.default;
  const key = new Request(`https://fovplanner.com/hips/${survey}/${rest}`);
  const hit = await cache.match(key);
  if (hit) return hit;
  const now = Date.now(), list = HIPS[survey].filter((b) => !(now - (hipsBad.get(b) || 0) < 300000));
  for (const base of list.length ? list : HIPS[survey]) {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 5000);
    try {
      const r = await fetch(`${base}/${rest}`, { signal: ctl.signal, cf: { cacheTtl: 2592000, cacheEverything: true } });
      if (!r.ok) { hipsBad.set(base, Date.now()); continue; }   // includes 404: a mirror that is down (CDS answers every request with a 404 page then)
      const meta = rest === 'properties' || rest === 'Moc.fits';
      const type = r.headers.get('content-type') || (rest.endsWith('.png') ? 'image/png' : rest === 'properties' ? 'text/plain' : rest === 'Moc.fits' ? 'application/fits' : 'image/jpeg');
      if (!meta && !/^image\//.test(type)) { hipsBad.set(base, Date.now()); continue; }   // an HTML error page from a sick mirror
      const res = new Response(r.body, { headers: { 'content-type': type, 'cache-control': `public, max-age=${meta ? 86400 : 2592000}`,
        'access-control-allow-origin': '*', 'x-hips-source': new URL(base).host } });
      await cache.put(key, res.clone());
      return res;
    } catch { hipsBad.set(base, Date.now()); /* try the next mirror */ } finally { clearTimeout(tm); }
  }
  return new Response('No survey mirror had this tile', { status: 404, headers: { 'access-control-allow-origin': '*' } });
}

// Settings sync between a person's devices, under a name the person picks plus a 6-digit PIN.
// The browser derives two things from name + PIN: a proof (sent here) and an encryption key (never sent). The settings
// arrive already encrypted, so this server stores a blob it cannot read. A short PIN is only safe because guessing is
// limited: after 5 wrong PINs a name is locked for 15 minutes, then for longer each time.
const SYNC_MAX = 1024 * 1024;
const hex = (buf) => Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, '0')).join('');
async function syncApi(req, env, p) {
  const id = p.slice('/api/sync/'.length), H = { 'cache-control': 'no-store' };
  if (!/^[0-9a-f]{64}$/.test(id)) fail('Bad sync id.', 404);
  const proof = req.headers.get('x-sync-proof') || '';
  if (!/^[0-9a-f]{64}$/.test(proof)) fail('Missing PIN proof.', 401);
  const dataKey = `sync/${id}.json`, authKey = `sync/${id}.auth.json`;
  const ao = await env.GALLERY.get(authKey), auth = ao ? await ao.json() : null;
  const now = Date.now(), want = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('fovplanner:' + proof)));
  const saveAuth = (a) => env.GALLERY.put(authKey, JSON.stringify(a), { httpMetadata: { contentType: 'application/json' } });
  if (auth) {
    if (auth.lockUntil > now) return json({ error: 'locked', until: auth.lockUntil }, 429, H);
    if (auth.proof !== want) {
      auth.fails = (auth.fails || 0) + 1;
      if (auth.fails % 5 === 0) auth.lockUntil = now + 15 * 60000 * 2 ** Math.min(6, auth.fails / 5 - 1);   // 15 min, 30, 60 … up to 16 h
      await saveAuth(auth);
      if (auth.lockUntil > now) return json({ error: 'locked', until: auth.lockUntil }, 429, H);
      return json({ error: 'wrong', left: 5 - (auth.fails % 5) }, 403, H);
    }
    if (auth.fails) { auth.fails = 0; auth.lockUntil = 0; await saveAuth(auth); }
  }
  if (req.method === 'GET') {
    const o = auth && await env.GALLERY.get(dataKey);
    if (!o) return json({ error: 'none' }, 404, H);
    return new Response(o.body, { headers: { ...JSON_H, ...H } });
  }
  if (req.method === 'PUT') {
    const body = await req.text();
    if (body.length > SYNC_MAX) fail('Settings too large to sync.', 413);
    let d; try { d = JSON.parse(body); } catch { fail('Bad sync data.'); }
    if (d?.v !== 2 || typeof d.iv !== 'string' || typeof d.ct !== 'string' || !(d.ts > 0)) fail('Bad sync data.');
    if (!auth) await saveAuth({ proof: want, created: now, fails: 0 });   // first save claims the name
    // never let an older copy overwrite a newer one (two devices saving at nearly the same time)
    const cur = await env.GALLERY.head(dataKey), curTs = +(cur?.customMetadata?.ts || 0);
    if (curTs > d.ts) return json({ ok: false, newer: curTs }, 409, H);
    await env.GALLERY.put(dataKey, body, { httpMetadata: { contentType: 'application/json' }, customMetadata: { ts: String(d.ts) } });
    return json({ ok: true, ts: d.ts }, 200, H);
  }
  if (req.method === 'DELETE') { await env.GALLERY.delete([dataKey, authKey]); return json({ ok: true }, 200, H); }
  fail('Method not allowed.', 405);
}

// Live site sensors (CheapoDC dew controller, anemometer…). The planner creates a feed: a random id (which also lets you
// read it) and a device key (which lets a device write to it; only its hash is kept here). A device POSTs a small JSON
// reading every minute or two; the planner reads the latest and the last 48 hours.
const SITE_FIELDS = ['t', 'rh', 'dp', 'out', 'sky', 'skyd', 'wind', 'gust', 'wdir', 'sp', 'p', 'lux', 'sqm', 'v', 'rssi'];
const SITE_KEEP = 48 * 3600e3;
async function siteApi(req, env, p, url) {
  const H = { 'cache-control': 'no-store', 'access-control-allow-origin': '*' };
  const sha = async (t) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('fovplanner-site:' + t)));
  if (p === '/api/site' && req.method === 'POST') {   // create a feed
    const rnd = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
    const id = rnd(12), key = rnd(16);
    await env.GALLERY.put(`site/${id}.auth.json`, JSON.stringify({ key: await sha(key), created: Date.now() }), { httpMetadata: { contentType: 'application/json' } });
    return json({ id, key }, 200, H);
  }
  const id = p.slice('/api/site/'.length);
  if (!/^[0-9a-f]{24}$/.test(id)) fail('Unknown feed.', 404);
  const ao = await env.GALLERY.get(`site/${id}.auth.json`); if (!ao) fail('Unknown feed.', 404);
  const dataKey = `site/${id}.json`;
  if (req.method === 'GET') {
    const o = await env.GALLERY.get(dataKey);
    if (!o) return json({ last: null, hist: [] }, 200, H);
    const d = await o.json(), since = Date.now() - Math.min(48, Math.max(1, +url.searchParams.get('h') || 12)) * 3600e3;
    return json({ last: d.last, hist: (d.hist || []).filter((r) => r.ts >= since) }, 200, H);
  }
  if (req.method === 'POST') {   // a device reading
    const auth = await ao.json();
    if ((await sha(req.headers.get('x-site-key') || '')) !== auth.key) fail('Wrong device key.', 403);
    const body = await req.text(); if (body.length > 4096) fail('Reading too large.', 413);
    let r; try { r = JSON.parse(body); } catch { fail('Bad reading.'); }
    const rec = { ts: Date.now() };
    for (const k of SITE_FIELDS) if (Number.isFinite(+r[k]) && r[k] !== null && r[k] !== '') rec[k] = Math.round(+r[k] * 100) / 100;
    if (typeof r.dev === 'string') rec.dev = r.dev.slice(0, 24).replace(/[^\w .-]/g, '');
    if (Object.keys(rec).length < 2) fail('No readings in that message.');
    const o = await env.GALLERY.get(dataKey), d = o ? await o.json() : { hist: [] };
    // several devices can share a feed: merge their latest values, keep a history point per message (thinned to 1/min)
    d.last = { ...(d.last && Date.now() - d.last.ts < 15 * 60e3 ? d.last : {}), ...rec };
    const h = (d.hist || []).filter((x) => x.ts >= rec.ts - SITE_KEEP);
    const prev = h[h.length - 1];
    if (prev && rec.ts - prev.ts < 55e3 && prev.dev === rec.dev) h[h.length - 1] = { ...prev, ...rec }; else h.push(rec);
    d.hist = h;
    await env.GALLERY.put(dataKey, JSON.stringify(d), { httpMetadata: { contentType: 'application/json' } });
    return json({ ok: true }, 200, H);
  }
  if (req.method === 'DELETE') {
    const auth = await ao.json();
    if ((await sha(req.headers.get('x-site-key') || '')) !== auth.key) fail('Wrong device key.', 403);
    await env.GALLERY.delete([dataKey, `site/${id}.auth.json`]); return json({ ok: true }, 200, H);
  }
  fail('Method not allowed.', 405);
}

// ---- ✦ Plan my night: the planner's own numbers → Claude → a timed session plan ----
// Test phase: only the site owner (upload key) and holders of a tester code (PLAN_CODES secret, comma-separated) may
// use it, unless PLAN_OPEN = "1". Every plan is counted per day in R2 (ai/usage/YYYY-MM-DD.json) with its tokens, and
// a daily cap (PLAN_DAILY_MAX, default 100) and a per-connection cap (PLAN_PER_IP, default 5) protect the API bill.
const PLAN_MODEL = 'claude-haiku-5-5';
const PRICE = { 'claude-haiku-5-5': [0.10, 0.50], 'claude-sonnet-5-5': [2, 10], 'claude-opus-5-5': [4, 20] };   // USD per million tokens in, out
const PLAN_SYSTEM = `You are the session planner inside FOV Planner, a free astrophotography planning website.
You receive JSON the planner has already calculated for one night at one site: the rigs the user is taking (each its own mount, running at the same time unless the user says otherwise), candidate deep-sky targets with the local times each is clear of the user's horizon and above their minimum altitude ("clear"), the hourly forecast (cloud % is the median of four weather models, cloud_spread is how much they disagree; seeing in arcseconds; gust and wind in km/h; dew_gap = temperature minus dew point in °C; moon_alt in degrees), the Moon, the Bortle class, and the user's wish list with notes.

Make a practical, timed plan for the user's window.
Rules:
- Use only targets from "targets" or "wish_list", with their ids exactly as given. Never invent coordinates, rise or set times: every block must sit inside one of that target's "clear" windows and inside the user's window.
- One target at a time per rig; prefer 1-2 long blocks per rig over many short ones (integration time matters). Leave ~10 min between blocks for slewing, plate solving and focus.
- Put a target on a rig it suits ("best_rig" and "framing"); a mosaic needs proportionally more time, so only plan one when the hours allow it.
- Moon: if moon_sensitive is true, schedule it when the Moon is down or far away. Narrowband and dual-band filters cope with moonlight; broadband (L, RGB, UV/IR-cut) does not.
- Bortle 7-9: favour emission nebulae with narrowband or dual-band filters.
- Avoid hours with high cloud or rain; if cloud_spread is large, say the forecast is uncertain. If gust exceeds a rig's wind_limit_kmh, warn or move that rig to a sheltered/smaller target. When dew_gap is under 3, tell them to raise dew heaters.
- Give filter and a sensible sub length for each block from the camera (mono/colour), filter type, f-ratio and sky brightness (e.g. narrowband 180-600 s, dual-band on colour 180-300 s, broadband 30-180 s under bright skies). Mention gain only in general terms ("unity gain"). Note a meridian flip when a block spans the time the target is highest.
- target_style: "best" = the strongest plan for tonight. "showpieces" or "popular" = well-known bright targets are fine. "gems" = the user wants targets that are striking but rarely photographed by amateurs, the kind that make someone say "aha, what is that?": strong colour contrast (Ha and OIII together, blue reflection beside dark dust), unusual shapes (arcs, shells, bubbles, jets, dark filaments), or a small showpiece of interest inside a larger field. Use your own knowledge of how each listed object looks and how often it is imaged to choose; avoid the obvious famous objects even if listed. For each block, "why" must say in one sentence what makes that object special to look at, and whether it needs long integration because it is faint.
- When the user asks for something specific (a type, "not common", "something new"), choose accordingly from the list; if nothing in the list matches, say so in the summary rather than substituting a famous object.
- Respect the user's request ("ask") when it does not break these rules. Prefer wish-list targets when they fit well. Skip targets marked already_imaged unless asked.
- If the night is clouded out or nothing fits, say so plainly and give the best fallback (e.g. the clearest hours, or calibration frames).
- Plain, friendly language; short sentences; no markdown. Times as HH:MM local, as in the data.
Return only the JSON object described by the schema.`;
const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['summary', 'blocks', 'before', 'during', 'after'],
  properties: {
    summary: { type: 'string', description: 'Two or three sentences: the verdict for the night and the overall plan.' },
    blocks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['rig', 'start', 'end', 'target', 'target_name', 'filter', 'exposure', 'framing', 'why'],
      properties: { rig: { type: 'string', description: 'Rig id letter from the data' }, start: { type: 'string' }, end: { type: 'string' },
        target: { type: 'string', description: 'Target id exactly as given' }, target_name: { type: 'string' },
        filter: { type: 'string' }, exposure: { type: 'string', description: 'e.g. 300 s subs, ~30 subs' }, framing: { type: 'string', description: 'single frame or mosaic grid, rotation hint' },
        why: { type: 'string', description: 'One sentence: why this target at this time' } } } },
    before: { type: 'array', items: { type: 'string' }, description: 'Setup tips before starting (max 4)' },
    during: { type: 'array', items: { type: 'string' }, description: 'Things to watch during the night: weather, dew, flips (max 4)' },
    after: { type: 'array', items: { type: 'string' }, description: 'Calibration and pack-up (max 3)' },
  },
};
async function planApi(req, env, p) {
  const H = { 'cache-control': 'no-store' };
  const owner = await authorised(req, env);
  const codes = (env.PLAN_CODES || '').split(',').map((s) => s.trim()).filter(Boolean);
  const code = (req.headers.get('x-plan-code') || '').trim();
  const tester = !!code && codes.includes(code);
  const allowed = owner || tester || env.PLAN_OPEN === '1';
  const model = env.PLAN_MODEL || PLAN_MODEL;
  const dailyMax = +env.PLAN_DAILY_MAX || 100, perIp = +env.PLAN_PER_IP || 5;
  const day = new Date().toISOString().slice(0, 10), usageKey = `ai/usage/${day}.json`;
  const ip = await (async () => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('fovplanner-ip:' + (req.headers.get('cf-connecting-ip') || '')))).slice(0, 16))();
  const readUsage = async (k) => { const o = env.GALLERY && await env.GALLERY.get(k); return o ? await o.json() : { n: 0, in: 0, out: 0, cacheIn: 0, usd: 0, ips: {} }; };
  const monthUsage = async () => {
    const list = await env.GALLERY.list({ prefix: `ai/usage/${day.slice(0, 7)}` }), m = { n: 0, usd: 0 };
    for (const o of list.objects) { const u = await readUsage(o.key); m.n += u.n; m.usd += u.usd || 0; }
    return m;
  };
  const usageView = async (u) => owner ? { today: { n: u.n, usd: u.usd || 0 }, month: await monthUsage(), dailyMax } : undefined;
  if (p === '/api/plan/status' && req.method === 'GET') {
    if (!allowed) return json({ allowed: false, test: true }, 200, H);
    if (!env.ANTHROPIC_KEY) return json({ allowed: false, error: 'not set up' }, 200, H);
    const u = await readUsage(usageKey);
    return json({ allowed: true, model, left: owner ? null : Math.max(0, perIp - (u.ips?.[ip] || 0)), usage: await usageView(u) }, 200, H);
  }
  if (p !== '/api/plan' || req.method !== 'POST') fail('Not found.', 404);
  if (!allowed) fail('AI planning is in a test phase and not open yet.', 403);
  if (!env.ANTHROPIC_KEY) fail('AI planning is not set up (ANTHROPIC_KEY secret missing).', 503);
  if (!env.GALLERY) fail('Storage (R2 bucket) is not connected.', 503);
  const body = await req.text(); if (body.length > 60000) fail('Too much data for one plan.', 413);
  let b; try { b = JSON.parse(body); } catch { fail('Bad request.'); }
  if (!b || typeof b.data !== 'object') fail('Bad request.');
  const u = await readUsage(usageKey);
  if (u.n >= dailyMax && !owner) fail('The AI planner has reached today\'s limit. Please try again tomorrow.', 429);
  if (!owner && (u.ips?.[ip] || 0) >= perIp) return json({ error: `You have used today's ${perIp} plans. More tomorrow!`, left: 0 }, 429, H);
  const user = `Tonight's data:\n${JSON.stringify(b.data)}\n\nUser's request: ${String(b.ask || '').slice(0, 400) || '(none: make the best plan)'}`;
  const call = async (structured) => fetch(env.ANTHROPIC_URL || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_KEY, 'anthropic-version': env.ANTHROPIC_VERSION || '2023-06-01' },
    body: JSON.stringify({
      model, max_tokens: 4000,
      system: [{ type: 'text', text: PLAN_SYSTEM + (structured ? '' : '\n\nJSON schema:\n' + JSON.stringify(PLAN_SCHEMA)), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
      ...(structured ? { output_config: { format: { type: 'json_schema', schema: PLAN_SCHEMA } } } : {}),
    }),
  });
  let r = await call(true);
  if (r.status === 400) { const t = await r.text(); if (/output_config|json_schema|format/i.test(t)) r = await call(false); else fail('The AI service refused the request: ' + t.slice(0, 200), 502); }
  if (r.status === 429 || r.status === 529) fail('The AI service is busy. Try again in a minute.', 503);
  if (!r.ok) fail(`The AI service answered ${r.status}.`, 502);
  const j = await r.json();
  // count it first: the tokens are billed whether or not the answer can be used
  const us = j.usage || {}, [pin, pout] = PRICE[model] || PRICE[PLAN_MODEL];
  const inTok = (us.input_tokens || 0) + (us.cache_creation_input_tokens || 0) * 1.25, cacheTok = us.cache_read_input_tokens || 0;
  const usd = (inTok * pin + cacheTok * pin * 0.1 + (us.output_tokens || 0) * pout) / 1e6;
  const u2 = await readUsage(usageKey);   // re-read: another plan may have finished meanwhile
  u2.n++; u2.in += us.input_tokens || 0; u2.cacheIn += cacheTok; u2.out += us.output_tokens || 0; u2.usd = (u2.usd || 0) + usd;
  u2.ips = u2.ips || {}; if (!owner) u2.ips[ip] = (u2.ips[ip] || 0) + 1;
  await env.GALLERY.put(usageKey, JSON.stringify(u2), { httpMetadata: { contentType: 'application/json' } });
  const text = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
  const tryParse = (t) => { try { return JSON.parse(t); } catch { return null; } };
  let plan = tryParse(text) || tryParse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''))
    || (text.indexOf('{') >= 0 ? tryParse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) : null);
  if (plan && !Array.isArray(plan.blocks)) plan = Object.values(plan).find((v) => v && typeof v === 'object' && Array.isArray(v.blocks)) || plan;
  if (!plan || !Array.isArray(plan.blocks)) {
    console.log('plan parse failed', j.stop_reason, text.slice(0, 500));
    const why = j.stop_reason === 'max_tokens' ? 'The AI answer was cut off (too long).' : j.stop_reason === 'refusal' ? 'The AI declined this request.' : 'The AI answer could not be read. Please try again.';
    return json({ error: why, debug: owner ? { stop_reason: j.stop_reason, model: j.model, text: text.slice(0, 600), content_types: (j.content || []).map((c) => c.type) } : undefined,
      usage: await usageView(u2) }, 502, H);
  }
  // keep only what the page renders
  const str = (x, n = 300) => (typeof x === 'string' ? x.slice(0, n) : '');
  plan = { summary: str(plan.summary, 800), blocks: plan.blocks.slice(0, 12).map((x) => ({ rig: str(x.rig, 4), start: str(x.start, 5), end: str(x.end, 5), target: str(x.target, 60),
    target_name: str(x.target_name, 80), filter: str(x.filter, 80), exposure: str(x.exposure, 80), framing: str(x.framing, 120), why: str(x.why, 300) })),
    before: (plan.before || []).slice(0, 5).map((x) => str(x)), during: (plan.during || []).slice(0, 5).map((x) => str(x)), after: (plan.after || []).slice(0, 4).map((x) => str(x)) };
  return json({ plan, left: owner ? null : Math.max(0, perIp - (u2.ips[ip] || 0)), usage: await usageView(u2) }, 200, H);
}

function fail(msg, status = 400) { const e = new Error(msg); e.status = status; throw e; }

async function authorised(req, env) {
  const got = req.headers.get('x-upload-key') || '';
  const want = env.UPLOAD_KEY || '';
  if (!want || got.length !== want.length) return false;
  const a = new TextEncoder().encode(got), b = new TextEncoder().encode(want);
  return crypto.subtle.timingSafeEqual ? crypto.subtle.timingSafeEqual(a, b) : got === want;
}

async function readIndex(env) {
  const o = await env.GALLERY.get('index.json');
  return o ? await o.json() : [];
}
async function writeIndex(env, items) {
  await env.GALLERY.put('index.json', JSON.stringify(items), { httpMetadata: { contentType: 'application/json' } });
}

const TEXT_FIELDS = ['title', 'target', 'date', 'location', 'bortle', 'rig', 'telescope', 'camera', 'filters', 'integration', 'software', 'notes', 'credit', 'license', 'source'];
function cleanMeta(m) {
  const out = {};
  for (const k of TEXT_FIELDS) if (m[k] != null) out[k] = String(m[k]).slice(0, k === 'notes' ? 4000 : 300);
  if (m.ra != null && isFinite(m.ra)) out.ra = +m.ra;
  if (m.dec != null && isFinite(m.dec)) out.dec = +m.dec;
  if (m.wcs && Array.isArray(m.wcs.crval) && Array.isArray(m.wcs.crpix) && Array.isArray(m.wcs.cd)) {
    out.wcs = { crval: m.wcs.crval.map(Number), crpix: m.wcs.crpix.map(Number), cd: m.wcs.cd.map(Number), w: +m.wcs.w, h: +m.wcs.h };
  }
  if (m.w) out.w = +m.w; if (m.h) out.h = +m.h;
  if (typeof m.flip === 'boolean') out.flip = m.flip;
  if (m.kind === 'mine' || m.kind === 'ref') out.kind = m.kind;
  if (out.source && !/^https?:\/\//i.test(out.source)) delete out.source;
  return out;
}

async function galleryApi(req, env, url) {
  if (!env.GALLERY) fail('The gallery storage (R2 bucket) is not connected yet.', 503);
  const parts = url.pathname.split('/').filter(Boolean);   // ['api','gallery', id?, 'solve'?]
  const id = parts[2], sub = parts[3];

  if (req.method === 'GET' && !id) {
    const items = await readIndex(env);
    // the public list never includes solve bookkeeping
    return json(items.map(({ solve, ...it }) => ({ ...it, solving: solve?.status === 'solving' || undefined })), 200, { 'cache-control': 'public, max-age=30' });
  }
  if (req.method === 'GET' && id === 'auth') return (await authorised(req, env)) ? json({ ok: true }) : json({ ok: false }, 401);

  if (!(await authorised(req, env))) fail('Upload key missing or wrong.', 401);

  if (req.method === 'POST' && !id) {
    const form = await req.formData();
    const meta = cleanMeta(JSON.parse(form.get('meta') || '{}'));
    const image = form.get('image'), thumb = form.get('thumb');
    if (!image || typeof image === 'string') fail('No image received.');
    if (image.size > MAX_IMAGE) fail('Image is too large (30 MB max).');
    const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await env.GALLERY.put(`g/${newId}/image.jpg`, await image.arrayBuffer(), { httpMetadata: { contentType: 'image/jpeg' } });
    if (thumb && typeof thumb !== 'string') await env.GALLERY.put(`g/${newId}/thumb.jpg`, await thumb.arrayBuffer(), { httpMetadata: { contentType: 'image/jpeg' } });
    const item = { id: newId, added: Date.now(), ...meta };
    const items = await readIndex(env);
    items.unshift(item);
    await writeIndex(env, items);
    return json(item, 201);
  }

  const items = await readIndex(env);
  const k = items.findIndex((x) => x.id === id);
  if (k < 0) fail('No such image.', 404);

  if (req.method === 'PUT' && !sub) {
    const patch = cleanMeta(await req.json());
    items[k] = { ...items[k], ...patch, edited: Date.now() };
    await writeIndex(env, items);
    return json(items[k]);
  }
  if (req.method === 'DELETE' && !sub) {
    await env.GALLERY.delete([`g/${id}/image.jpg`, `g/${id}/thumb.jpg`]);
    items.splice(k, 1);
    await writeIndex(env, items);
    return json({ ok: true });
  }
  if (sub === 'solve' && req.method === 'POST') {
    if (!env.ASTROMETRY_KEY) fail('Plate solving is not set up (ASTROMETRY_KEY secret missing).', 503);
    const hints = await req.json().catch(() => ({}));
    const session = await novaLogin(env);
    const rq = { session, url: `${url.origin}/g/${id}/image.jpg`, allow_commercial_use: 'n', allow_modifications: 'n', publicly_visible: 'n', downsample_factor: 2 };
    if (isFinite(hints.scale_lower) && isFinite(hints.scale_upper)) Object.assign(rq, { scale_units: 'arcsecperpix', scale_type: 'ul', scale_lower: +hints.scale_lower, scale_upper: +hints.scale_upper });
    if (isFinite(hints.ra) && isFinite(hints.dec)) Object.assign(rq, { center_ra: +hints.ra, center_dec: +hints.dec, radius: isFinite(hints.radius) ? +hints.radius : 5 });
    const r = await fetch(`${NOVA}/api/url_upload`, { method: 'POST', body: new URLSearchParams({ 'request-json': JSON.stringify(rq) }) });
    const j = await r.json();
    if (j.status !== 'success') fail('astrometry.net did not accept the image: ' + (j.errormessage || 'unknown error'), 502);
    items[k].solve = { status: 'solving', subid: j.subid, started: Date.now() };
    await writeIndex(env, items);
    return json({ status: 'solving' });
  }
  if (sub === 'solve' && req.method === 'GET') {
    const s = items[k].solve;
    if (!s || s.status !== 'solving') return json({ status: s?.status || 'none', wcs: items[k].wcs || null });
    const sj = await (await fetch(`${NOVA}/api/submissions/${s.subid}`)).json();
    const jobId = (sj.jobs || []).find((x) => x != null);
    if (!jobId) {
      if (Date.now() - s.started > 30 * 60e3) { items[k].solve = { ...s, status: 'failed', why: 'timed out' }; await writeIndex(env, items); return json({ status: 'failed' }); }
      return json({ status: 'solving', stage: 'queued' });
    }
    const jj = await (await fetch(`${NOVA}/api/jobs/${jobId}/info`)).json();
    if (jj.status !== 'success' && jj.status !== 'failure') return json({ status: 'solving', stage: 'solving' });
    if (jj.status !== 'success') { items[k].solve = { ...s, status: 'failed', job: jobId }; await writeIndex(env, items); return json({ status: 'failed' }); }
    const hdr = parseFitsHeader(await (await fetch(`${NOVA}/wcs_file/${jobId}`)).arrayBuffer());
    const wcs = linearWcs(hdr);
    if (!wcs) { items[k].solve = { ...s, status: 'failed', job: jobId, why: 'no WCS' }; await writeIndex(env, items); return json({ status: 'failed' }); }
    items[k].wcs = wcs;
    items[k].solve = { status: 'solved', job: jobId, at: Date.now() };
    await writeIndex(env, items);
    return json({ status: 'solved', wcs });
  }
  fail('Not found.', 404);
}

// ---- Stand-alone plate solving (e.g. OAG calibration frames): image kept only until it is solved ----
async function solveApi(req, env, url) {
  if (!env.GALLERY) fail('Storage (R2 bucket) is not connected.', 503);
  if (!(await authorised(req, env))) fail('Plate solving is for the site owner: unlock uploads under Gallery first.', 401);
  if (!env.ASTROMETRY_KEY) fail('Plate solving is not set up (ASTROMETRY_KEY secret missing).', 503);
  const id = url.pathname.split('/')[3];
  if (req.method === 'POST' && !id) {
    const form = await req.formData();
    const image = form.get('image'); if (!image || typeof image === 'string') fail('No image received.');
    if (image.size > MAX_IMAGE) fail('Image is too large.');
    const hints = JSON.parse(form.get('hints') || '{}');
    const tid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    await env.GALLERY.put(`tmp/${tid}.jpg`, await image.arrayBuffer(), { httpMetadata: { contentType: 'image/jpeg' } });
    const session = await novaLogin(env);
    const rq = { session, url: `${url.origin}/t/${tid}.jpg`, allow_commercial_use: 'n', allow_modifications: 'n', publicly_visible: 'n', downsample_factor: 2 };
    if (isFinite(hints.scale_lower) && isFinite(hints.scale_upper)) Object.assign(rq, { scale_units: 'arcsecperpix', scale_type: 'ul', scale_lower: +hints.scale_lower, scale_upper: +hints.scale_upper });
    if (isFinite(hints.ra) && isFinite(hints.dec)) Object.assign(rq, { center_ra: +hints.ra, center_dec: +hints.dec, radius: isFinite(hints.radius) ? +hints.radius : 5 });
    const j = await (await fetch(`${NOVA}/api/url_upload`, { method: 'POST', body: new URLSearchParams({ 'request-json': JSON.stringify(rq) }) })).json();
    if (j.status !== 'success') { await env.GALLERY.delete(`tmp/${tid}.jpg`); fail('astrometry.net did not accept the image: ' + (j.errormessage || 'unknown error'), 502); }
    await env.GALLERY.put(`tmp/${tid}.json`, JSON.stringify({ subid: j.subid, started: Date.now() }), { httpMetadata: { contentType: 'application/json' } });
    return json({ id: tid, status: 'solving' });
  }
  if (req.method === 'GET' && id && /^[a-z0-9]+$/.test(id)) {
    const o = await env.GALLERY.get(`tmp/${id}.json`); if (!o) fail('Unknown or finished job.', 404);
    const st = await o.json();
    const cleanup = () => env.GALLERY.delete([`tmp/${id}.jpg`, `tmp/${id}.json`]);
    const sj = await (await fetch(`${NOVA}/api/submissions/${st.subid}`)).json();
    const jobId = (sj.jobs || []).find((x) => x != null);
    if (!jobId) {
      if (Date.now() - st.started > 20 * 60e3) { await cleanup(); return json({ status: 'failed', why: 'timed out' }); }
      return json({ status: 'solving', stage: 'queued' });
    }
    const jj = await (await fetch(`${NOVA}/api/jobs/${jobId}/info`)).json();
    if (jj.status !== 'success' && jj.status !== 'failure') return json({ status: 'solving', stage: 'solving' });
    if (jj.status !== 'success') { await cleanup(); return json({ status: 'failed' }); }
    const hdr = parseFitsHeader(await (await fetch(`${NOVA}/wcs_file/${jobId}`)).arrayBuffer());
    const wcs = linearWcs(hdr);
    await cleanup();
    return wcs ? json({ status: 'solved', wcs }) : json({ status: 'failed', why: 'no WCS' });
  }
  fail('Not found.', 404);
}
async function serveTemp(env, key) {
  if (!env.GALLERY || !/^[a-z0-9]+\.jpg$/.test(key)) return new Response('Not found', { status: 404 });
  const o = await env.GALLERY.get('tmp/' + key);
  return o ? new Response(o.body, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'no-store' } }) : new Response('Not found', { status: 404 });
}

async function novaLogin(env) {
  const r = await fetch(`${NOVA}/api/login`, { method: 'POST', body: new URLSearchParams({ 'request-json': JSON.stringify({ apikey: env.ASTROMETRY_KEY }) }) });
  const j = await r.json();
  if (j.status !== 'success') fail('astrometry.net login failed (check the ASTROMETRY_KEY secret).', 502);
  return j.session;
}

async function serveFile(req, env, key) {
  if (!env.GALLERY || !/^g\/[a-z0-9]+\/(image|thumb)\.jpg$/.test(key)) return new Response('Not found', { status: 404 });
  const o = await env.GALLERY.get(key);
  if (!o) return new Response('Not found', { status: 404 });
  return new Response(o.body, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable', etag: o.httpEtag } });
}

// FITS header (astrometry.net wcs_file) → plain TAN WCS
function parseFitsHeader(buf) {
  const b = new Uint8Array(buf); let text = '';
  for (let i = 0; i < Math.min(b.length, 2880 * 20); i++) text += String.fromCharCode(b[i]);
  const h = {};
  for (const c of text.match(/.{1,80}/gs) || []) {
    const key = c.slice(0, 8).trim();
    if (key === 'END') break;
    if (c[8] !== '=' || !key) continue;
    let v = c.slice(10);
    const sq = v.match(/^\s*'((?:[^']|'')*)'/);
    if (sq) h[key] = sq[1].trim();
    else { v = v.split('/')[0].trim(); const n = Number(v); h[key] = isFinite(n) && v !== '' ? n : v; }
  }
  return h;
}
function linearWcs(h) {
  if (h.CRVAL1 == null || h.CRVAL2 == null || h.CRPIX1 == null || h.CRPIX2 == null || h.CD1_1 == null) return null;
  return { crval: [h.CRVAL1, h.CRVAL2], crpix: [h.CRPIX1, h.CRPIX2], cd: [h.CD1_1, h.CD1_2 || 0, h.CD2_1 || 0, h.CD2_2], w: h.IMAGEW || null, h: h.IMAGEH || null };
}
