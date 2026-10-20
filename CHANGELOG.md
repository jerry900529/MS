# CHANGELOG

## 2026-10-20
- 修正：`fetch-data.js` 抓取日期改用台北時間的昨天。
- 原因：原本用 UTC 計算，排程在台灣凌晨執行時會抓到前天的資料，網頁資料落後兩天。
- 同步在 `public/changelog.json` 新增 V004。
