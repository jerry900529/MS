# 角色查詢服務（Cloudflare Worker）

網站是純靜態的 GitHub Pages，**API 金鑰不能放在網頁裡**。所以查詢由一個小 Worker 代為呼叫 Nexon，金鑰存在 Worker 的 Secret。
免費方案就夠用（朋友一天 6～10 人）；不需要綁信用卡。

## 一次性部署（約 5 分鐘）
```bash
cd worker
npx wrangler login                      # 開瀏覽器登入 Cloudflare（沒有帳號先免費註冊）
npx wrangler secret put NEXON_API_KEY   # 貼上金鑰（建議另建第 2 把金鑰給查詢專用，見下）
npx wrangler deploy                     # 完成後會印出 https://tms-lookup.<你的帳號>.workers.dev
```
然後把網址填進 `public/config.json`：
```json
"lookupApi": "https://tms-lookup.<你的帳號>.workers.dev"
```
commit + push 後，網站右上角就會出現「🔍 角色查詢」。沒填 `lookupApi` 時線上版不顯示按鈕（本機 `node server.js` 一律可用）。

## 額度與保護
- 開發金鑰每天 1000 次。查一個新角色約 28 次；同名稱 6 小時內走快取，不耗額度。每天自動更新 4 個角色約 344 次。
- Nexon 一個應用可建 2 把金鑰：**建議第 2 把專給查詢用**，萬一被濫用，換掉它就好，不影響每日自動更新。
- Worker 只接受 `ALLOW_ORIGIN` 內網站的瀏覽器請求（非瀏覽器的工具可偽造標頭，所以這只是擋一般濫用，不是安全邊界）。
- 額度用完時前端會顯示「查詢人數太多，請 1 分鐘後再試」。

## claude.ai 自訂連結器（MCP）
同一個 Worker 另外提供 `/mcp/<MCP_PATH>`（`mcp.mjs`），讓 claude.ai 的「設定 → 連結器 → 新增自訂連結器」可以查詢本站資料。
工具：`list_characters`、`get_profile`、`get_history`、`lookup_character`（沒有 refresh，更新資料請跑 GitHub workflow 或用本機 `mcp-server.js`）。
```bash
cd worker
# 產生隨機路徑並存成 Secret（路徑就是密碼，不要貼到公開的地方）
openssl rand -hex 16                    # 複製輸出
npx wrangler secret put MCP_PATH        # 貼上剛才的值
npx wrangler deploy
```
連結器網址：`https://tms-lookup.jerry900529.workers.dev/mcp/<MCP_PATH>`（不需要認證）。沒設 `MCP_PATH` 時 MCP 功能關閉；路徑不對一律 404。
- 資料來自 GitHub Pages 已公開的 `data/<id>/*.json`；只有 `lookup_character` 會用 Nexon 金鑰額度。
- 限流：整體每分鐘 120 次請求；`lookup_character` 未命中快取時每小時 6 次（以 Cache API 計數，每個 Cloudflare 節點各自計算，只擋一般濫用）。
- 要更換連結：重新 `wrangler secret put MCP_PATH` 後到 claude.ai 更新網址即可。
- 連結器圖示：Worker 的 `/favicon.ico`、`/favicon.png` 會轉送 GitHub Pages 上的網站圖示（claude.ai 會抓網域根目錄的 favicon，沒有設定欄位）。
