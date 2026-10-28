# TMS 角色網站

台服新楓之谷個人網站：4 個角色資料頁＋王團撿寶輪替表。純靜態、無建置，線上：https://jerry900529.github.io/MS/

## 執行方式
- 本機預覽：`node server.js`，開啟 http://localhost:3000/?c=jerry
- 手動抓資料：`node fetch-data.js [id]`（需要 `.env` 的 `NEXON_API_KEY`）

## 讓 Claude 透過 MCP 查詢資料
`mcp-server.js` 是本機 stdio MCP server（依賴只有它用，網站本身仍零依賴）。
```bash
npm install
claude mcp add tms-ms -- node /絕對路徑/mcp-server.js
```
（claude.ai 網頁版連結器見 `worker/README.md`。）
提供工具：`list_characters`、`get_profile`、`get_history`、`lookup_character`、`refresh_character`。
`refresh_character` 會消耗 Nexon API 額度（約 85 次），在背景執行，同角色冷卻 2 分鐘。

## 資料夾結構
詳見 `CLAUDE.md`。
