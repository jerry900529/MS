/* 背景音樂小播放器（右下角）。用法：MusicPlayer.set({ title, yt?, src? })
   - yt：YouTube 影片網址或 ID，用官方嵌入播放器（IFrame API）。可展開面板看影片（嵌入規範要求播放器要看得見）
   - src：自己的音檔路徑（本機用）。沒有 yt 時才使用；檔案載入失敗會自動隱藏播放器
   - 瀏覽器不允許自動出聲：第一次點擊頁面任何地方才會開始播放；按暫停後會記住，不再自動播放
   - 音量、暫停偏好、播放進度存在 localStorage；換角色（換頁）時同一首會接續播放 */
(function () {
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  const css = `
  .bgm{position:fixed;right:16px;bottom:16px;z-index:50;display:flex;flex-direction:column;align-items:flex-end;gap:8px;max-width:calc(100vw - 32px)}
  .bgm .ctl{display:flex;align-items:center;gap:10px;padding:8px 14px 8px 8px;border-radius:99px;background:color-mix(in srgb,var(--card,var(--panel,#151a28)) 92%,transparent);
    border:1px solid var(--line,var(--panel-b,#2a3350));box-shadow:0 8px 28px #0006;backdrop-filter:blur(10px);
    color:var(--ink,var(--text,#eef0ff));font:600 .9rem/1.2 system-ui,"Noto Sans TC",sans-serif}
  .bgm button{all:unset;cursor:pointer;display:grid;place-items:center;flex:none}
  .bgm .pp{width:42px;height:42px;border-radius:50%;background:var(--accent,#4de1ff);color:var(--on-accent,#04141c);font-size:1.1rem}
  .bgm .tg{width:30px;height:30px;border-radius:50%;opacity:.75;font-size:.9rem;border:1px solid var(--line,var(--panel-b,#2a3350))}
  .bgm button:hover{filter:brightness(1.1)}.bgm button:focus-visible{outline:2px solid var(--ink,#fff);outline-offset:2px}
  .bgm .t{display:flex;flex-direction:column;min-width:0}.bgm .t small{font-weight:400;opacity:.65;font-size:.72rem;letter-spacing:.08em}
  .bgm .t b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:9em}
  .bgm input{width:84px;accent-color:var(--accent,#4de1ff);cursor:pointer}
  .bgm.hint .pp{animation:bgmpulse 1.6s infinite}
  @keyframes bgmpulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent,#4de1ff) 70%,transparent)}100%{box-shadow:0 0 0 16px transparent}}
  /* 影片面板：收合時移出畫面但維持 200x200 以上的尺寸；展開時顯示在控制列上方 */
  .bgm .vid{width:320px;max-width:calc(100vw - 32px);height:200px;border-radius:14px;overflow:hidden;border:1px solid var(--line,var(--panel-b,#2a3350));box-shadow:0 8px 28px #0008;background:#000}
  .bgm .vid iframe{width:100%;height:100%;border:0}
  .bgm:not(.open) .vid{position:fixed;left:-9999px;top:0}
  @media(max-width:520px){.bgm input{width:64px}.bgm .t b{max-width:5.5em}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);

  const box = document.createElement('div'); box.className = 'bgm'; box.hidden = true;
  box.innerHTML = '<div class="vid"><div id="bgm-yt"></div></div><div class="ctl"><button type="button" class="pp" aria-label="播放音樂">▶</button><div class="t"><small>BGM</small><b></b></div><input type="range" min="0" max="1" step="0.01" aria-label="音量"><button type="button" class="tg" aria-label="顯示影片" title="顯示／收合影片">▴</button></div>';
  const vidBox = box.querySelector('.vid'), pp = box.querySelector('.pp'), tg = box.querySelector('.tg'), vol = box.querySelector('input'), label = box.querySelector('b');
  let eng = null, started = false, track = null;
  let volume = Math.min(1, Math.max(0, parseFloat(LS.get('bgm_vol', '0.3')) || 0.3)); vol.value = volume;

  const ui = () => {
    const p = !!eng && eng.playing();
    pp.textContent = p ? '❚❚' : '▶'; pp.setAttribute('aria-label', p ? '暫停音樂' : '播放音樂');
    box.classList.toggle('hint', !p && LS.get('bgm_on', '1') !== '0');
  };
  const play = () => { if (eng) { eng.play(); started = true; LS.set('bgm_on', '1'); } };
  pp.onclick = () => { if (!eng) return; if (eng.playing()) { eng.pause(); LS.set('bgm_on', '0'); } else play(); setTimeout(ui, 150); };
  vol.oninput = () => { volume = +vol.value; eng && eng.volume(volume); LS.set('bgm_vol', vol.value); };
  tg.onclick = () => { const o = box.classList.toggle('open'); tg.textContent = o ? '▾' : '▴'; tg.setAttribute('aria-label', o ? '收合影片' : '顯示影片'); };
  setInterval(() => { if (eng && eng.playing()) LS.set('bgm_pos', JSON.stringify({ s: track.key, t: eng.time() })); ui(); }, 1500);

  // 第一次互動後開始播放（除非使用者先前按過暫停）
  const first = () => { if (!started && eng && !eng.playing() && LS.get('bgm_on', '1') !== '0') play(); };
  ['pointerdown', 'keydown'].forEach((e) => addEventListener(e, first, { once: true, capture: true }));

  const resumeAt = () => { try { const p = JSON.parse(LS.get('bgm_pos', 'null')); return p && p.s === track.key ? p.t : 0; } catch { return 0; } };

  /* ---- 引擎 1：YouTube IFrame API ---- */
  const ytId = (s) => { const m = String(s).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : /^[\w-]{11}$/.test(s) ? s : null; };
  let ytApi;
  const loadYT = () => ytApi || (ytApi = new Promise((ok, no) => {
    if (window.YT && window.YT.Player) return ok(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); ok(window.YT); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = no; document.head.append(s);
  }));
  function ytEngine(id) {
    let pl = null, queued = false;
    const e = {
      play() { pl && pl.playVideo ? pl.playVideo() : (queued = true); },
      pause() { pl && pl.pauseVideo && pl.pauseVideo(); },
      playing() { return !!(pl && pl.getPlayerState && pl.getPlayerState() === 1); },
      volume(v) { pl && pl.setVolume && pl.setVolume(Math.round(v * 100)); },
      time() { return pl && pl.getCurrentTime ? pl.getCurrentTime() : 0; },
    };
    loadYT().then((YT) => {
      pl = new YT.Player('bgm-yt', {
        width: '100%', height: '100%', videoId: id,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { playsinline: 1, loop: 1, playlist: id, rel: 0, modestbranding: 1, start: Math.floor(resumeAt()) },
        events: {
          onReady: () => { pl.setVolume(Math.round(volume * 100)); if (queued || (started && LS.get('bgm_on', '1') !== '0')) pl.playVideo(); ui(); },
          onStateChange: ui,
          onError: () => { box.hidden = true; }, // 影片被下架或不允許嵌入
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
    const t = resumeAt(); if (t) a.addEventListener('loadedmetadata', () => { if (t < a.duration - 1) a.currentTime = t; }, { once: true });
    vidBox.style.display = 'none'; tg.style.display = 'none';
    return { play() { a.play().catch(ui); }, pause() { a.pause(); }, playing: () => !a.paused, volume(v) { a.volume = v; }, time: () => a.currentTime };
  }

  window.MusicPlayer = {
    set(t) {
      if (!t) return;
      const id = t.yt ? ytId(t.yt) : null;
      if (!id && !t.src) return;
      track = { key: id || t.src };
      label.textContent = t.title || '背景音樂';
      if (!box.isConnected) document.body.append(box);
      box.hidden = false;
      eng = id ? ytEngine(id) : fileEngine(t.src);
      if (!id) { if (LS.get('bgm_on', '1') !== '0') { eng.play(); } }
      ui();
    },
  };
})();
