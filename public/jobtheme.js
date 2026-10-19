/* 職業主題產生器：給「角色查詢」用。依職業的美術色系產生一整套 CSS 變數（背景、卡片、文字、頂部漸層、浮水印圖樣）。
   - JobTheme.apply('傑諾') → 套用並回傳 'gen'；JobTheme.clear() → 清掉產生的變數（切回手工主題前要先呼叫）
   - 表裡沒有的職業：用職業名稱算出固定色相的深色主題（同一個職業永遠同一個顏色）
   - 4 個內建手工主題（夜使者／破風使者／暗影神偷／惡魔復仇者）不在這裡，仍由 index.html 的 CSS 負責
   欄位：m=d(深色)／l(淺色)　a=主色　b=副色　h=頂部漸層三色　k=圖樣 */
(function () {
  const J = {
    // 劍士
    英雄: { m: 'd', a: '#ff6b4a', b: '#ffb03a', h: ['#1a0806', '#5a1608', '#a8321a'], k: 'blade' },
    聖騎士: { m: 'l', a: '#d4a020', b: '#4a8fe0', h: ['#8a5e08', '#c99518', '#efc65a'], k: 'cross' },
    黑騎士: { m: 'd', a: '#9b6dff', b: '#5a4bd1', h: ['#05030a', '#1c1236', '#3d2380'], k: 'blade' },
    聖魂劍士: { m: 'l', a: '#e8a317', b: '#3c8dde', h: ['#2a5db8', '#3d86d8', '#f0b73c'], k: 'sun' },
    狂狼勇士: { m: 'l', a: '#3a8fd8', b: '#8fd3ff', h: ['#174f94', '#3a8fd8', '#9fdcff'], k: 'crystal' },
    米哈逸: { m: 'l', a: '#d9a42a', b: '#5aa0f0', h: ['#7a5a14', '#c09a30', '#f0d98a'], k: 'cross' },
    凱撒: { m: 'd', a: '#e0b44a', b: '#c0392b', h: ['#08090f', '#1b2338', '#5b4720'], k: 'blade' },
    惡魔殺手: { m: 'd', a: '#c04dff', b: '#ff4d8a', h: ['#0b0412', '#2c0c3c', '#5a1257'], k: 'flame' },
    劍豪: { m: 'd', a: '#e5484d', b: '#e8e0d0', h: ['#0a0a0c', '#2a0f12', '#5a1218'], k: 'blade' },
    神之子: { m: 'd', a: '#f2c14e', b: '#8e7cff', h: ['#1c1740', '#4a3d9a', '#c89a3a'], k: 'ring' },
    阿戴爾: { m: 'd', a: '#6c8cff', b: '#c9a0ff', h: ['#070a1a', '#1b2766', '#4a3b9a'], k: 'blade' },
    亞克: { m: 'd', a: '#2ee6c8', b: '#7a5cff', h: ['#040b12', '#0b2a3a', '#1c4a6a'], k: 'ring' },
    // 法師
    '大魔導士(火': { m: 'd', a: '#ff6a3a', b: '#b04dd0', h: ['#12060a', '#4a1010', '#7a2a8a'], k: 'flame' },
    '大魔導士(冰': { m: 'l', a: '#3ab0ff', b: '#8a7cff', h: ['#123e8a', '#2a8ae0', '#9ad8ff'], k: 'crystal' },
    主教: { m: 'l', a: '#d8a828', b: '#8a6cf0', h: ['#6a4fc0', '#9a82e0', '#e0c070'], k: 'cross' },
    烈焰巫師: { m: 'd', a: '#ff7a2a', b: '#ffcc3a', h: ['#1a0804', '#6a2208', '#c0501a'], k: 'flame' },
    龍魔導士: { m: 'l', a: '#22b8a0', b: '#7ae0a0', h: ['#0a5a52', '#1a9a88', '#5ac8a0'], k: 'leaf' },
    夜光: { m: 'd', a: '#d8c0ff', b: '#ffe27a', h: ['#07071a', '#2a1f5a', '#6a4aa0'], k: 'crescent' },
    煉獄巫師: { m: 'd', a: '#7ee050', b: '#3aa0a0', h: ['#04100a', '#0f3020', '#1e5a30'], k: 'ring' },
    幻影俠盜: { m: 'd', a: '#c8a0ff', b: '#ff6aa8', h: ['#06060f', '#1a1640', '#3a2a70'], k: 'diamond' },
    凱內西斯: { m: 'd', a: '#b06aff', b: '#ff5ad0', h: ['#0a0614', '#2a1250', '#5a2a90'], k: 'ring' },
    伊利恩: { m: 'l', a: '#4aa8ff', b: '#a0e0ff', h: ['#1a4a9a', '#3a88e0', '#8ad0ff'], k: 'crystal' },
    菈菈: { m: 'l', a: '#3ab070', b: '#a0e060', h: ['#0e6a40', '#2ab070', '#8ad870'], k: 'leaf' },
    虎影: { m: 'd', a: '#ff9a3a', b: '#8a5ce0', h: ['#12081a', '#3a1a50', '#8a3a30'], k: 'crescent' },
    卡莉: { m: 'd', a: '#ff4a9a', b: '#8a4aff', h: ['#0e0612', '#38123e', '#7a1a5a'], k: 'blade' },
    // 弓箭手
    箭神: { m: 'l', a: '#36b86a', b: '#f0c43a', h: ['#0e5a3a', '#1e9a5a', '#6ac86a'], k: 'leaf' },
    神射手: { m: 'l', a: '#2aa8c8', b: '#a0d84a', h: ['#0a4a6a', '#1a88a8', '#4ac0b0'], k: 'star4' },
    開拓者: { m: 'd', a: '#6a9aff', b: '#ff6a6a', h: ['#0a1020', '#1a3a6a', '#3a6a9a'], k: 'ring' },
    精靈遊俠: { m: 'l', a: '#4aa8ff', b: '#d8b8ff', h: ['#1a4a9a', '#4a8ae0', '#9ac0ff'], k: 'leaf' },
    狂豹獵人: { m: 'd', a: '#7ac84a', b: '#ff9a2a', h: ['#080f08', '#1e3a14', '#3a6a22'], k: 'blade' },
    暗夜行者: { m: 'd', a: '#6a7aff', b: '#b04aff', h: ['#04040f', '#14143a', '#2a1a5a'], k: 'star4' },
    // 盜賊
    影武者: { m: 'd', a: '#ff4a5a', b: '#c8c8d8', h: ['#0a0608', '#32101a', '#6a1a28'], k: 'blade' },
    卡蒂娜: { m: 'd', a: '#e0b84a', b: '#a04aff', h: ['#0a0610', '#2a1040', '#5a2a70'], k: 'diamond' },
    // 海盜
    拳霸: { m: 'l', a: '#2f9be8', b: '#ff9a3a', h: ['#0e4a8a', '#1f86d0', '#37b8f0'], k: 'wave' },
    槍神: { m: 'd', a: '#e6b84a', b: '#3aa0d8', h: ['#06101a', '#12304a', '#2a5a80'], k: 'star4' },
    重砲指揮官: { m: 'd', a: '#ff8a3a', b: '#ffd24a', h: ['#120a06', '#3a1e0c', '#7a3a12'], k: 'flame' },
    閃雷悍將: { m: 'l', a: '#2f8de8', b: '#ffe04a', h: ['#123c8a', '#2a74d0', '#52b4f0'], k: 'rays' },
    機甲戰神: { m: 'd', a: '#ff9a2b', b: '#5fb7ff', h: ['#0a0f16', '#1d2f45', '#3b5a7a'], k: 'hex' },
    傑諾: { m: 'l', a: '#2a9bff', b: '#5af0ff', h: ['#0a49c9', '#1f8cf0', '#4fd0ff'], k: 'hex' },
    天使破壞者: { m: 'l', a: '#ff6ab8', b: '#ffd24a', h: ['#b8387e', '#f060b0', '#ffa0d0'], k: 'stars' },
    隱月: { m: 'd', a: '#6ab0ff', b: '#e0f0ff', h: ['#070d1c', '#16305a', '#2a5a9a'], k: 'crescent' },
    陰陽師: { m: 'l', a: '#e8508a', b: '#f0b84a', h: ['#8a1a4a', '#d03a70', '#f08a9a'], k: 'crescent' },
  };
  const KEYS = Object.keys(J).sort((x, y) => y.length - x.length);
  const find = (job) => { const k = KEYS.find((k) => String(job).includes(k)); return k ? J[k] : null; };
  const MOTIFS = ['rays', 'ring', 'diamond', 'star4', 'crystal', 'leaf', 'flame', 'crescent', 'blade'];

  /* ---- 色彩工具 ---- */
  const hexRgb = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const hueOf = (x) => { const [r, g, b] = hexRgb(x).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 220;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return Math.round((h * 60 + 360) % 360); };
  const lumOf = (x) => { const [r, g, b] = hexRgb(x).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const hsl = (h, s, l, a) => `hsl(${h} ${s}% ${l}%${a == null ? '' : ' / ' + a}) `.trim();

  /* ---- 浮水印圖樣（SVG，viewBox 200） ---- */
  const svg = (body, w = 200, h = 200) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' fill='none'>${body}</svg>`)}")`;
  const EMBLEM = {
    star4: (c, o) => `<g transform='rotate(14 100 100)'><path fill='${c}' fill-opacity='${o}' fill-rule='evenodd' d='M100 6L125 75 194 100 125 125 100 194 75 125 6 100 75 75ZM100 86a14 14 0 1 0 .1 0Z'/></g>`,
    ring: (c, o) => `<g stroke='${c}' stroke-opacity='${o * 1.8}' stroke-width='5'><circle cx='100' cy='100' r='88'/><circle cx='100' cy='100' r='64'/><path d='M100 12v176M12 100h176M38 38l124 124M162 38L38 162' stroke-width='2'/></g>`,
    diamond: (c, o) => `<path fill='${c}' fill-opacity='${o}' d='M100 8L176 100 100 192 24 100Z'/><path stroke='${c}' stroke-opacity='${o * 2}' stroke-width='4' d='M100 40L146 100 100 160 54 100Z'/>`,
    crystal: (c, o) => `<g fill='${c}' fill-opacity='${o}'><path d='M100 6L132 70 100 194 68 70Z'/><path d='M40 60L68 90 56 170 24 100ZM160 60L176 100 144 170 132 90Z' fill-opacity='${o * .7}'/></g>`,
    leaf: (c, o) => `<path fill='${c}' fill-opacity='${o}' d='M24 176C12 84 76 18 180 22 186 124 122 186 48 178Z'/><path stroke='${c}' stroke-opacity='${o * 2.4}' stroke-width='5' stroke-linecap='round' d='M30 172C74 122 114 90 156 52'/>`,
    flame: (c, o) => `<path fill='${c}' fill-opacity='${o}' d='M100 6C118 48 168 70 160 126c-6 36-34 62-60 68-30-2-58-30-58-68 0-30 18-44 30-62 4 20 14 28 22 30-6-40 0-66 6-88Z'/>`,
    crescent: (c, o) => `<path fill='${c}' fill-opacity='${o}' d='M130 14a86 86 0 1 0 56 132A72 72 0 0 1 130 14Z'/><circle cx='150' cy='60' r='7' fill='${c}' fill-opacity='${o * 1.6}'/>`,
    cross: (c, o) => `<path fill='${c}' fill-opacity='${o}' d='M84 8h32v76h76v32h-76v76H84v-76H8V84h76Z'/>`,
    blade: (c, o) => `<g transform='rotate(40 100 100)' fill='${c}' fill-opacity='${o}'><path d='M92 6h16l6 126H86Z'/><rect x='56' y='132' width='88' height='14' rx='4'/><rect x='94' y='146' width='12' height='46' rx='4'/></g>`,
    wave: (c, o) => `<g stroke='${c}' stroke-opacity='${o * 2}' stroke-width='7' stroke-linecap='round'><path d='M14 70C64 38 118 40 150 62C176 80 160 108 136 100'/><path d='M6 112C58 86 110 92 142 112C168 128 152 152 128 146'/><path d='M38 152C80 136 120 142 142 158'/></g>`,
    hex: (c, o) => `<g stroke='${c}' stroke-opacity='${o * 2.2}' stroke-width='5'><path d='M100 8L180 54V146L100 192 20 146V54Z'/><path d='M100 44L148 72V128L100 156 52 128V72Z' stroke-width='3'/></g><circle cx='100' cy='100' r='14' fill='${c}' fill-opacity='${o * 1.4}'/>`,
    sun: (c, o) => `<g fill='${c}' fill-opacity='${o}'><circle cx='100' cy='100' r='42'/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path transform='rotate(${a} 100 100)' d='M100 6L112 46H88Z'/>`).join('')}</g>`,
    rays: (c, o) => `<path fill='${c}' fill-opacity='${o}' d='M118 6L52 112H98L82 194 156 84H108Z'/>`,
  };
  EMBLEM.stars = EMBLEM.star4;
  const hexTile = (c, o) => svg(`<path d='M28 66L0 50V16L28 0l28 16v34zM28 100L0 84V66l28 16 28-16v18z' stroke='${c}' stroke-opacity='${o}'/>`, 56, 100);
  const dotTile = (c) => svg(`<g fill='${c}'><circle cx='20' cy='24' r='1.6' opacity='.7'/><circle cx='88' cy='12' r='1.2' opacity='.5'/><circle cx='64' cy='70' r='2' opacity='.8'/><circle cx='108' cy='98' r='1.4' opacity='.6'/><circle cx='30' cy='104' r='1.2' opacity='.5'/></g>`, 120, 120);
  const deco = (k, light, a, b) => {
    const w = light ? '#ffffff' : a, g1 = light ? '#ffffff55' : b + '3a', g2 = light ? '#ffffff33' : a + '22';
    if (k === 'hex') return `${hexTile(w, light ? .22 : .16)},radial-gradient(520px 240px at 82% 12%,${g1},transparent 70%)`;
    if (k === 'stars' || k === 'crescent') return `${dotTile(light ? '#fff' : '#cfe0ff')},radial-gradient(560px 240px at 85% 10%,${g1},transparent 70%)`;
    if (k === 'crystal' || k === 'diamond') return `repeating-linear-gradient(60deg,transparent 0 60px,${w}${light ? '22' : '10'} 60px 61px),repeating-linear-gradient(-60deg,transparent 0 60px,${w}${light ? '22' : '10'} 60px 61px),radial-gradient(520px 240px at 85% 15%,${g1},transparent 70%)`;
    if (k === 'flame' || k === 'blade') return `radial-gradient(520px 200px at 78% 118%,${b}55,transparent 70%),radial-gradient(420px 180px at 12% 115%,${a}33,transparent 70%)`;
    if (k === 'leaf' || k === 'wave' || k === 'sun') return `radial-gradient(280px 120px at 15% 112%,#ffffff55,transparent 70%),radial-gradient(240px 100px at 62% -10%,#ffffff44,transparent 70%),radial-gradient(200px 90px at 96% 75%,#ffffff33,transparent 70%)`;
    return `repeating-linear-gradient(115deg,transparent 0 46px,${w}${light ? '1c' : '0f'} 46px 47px),radial-gradient(620px 260px at 85% 15%,${g1},transparent 70%)`; // rays / ring / star4
  };

  const SET = [];
  const put = (el, k, v) => { el.style.setProperty(k, v); SET.push(k); };
  function fromSpec(s) {
    const hh = hueOf(s.a), light = s.m === 'l', ink = lumOf(s.a) > 0.34 ? '#0b1220' : '#ffffff';
    const v = light
      ? { '--bg': hsl(hh, 55, 96), '--bg2': '#ffffff', '--card': '#ffffff', '--ink': hsl(hh, 45, 14), '--mute': hsl(hh, 18, 40), '--line': hsl(hh, 45, 86),
          '--shadow': `0 10px 28px ${hsl(hh, 60, 40, .16)}`, '--grid': hsl(hh, 40, 90), '--axis': hsl(hh, 18, 40), '--chart': hsl(hh, 72, 40), '--hl': hsl(hh, 72, 33),
          '--bar': hsl(hh, 62, 30), '--bar-ink': hsl(hh, 70, 95), '--r': '20px', '--r2': '14px', '--head-ls': '.03em' }
      : { '--bg': hsl(hh, 30, 6), '--bg2': hsl(hh, 30, 9), '--card': hsl(hh, 26, 12), '--ink': hsl(hh, 35, 93), '--mute': hsl(hh, 14, 64), '--line': hsl(hh, 26, 21),
          '--shadow': '0 10px 30px #000a', '--grid': hsl(hh, 24, 17), '--axis': hsl(hh, 14, 64), '--chart': s.a, '--hl': hsl(hh, 100, 76),
          '--bar': hsl(hh, 35, 3.5), '--bar-ink': hsl(hh, 30, 78), '--r': '8px', '--r2': '5px', '--head-ls': '.1em' };
    Object.assign(v, { '--accent': s.a, '--accent2': s.b, '--on-accent': ink, '--exp-a': light ? '#fff6a8' : s.a, '--exp-b': s.b, '--star': '#ffd45e',
      '--hero-bg': `linear-gradient(115deg,${s.h[0]} 0%,${s.h[1]} 55%,${s.h[2]} 100%)`, '--hero-ink': '#ffffff',
      '--deco': deco(s.k, light, s.a, s.b), '--emblem': svg((EMBLEM[s.k] || EMBLEM.star4)(light ? '#ffffff' : s.a, light ? .34 : .16)),
      '--h1-shadow': light ? `0 2px 14px ${s.h[0]}99` : `0 0 22px ${s.a}80` });
    return v;
  }
  function fallback(job) { // 沒收錄的職業：用名稱算出固定色相的深色主題
    let n = 0; for (const ch of String(job)) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
    const h = n % 360;
    return { m: 'd', a: hslHex(hsl(h, 85, 60)), b: hslHex(hsl((h + 40) % 360, 80, 62)), h: [hsl(h, 50, 4), hsl(h, 45, 14), hsl(h, 50, 26)].map(hslHex), k: MOTIFS[n % MOTIFS.length] };
  }
  function hslHex(s) { // 'hsl(h s% l%)' → '#rrggbb'
    const [h, sa, l] = s.match(/[\d.]+/g).map(Number), S = sa / 100, L = l / 100, c = (1 - Math.abs(2 * L - 1)) * S, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = L - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r, g, b].map((q) => Math.round((q + m) * 255).toString(16).padStart(2, '0')).join('');
  }

  window.JobTheme = {
    has: (job) => !!find(job),
    clear() { const el = document.documentElement; SET.splice(0).forEach((k) => el.style.removeProperty(k)); },
    apply(job) {
      this.clear();
      const el = document.documentElement, vars = fromSpec(find(job) || fallback(job));
      Object.entries(vars).forEach(([k, v]) => put(el, k, v));
      el.dataset.theme = 'gen';
      return 'gen';
    },
  };
})();
