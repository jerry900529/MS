// 本機預覽伺服器：提供 public/ 靜態檔，並支援網頁上的「重新整理資料」按鈕
// 用法：node server.js（金鑰放在 .env 的 NEXON_API_KEY）
const http = require('http');
const fs = require('fs');
const path = require('path');
const { refresh, refreshAll, readCache, characters, isRunning, hasKey } = require('./fetch-data');

const PORT = process.env.PORT || 3000;
const COOLDOWN_MS = 2 * 60 * 1000; // 同一角色兩次手動更新至少間隔 2 分鐘，保護 API 額度
const REFRESH_MS = 6 * 3600 * 1000; // 開著時每 6 小時自動更新過期的角色
const PUBLIC = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg' };

const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const log = (m) => console.log(m);
const stale = () => characters().filter((c) => Date.now() - readCache(c.id).updated > REFRESH_MS).map((c) => c.id);
const sweep = () => { const ids = stale(); if (ids.length && !sweeping) { sweeping = true; refreshAll(ids, log).finally(() => { sweeping = false; }); } };
let sweeping = false;

if (hasKey()) { sweep(); setInterval(sweep, 600000); }

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const id = u.searchParams.get('c') || characters()[0]?.id;
  if (u.pathname === '/api/status') return json(res, 200, { refreshing: isRunning(id), updated: readCache(id).updated });
  if (u.pathname === '/api/refresh' && req.method === 'POST') {
    if (!hasKey()) return json(res, 503, { error: '尚未設定 NEXON_API_KEY' });
    if (!characters().some((c) => c.id === id)) return json(res, 404, { error: '未知的角色' });
    if (isRunning(id)) return json(res, 202, { refreshing: true });
    const wait = COOLDOWN_MS - (Date.now() - readCache(id).updated);
    if (wait > 0) return json(res, 429, { error: '剛更新過，請稍後再試', retryAfter: Math.ceil(wait / 1000) });
    refreshAll([id], log);
    return json(res, 202, { refreshing: true });
  }
  const file = path.join(PUBLIC, u.pathname === '/' ? 'index.html' : path.normalize(u.pathname));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    const base = { 'content-type': type, 'cache-control': 'no-cache', 'accept-ranges': 'bytes' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || ''); // 支援 Range（音訊拖動進度、接續播放需要）
    if (m && (m[1] || m[2])) {
      const start = m[1] ? +m[1] : Math.max(0, st.size - +m[2]);
      const end = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      if (start > end || start >= st.size) { res.writeHead(416, { 'content-range': `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { ...base, 'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...base, 'content-length': st.size });
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, () => console.log(`http://localhost:${PORT}  (API key: ${hasKey() ? 'set' : 'MISSING'})`));
