import { PEOPLE, DEFAULT_ITEMS } from "./data.js";

const KEY = "who-items-v1";
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  kids.flat().forEach((k) => n.append(k));
  return n;
};
const color = (name) => PEOPLE[name]?.color || "#ffb347";

/* ---------- 角色資料（頭像、裝備圖示）：來自站內 data/<id>/profile.json，即 NEXON Open API 的快取 ---------- */
const INFO = {}; // 人名 → { charName, job, avatar, eternal: [{ n, u }] }
async function loadPeople() {
  try {
    const cfg = await (await fetch("config.json")).json();
    await Promise.all(Object.entries(cfg.loot?.people || {}).map(async ([who, id]) => {
      try {
        const d = (await (await fetch(`data/${id}/profile.json`)).json()).data || {};
        INFO[who] = {
          charName: d.basic?.character_name,
          job: d.basic?.character_class,
          avatar: d.basic?.character_image,
        };
      } catch {}
    }));
  } catch {}
}
// 有頭像用頭像，沒有就退回 emoji
const face = (name, size) => {
  const a = INFO[name]?.avatar;
  if (!a) return el("span", { className: "face-emoji", textContent: PEOPLE[name]?.emoji || "" });
  return el("img", { className: "face", src: a, alt: name, width: size, height: size, loading: "lazy" });
};

/* ---------- 資料層:Firestore 即時同步(未設定則用 localStorage) ---------- */
const FB = "https://www.gstatic.com/firebasejs/10.12.2";
const defaults = () => Object.fromEntries(DEFAULT_ITEMS.map((i) => [i.id, i.next]));
let state = defaults();
let undoStack = [];
let store;
let unlocked = false;

