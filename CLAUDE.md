# CLAUDE.md — TMS 角色網站（jerry900529/MS）

台服新楓之谷（TMS）個人網站：4 個角色的資料頁（下拉選單切換）+ 王團撿寶輪替表。純靜態、無建置、零依賴。
線上：https://jerry900529.github.io/MS/　　使用者習慣用**繁體中文**溝通，UI 也是繁中。

## 結構（改東西前先看這裡，不用全部讀）
| 路徑 | 作用 |
|---|---|
| `public/index.html` | **整個角色頁的 CSS + JS 都內嵌在這一檔**。分頁：總覽／成長曲線／裝備／時裝／能力配點／技能／HEXA・V／聯盟公會／其他 |
| `public/config.json` | `characters[{id,name,job,music{title,yt}}]`、`loot{people,music}`、`server`、`version`、`repo` |
| `public/data/<id>/profile.json` | `{updated(ms), data:{basic,stat,equip,...}, errors}`，由 fetch-data.js 產生 |
| `public/data/<id>/history.json` | 經驗歷史 `{points:[{d,lv,rate,exp}], floor}`（成長曲線用） |
| `fetch-data.js` | 向 Nexon API 抓資料。`node fetch-data.js [id]`；也被 server.js 引用。端點清單在 `ENDPOINTS` |
| `server.js` | 本機預覽（port 3000）。`POST /api/refresh?c=<id>`（同角色冷卻 2 分鐘）、`GET /api/status?c=<id>`、支援 Range |
| `public/loot.html` + `public/loot/` | 王團撿寶（併自 jerry900529/who）。Firebase Firestore 即時同步 + 通關密語。`firebase/firestore.rules` 只是備份，不會部署 |
| `worker/lookup.mjs` | 角色查詢（`?q=角色名稱`）。同一份程式：Cloudflare Worker（金鑰在 Secret）＋本機 `server.js` 的 `/api/lookup`。約 27 次 API 呼叫、6～10 秒，快取 6 小時。線上版靠 `config.json` 的 `lookupApi`（已部署：`https://tms-lookup.jerry900529.workers.dev`）；改了 `worker/` 要重新 `cd worker && npx wrangler deploy`，部署步驟見 `worker/README.md` |
| `public/jobtheme.js` | 查詢模式專用的職業主題產生器：`J` 表是「職業名→{深/淺色, 主色, 副色, 頂部漸層, 圖樣}」，缺的職業會用名稱算固定色。4 個手工主題仍在 index.html。新增/修正職業配色改 `J` 即可（職業名是 API 的 `character_class`，用 includes 比對） |
| `public/hexacost.js` | HEXA 各核心升級所需靈魂艾爾達／碎片的固定費用表（API 不提供）＋ `HexaCost.analyze()`。遊戲改版（費用或核心數變動）時要更新這張表 |
| `public/changelog.json` | 更新日誌（右上角「更新日誌」按鈕）。**每次改動都要新增一筆版本**（V001 是下載時的初始版，V002 起依序遞增，新的放最前面） |
| `music-list.txt`／`music-list-en.txt` + `sync-music.js` | 背景音樂曲庫來源（名稱｜YouTube ID），中文歌單與英文歌單各一檔。改完 `node sync-music.js` → 寫入 `config.json` 的 `musicLibrary`／`musicLibraryEn`。播放器清單分兩區，上下首與隨機只在同區輪播 |
| `public/player.js` | 右下角背景音樂。`track.yt` 用 YouTube IFrame；`track.src` 是選用的本機音檔（目前沒有任何角色在用，找不到檔會自動隱藏） |
| `.github/workflows/update.yml` | 每天台灣 01:30 抓資料→commit `public/data`→部署 Pages。也可手動 Run workflow；push 觸發時**不抓資料**只部署 |

## 常用指令
```bash
node server.js                      # http://localhost:3000/?c=jerry|lushi|yuming|alucard ；loot.html 是撿寶頁
node fetch-data.js [id]             # 手動抓資料（需要 .env 的 NEXON_API_KEY）
git pull --rebase origin main       # push 前必做：GitHub 機器人每天會 commit 資料
```
本機驗證畫面：`google-chrome --headless=new --no-sandbox --disable-gpu --window-size=1100,700 --virtual-time-budget=9000 --screenshot=/path.png "http://localhost:3000/?c=jerry"`

