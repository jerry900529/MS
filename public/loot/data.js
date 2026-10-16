// 成員與寶物的初始資料(第一次「初始化資料庫」時會寫入 Firestore)
// order = 輪替順序,next = 下一位撿取者在 order 的索引(0 起算)
// image 請把圖片放進 images/ 資料夾,檔名對應如下(沒有圖片會顯示預設圖示)

export const PEOPLE = {
  Jerry: { color: "#f5c04a", emoji: "🦊" },
  YC: { color: "#ff7eb6", emoji: "🌸" },
  W10: { color: "#4fd1e8", emoji: "⚡" },
};

export const DEFAULT_ITEMS = [
  { id: "life-grindstone", sort: 1, name: "生命研磨石", icon: "💎", image: "loot/images/life-grindstone.png", order: ["Jerry", "W10", "YC"], next: 1 },
  { id: "dark-box", sort: 2, name: "漆黑箱", icon: "🎁", image: "loot/images/dark-box.png", order: ["Jerry", "W10", "YC"], next: 2 },
  { id: "life-box", sort: 3, name: "生命箱", icon: "📦", image: "loot/images/life-box.png", order: ["Jerry", "W10", "YC"], next: 2 },
  { id: "white-jade-box", sort: 4, name: "白玉箱", icon: "🏺", image: "loot/images/white-jade-box.png", order: ["YC", "W10", "Jerry"], next: 1 },
  { id: "faith-grindstone", sort: 5, name: "信念研磨石", icon: "🔮", image: "loot/images/faith-grindstone.png", order: ["YC", "W10", "Jerry"], next: 0 },
  { id: "eternal-box", sort: 6, name: "永恆箱裝備", icon: "⚔️", image: "loot/images/eternal-box.png", order: ["YC", "W10", "Jerry"], next: 1 },
];
