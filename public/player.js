/* 背景音樂小播放器（右下角）。用法：MusicPlayer.set({ title, yt?, src? }) ＝ 設定「預設曲」（通常是角色專屬配樂）
   - yt：YouTube 影片網址或 ID，用官方嵌入播放器（IFrame API）。可展開面板看影片（嵌入規範要求播放器要看得見）
   - src：自己的音檔路徑（本機用）。沒有 yt 時才使用；檔案載入失敗會自動隱藏播放器
   - 曲庫：config.json 的 musicLibrary（中文）與 musicLibraryEn（英文）［{title, yt}］，清單內分兩區，上下首只在同區輪播。☰ 開啟曲目清單（可搜尋），訪客自己選歌；選過之後換角色不會被蓋掉，清單頂端可「跟隨角色預設」
   - 播放模式（🔁 全部循環／🔂 單曲循環／🔀 隨機）：曲末自動接下一首，可以一直播；影片無法嵌入時自動跳下一首
   - 瀏覽器不允許自動出聲：第一次點擊頁面任何地方才會開始播放；按暫停後會記住，不再自動播放
   - 音量、暫停偏好、模式、所選歌曲、播放進度存在 localStorage */
(function () {
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const css = `
  .bgm{position:fixed;right:16px;bottom:16px;z-index:50;display:flex;flex-direction:column;align-items:flex-end;gap:8px;max-width:calc(100vw - 32px)}
  .bgm .ctl{display:flex;align-items:center;gap:10px;padding:8px 14px 8px 8px;border-radius:99px;background:color-mix(in srgb,var(--card,var(--panel,#151a28)) 92%,transparent);
    border:1px solid var(--line,var(--panel-b,#2a3350));box-shadow:0 8px 28px #0006;backdrop-filter:blur(10px);
    color:var(--ink,var(--text,#eef0ff));font:600 .9rem/1.2 system-ui,"Noto Sans TC",sans-serif}
  .bgm button{all:unset;cursor:pointer;display:grid;place-items:center;flex:none}
  .bgm .pp{width:42px;height:42px;border-radius:50%;background:var(--accent,#4de1ff);color:var(--on-accent,#04141c);font-size:1.1rem}
  .bgm .tg{width:30px;height:30px;border-radius:50%;opacity:.75;font-size:.9rem;border:1px solid var(--line,var(--panel-b,#2a3350))}
  .bgm .tg.on{opacity:1;background:color-mix(in srgb,var(--accent,#4de1ff) 25%,transparent)}
  .bgm button:hover{filter:brightness(1.1)}.bgm button:focus-visible{outline:2px solid var(--ink,#fff);outline-offset:2px}
  .bgm .t{display:flex;flex-direction:column;min-width:0}.bgm .t small{font-weight:400;opacity:.65;font-size:.72rem;letter-spacing:.08em}
  .bgm .t b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:9em}
  .bgm input[type=range]{width:84px;accent-color:var(--accent,#4de1ff);cursor:pointer}
  /* 頻譜條：YouTube 內嵌無法讀取實際音訊，這是播放中的模擬律動（低音區跟著節拍、高音區快速閃動） */
  .bgm .eq{display:flex;align-items:flex-end;gap:2px;height:24px;flex:none}
  .bgm .eq i{width:3px;height:100%;border-radius:2px;background:var(--accent,#4de1ff);transform-origin:bottom;transform:scaleY(.12);opacity:.9}
  @media(prefers-reduced-motion:reduce){.bgm .eq{display:none}}
  .bgm.hint .pp{animation:bgmpulse 1.6s infinite}
  @keyframes bgmpulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent,#4de1ff) 70%,transparent)}100%{box-shadow:0 0 0 16px transparent}}
  /* 影片面板：收合時移出畫面但維持 200x200 以上的尺寸；展開時顯示在控制列上方 */
  .bgm .vid{width:320px;max-width:calc(100vw - 32px);height:200px;border-radius:14px;overflow:hidden;border:1px solid var(--line,var(--panel-b,#2a3350));box-shadow:0 8px 28px #0008;background:#000}
  .bgm .vid iframe{width:100%;height:100%;border:0}
  .bgm:not(.open) .vid{position:fixed;left:-9999px;top:0}
  /* 曲目清單 */
  .bgm .lst{display:none;flex-direction:column;width:320px;max-width:calc(100vw - 32px);max-height:min(60vh,420px);border-radius:14px;overflow:hidden;
    background:color-mix(in srgb,var(--card,var(--panel,#151a28)) 96%,transparent);border:1px solid var(--line,var(--panel-b,#2a3350));box-shadow:0 8px 28px #0008;backdrop-filter:blur(10px);
    color:var(--ink,var(--text,#eef0ff));font:500 .88rem/1.3 system-ui,"Noto Sans TC",sans-serif}
  .bgm.list .lst{display:flex}
  .bgm .lst input{all:unset;box-sizing:border-box;margin:10px;padding:8px 12px;border-radius:99px;border:1px solid var(--line,var(--panel-b,#2a3350));background:#0003}
  .bgm .lst input:focus{border-color:var(--accent,#4de1ff)}
  .bgm .lst ul{margin:0;padding:0 6px 8px;list-style:none;overflow:auto}
  .bgm .lst li button{all:unset;cursor:pointer;display:flex;gap:8px;width:calc(100% - 20px);padding:7px 10px;border-radius:8px}
  .bgm .lst li button:hover{background:#ffffff14}.bgm .lst li button:focus-visible{outline:2px solid var(--ink,#fff)}
  .bgm .lst li.cur button{background:color-mix(in srgb,var(--accent,#4de1ff) 22%,transparent);font-weight:700}
  .bgm .lst li i{font-style:normal;opacity:.5;min-width:2.2em;text-align:right;flex:none}
  .bgm .lst li.rst button{opacity:.8;border-bottom:1px solid var(--line,var(--panel-b,#2a3350));border-radius:8px 8px 0 0}
  .bgm .lst li.sec{position:sticky;top:0;padding:6px 10px 4px;font-size:.75rem;font-weight:700;letter-spacing:.08em;opacity:.65;background:color-mix(in srgb,var(--card,var(--panel,#151a28)) 96%,transparent)}
  .bgm .lst .none{padding:10px 16px;opacity:.6}
  @media(max-width:520px){.bgm input[type=range],.bgm .t small{display:none}.bgm .t b{max-width:5em}.bgm .ctl{gap:6px;padding:6px 10px 6px 6px}.bgm .tg{width:28px;height:28px}.bgm .pp{width:38px;height:38px}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);

  const box = document.createElement('div'); box.className = 'bgm'; box.hidden = true;
  box.innerHTML = '<div class="lst"><input type="search" placeholder="搜尋曲目…" aria-label="搜尋曲目"><ul></ul></div>'
    + '<div class="vid"><div id="bgm-yt"></div></div>'
    + '<div class="ctl"><button type="button" class="pp" aria-label="播放音樂">▶</button>'
    + '<button type="button" class="tg pv" aria-label="上一首" title="上一首">⏮</button><button type="button" class="tg nx" aria-label="下一首" title="下一首">⏭</button>'
    + '<div class="eq" aria-hidden="true">' + '<i></i>'.repeat(8) + '</div>'
    + '<div class="t"><small>BGM</small><b></b></div>'
    + '<input type="range" min="0" max="1" step="0.01" aria-label="音量">'
    + '<button type="button" class="tg md" aria-label="播放模式" title="播放模式"></button>'
    + '<button type="button" class="tg ls" aria-label="曲目清單" title="曲目清單">☰</button>'
    + '<button type="button" class="tg vt" aria-label="顯示影片" title="顯示／收合影片">▴</button></div>';
  const $q = (s) => box.querySelector(s);
  const pp = $q('.pp'), vt = $q('.vt'), ls = $q('.ls'), md = $q('.md'), pv = $q('.pv'), nx = $q('.nx'), vol = $q('.ctl input'),
    label = $q('.t b'), vidBox = $q('.vid'), search = $q('.lst input'), ul = $q('.lst ul');
  let eng = null, started = false, track = null, defTrack = null, lib = [], libReady = null, errs = 0;
  const history = [];
  let volume = Math.min(1, Math.max(0, parseFloat(LS.get('bgm_vol', '0.3')) || 0.3)); vol.value = volume;

  /* ---- 播放模式 ---- */
  const MODES = [['all', '🔁', '全部循環'], ['one', '🔂', '單曲循環'], ['shuffle', '🔀', '隨機播放']];
  let mode = LS.get('bgm_mode', 'all'); if (!MODES.some((m) => m[0] === mode)) mode = 'all';
  const showMode = () => { const m = MODES.find((x) => x[0] === mode); md.textContent = m[1]; md.title = '播放模式：' + m[2] + '（點擊切換）'; md.setAttribute('aria-label', md.title); };
  md.onclick = () => { mode = MODES[(MODES.findIndex((m) => m[0] === mode) + 1) % MODES.length][0]; LS.set('bgm_mode', mode); showMode(); };
  showMode();

  /* ---- 頻譜條（模擬律動） ---- */
  const bars = [...$q('.eq').children], lv = bars.map(() => 0.12);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let eqRaf = 0, eqLast = 0, kick = 0, nextKick = 0;
  function eqFrame(t) {
    eqRaf = requestAnimationFrame(eqFrame);
    const dt = Math.min(0.05, (t - eqLast) / 1000 || 0.016); eqLast = t;
    if (t >= nextKick) { kick = 0.7 + Math.random() * 0.3; nextKick = t + 380 + Math.random() * 220; }
    kick = Math.max(0, kick - dt * 2.6);
    bars.forEach((b, i) => {
      const f = i / (bars.length - 1);                       // 0 = 低音，1 = 高音
      const wob = 0.5 + 0.5 * Math.sin(t / 1000 * (2 + f * 9) + i * 1.7);
      const target = Math.min(1, 0.12 + (1 - f) * kick * 0.75 + wob * (0.15 + f * 0.35) * (0.5 + Math.random() * 0.5));
      lv[i] += (target - lv[i]) * Math.min(1, dt * (target > lv[i] ? 28 : 7));
      b.style.transform = `scaleY(${lv[i].toFixed(3)})`;
    });
  }
  function eqSet(on) {
    on = on && !document.hidden && !reduceMotion.matches;
    if (on && !eqRaf) { eqLast = performance.now(); eqRaf = requestAnimationFrame(eqFrame); }
    else if (!on && eqRaf) { cancelAnimationFrame(eqRaf); eqRaf = 0; bars.forEach((b, i) => { lv[i] = 0.12; b.style.transform = ''; }); }
  }
  document.addEventListener('visibilitychange', () => eqSet(!!eng && eng.playing()));

  const ui = () => {
    const p = !!eng && eng.playing();
    eqSet(p);
    pp.textContent = p ? '❚❚' : '▶'; pp.setAttribute('aria-label', p ? '暫停音樂' : '播放音樂');
    box.classList.toggle('hint', !p && LS.get('bgm_on', '1') !== '0');
  };
  const play = () => { if (eng) { eng.play(); started = true; LS.set('bgm_on', '1'); } };
  pp.onclick = () => { if (!eng) return; if (eng.playing()) { eng.pause(); LS.set('bgm_on', '0'); } else play(); setTimeout(ui, 150); };
  vol.oninput = () => { volume = +vol.value; eng && eng.volume(volume); LS.set('bgm_vol', vol.value); };
  vt.onclick = () => { const o = box.classList.toggle('open'); vt.textContent = o ? '▾' : '▴'; vt.setAttribute('aria-label', o ? '收合影片' : '顯示影片'); };
  ls.onclick = () => { const o = box.classList.toggle('list'); ls.classList.toggle('on', o); if (o) { renderList(); const c = ul.querySelector('.cur'); c && c.scrollIntoView({ block: 'center' }); } };
  setInterval(() => { if (eng && track && eng.playing()) LS.set('bgm_pos', JSON.stringify({ s: track.key, t: eng.time() })); ui(); }, 1500);

  // 第一次互動後開始播放（除非使用者先前按過暫停）
  const first = () => { if (!started && eng && !eng.playing() && LS.get('bgm_on', '1') !== '0') play(); };
  ['pointerdown', 'keydown'].forEach((e) => addEventListener(e, first, { once: true, capture: true }));

  const resumeAt = (key) => { try { const p = JSON.parse(LS.get('bgm_pos', 'null')); return p && p.s === key ? p.t : 0; } catch { return 0; } };

  /* ---- 引擎 1：YouTube IFrame API（同一個播放器反覆換歌） ---- */
  const ytId = (s) => { const m = String(s).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : /^[\w-]{11}$/.test(s) ? s : null; };
  let ytApi;
  const loadYT = () => ytApi || (ytApi = new Promise((ok, no) => {
    if (window.YT && window.YT.Player) return ok(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); ok(window.YT); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = no; document.head.append(s);
  }));
  function ytEngine(id, start) {
    let pl = null, queued = false, want = { id, start };
    const e = {
      play() { pl && pl.playVideo ? pl.playVideo() : (queued = true); },
      pause() { pl && pl.pauseVideo && pl.pauseVideo(); queued = false; },
      playing() { return !!(pl && pl.getPlayerState && pl.getPlayerState() === 1); },
      volume(v) { pl && pl.setVolume && pl.setVolume(Math.round(v * 100)); },
      time() { return pl && pl.getCurrentTime ? pl.getCurrentTime() : 0; },
      load(id, start, autoplay) {
        want = { id, start };
        if (pl && pl.loadVideoById) pl[autoplay ? 'loadVideoById' : 'cueVideoById']({ videoId: id, startSeconds: start || 0 });
        else queued = autoplay;
      },
      seek0() { pl && pl.seekTo && (pl.seekTo(0, true), pl.playVideo()); },
    };
    loadYT().then((YT) => {
      pl = new YT.Player('bgm-yt', {
        width: '100%', height: '100%', videoId: want.id,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, start: Math.floor(want.start || 0) },
        events: {
          onReady: () => { pl.setVolume(Math.round(volume * 100)); if (queued || (started && LS.get('bgm_on', '1') !== '0')) pl.playVideo(); ui(); },
          onStateChange: (ev) => { if (ev.data === 1) errs = 0; if (ev.data === 0) onEnded(); ui(); },
          onError: onBroken, // 影片被下架或不允許嵌入
        },
      });
    }).catch(() => { box.hidden = true; });
    return e;
  }

  /* ---- 引擎 2：本機音檔 ---- */
  function fileEngine(src) {
    const a = new Audio(); a.loop = true; a.preload = 'auto'; a.src = src; a.volume = volume;
    a.addEventListener('error', () => { box.hidden = true; }); // 檔案不存在（例如線上版沒有放音檔）→ 藏起來
    a.addEventListener('play', ui); a.addEventListener('pause', ui);
    const t = resumeAt(src); if (t) a.addEventListener('loadedmetadata', () => { if (t < a.duration - 1) a.currentTime = t; }, { once: true });
    vidBox.style.display = 'none'; vt.style.display = 'none';
    return { play() { a.play().catch(ui); }, pause() { a.pause(); }, playing: () => !a.paused, volume(v) { a.volume = v; }, time: () => a.currentTime };
  }

  /* ---- 曲庫與選曲 ---- */
  const titleOf = (id) => (lib.find((x) => x.id === id) || {}).title || (defTrack && defTrack.id === id ? defTrack.title : '') || '背景音樂';
  const idx = () => lib.findIndex((x) => x.id === (track && track.key));
  // 切到某首（曲庫內或預設曲）。remember：記成訪客自己的選擇（之後換角色不會被預設曲蓋掉）
  function go(id, { remember = true, autoplay = true, start = 0 } = {}) {
    if (!id) return;
    if (track && track.key !== id) { history.push(track.key); if (history.length > 200) history.shift(); }
    track = { key: id }; label.textContent = titleOf(id); label.title = label.textContent;
    if (remember) LS.set('bgm_cur', id);
    const ap = autoplay && (started || (eng && eng.playing()));
    if (eng && eng.load) eng.load(id, start, ap);
    else eng = ytEngine(id, start);
    if (autoplay) { started = true; LS.set('bgm_on', '1'); }
    renderList(); ui();
  }
  // 上一首／下一首／隨機只在目前這首所屬的歌單（中文或英文）內輪播；預設曲不在曲庫時視為中文歌單
  function pickNext(dir) {
    const cur = lib.find((x) => x.id === (track && track.key));
    const pool = lib.filter((x) => x.g === (cur ? cur.g : 0));
    if (!pool.length) return track && track.key;
    if (mode === 'shuffle' && dir > 0) {
      if (pool.length === 1) return pool[0].id;
      let n; do { n = pool[Math.floor(Math.random() * pool.length)].id; } while (n === track.key);
      return n;
    }
    const i = pool.findIndex((x) => x.id === (track && track.key));
    if (dir < 0) {
      if (mode === 'shuffle' && history.length) return history.pop();
      return pool[(i <= 0 ? pool.length : i) - 1].id;
    }
    return pool[(i + 1) % pool.length].id;
  }
  const step = (dir) => {
    const was = history.length;
    const id = pickNext(dir);
    if (dir < 0 && mode === 'shuffle' && history.length < was) { // 從歷史退回：不要再把目前這首推進歷史
      track = { key: id }; label.textContent = titleOf(id); LS.set('bgm_cur', id);
      eng.load(id, 0, true); started = true; LS.set('bgm_on', '1'); renderList(); ui(); return;
    }
    go(id);
  };
  pv.onclick = () => step(-1); nx.onclick = () => step(1);
  function onEnded() {
    if (mode === 'one' || lib.length <= 1) eng.seek0();
    else step(1);
  }
  function onBroken() {
    if (lib.length > 1 && ++errs < lib.length) { setTimeout(() => step(1), 600); return; }
    box.hidden = true;
  }

  function renderList() {
    if (!box.classList.contains('list')) return;
    const q = search.value.trim().toLowerCase();
    const rows = lib.map((x, i) => [x, i]).filter(([x]) => !q || x.title.toLowerCase().includes(q));
    const follow = !LS.get('bgm_cur', '');
    const GN = ['中文歌單', '英文歌單'];
    let lastG = -1;
    const row = ([x, i]) => (x.g !== lastG ? (lastG = x.g, `<li class="sec">${GN[x.g]}</li>`) : '')
      + `<li class="${track && track.key === x.id ? 'cur' : ''}"><button type="button" data-i="${i}"><i>${i + 1}</i><span>${esc(x.title)}</span></button></li>`;
    ul.innerHTML = (defTrack && !q ? `<li class="rst${follow ? ' cur' : ''}"><button type="button" data-f="1">↺ 跟隨角色預設（${esc(titleOf(defTrack.id))}）</button></li>` : '')
      + (rows.length ? rows.map(row).join('')
        : '<li class="none">找不到符合的曲目</li>');
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  search.oninput = renderList;
  ul.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.f) { LS.del('bgm_cur'); if (defTrack) go(defTrack.id, { remember: false }); return; }
    go(lib[+b.dataset.i].id);
  };

  // 曲庫來自 config.json 的 musicLibrary（找不到就只有預設曲）
  const loadLib = () => libReady || (libReady = fetch('config.json').then((r) => r.json()).then((c) => {
    const conv = (a, g) => (a || []).map((x) => ({ id: ytId(x.yt), title: x.title || '', g })).filter((x) => x.id);
    lib = conv(c.musicLibrary, 0).concat(conv(c.musicLibraryEn, 1));
  }).catch(() => {}));

  window.MusicPlayer = {
    async set(t) {
      if (!t) return;
      const id = t.yt ? ytId(t.yt) : null;
      if (!id && !t.src) return;
      if (!box.isConnected) document.body.append(box);
      box.hidden = false;
      if (!id) { // 本機音檔：沒有曲庫功能
        track = { key: t.src }; label.textContent = t.title || '背景音樂';
        [md, ls, pv, nx].forEach((b) => (b.style.display = 'none'));
        eng = fileEngine(t.src); if (LS.get('bgm_on', '1') !== '0') eng.play(); ui(); return;
      }
      defTrack = { id, title: t.title || '背景音樂' };
      await loadLib();
      if (!lib.length) { [md, ls, pv, nx].forEach((b) => (b.style.display = 'none')); mode = 'one'; }
      const mine = LS.get('bgm_cur', '');
      if (track && mine) return renderList();          // 訪客已選歌：換角色不打斷
      if (track && track.key === id) return renderList();
      const pick = mine || id;                         // 第一次載入：訪客選的歌 > 角色預設
      const playing = !!(eng && eng.playing());
      go(pick, { remember: false, autoplay: playing, start: track ? 0 : resumeAt(pick) });
    },
  };
})();
