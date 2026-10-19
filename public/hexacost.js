/* HEXA 核心升級費用（靈魂艾爾達／靈魂艾爾達碎片）。API 只給核心等級，費用是遊戲固定數值，所以放在這裡。
   來源：MapleStory Wiki「HEXA Matrix」；各表總量已和韓服公佈值核對。遊戲改版時要更新這張表。
   每個陣列 30 項，第 i 項＝從 i-1 級升到 i 級的花費（第 1 項是開啟／解鎖該核心）。
   - skill1 起源技能、skill2 昇華技能（API 的「技能核心」依清單順序視為第 1、第 2 個）
   - common 靈魂雅努斯／赫卡忒、common3 職業共用的強化核心（例：終極隱身術VI） */
(function () {
  const T = {
    skill1: [[0, 1, 1, 1, 2, 2, 2, 3, 3, 10, 3, 3, 4, 4, 4, 4, 4, 4, 5, 15, 5, 5, 5, 5, 5, 6, 6, 6, 7, 20],
             [0, 30, 35, 40, 45, 50, 55, 60, 65, 200, 80, 90, 100, 110, 120, 130, 140, 150, 160, 350, 170, 180, 190, 200, 210, 220, 230, 240, 250, 500]],
    skill2: [[5, 1, 1, 1, 2, 2, 2, 3, 3, 10, 3, 3, 4, 4, 4, 4, 4, 4, 5, 15, 5, 5, 5, 5, 5, 6, 6, 6, 7, 20],
             [100, 30, 35, 40, 45, 50, 55, 60, 65, 200, 80, 90, 100, 110, 120, 130, 140, 150, 160, 350, 170, 180, 190, 200, 210, 220, 230, 240, 250, 500]],
    mastery: [[3, 1, 1, 1, 1, 1, 1, 2, 2, 5, 2, 2, 2, 2, 2, 2, 2, 2, 3, 8, 3, 3, 3, 3, 3, 3, 3, 3, 4, 10],
              [50, 15, 18, 20, 23, 25, 28, 30, 33, 100, 40, 45, 50, 55, 60, 65, 70, 75, 80, 175, 85, 90, 95, 100, 105, 110, 115, 120, 125, 250]],
    boost: [[4, 1, 1, 1, 2, 2, 2, 3, 3, 8, 3, 3, 3, 3, 3, 3, 3, 3, 4, 12, 4, 4, 4, 4, 4, 5, 5, 5, 6, 15],
            [75, 23, 27, 30, 34, 38, 42, 45, 49, 150, 60, 68, 75, 83, 90, 98, 105, 113, 120, 263, 128, 135, 143, 150, 158, 165, 173, 180, 188, 375]],
    common: [[7, 2, 2, 2, 3, 3, 3, 5, 5, 14, 5, 5, 6, 6, 6, 6, 6, 6, 7, 17, 7, 7, 7, 7, 7, 9, 9, 9, 10, 20],
             [125, 38, 44, 50, 57, 63, 69, 75, 82, 300, 110, 124, 138, 152, 165, 179, 193, 207, 220, 525, 234, 248, 262, 275, 289, 303, 317, 330, 344, 750]],
    common3: [[4, 1, 1, 1, 2, 2, 2, 3, 3, 9, 3, 3, 3, 3, 4, 4, 4, 4, 4, 14, 4, 5, 5, 5, 5, 5, 5, 5, 6, 18],
              [90, 25, 30, 35, 40, 45, 50, 55, 60, 180, 73, 81, 90, 98, 107, 115, 124, 132, 141, 315, 151, 160, 170, 179, 189, 198, 208, 217, 227, 450]],
  };
  // 累計：cum[k][L] = 升到 L 級總共花的 [艾爾達, 碎片]
  const cum = {};
  for (const [k, [e, f]] of Object.entries(T)) { let a = 0, b = 0; cum[k] = [[0, 0]]; for (let i = 0; i < 30; i++) { a += e[i]; b += f[i]; cum[k].push([a, b]); } }
  // 顯示用分類與「目前 TMS 版本的滿配核心數」（技能 2、精通 4、強化 4、共用 3）
  const KINDS = [['skill', '技能核心', 2], ['mastery', '精通核心', 4], ['boost', '強化核心', 4], ['common', '共用核心', 3]];

  function analyze(cores) {
    let skillN = 0;
    const rows = [], by = Object.fromEntries(KINDS.map(([k, label, exp]) => [k, { kind: k, label, expected: exp, owned: 0, sumLv: 0, spentE: 0, spentF: 0, leftE: 0, leftF: 0, unE: 0, unF: 0 }]));
    const own = { skill1: 0, skill2: 0, mastery: 0, boost: 0, common: 0, common3: 0 };
    for (const c of cores || []) {
      const ty = c.hexa_core_type || '', nm = c.hexa_core_name || '';
      let tab, grp;
      if (ty === '技能核心') { tab = skillN++ === 0 ? 'skill1' : 'skill2'; grp = 'skill'; }
      else if (ty === '精通核心') { tab = 'mastery'; grp = 'mastery'; }
      else if (ty === '強化核心') { tab = 'boost'; grp = 'boost'; }
      else if (ty === '共用核心') { tab = nm.startsWith('靈魂') ? 'common' : 'common3'; grp = 'common'; }
      else { rows.push(null); continue; }
      own[tab]++;
      const lv = Math.max(0, Math.min(30, +c.hexa_core_level || 0)), sp = cum[tab][lv], tot = cum[tab][30];
      const r = { lv, spentE: sp[0], spentF: sp[1], leftE: tot[0] - sp[0], leftF: tot[1] - sp[1], done: lv >= 30 };
      rows.push(r);
      const g = by[grp]; g.owned++; g.sumLv += lv; g.spentE += r.spentE; g.spentF += r.spentF; g.leftE += r.leftE; g.leftF += r.leftF;
    }
    // 尚未開啟的核心：整條都還缺（含解鎖）
    const miss = { skill: [['skill1', own.skill1 ? 0 : 1], ['skill2', own.skill2 ? 0 : 1]], mastery: [['mastery', 4 - own.mastery]], boost: [['boost', 4 - own.boost]],
      common: [['common', 2 - own.common], ['common3', 1 - own.common3]] };
    for (const [grp, list] of Object.entries(miss)) for (const [tab, n] of list) if (n > 0) { by[grp].unE += cum[tab][30][0] * n; by[grp].unF += cum[tab][30][1] * n; by[grp].unN = (by[grp].unN || 0) + n; }
    const kinds = KINDS.map(([k]) => by[k]);
    const sum = (f) => kinds.reduce((a, x) => a + (x[f] || 0), 0);
    return { rows, kinds, total: { owned: sum('owned'), expected: 13, sumLv: sum('sumLv'), spentE: sum('spentE'), spentF: sum('spentF'), leftE: sum('leftE'), leftF: sum('leftF'), unE: sum('unE'), unF: sum('unF'), unN: sum('unN') } };
  }
  window.HexaCost = { analyze, cum, T };
})();
