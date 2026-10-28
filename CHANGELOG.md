# CHANGELOG

## 2026-10-28
- 新增：`mcp-server.js`，本機 stdio MCP server，提供 `list_characters`、`get_profile`、`get_history`、`lookup_character`、`refresh_character` 五個工具。
- 新增：`package.json`（依賴 `@modelcontextprotocol/sdk`、`zod`，僅 MCP server 使用）與 `README.md`。
- 原因：讓 Claude 能直接查詢角色資料、查詢任意角色，並在冷卻限制下觸發向 Nexon 更新；網站與部署流程不受影響。
- 新增：`worker/mcp.mjs`，在 Cloudflare Worker 提供 Streamable HTTP 的 MCP 端點 `/mcp/<MCP_PATH>`（`list_characters`、`get_profile`、`get_history`、`lookup_character`），給 claude.ai 自訂連結器使用；`worker/lookup.mjs` 入口加上路由。
- 保護：路徑密碼（Secret `MCP_PATH`，未設定則關閉、錯誤一律 404）、整體每分鐘 120 次、角色查詢每小時 6 次的限流。
- 原因：本機 stdio 版 claude.ai 連不到，需要公開 HTTPS 端點；不提供 refresh，避免公開觸發耗額度的抓取。需 `wrangler secret put MCP_PATH` 並 `wrangler deploy` 後才生效。
- 新增：Worker 的 `/favicon.ico`、`/favicon.png` 轉送網站圖示，讓 claude.ai 連接器清單顯示圖示（claude.ai 無上傳欄位，只抓網域根目錄的 favicon）。

## 2026-10-20
- 修正：`fetch-data.js` 抓取日期改用台北時間的昨天。
- 原因：原本用 UTC 計算，排程在台灣凌晨執行時會抓到前天的資料，網頁資料落後兩天。
- 新增：音樂曲庫加入「地球防衛總部吹笛版」（qm6CIm7rNlY），並設為花心傑睿的預設音樂。
- 修正：曲庫三首瑞恩相關曲目名稱開頭多餘的「－」已移除。
- 新增：英文歌單 208 首（來源為 Classic MapleStory BGM 歌單，已去掉 `[MapleStory BGM]` 前綴），與中文歌單分區顯示在同一份曲目清單。新增 `music-list-en.txt`，`sync-music.js` 同步寫入 `config.json` 的 `musicLibraryEn`，`player.js` 上下首與隨機只在同一歌單內輪播。
- 新增：`player.js` 播放器曲名旁加入 8 條頻譜條，播放時模擬律動（低音區跟節拍、高音區快速閃動），暫停、分頁隱藏或系統開啟減少動態效果時停止或隱藏。
- 原因：YouTube 內嵌無法讀取實際音訊，只能模擬；目的是讓播放時有視覺回饋。
- 原因：英文曲名無法對應台服中文名稱，分成兩個歌單可避免中英混雜與重複。
- 同步在 `public/changelog.json` 新增 V004。
