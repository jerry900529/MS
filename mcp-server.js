// MCP server（stdio）：讓 Claude 查詢本站角色資料、角色查詢，並觸發向 Nexon 更新
// 註冊：claude mcp add tms-ms -- node /絕對路徑/mcp-server.js
// 注意：stdout 專供 MCP 協定使用，記錄一律寫到 stderr
const fs = require('fs');
const path = require('path');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { refreshAll, readCache, characters, isRunning, hasKey } = require('./fetch-data');

const COOLDOWN_MS = 120000; // 與 server.js 相同：同角色冷卻 2 分鐘
const log = (m) => console.error(m);
const text = (v, isError = false) => ({ content: [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v) }], isError });
const known = (id) => characters().some((c) => c.id === id);
const fmtTW = (ms) => (ms ? new Date(ms + 8 * 3600000).toISOString().replace('T', ' ').slice(0, 16) + '（台北）' : '尚無資料');

const server = new McpServer({ name: 'tms-ms', version: '1.0.0' });

server.registerTool('list_characters', {
  description: '列出網站上的角色（id、名稱、職業）、資料更新時間與是否正在更新',
}, async () => text(characters().map((c) => ({
  id: c.id, name: c.name, job: c.job, updated: fmtTW(readCache(c.id).updated), refreshing: isRunning(c.id),
}))));

server.registerTool('get_profile', {
  description: '讀取角色資料。不給 section 只回傳區塊名稱清單（整份很大）；給 section 才回傳該區塊，例如 basic、stat、equip、hexa、skill5、union',
  inputSchema: { id: z.string().describe('角色 id，見 list_characters'), section: z.string().optional() },
}, async ({ id, section }) => {
  if (!known(id)) return text(`未知的角色：${id}`, true);
  const p = readCache(id);
  if (!p.data) return text('此角色尚無資料，請先 refresh_character', true);
  if (!section) return text({ updated: fmtTW(p.updated), date: p.data.date, sections: Object.keys(p.data), errors: p.errors });
  if (!(section in p.data)) return text(`沒有這個區塊：${section}。可用：${Object.keys(p.data).join(', ')}`, true);
  return text(p.data[section]);
});

server.registerTool('get_history', {
  description: '讀取角色經驗歷史（成長曲線）：points[{d,lv,rate,exp}] 與 floor',
  inputSchema: { id: z.string() },
}, async ({ id }) => {
  if (!known(id)) return text(`未知的角色：${id}`, true);
  try { return text(fs.readFileSync(path.join(__dirname, 'public', 'data', id, 'history.json'), 'utf8')); }
  catch { return text('此角色尚無歷史資料', true); }
});

const lookups = new Map(); // 查詢結果快取 6 小時，與 Worker 行為一致
server.registerTool('lookup_character', {
  description: '以角色名稱查詢任意角色（約 27 次 API 呼叫、6～10 秒，結果快取 6 小時）',
  inputSchema: { name: z.string().describe('角色名稱') },
}, async ({ name }) => {
  if (!hasKey()) return text('尚未設定 NEXON_API_KEY（.env）', true);
  const { run, NAME_RE } = await import('./worker/lookup.mjs');
  if (!NAME_RE.test(name)) return text('角色名稱格式不正確', true);
  const hit = lookups.get(name);
  if (hit && Date.now() - hit.t < 6 * 3600e3) return text(hit.r.body);
  const r = await run(name, process.env.NEXON_API_KEY);
  if (r.status !== 200) return text({ status: r.status, ...r.body }, true);
  lookups.set(name, { t: Date.now(), r });
  return text(r.body);
});

server.registerTool('refresh_character', {
  description: '向 Nexon 抓取角色新資料並寫入 public/data（約 85 次 API 呼叫、需數分鐘）。在背景執行，立即回傳；用 list_characters 查看 refreshing 與更新時間。同角色冷卻 2 分鐘',
  inputSchema: { id: z.string() },
}, async ({ id }) => {
  if (!hasKey()) return text('尚未設定 NEXON_API_KEY（.env）', true);
  if (!known(id)) return text(`未知的角色：${id}`, true);
  if (isRunning(id)) return text('此角色正在更新中');
  const wait = COOLDOWN_MS - (Date.now() - readCache(id).updated);
  if (wait > 0) return text(`剛更新過，請約 ${Math.ceil(wait / 1000)} 秒後再試`, true);
  refreshAll([id], log);
  return text('已開始更新，完成後 list_characters 的更新時間會改變');
});

server.connect(new StdioServerTransport()).catch((e) => { log(e); process.exit(1); });
