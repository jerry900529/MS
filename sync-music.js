// 把 music-list.txt（名稱 | YouTube ID | …）同步到 public/config.json 的 musicLibrary
// 用法：node sync-music.js    （改完 music-list.txt 的名稱後執行；整行刪掉＝移除該曲）
const fs = require('fs'), path = require('path');
const cfgPath = path.join(__dirname, 'public', 'config.json');
const lines = fs.readFileSync(path.join(__dirname, 'music-list.txt'), 'utf8').split('\n');
const seen = new Set(), lib = [];
for (const l of lines) {
  if (!l.trim() || l.startsWith('#')) continue;
  const [title, yt] = l.split('|').map((s) => s.trim());
  if (!title || !/^[\w-]{11}$/.test(yt || '') || seen.has(yt)) { console.warn('略過：', l); continue; }
  seen.add(yt); lib.push({ title, yt });
}
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
cfg.musicLibrary = lib;
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
console.log(`musicLibrary：${lib.length} 首`);
