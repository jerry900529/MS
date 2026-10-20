// 把 music-list.txt（中文歌單）與 music-list-en.txt（英文歌單）同步到 public/config.json 的 musicLibrary／musicLibraryEn
// 格式：名稱 | YouTube ID | …
// 用法：node sync-music.js    （改完 music-list.txt 的名稱後執行；整行刪掉＝移除該曲）
const fs = require('fs'), path = require('path');
const cfgPath = path.join(__dirname, 'public', 'config.json');
const readList = (file) => {
  const seen = new Set(), lib = [];
  for (const l of fs.readFileSync(path.join(__dirname, file), 'utf8').split('\n')) {
    if (!l.trim() || l.startsWith('#')) continue;
    const [title, yt] = l.split('|').map((s) => s.trim());
    if (!title || !/^[\w-]{11}$/.test(yt || '') || seen.has(yt)) { console.warn('略過：', l); continue; }
    seen.add(yt); lib.push({ title, yt });
  }
  return lib;
};
const lib = readList('music-list.txt'), libEn = readList('music-list-en.txt');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
cfg.musicLibrary = lib;
cfg.musicLibraryEn = libEn;
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
console.log(`musicLibrary：${lib.length} 首，musicLibraryEn：${libEn.length} 首`);
