# TMS 新楓之谷角色網站（花心傑睿＋朋友）

資料來源：NEXON Open API（台服）。網站是純靜態頁面（`public/`），資料存在 `public/data/<id>/profile.json`。

## 角色清單與主題
角色在 `public/config.json` 的 `characters`（`id`、`name`、`job`）。網頁上方的下拉選單切換角色，第一個是預設。每個角色依職業套用自己的視覺主題（夜使者／破風使者／暗影神偷／惡魔復仇者，其他職業用預設橘色主題）；要新增職業主題，在 `public/index.html` 的 `[data-theme=...]` 區塊與 `THEMES` 對照表加一組即可。每位角色的資料存在 `public/data/<id>/`。

## 王團撿寶輪替表（併入自 jerry900529/who）
頁面是 `public/loot.html`，程式在 `public/loot/`（`data.js` 設定寶物與輪替順序、`firebase-config.js` 是 Firebase 設定），資料即時同步在 Firebase Firestore，操作需要通關密語。`firebase/firestore.rules` 是資料庫規則（要貼回 Firebase Console 的 Rules，不會被部署）。
人物頭像與永恆裝備圖示取自站內 API 資料，人名對應在 `public/config.json` 的 `loot.people`（Jerry→jerry、YC→yuming、W10→lushi）。寶物圖示是 `public/loot/images/` 的圖檔，API 沒有道具圖示可以查。
> 本機預覽時，Firebase 金鑰的 HTTP referrer 限制如果只有 `localhost:8000`，請用 `PORT=8000 node server.js`，或到 Google Cloud Console 加上 `http://localhost:3000/*`。

## 本機預覽
```bash
echo "NEXON_API_KEY=你的金鑰" > .env     # .env 已被 .gitignore 排除，不會上傳
node server.js                            # http://localhost:3000
```
網頁上的「重新整理資料」按鈕會呼叫本機伺服器向 Nexon 重新抓取（兩次之間至少間隔 2 分鐘）。

## 經驗成長曲線
歷史資料存在 `public/data/<id>/history.json`：近 30 天每天一點、更早每週一點，往回抓到 API 沒資料為止（約半年）。每次更新只補缺的日期，單次最多補 60 筆以保護 API 額度，所以第一次可能要更新兩三次才會補齊。

## 放到 GitHub Pages
1. 建立 repo 並推上 `main`（**不要**提交 `.env`）。
2. Settings → Secrets and variables → Actions → New repository secret：名稱 `NEXON_API_KEY`，值為你的金鑰。
3. Settings → Pages → Source 選 **GitHub Actions**。
4. 在 `public/config.json` 填入 `"repo": "你的帳號/repo名稱"`，按鈕才會顯示 Actions 連結。
5. 每天台灣時間 01:30 自動抓資料並部署；也可到 Actions → Update data & deploy → Run workflow 手動更新。

> Pages 是靜態空間，網頁上的按鈕只能「重新載入網站上最新的資料」；要向 Nexon 抓新資料需要執行上面的 workflow。
> 注意：私有 repo 的 Pages 需要付費方案；公開 repo 的話，角色資料（本來就是公開的遊戲資料）會是公開的。
