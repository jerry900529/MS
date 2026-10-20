// 向 NEXON Open API (TMS) 抓角色資料，寫入 public/data/<id>/{profile,history}.json
// 角色清單來自 public/config.json 的 characters。
// 可單獨執行（node fetch-data.js [id]，GitHub Actions 用），也被 server.js 引用
const fs = require('fs');
const path = require('path');

try { // 讀取 .env（不依賴套件）
  for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {}

const API_KEY = process.env.NEXON_API_KEY || '';
const BASE = 'https://open.api.nexon.com/maplestorytw/v1';
const DATA_DIR = path.join(__dirname, 'public', 'data');

const characters = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'config.json'), 'utf8')).characters || [];
const files = (id) => ({ dir: path.join(DATA_DIR, id), out: path.join(DATA_DIR, id, 'profile.json'), hist: path.join(DATA_DIR, id, 'history.json') });
const find = (id) => characters().find((c) => c.id === id);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function nexon(p, params = {}, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(`${BASE}${p}?${new URLSearchParams(params)}`, { headers: { 'x-nxopen-api-key': API_KEY } });
    const v = await r.json().catch(() => ({}));
    if (r.ok) return v;
    if (v.error?.name === 'OPENAPI00007' && i < tries - 1) { await sleep(4000 * (i + 1)); continue; } // 呼叫太頻繁 → 等一下重試
    throw Object.assign(new Error(v.error?.message || 'API error'), { code: v.error?.name, status: r.status });
  }
}

// 要抓的端點；key 是前端使用的欄位名，[路徑, 額外參數]
const ENDPOINTS = {
  basic: '/character/basic',
  stat: '/character/stat',
  equip: '/character/item-equipment',
  popularity: '/character/popularity',
  ability: '/character/ability',
  hyper: '/character/hyper-stat',
  propensity: '/character/propensity',
  android: '/character/android-equipment',
  pet: '/character/pet-equipment',
  link: '/character/link-skill',
  symbol: '/character/symbol-equipment',
  setEffect: '/character/set-effect',
  hexa: '/character/hexamatrix',
  hexaStat: '/character/hexamatrix-stat',
  vmatrix: '/character/vmatrix',
  skill5: ['/character/skill', { character_skill_grade: '5' }],
  skill6: ['/character/skill', { character_skill_grade: '6' }],
  dojang: '/character/dojang',
  cash: '/character/cashitem-equipment',
  beauty: '/character/beauty-equipment',
  raider: '/user/union-raider',
  union: '/user/union',
  artifact: '/user/union-artifact',
  champion: '/user/union-champion',
};

function readCache(id) {
  try { return JSON.parse(fs.readFileSync(files(id).out, 'utf8')); } catch { return { updated: 0, data: {}, errors: {} }; }
}

// 經驗歷史：近 30 天每天一點，更早每週一點，往回抓到 API 沒資料為止（floor）。每次只補缺的日期。
async function updateHistory(id, ocid, latest, cap = 60) {
  const f = files(id);
  let h = { points: [], floor: null };
  try { h = JSON.parse(fs.readFileSync(f.hist, 'utf8')); } catch {}
  const have = new Set(h.points.map((p) => p.d));
  const DAY = 86400000, base = Date.parse(latest);
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  const wanted = [];
  for (let i = 0; i < 30; i++) wanted.push({ d: iso(base - i * DAY), daily: true });
  for (let i = 35; i <= 700; i += 7) wanted.push({ d: iso(base - i * DAY), daily: false });
  let calls = 0;
  for (const { d, daily } of wanted) { // 由新到舊
    if (have.has(d)) continue;
    if (h.floor && d <= h.floor) break;
    if (calls++ >= cap) break;
    const b = await nexon('/character/basic', { ocid, date: d });
    await sleep(1200);
    if (b.character_level == null) { if (daily) continue; h.floor = d; break; }
    h.points.push({ d, lv: b.character_level, rate: Number(b.character_exp_rate), exp: Number(b.character_exp) });
  }
  h.points.sort((a, b) => (a.d < b.d ? -1 : 1));
  fs.mkdirSync(f.dir, { recursive: true });
  fs.writeFileSync(f.hist, JSON.stringify(h));
}

const running = new Map();
// 抓取單一角色的全部資料；抓失敗的欄位保留舊值。同一角色同時間只會有一個在跑
function refresh(id) {
  if (!API_KEY) return Promise.reject(new Error('尚未設定 NEXON_API_KEY'));
  const ch = find(id);
  if (!ch) return Promise.reject(new Error('未知的角色：' + id));
  if (running.has(id)) return running.get(id);
  const p = (async () => {
    const f = files(id), prev = readCache(id);
    const { ocid } = await nexon('/id', { character_name: ch.name });
    const date = new Date(Date.now() + 8 * 3600000 - 86400000).toISOString().slice(0, 10); // 官方資料每日更新，取台北時間的昨日
    const next = { ...prev.data, name: ch.name, date };
    const errors = {};
    for (const [k, def] of Object.entries(ENDPOINTS)) {
      const [ep, extra] = Array.isArray(def) ? def : [def, {}];
      try { next[k] = await nexon(ep, { ocid, date, ...extra }); } catch (e) { errors[k] = e.code || e.message; }
      await sleep(1500);
    }
    try { // 公會資訊
      const g = next.basic?.character_guild_name;
      if (g) {
        const { oguild_id } = await nexon('/guild/id', { guild_name: g, world_name: next.basic.world_name });
        next.guild = await nexon('/guild/basic', { oguild_id, date });
      }
    } catch (e) { errors.guild = e.code || e.message; }
    try { await updateHistory(id, ocid, date); } catch (e) { errors.history = e.code || e.message; }
    const out = { updated: Date.now(), data: next, errors };
    fs.mkdirSync(f.dir, { recursive: true });
    fs.writeFileSync(f.out, JSON.stringify(out));
    return out;
  })().finally(() => running.delete(id));
  running.set(id, p);
  return p;
}

// 依序更新多個角色（一個失敗不影響其他）。ids 省略 = 全部
async function refreshAll(ids, log = console.log) {
  let ok = 0;
  for (const c of characters().filter((c) => !ids || ids.includes(c.id))) {
    try {
      const o = await refresh(c.id);
      ok++;
      log(`[${c.id}] refreshed ${new Date(o.updated).toISOString()} errors: ${JSON.stringify(o.errors)}`);
    } catch (e) { log(`[${c.id}] failed: ${e.message}`); }
  }
  return ok;
}

module.exports = { refresh, refreshAll, readCache, characters, isRunning: (id) => running.has(id), hasKey: () => !!API_KEY };

if (require.main === module) {
  const ids = process.argv.slice(2);
  refreshAll(ids.length ? ids : null).then((ok) => { if (!ok) process.exit(1); });
}
