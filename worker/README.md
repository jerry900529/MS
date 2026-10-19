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
- 開發金鑰每天 1000 次。查一個新角色約 27 次；同名稱 6 小時內走快取，不耗額度。每天自動更新 4 個角色約 340 次。
- Nexon 一個應用可建 2 把金鑰：**建議第 2 把專給查詢用**，萬一被濫用，換掉它就好，不影響每日自動更新。
- Worker 只接受 `ALLOW_ORIGIN` 內網站的瀏覽器請求（非瀏覽器的工具可偽造標頭，所以這只是擋一般濫用，不是安全邊界）。
- 額度用完時前端會顯示「查詢人數太多，請 1 分鐘後再試」。
