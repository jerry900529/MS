// MCP server（Streamable HTTP，無狀態、無套件）：讓 claude.ai 的「自訂連結器」查詢本站資料
// 網址：https://<worker>/mcp/<MCP_PATH>，MCP_PATH 是 Worker 的 Secret（當作密碼，路徑不對一律 404）
// 資料取自 GitHub Pages 上已公開的 data/<id>/*.json；只有 lookup_character 會消耗 Nexon 額度，另有限流
const SITE = 'https://jerry900529.github.io/MS';
const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const ID_RE = /^[a-z0-9_-]{1,32}$/i;
const REQ_LIMIT = [120, 60];          // 整體：每分鐘 120 次請求
const LOOKUP_LIMIT = [6, 3600];       // 角色查詢（未命中快取才算）：每小時 6 次
const fmtTW = (ms) => (ms ? new Date(ms + 8 * 3600000).toISOString().replace('T', ' ').slice(0, 16) + '（台北）' : '尚無資料');

const idProp = { id: { type: 'string', description: '角色 id，見 list_characters' } };
const TOOLS = [
  { name: 'list_characters', description: '列出網站上的角色（id、名稱、職業）與資料更新時間', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_profile', description: '讀取角色資料。不給 section 只回傳區塊名稱清單；給 section 才回傳該區塊，例如 basic、stat、equip、hexa、skill5、union', inputSchema: { type: 'object', properties: { ...idProp, section: { type: 'string' } }, required: ['id'] } },
  { name: 'get_history', description: '讀取角色經驗歷史（成長曲線）：points[{d,lv,rate,exp}] 與 floor', inputSchema: { type: 'object', properties: idProp, required: ['id'] } },
  { name: 'lookup_character', description: '以完全正確的角色名稱查詢任意角色（約 27 次 API、6～10 秒，結果快取 6 小時，每小時有次數上限）。不給 section 只回傳區塊名稱清單與基本資料', inputSchema: { type: 'object', properties: { name: { type: 'string' }, section: { type: 'string' } }, required: ['name'] } },
];

const text = (v, isError = false) => ({ content: [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v) }], isError });
const rpc = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcErr = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

// 以 Cache API 做簡易計數限流（非嚴格原子，足以擋一般濫用）；回傳 true = 超過上限
async function limited(name, [max, sec]) {
  const bucket = Math.floor(Date.now() / 1000 / sec);
  const key = new Request(`https://rl.cache/${name}/${bucket}`);
  const hit = await caches.default.match(key);
  const n = hit ? Number(await hit.text()) : 0;
  if (n >= max) return true;
  await caches.default.put(key, new Response(String(n + 1), { headers: { 'cache-control': `max-age=${sec}` } }));
  return false;
}

async function site(path) {
  const r = await fetch(`${SITE}/${path}`, { cf: { cacheTtl: 300 } });
  if (!r.ok) throw new Error(`讀取失敗（${r.status}）`);
  return r.json();
}
const pick = (p, section) => {
  if (!section) return { updated: fmtTW(p.updated), date: p.data?.date, sections: Object.keys(p.data || {}), errors: p.errors };
  if (!(section in (p.data || {}))) throw new Error(`沒有這個區塊：${section}。可用：${Object.keys(p.data || {}).join(', ')}`);
  return p.data[section];
};

async function call(name, a, env, ctx, deps) {
  if (name === 'list_characters') {
    const cs = (await site('config.json')).characters || [];
    return text(await Promise.all(cs.map(async (c) => {
      const p = await site(`data/${c.id}/profile.json`).catch(() => ({}));
      return { id: c.id, name: c.name, job: c.job, updated: fmtTW(p.updated) };
    })));
  }
  if (name === 'get_profile' || name === 'get_history') {
    const id = String(a.id || '');
    const cs = (await site('config.json')).characters || [];
    if (!ID_RE.test(id) || !cs.some((c) => c.id === id)) return text(`未知的角色：${id}`, true);
    if (name === 'get_history') return text(await site(`data/${id}/history.json`));
    return text(pick(await site(`data/${id}/profile.json`), a.section));
  }
  if (name === 'lookup_character') {
    const n = String(a.name || '').trim();
    if (!deps.NAME_RE.test(n)) return text('角色名稱格式不正確', true);
    const cacheKey = new Request('https://lookup.cache/' + encodeURIComponent(n)); // 與 ?name= 查詢共用快取
    const hit = await caches.default.match(cacheKey);
    let body = hit ? await hit.json() : null;
    if (!body) {
      if (await limited('lookup', LOOKUP_LIMIT)) return text('查詢次數已達上限，請稍後再試', true);
      const r = await deps.run(n, env.NEXON_API_KEY);
      if (r.status !== 200) return text({ status: r.status, ...r.body }, true);
      body = r.body;
      ctx.waitUntil(caches.default.put(cacheKey, new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=21600' } })));
    }
    return text(pick(body, a.section));
  }
  return null;
}

async function handle(m, env, ctx, deps) {
  const id = m.id;
  if (id === undefined) return null; // notification（如 notifications/initialized）不回應
  switch (m.method) {
    case 'initialize': {
      const v = m.params?.protocolVersion;
      return rpc(id, { protocolVersion: VERSIONS.includes(v) ? v : VERSIONS[0], capabilities: { tools: {} }, serverInfo: { name: 'tms-ms', version: '1.0.0' } });
    }
    case 'ping': return rpc(id, {});
    case 'tools/list': return rpc(id, { tools: TOOLS });
    case 'tools/call': {
      try {
        const r = await call(m.params?.name, m.params?.arguments || {}, env, ctx, deps);
        return r ? rpc(id, r) : rpcErr(id, -32602, `未知的工具：${m.params?.name}`);
      } catch (e) { return rpc(id, text(e.message || '發生錯誤', true)); }
    }
    default: return rpcErr(id, -32601, 'Method not found');
  }
}

// 回傳 Response；路徑不是 /mcp/<MCP_PATH> 時回傳 null，讓 Worker 繼續走原本的查詢流程
export async function mcp(req, env, ctx, deps) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  if (parts[0] !== 'mcp') return null;
  if (!env.MCP_PATH || parts[1] !== env.MCP_PATH || parts.length !== 2) return new Response('Not found', { status: 404 });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
  if (await limited('req', REQ_LIMIT)) return new Response('Too many requests', { status: 429, headers: { 'retry-after': '60' } });
  let body;
  try { body = await req.json(); } catch { return Response.json(rpcErr(null, -32700, 'Parse error'), { status: 400 }); }
  const msgs = Array.isArray(body) ? body : [body];
  const out = (await Promise.all(msgs.map((m) => handle(m || {}, env, ctx, deps)))).filter(Boolean);
  if (!out.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? out : out[0]);
}
