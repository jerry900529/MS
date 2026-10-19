// 角色查詢：輸入「完全正確」的角色名稱 → 回傳和 public/data/<id>/profile.json 同格式的資料
// 同一份程式碼有兩個用途：
//   1. Cloudflare Worker（部署後金鑰放在 Worker 的 Secret，不會出現在網頁／repo）
//   2. 本機 server.js 的 /api/lookup（node server.js 測試用）
// 純 ES module、不依賴套件。ENDPOINTS 要和 fetch-data.js 的保持一致（但不抓歷史經驗，省額度）
const BASE = 'https://open.api.nexon.com/maplestorytw/v1';
const ENDPOINTS = {
  basic: '/character/basic', stat: '/character/stat', equip: '/character/item-equipment', popularity: '/character/popularity',
  ability: '/character/ability', hyper: '/character/hyper-stat', propensity: '/character/propensity', android: '/character/android-equipment',
  pet: '/character/pet-equipment', link: '/character/link-skill', symbol: '/character/symbol-equipment', setEffect: '/character/set-effect',
  hexa: '/character/hexamatrix', hexaStat: '/character/hexamatrix-stat', vmatrix: '/character/vmatrix',
  skill5: ['/character/skill', { character_skill_grade: '5' }], skill6: ['/character/skill', { character_skill_grade: '6' }],
  dojang: '/character/dojang', cash: '/character/cashitem-equipment', beauty: '/character/beauty-equipment',
  raider: '/user/union-raider', union: '/user/union', artifact: '/user/union-artifact', champion: '/user/union-champion',
};
const CONCURRENCY = 3;          // 開發金鑰每秒 5 次：同時 3 條、遇到 OPENAPI00007 就等一下重試
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function nexon(key, p, params = {}, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(`${BASE}${p}?${new URLSearchParams(params)}`, { headers: { 'x-nxopen-api-key': key } });
    const v = await r.json().catch(() => ({}));
    if (r.ok) return v;
    if (v.error?.name === 'OPENAPI00007' && i < tries - 1) { await sleep(1200 * (i + 1)); continue; }
    throw Object.assign(new Error(v.error?.message || 'API error'), { code: v.error?.name, status: r.status });
  }
}

// 把工作排成佇列、同時最多 n 條
async function pool(jobs, n) {
  const q = [...jobs];
  await Promise.all(Array.from({ length: n }, async () => { for (let j; (j = q.shift()); ) await j(); }));
}

export async function lookup(name, key) {
  const date = new Date(Date.now() - 86400000).toISOString().slice(0, 10); // 官方資料每日結算，取昨日
  const { ocid } = await nexon(key, '/id', { character_name: name });
  const data = { name, date }, errors = {};
  const jobs = Object.entries(ENDPOINTS).map(([k, def]) => async () => {
    const [ep, extra] = Array.isArray(def) ? def : [def, {}];
    try { data[k] = await nexon(key, ep, { ocid, date, ...extra }); } catch (e) { errors[k] = e.code || e.message; }
  });
  await pool(jobs, CONCURRENCY);
  try { // 公會資訊（2 次呼叫）
    const g = data.basic?.character_guild_name;
    if (g) {
      const { oguild_id } = await nexon(key, '/guild/id', { guild_name: g, world_name: data.basic.world_name });
      data.guild = await nexon(key, '/guild/basic', { oguild_id, date });
    }
  } catch (e) { errors.guild = e.code || e.message; }
  return { updated: Date.now(), data, errors, lookup: true };
}

/* ---- 以下是 Cloudflare Worker 的進入點 ---- */
// 查詢並把錯誤整理成 {status, body}（Worker 與本機 server.js 共用）
export async function run(name, key) {
  try {
    const out = await lookup(name, key);
    return out.data.basic?.character_name ? { status: 200, body: out } : { status: 404, body: { error: 'no_data' } };
  } catch (e) {
    if (e.code === 'OPENAPI00003' || e.code === 'OPENAPI00004' || e.status === 400) return { status: 404, body: { error: 'not_found' } };
    if (e.code === 'OPENAPI00007' || e.code === 'OPENAPI00009' || e.status === 429) return { status: 429, body: { error: 'busy' } };
    return { status: 502, body: { error: 'upstream', code: e.code || null } };
  }
}

const TTL = 6 * 3600;           // 同一個名稱快取 6 小時（命中快取不耗 API 額度）
export const NAME_RE = /^[\p{L}\p{N}_ -]{1,20}$/u;
const json = (body, status, cors) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors } });

export default {
  async fetch(req, env, ctx) {
    const origin = req.headers.get('origin') || '';
    const allow = (env.ALLOW_ORIGIN || 'https://jerry900529.github.io').split(',').map((s) => s.trim());
    const cors = allow.includes(origin) ? { 'access-control-allow-origin': origin, vary: 'origin' } : { vary: 'origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET', 'access-control-max-age': '86400' } });
    if (origin && !allow.includes(origin)) return json({ error: 'forbidden' }, 403, cors);
    const name = (new URL(req.url).searchParams.get('name') || '').trim();
    if (!NAME_RE.test(name)) return json({ error: 'bad_name' }, 400, cors);

    const cacheKey = new Request('https://lookup.cache/' + encodeURIComponent(name));
    const hit = await caches.default.match(cacheKey);
    if (hit) return new Response(hit.body, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'x-cache': 'HIT', ...cors } });
    const r = await run(name, env.NEXON_API_KEY);
    if (r.status !== 200) return json(r.body, r.status, cors);
    const res = new Response(JSON.stringify(r.body), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${TTL}` } });
    ctx.waitUntil(caches.default.put(cacheKey, res.clone()));
    return new Response(res.body, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'x-cache': 'MISS', ...cors } });
  },
};
