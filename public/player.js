/* 背景音樂小播放器（右下角）。用法：MusicPlayer.set({ src, title })
   - 瀏覽器不允許自動出聲：第一次點擊頁面任何地方才會開始播放；按暫停後會記住，不再自動播放
   - 音量、暫停偏好、播放進度存在 localStorage；換角色（換頁）時同一首會接續播放 */
(function () {
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  const css = `
  .bgm{position:fixed;right:16px;bottom:16px;z-index:50;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 32px);
    padding:8px 14px 8px 8px;border-radius:99px;background:color-mix(in srgb,var(--card,var(--panel,#151a28)) 92%,transparent);
    border:1px solid var(--line,var(--panel-b,#2a3350));box-shadow:0 8px 28px #0006;backdrop-filter:blur(10px);
    color:var(--ink,var(--text,#eef0ff));font:600 .9rem/1.2 system-ui,"Noto Sans TC",sans-serif}
  .bgm button{all:unset;cursor:pointer;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;flex:none;
    background:var(--accent,#4de1ff);color:var(--on-accent,#04141c);font-size:1.1rem}
  .bgm button:focus-visible{outline:2px solid var(--ink,#fff);outline-offset:2px}
  .bgm .t{display:flex;flex-direction:column;min-width:0}.bgm .t small{font-weight:400;opacity:.65;font-size:.72rem;letter-spacing:.08em}
  .bgm .t b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:9em}
  .bgm input{width:84px;accent-color:var(--accent,#4de1ff);cursor:pointer}
  .bgm.hint button{animation:bgmpulse 1.6s infinite}
  @keyframes bgmpulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent,#4de1ff) 70%,transparent)}100%{box-shadow:0 0 0 16px transparent}}
  @media(max-width:520px){.bgm input{width:64px}.bgm .t b{max-width:5.5em}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);

  const audio = new Audio(); audio.loop = true; audio.preload = 'auto';
  audio.volume = Math.min(1, Math.max(0, parseFloat(LS.get('bgm_vol', '0.3')) || 0.3));
  const box = document.createElement('div'); box.className = 'bgm'; box.hidden = true;
  box.innerHTML = '<button type="button" aria-label="播放音樂">▶</button><div class="t"><small>BGM</small><b></b></div><input type="range" min="0" max="1" step="0.01" aria-label="音量">';
  const [btn, , vol] = [box.children[0], box.children[1], box.children[2]];
  const label = box.querySelector('b'); vol.value = audio.volume;
  let started = false;

  const ui = () => { const p = !audio.paused; btn.textContent = p ? '❚❚' : '▶'; btn.setAttribute('aria-label', p ? '暫停音樂' : '播放音樂'); box.classList.toggle('hint', !p && LS.get('bgm_on', '1') !== '0'); };
  const play = () => audio.play().then(() => { started = true; LS.set('bgm_on', '1'); ui(); }).catch(() => ui());
  btn.onclick = () => { if (audio.paused) play(); else { audio.pause(); LS.set('bgm_on', '0'); ui(); } };
  vol.oninput = () => { audio.volume = +vol.value; LS.set('bgm_vol', vol.value); };
  audio.onplay = audio.onpause = ui;
  setInterval(() => { if (!audio.paused && audio.src) LS.set('bgm_pos', JSON.stringify({ s: audio.getAttribute('data-src'), t: audio.currentTime })); }, 2000);

  // 第一次互動後開始播放（除非使用者先前按過暫停）
  const first = () => { if (!started && audio.paused && LS.get('bgm_on', '1') !== '0') play(); };
  ['pointerdown', 'keydown'].forEach((e) => addEventListener(e, first, { once: true, capture: true }));

  window.MusicPlayer = {
    set(track) {
      if (!track || !track.src) return;
      label.textContent = track.title || '背景音樂';
      audio.setAttribute('data-src', track.src); audio.src = track.src;
      try { const p = JSON.parse(LS.get('bgm_pos', 'null')); if (p && p.s === track.src) audio.addEventListener('loadedmetadata', () => { if (p.t < audio.duration - 1) audio.currentTime = p.t; }, { once: true }); } catch {}
      box.hidden = false; if (!box.isConnected) document.body.append(box);
      if (LS.get('bgm_on', '1') !== '0') audio.play().then(() => { started = true; ui(); }).catch(() => ui()); else ui();
    },
  };
})();