## 不在 git 裡的東西（換電腦要自己補）
- `.env`：`NEXON_API_KEY=test_...`（Nexon Open API 後台取得）。GitHub 上另有 Secret `NEXON_API_KEY`（Actions 用）。
- 音樂全部用 YouTube 嵌入（`config.json` 的 `music.yt`），repo 裡不放配樂檔（`.gitignore` 仍排除 `public/audio/`）。favicon 的原始圖已不在專案內，現有的是去背後的 `favicon.png/.ico`。
- 遠端 `origin` 是 SSH：`git@github.com:jerry900529/MS.git`，需要該機器的公鑰已加到 GitHub。

## 設計重點與規則
- **主題**：每個職業一套 `[data-theme=nightlord|windarcher|shadower|demonavenger]`（CSS 變數：`--bg --card --ink --accent --accent2 --hl --on-accent --line --hero-bg --deco --emblem --r --r2 --exp-a --exp-b …`）。未知職業用 `:root` 預設橘色主題。
- **防閃爍**：`<head>` 最前面的小 script 在首次繪製前設主題，內建 `T = {id→主題}` 對照；**新增角色要同步更新這個 `T`**，JS 裡的 `THEMES`（職業→主題）也要對應。
- **新增角色**：`config.json` 加 `{id,name,job,music}` → 更新 head 的 `T` → `node fetch-data.js <id>` → commit `public/data/<id>/`。
- **全站單一樣式表**，class 名稱要小心撞名（例：`.bar` 是進度條，播放器改用 `.ctl`）。基準字體 `html{font-size:112.5%}`，圖表文字在 SVG 裡另外設定。
- 時間一律用台北時間顯示（`fmtTW`）。Nexon 資料每日結算，我們抓「昨天」的 `date`；`updated` 是抓取時間。
- 風格：原生 JS、不引入套件／打包工具。語氣與註解用繁中。

## Nexon API 的坑
- Base `https://open.api.nexon.com/maplestorytw/v1`，header `x-nxopen-api-key`。流程：`/id?character_name=` → `ocid` → 各端點帶 `ocid&date=`。
- 開發金鑰額度小：撞到 `OPENAPI00007` 要等；一個角色每次更新約 85 次呼叫，**必須循序且間隔 ~1.5 秒**，不要平行。歷史補抓每次上限 60 筆。
- **沒有**道具查詢、帳號→角色清單（皆 403 `OPENAPI00002`）。圖示只有角色身上已有的（`open.api.nexon.com/static/maplestorytw/...`）。
- 歷史資料約半年（更早回傳空值 → 記為 `floor`）。

## 部署（GitHub Pages）與撿寶 Firebase
- 首次設定：repo 推上 `main` → Settings → Secrets → Actions 新增 `NEXON_API_KEY` → Settings → Pages 的 Source 選 **GitHub Actions** → `config.json` 的 `repo` 填 `jerry900529/MS`（讓按鈕顯示 Actions 連結）。
- Pages 是靜態空間：網頁上的「重新整理資料」在線上版只會重新載入網站上現有資料；要向 Nexon 抓新資料必須跑 workflow（Actions → Update data & deploy → Run workflow，約 3～10 分鐘）。本機 `node server.js` 的按鈕才會真的呼叫 Nexon。
- 私有 repo 的 Pages 需付費方案；目前是公開 repo，角色資料（公開遊戲資料）也是公開的。
- 撿寶頁人名對應：`config.json` 的 `loot.people`（Jerry→jerry、YC→yuming、W10→lushi）。頭像取自站內 API 資料；寶物圖示是 `public/loot/images/` 的圖檔。
- Firebase 金鑰有 HTTP referrer 限制：原本只允許 `https://jerry900529.github.io/*` 與 `localhost:8000`。本機預覽撿寶頁若連線失敗，改用 `PORT=8000 node server.js`，或到 Google Cloud Console 加上 `http://localhost:3000/*`。
- 成長曲線歷史：近 30 天每天一點、更早每週一點，往回抓到 API 沒資料為止（約半年）；每次更新只補缺的日期，新角色可能要更新兩三次才補齊。

## Git／版權
- commit 結尾加：`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`。這台機器 git 2.25（不支援 `git init -b`）。
- 不要把遊戲配樂、官方美術（Boss 圖等）放進 repo；不要重畫受版權保護的角色，需要圖示時用原創設計或 API 取得的圖。
- `public/data/` 會被機器人 commit，提交前先 `git pull --rebase`。