async function makeFirebaseStore() {
  const { firebaseConfig } = await import("./firebase-config.js");
  if (firebaseConfig.apiKey.startsWith("YOUR_")) return null;
  const [{ initializeApp }, fs, au] = await Promise.all([
    import(`${FB}/firebase-app.js`),
    import(`${FB}/firebase-firestore.js`),
    import(`${FB}/firebase-auth.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const db = fs.getFirestore(app);
  const auth = au.getAuth(app);
  return {
    mode: "online",
    // 背景匿名登入;已有 members/{uid} 文件即代表已通過密語
    watchLock: (cb) =>
      au.onAuthStateChanged(auth, async (user) => {
        if (!user) { au.signInAnonymously(auth).catch(() => cb(false)); return; }
        try { cb((await fs.getDoc(fs.doc(db, "members", user.uid))).exists()); } catch { cb(false); }
      }),
    unlock: async (pass) => {
      const user = auth.currentUser || (await au.signInAnonymously(auth)).user;
      await fs.setDoc(fs.doc(db, "members", user.uid), { pass }); // 密語錯誤會被規則拒絕
    },
    lock: () => au.signOut(auth),
    subscribe: (cb, onError) =>
      fs.onSnapshot(fs.collection(db, "items"), (snap) => {
        const remote = {};
        snap.forEach((d) => { if (Number.isInteger(d.data().next)) remote[d.id] = d.data().next; });
        cb(remote);
      }, onError),
    write: async (changes) => {
      const batch = fs.writeBatch(db);
      for (const [id, next] of Object.entries(changes)) batch.set(fs.doc(db, "items", id), { next });
      await batch.commit();
    },
  };
}

function makeLocalStore() {
  const KEY = "who-items-v1";
  let listener = () => {};
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  return {
    mode: "local",
    watchLock: (cb) => cb(true),
    subscribe: (cb) => { listener = cb; cb(read()); },
    write: async (changes) => {
      const data = { ...read(), ...changes };
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
      listener(data);
    },
  };
}

function applyRemote(remote) {
  state = defaults();
  for (const i of DEFAULT_ITEMS) {
    if (Number.isInteger(remote[i.id]) && remote[i.id] >= 0 && remote[i.id] < i.order.length) state[i.id] = remote[i.id];
  }
  render();
}

/* ---------- 畫面 ---------- */
function renderSummary() {
  $("summary").replaceChildren(
    ...Object.entries(PEOPLE).map(([name, p]) => {
      const mine = DEFAULT_ITEMS.filter((i) => i.order[state[i.id]] === name);
      return el("div", { className: "sum-card", style: `--c:${p.color}` },
        el("h3", {}, face(name, 44), el("span", {}, name, INFO[name]?.charName ? el("small", { className: "who", textContent: `${INFO[name].charName}・${INFO[name].job}` }) : ""), el("small", { textContent: `${mine.length} 項輪到`, className: "cnt" })),
        el("div", { className: "tags" },
          mine.length ? mine.map((i) => el("span", { className: "tag", textContent: i.name })) : el("span", { className: "none", textContent: "目前沒有輪到的寶物" })));
    }),
  );
}

function renderCard(item) {
  const next = state[item.id];
  const nextName = item.order[next];
  const following = (next + 1) % item.order.length;

  const thumb = el("div", { className: "thumb" });
  const img = el("img", { src: item.image, alt: item.name, loading: "lazy" });
  img.onerror = () => thumb.replaceChildren(item.icon || "🎁");
  thumb.append(img);

  const rotation = el("div", { className: "rotation" });
  item.order.forEach((name, idx) => {
    if (idx) rotation.append(el("span", { className: "arrow", textContent: "➜" }));
    const chip = el("button", { className: "chip" + (idx === next ? " is-next" : ""), style: `--pc:${color(name)}` }, face(name, 22), name);
    chip.disabled = !unlocked;
    chip.onclick = () => act(item.id, idx, `${item.name}:改由 ${name} 撿取`);
    rotation.append(chip);
  });

  const btn = el("button", { className: "btn primary pick", textContent: `✔ ${nextName} 已撿取,換下一位` });
  btn.onclick = () => act(item.id, following, `${item.name}:${nextName} 撿完,輪到 ${item.order[following]}`);

  return el("article", { className: "card", id: `card-${item.id}`, style: `--c:${color(nextName)}` },
    el("div", { className: "card-head" }, thumb,
      el("div", {}, el("h2", { textContent: item.name }), el("div", { className: "next-label", textContent: "下一位撿取" }),
        el("div", { className: "next-name" }, face(nextName, 40), nextName))),
    "",
    rotation,
    unlocked ? [btn, el("p", { className: "hint", textContent: "也可以直接點上方名字,手動指定下一位" })] : []);
}

function render() {
  renderSummary();
  $("grid").replaceChildren(...[...DEFAULT_ITEMS].sort((a, b) => a.sort - b.sort).map(renderCard));
  $("undoBtn").disabled = !unlocked || undoStack.length === 0;
  $("resetBtn").disabled = !unlocked;
  $("lockBar").hidden = unlocked || store?.mode !== "online";
  $("lockBtn").hidden = !unlocked || store?.mode !== "online";
}


let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

async function commit(changes, msg, flashId) {
  undoStack.push({ ...state });
  Object.assign(state, changes); // 先樂觀更新畫面
  render();
  try {
    await store.write(changes);
    toast("✅ " + msg);
    if (flashId) document.getElementById(`card-${flashId}`)?.classList.add("flash");
  } catch (e) {
    console.error(e);
    state = undoStack.pop();
    render();
    toast("❌ 寫入失敗,請稍後再試");
  }
}
const act = (id, next, msg) => commit({ [id]: next }, msg, id);

/* ---------- 啟動 ---------- */
render();
loadPeople().then(render);

$("undoBtn").onclick = () => {
  if (!undoStack.length) return;
  const prev = undoStack.pop();
  store.write(prev).then(() => toast("↩ 已復原")).catch(() => toast("❌ 復原失敗"));
};
$("resetBtn").onclick = () => {
  if (!confirm("確定要重設成初始順序嗎?(所有人都會被重設)")) return;
  commit(defaults(), "已重設");
};

$("lockBar").onsubmit = async (e) => {
  e.preventDefault();
  const pass = $("passInput").value.trim();
  if (!pass) return;
  try {
    await store.unlock(pass);
    $("passInput").value = "";
    unlocked = true;
    render();
    toast("🔓 已解鎖");
  } catch {
    $("lockBar").classList.remove("shake");
    void $("lockBar").offsetWidth;
    $("lockBar").classList.add("shake");
    toast("❌ 密語錯誤");
  }
};
$("lockBtn").onclick = () => { unlocked = false; undoStack = []; render(); store.lock(); };

(async () => {
  try { store = await makeFirebaseStore(); } catch (e) { console.error(e); store = null; toast("Firebase 載入失敗,改用本機模式"); }
  store ||= makeLocalStore();
  const badge = $("syncBadge");
  badge.textContent = store.mode === "online" ? "● 即時同步中" : "本機模式(不同步)";
  badge.classList.add(store.mode === "online" ? "edit" : "demo");
  store.watchLock((ok) => { unlocked = ok; render(); });
  store.subscribe(applyRemote, (e) => { console.error(e); badge.textContent = "連線失敗"; badge.classList.replace("edit", "demo"); });
})();
