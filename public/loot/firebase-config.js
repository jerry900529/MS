// Firebase Web 設定。這些值本來就會公開在前端(apiKey 只是識別碼),
// 安全性靠 firestore.rules 與網域限制,見 README。
// 若改回 YOUR_... 開頭,網站會用瀏覽器本機儲存(不會同步)。

export const firebaseConfig = {
  apiKey: "AIzaSyBhi931yHbAg7Toono_kcmNulCLirnPDRU",
  authDomain: "whoms-a745d.firebaseapp.com",
  projectId: "whoms-a745d",
  storageBucket: "whoms-a745d.firebasestorage.app",
  messagingSenderId: "816212214084",
  appId: "1:816212214084:web:2e8a27ab5684219cf4d711",
  measurementId: "G-8TWL0Q1366",
};
