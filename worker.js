// fovplanner.com server: the static site (index.html) plus a small gallery API.
// Images live in the R2 bucket bound as GALLERY; uploads need the UPLOAD_KEY secret;
// plate solving goes through nova.astrometry.net with the ASTROMETRY_KEY secret.

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
    } catch (e) {
      return json({ error: e.message || String(e) }, e.status || 500);
    }
    return env.ASSETS.fetch(req);
  },
};

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

const TEXT_FIELDS = ['title', 'target', 'date', 'location', 'bortle', 'rig', 'telescope', 'camera', 'filters', 'integration', 'software', 'notes'];
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
