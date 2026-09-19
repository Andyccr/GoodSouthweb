/* Good South — zh / en strings + catalog English fields */
(function (g) {
  var GS = g.GS || (g.GS = {});
  GS.LANG = "zh";

  function pack() {
    return (GS.I18N && GS.I18N[GS.LANG]) || (GS.I18N && GS.I18N.zh) || {};
  }

  GS.t = function (key, a, b, c) {
    var s = pack()[key];
    if (s == null && GS.I18N && GS.I18N.zh) s = GS.I18N.zh[key];
    if (s == null) s = key;
    s = String(s);
    if (a != null) s = s.replace(/\{0\}/g, a);
    if (b != null) s = s.replace(/\{1\}/g, b);
    if (c != null) s = s.replace(/\{2\}/g, c);
    return s;
  };

  GS.loc = function (obj, field) {
    field = field || "name";
    if (!obj) return "";
    if (GS.LANG === "en" && obj[field + "En"]) return obj[field + "En"];
    return obj[field] != null ? obj[field] : "";
  };

  GS.setLang = function (lang) {
    GS.LANG = lang === "en" ? "en" : "zh";
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = GS.LANG === "en" ? "en" : "zh-CN";
    }
    if (GS.I18N && GS.I18N.applyChrome) GS.I18N.applyChrome();
    return GS.LANG;
  };

  GS.joinList = function (arr) {
    return (arr || []).join(GS.LANG === "en" ? ", " : "、");
  };

  GS.I18N = {
    zh: {
      langName: "中文",
      langToggle: "English",
      subtitle: "南 境 据 点  ·  矮人要塞风格 ASCII 塔防沙盒",
      flavor: "北蛮的长船正在南下。你是南境的寨主。守住屋舍，收集圣物，在航程里做出抉择。",
      continue: "继续征程",
      loadSlots: "读取存档 — 多槽位",
      newCampaign: "新的战役 — 群岛远征",
      sandbox: "沙盒模式 — 随机构图 / 刷子 / 刷兵",
      handbook: "手册",
      titleHint: "Esc 暂停菜单 · F5 快速存档 · F9 快速读档 · 空格战斗内暂停 · I 中/EN",
      inBattle: "战斗中",
      pause: "暂停",
      pauseBattle: "战斗已冻结。可存档后离开，稍后从同一战局继续。",
      pauseChart: "海图暂停。",
      resume: "继续",
      saveProgress: "保存进度",
      loadSave: "读取存档",
      palette: "调色板",
      muteOn: "开启音效",
      muteOff: "静音",
      evac: "弃岛撤退（保兵）",
      backChart: "返回海图（不存战斗）",
      backTitle: "返回标题",
      saveHint: "自动档会在关键节点写入；手动档不会被自动覆盖。战斗中存档可恢复战局。",
      loadHint: "选择一个槽位。若存档含战斗快照，将直接回到该战局。",
      empty: "空",
      coins: "钱币",
      cleared: "收复",
      captains: "队长",
      relics: "圣物",
      currentIsland: "当前岛",
      confirm: "确认",
      ok: "确定",
      cancel: "取消",
      back: "返回",
      arriving: "将至",
      threat: "威胁",
      houses: "屋舍",
      mapSize: "版图",
      beacons: "烽火台",
      landFrom: "登陆方向",
      omen: "征兆",
      relicHold: "据点圣物",
      relicGain: "守住后获得",
      homes: "民居",
      deployG: "登岸布置兵团",
      hireN: "招募",
      hireTitle: "招募",
      hireFlavor: "南境的散兵愿意为钱币而战。每位队长带一小队。",
      hireInf: "招募盾兵",
      hireArc: "招募弓手",
      hirePike: "招募枪兵",
      hireSkirm: "招募投矛手",
      hireHint: "阵亡队长无法复活。胜利按残存屋舍得钱；圣物守岛后永久生效。",
      victory: "胜利",
      retreat: "撤退",
      defeat: "陷落",
      housesLeft: "残存屋舍",
      gained: "获得钱币",
      nowHave: "现有",
      stillFight: "仍可作战的队长",
      nextChart: "继续海图",
      southLost: "南境沦陷 · 返回标题",
      retryIsland: "再攻此岛",
      gotRelic: "获得圣物",
      wheatBonus: "麦仓印额外 +{0} 钱币。",
      voyageEnd: "群岛纪事终章",
      voyageEndBody: "南境的岛链或守或弃，潮水暂时平了。收复 {0} 座岛。",
      title: "标题",
      menu: "菜单",
      save: "保存",
      lang: "语言",
      chart: "海图",
      isles: "群岛",
      intel: "情报",
      roster: "编制",
      troops: "部队",
      land: "登陆",
      landThis: "登陆此岛",
      fit: "全图",
      center: "对准",
      look: "观察",
      looking: "观察中",
      startFight: "开战",
      rotate: "转向",
      warhorn: "号角",
      hornUsed: "号角已用",
      evacShort: "撤退",
      place: "布置",
      paint: "刷地",
      raiders: "蛮兵",
      longship: "长船",
      allies: "己方",
      shaman: "萨满",
      hound: "猎犬",
      newIsle: "新岛",
      qsave: "快存",
      phaseDeploy: "布置",
      phaseOver: "结束",
      paused: "暂停",
      eco: "生态",
      stage: "阶段",
      facing: "朝向",
      ours: "我军",
      northmen: "北蛮",
      waves: "波次",
      mode: "模式",
      sandboxMode: "沙盒",
      selected: "选中兵团",
      notPlaced: "尚未落子",
      moveCd: "换阵冷却",
      log: "纪事",
      knownIsles: "已知岛屿",
      listHint: "点选对准，登陆请用按钮。",
      chartHint: "海图点两下或按 G 登陆。列表只对准镜头。",
      pickIsle: "选一座岛。",
      unknown: "未知",
      unfought: "未攻",
      recovered: "已收复",
      fallen: "已陷",
      routes: "航线",
      relicEmpty: "守岛可获得据点圣物，全军常驻。",
      legend: "图例",
      legendBody: "≈深海 ~浅 .滩 ,草 n丘\n▲崖 #岩 ♣树 ⌂屋 █墙 ¥烽\n☻盾 }弓 ↑枪 ‡矛 ☺乡勇\nv蛮 V力 x投 ▼盾 Ψ萨 d犬 Ω领\n黄闪箭头 = 登陆点",
      observe: "观察",
      cursor: "光标",
      south: "南境",
      southIntro: "北蛮的长船正在南下。",
      seed: "种子",
      biome: "生态",
      diff: "威胁",
      size: "尺度",
      sizeS: "小",
      sizeM: "中",
      sizeL: "大",
      genIsle: "生成新岛",
      hintTitle: "a 战役 · b 沙盒 · c 手册 · I 中/EN",
      hintChart: "WASD/拖平移 · 滚轮缩放 · 点岛再点登陆 · 右键立刻登 · Tab换岛 · Enter登陆",
      hintChartTouch: "点岛选中 · 再点或长按登陆 · 拖/捏平移缩放",
      hintBattle: "点空地就位 · 拖/WASD平移 · R或再点兵团转向 · G开战",
      hintSandbox: "点空地就位 · 拖/WASD平移 · 滚轮缩放 · 右键转向",
      hintBattleTouch: "点空地就位 · 拖平移 · 双指缩放 · 点同一兵团转向",
      bannerDeploy: "就位 — 点空地放下兵团，R 转向（箭头），开战后天兵整团接战 · G 开战",
      bannerDeployTouch: "点空地放下 · 转向看箭头朝向 · 拖动画布",
      confirmNew: "开始新战役？",
      confirmNewMsg: "已有存档。新战役不会立刻覆盖手动档，但自动档会在推进时更新。确定开始？",
      confirmYes: "开始新战役",
      toastPaused: "已暂停（Esc 打开菜单）",
      toastResume: "继续 ×{0}",
      toastNoSave: "当前没有可保存的战役。",
      toastSandboxSave: "沙盒请用战役存档位：先开始战役。",
      toastPickSquad: "先点选一个兵团。",
      toastPickSquadDesk: "先选中兵团再转向。",
      toastFacing: "朝向 {0} {1}",
      toastHornMore: "号角！还可再吹一次",
      toastHorn: "号角！北蛮减速",
      toastHornWait: "开战后方可吹号",
      toastHornSpent: "本场号角已用过",
      toastMuted: "已静音",
      toastUnmute: "音效开启",
      toastSelect: "选中 {0}",
      toastPlaceMode: "布置模式",
      toastBrush: "地形刷：{0}",
      toastVoyageStart: "远征开始。西侧家园已侦察。",
      toastNothing: "没有可保存的战役。",
      toastSavedAuto: "已保存到自动档",
      toastSavedSlot: "已保存到存档位 {0}",
      toastSaveFail: "保存失败（存储空间？）",
      toastNoQsave: "当前无法快速存档。",
      toastQsave: "快速存档完成（自动档）",
      toastQsaveFail: "快速存档失败",
      toastNoLoad: "没有可用存档。",
      toastEmptySlot: "存档为空。",
      toastLoadBattle: "已读取战斗存档 · {0}",
      toastLoad: "已读取征程。",
      toastCleared: "{0} 已经收复。",
      toastDeployTouch: "点空地就位，拖动画布，双指缩放。",
      toastNoCoins: "钱币不够。",
      toastNoHire: "无法招募。",
      toastHired: "新队长入列。",
      toastHornStart: "角声响起。",
      toastVoyageOk: "航程决议已记下。",
      toastSandboxReady: "沙盒就绪 {0}×{1}。滚轮缩放，中键拖镜头。",
      toastSandboxReadyTouch: "沙盒就绪 {0}×{1}。点地布置，拖动画布。",
      toastNewIsle: "新岛：{0}（{1}×{2}）",
      toastNeedSquad: "先点选一个兵团（1–9 或点击士兵）。",
      toastCd: "换阵冷却中。",
      toastOnHouse: "屋舍上无法列阵。",
      toastBadTile: "无法落在此处。",
      toastPal: "调色：{0}",
      toastArm: "{0} · 再点一次登陆",
      toastLang: "语言：中文",
      hoverLand: "再点一次登陆 · 右键立刻登",
      hoverLandTouch: "再点一次登陆 · 长按立刻登",
      autoSlot: "自动",
      manualSlot: "手动 {0}",
      slotMetaTime: "",
      palDf: "经典 DF",
      palGreen: "绿磷",
      palAmber: "琥珀",
      deployHint: "点一下空地放下兵团即可。开战后天兵会自己找北蛮打。",
      shipName: "北境长船",
      wreck: "搁浅的龙骨",
      miss: "空",
      missRanged: "偏",
      hexMark: "咒",
      helpTitle: "南境手册",
      arrive: "抵达 {0}。{1}。",
      landingsLine: "登陆点：{0}。点空地让兵团就位，开战后天兵会自己接战。",
      beaconLine: "岛上有 {0} 座烽火台——弓手靠近可加强。",
      placedLine: "{0} 在 ({1},{2}) 就位，面朝{3}。发现北蛮会自行接战。",
      needPlace: "至少布置一个兵团才能开战。",
      hornStartLog: "角声响起。北境的船帆出现在海平线上。",
      hornBlast: "号角震天！北蛮脚步乱了片刻。",
      militiaUp: "{0}的乡勇拿起了农具！",
      shipArrive: "一艘长船自{0}方海平线驶来！",
      waveSplit: "第 {0}/{1} 波分兵自{2}与{3}方杀到！",
      waveOne: "第 {0}/{1} 波自{2}方杀到！",
      foeDown: "{0}（{1}）倒下了。",
      soldierDead: "{0}战死了。",
      captainDead: "队长 {0} 阵亡！兵团溃散。",
      houseBurn: "{0}被点燃了！村民四散。",
      allBurned: "所有屋舍都烧了。这座岛落入北蛮之手。",
      heldIsle: "潮水退去。你们守住了 {0}。",
      lootCoins: "缴获钱币 {0}。",
      omenLine: "征兆：{0} — {1}",
      relicsCarry: "携带圣物 {0} 件。",
      voidLook: "虚空。",
      heightRel: "相对高度 {0}。",
      houseLook: "{0} — 耐久 {1}/{2}{3}。",
      unitLook: "{0}，{1}。体力 {2}/{3}。",
      corpseLook: "这里有 {0} 的尸体。",
      burnedMark: "（已焚）",
      deadMark: " 阵亡",
      hall: "厅堂",
      troopsN: "兵",
      trait: "特质",
      already: "已{0}",
      paintBrush: "刷：{0}（拖拽连涂）",
      tool: "工具",
      sheetSandboxHint: "刷地后点地图改地形；新岛用当前种子/生态。",
      tapStart: "点按钮开始",
      continueAs: "继续征程 — {0}",
      hireHall: "招募厅  ·  钱币 {0}",
      hireBtn: "{0}  ({1})",
      arrivingIsle: "将至 · {0}",
      previewMeta: "{0}  ·  {1}  ·  威胁 {2}",
      previewCounts: "屋舍 {0} 座 · 版图 {1}×{2}",
      previewBeacons: " · 烽火台 {0}",
      previewLand: "。登陆方向：",
      previewHomes: "民居：",
      omenP: "征兆 {0} — {1}",
      relicP: "据点圣物 {0} {1} — 守住后获得：{2}",
      hireNCoins: "招募 / 钱币 {0}",
      resultHead: "{0} — {1}",
      resultStats: "残存屋舍 {0}/{1}　获得钱币 {2}　现有 {3}",
      captainsLeft: "仍可作战的队长：",
      voyageHead: "航程 · {0}",
      finaleRelics: "。圣物：",
      slotAuto: "自动存档",
      slotManual: "存档位 {0}",
      slotCoins: "钱币 {0}",
      slotCleared: "收复 {0}/{1}",
      slotCaps: "队长 {0}",
      slotRelics: "圣物 {0}",
      slotIsland: "当前岛 {0}",
      inBattleMark: "（战斗中）",
      threatLine: "威胁 {0}",
      routesLine: "航线：",
      cursorAt: "光标 ({0},{1}) {2}",
      facingAt: "朝{0}",
      soldiersOf: "兵 {0}/{1}",
      landThisName: "登陆 {0}",
      warhornN: "号角×{0}",
      zoomIn: "放大",
      zoomOut: "缩小",
      burnedShort: "已焚",
      docTitle: "GOOD SOUTH — 南境据点",
      needSquad: "先点选一个兵团。",
    },
    en: {
      langName: "English",
      langToggle: "中文",
      subtitle: "HOLDFAST OF THE SOUTH  ·  DF-style ASCII island TD",
      flavor: "Longships bear down from the north. You are the hold's thane. Keep the houses, gather relics, and choose on the voyage.",
      continue: "Continue",
      loadSlots: "Load save — slots",
      newCampaign: "New campaign — the isles",
      sandbox: "Sandbox — maps / brushes / spawns",
      handbook: "Handbook",
      titleHint: "Esc pause · F5 quicksave · F9 quickload · Space pause in battle · I 中/EN",
      inBattle: "in battle",
      pause: "Paused",
      pauseBattle: "Time is frozen. You can save and leave, then resume this fight.",
      pauseChart: "Chart paused.",
      resume: "Resume",
      saveProgress: "Save",
      loadSave: "Load",
      palette: "Palette",
      muteOn: "Unmute",
      muteOff: "Mute",
      evac: "Evacuate (keep troops)",
      backChart: "Back to chart (no battle save)",
      backTitle: "Title",
      saveHint: "Autosave writes at key beats; manual slots are never overwritten. Battle saves restore the fight.",
      loadHint: "Pick a slot. Battle snapshots resume that engagement.",
      empty: "empty",
      coins: "coins",
      cleared: "held",
      captains: "captains",
      relics: "relics",
      currentIsland: "island",
      confirm: "Confirm",
      ok: "OK",
      cancel: "Cancel",
      back: "Back",
      arriving: "Approaching",
      threat: "threat",
      houses: "houses",
      mapSize: "map",
      beacons: "beacons",
      landFrom: "landings",
      omen: "Omen",
      relicHold: "Hold relic",
      relicGain: "keep if you hold",
      homes: "homes",
      deployG: "Land and deploy",
      hireN: "Hire",
      hireTitle: "Hiring",
      hireFlavor: "South-isle stragglers will fight for coin. Each captain brings a company.",
      hireInf: "Hire shields",
      hireArc: "Hire archers",
      hirePike: "Hire pikes",
      hireSkirm: "Hire skirmishers",
      hireHint: "Fallen captains do not return. Coin from surviving houses; relics last the campaign.",
      victory: "Victory",
      retreat: "Retreat",
      defeat: "Fallen",
      housesLeft: "houses left",
      gained: "coin gained",
      nowHave: "now",
      stillFight: "captains still able",
      nextChart: "Back to chart",
      southLost: "The South is lost · Title",
      retryIsland: "Retry this isle",
      gotRelic: "Relic gained",
      wheatBonus: "Wheat-seal +{0} extra coin.",
      voyageEnd: "End of the voyage",
      voyageEndBody: "The chain of isles is held or lost; the tide rests. {0} isles recovered.",
      title: "Title",
      menu: "Menu",
      save: "Save",
      lang: "Lang",
      chart: "Chart",
      isles: "Isles",
      intel: "Intel",
      roster: "Roster",
      troops: "Troops",
      land: "Land",
      landThis: "Land here",
      fit: "Fit",
      center: "Focus",
      look: "Look",
      looking: "Looking",
      startFight: "Fight",
      rotate: "Turn",
      warhorn: "Horn",
      hornUsed: "Horn spent",
      evacShort: "Evac",
      place: "Place",
      paint: "Paint",
      raiders: "Raiders",
      longship: "Ship",
      allies: "Allies",
      shaman: "Shaman",
      hound: "Hound",
      newIsle: "New isle",
      qsave: "Quicksave",
      phaseDeploy: "Deploy",
      phaseOver: "Over",
      paused: "Paused",
      eco: "biome",
      stage: "phase",
      facing: "face",
      ours: "ours",
      northmen: "north",
      waves: "waves",
      mode: "mode",
      sandboxMode: "sandbox",
      selected: "Selected company",
      notPlaced: "not placed",
      moveCd: "re-deploy CD",
      log: "Log",
      knownIsles: "Known isles",
      listHint: "Click to focus. Land with the button.",
      chartHint: "Tap twice on the chart or press G to land. The list only focuses.",
      pickIsle: "Pick an isle.",
      unknown: "unknown",
      unfought: "open",
      recovered: "held",
      fallen: "lost",
      routes: "routes",
      relicEmpty: "Hold an isle to keep its relic for the army.",
      legend: "Legend",
      legendBody: "≈deep ~shoal .beach ,grass n hill\n▲cliff #rock ♣tree ⌂house █wall ¥beacon\n☻shield }bow ↑pike ‡skirm ☺militia\nv raider V brute x thrower ▼shield Ψshaman d hound Ωjarl\nyellow flash = landing",
      observe: "Look",
      cursor: "cursor",
      south: "SOUTH",
      southIntro: "Northman longships are coming south.",
      seed: "seed",
      biome: "biome",
      diff: "threat",
      size: "size",
      sizeS: "S",
      sizeM: "M",
      sizeL: "L",
      genIsle: "New isle",
      hintTitle: "a campaign · b sandbox · c handbook · I 中/EN",
      hintChart: "WASD/drag pan · wheel zoom · tap isle then land · RMB lands · Tab cycle · Enter land",
      hintChartTouch: "tap isle · tap again or hold to land · drag/pinch",
      hintBattle: "tap ground to place · drag/WASD pan · R or re-tap company to turn · G fight",
      hintSandbox: "tap to place · drag/WASD pan · wheel zoom · RMB turn",
      hintBattleTouch: "tap ground · drag pan · pinch zoom · re-tap company to turn",
      bannerDeploy: "Place companies on open ground, R to face (arrows). They hunt on their own after G.",
      bannerDeployTouch: "Tap ground to place · turn by the arrow · drag the map",
      confirmNew: "Start a new campaign?",
      confirmNewMsg: "A save already exists. Manual slots stay; autosave will update as you go. Start anyway?",
      confirmYes: "New campaign",
      toastPaused: "Paused (Esc for menu)",
      toastResume: "Resume ×{0}",
      toastNoSave: "Nothing to save.",
      toastSandboxSave: "Sandbox has no campaign slot — start a campaign first.",
      toastPickSquad: "Select a company first.",
      toastPickSquadDesk: "Select a company, then turn.",
      toastFacing: "Facing {0} {1}",
      toastHornMore: "Horn! One blast left",
      toastHorn: "Horn! Northmen slow",
      toastHornWait: "Blow the horn after the fight starts",
      toastHornSpent: "Horn already spent",
      toastMuted: "Muted",
      toastUnmute: "Sound on",
      toastSelect: "Selected {0}",
      toastPlaceMode: "Place mode",
      toastBrush: "Brush: {0}",
      toastVoyageStart: "The voyage begins. The western home is scouted.",
      toastNothing: "Nothing to save.",
      toastSavedAuto: "Saved to autosave",
      toastSavedSlot: "Saved to slot {0}",
      toastSaveFail: "Save failed (storage?)",
      toastNoQsave: "Cannot quicksave now.",
      toastQsave: "Quicksaved (autosave)",
      toastQsaveFail: "Quicksave failed",
      toastNoLoad: "No save found.",
      toastEmptySlot: "Empty slot.",
      toastLoadBattle: "Loaded battle · {0}",
      toastLoad: "Campaign loaded.",
      toastCleared: "{0} is already held.",
      toastDeployTouch: "Tap ground to place, drag to pan, pinch to zoom.",
      toastNoCoins: "Not enough coin.",
      toastNoHire: "Cannot hire.",
      toastHired: "A new captain joins.",
      toastHornStart: "The horn sounds.",
      toastVoyageOk: "The voyage choice is noted.",
      toastSandboxReady: "Sandbox {0}×{1}. Wheel zoom, MMB pan.",
      toastSandboxReadyTouch: "Sandbox {0}×{1}. Tap to place, drag to pan.",
      toastNewIsle: "New isle: {0} ({1}×{2})",
      toastNeedSquad: "Select a company (1–9 or click a soldier).",
      toastCd: "Re-deploy cooling down.",
      toastOnHouse: "Cannot form on a house.",
      toastBadTile: "Cannot stand here.",
      toastPal: "Palette: {0}",
      toastArm: "{0} · tap again to land",
      toastLang: "Language: English",
      hoverLand: "tap again to land · RMB lands now",
      hoverLandTouch: "tap again to land · hold to land now",
      autoSlot: "auto",
      manualSlot: "slot {0}",
      palDf: "Classic DF",
      palGreen: "Phosphor",
      palAmber: "Amber",
      deployHint: "Tap open ground to place a company. After the horn they hunt on their own.",
      shipName: "North longship",
      wreck: "beached keel",
      miss: "miss",
      missRanged: "whiff",
      hexMark: "hex",
      helpTitle: "South Handbook",
      arrive: "Arrived at {0}. {1}.",
      landingsLine: "Landings: {0}. Place companies on open ground; after the horn they hunt on their own.",
      beaconLine: "{0} beacon(s) on this isle — archers nearby shoot farther.",
      placedLine: "{0} formed at ({1},{2}), facing {3}. They will hunt northmen on their own.",
      needPlace: "Place at least one company before the fight.",
      hornStartLog: "The horn sounds. North sails lift on the horizon.",
      hornBlast: "Warhorn! The northmen stumble.",
      militiaUp: "{0}'s militia take up tools!",
      shipArrive: "A longship from the {0}!",
      waveSplit: "Wave {0}/{1} splits from {2} and {3}!",
      waveOne: "Wave {0}/{1} from the {2}!",
      foeDown: "{0} ({1}) is down.",
      soldierDead: "{0} has fallen.",
      captainDead: "Captain {0} is slain! The company breaks.",
      houseBurn: "{0} is on fire! Villagers scatter.",
      allBurned: "Every house burned. The isle is lost to the north.",
      heldIsle: "The tide goes out. You held {0}.",
      lootCoins: "Coin taken: {0}.",
      omenLine: "Omen: {0} — {1}",
      relicsCarry: "Carrying {0} relic(s).",
      voidLook: "Void.",
      heightRel: "Relative height {0}.",
      houseLook: "{0} — hp {1}/{2}{3}.",
      unitLook: "{0}, {1}. Vitality {2}/{3}.",
      corpseLook: "A corpse of {0} lies here.",
      burnedMark: " (burned)",
      deadMark: " fallen",
      hall: "Hall",
      troopsN: "men",
      trait: "trait",
      already: "already {0}",
      paintBrush: "brush: {0} (drag to paint)",
      tool: "Tool",
      sheetSandboxHint: "Paint, then tap the map. New isles use the current seed/biome.",
      tapStart: "Tap a button to start",
      continueAs: "Continue — {0}",
      hireHall: "Hiring hall  ·  {0} coin",
      hireBtn: "{0}  ({1})",
      arrivingIsle: "Approaching · {0}",
      previewMeta: "{0}  ·  {1}  ·  threat {2}",
      previewCounts: "{0} houses · map {1}×{2}",
      previewBeacons: " · {0} beacon(s)",
      previewLand: ". Landings: ",
      previewHomes: "Homes: ",
      omenP: "Omen {0} — {1}",
      relicP: "Hold relic {0} {1} — keep if you hold: {2}",
      hireNCoins: "Hire / coin {0}",
      resultHead: "{0} — {1}",
      resultStats: "houses left {0}/{1}  coin +{2}  now {3}",
      captainsLeft: "Captains still able: ",
      voyageHead: "Voyage · {0}",
      finaleRelics: ". Relics: ",
      slotAuto: "Autosave",
      slotManual: "Slot {0}",
      slotCoins: "coin {0}",
      slotCleared: "held {0}/{1}",
      slotCaps: "captains {0}",
      slotRelics: "relics {0}",
      slotIsland: "island {0}",
      inBattleMark: " (in battle)",
      threatLine: "threat {0}",
      routesLine: "Routes: ",
      cursorAt: "cursor ({0},{1}) {2}",
      facingAt: "facing {0}",
      soldiersOf: "men {0}/{1}",
      landThisName: "Land {0}",
      warhornN: "Horn×{0}",
      zoomIn: "Zoom in",
      zoomOut: "Zoom out",
      burnedShort: "burned",
      docTitle: "GOOD SOUTH — Holdfast of the South",
      needSquad: "Select a company first.",
    },
  };

  GS.I18N.helpHtml = function () {
    if (GS.LANG === "en") {
      return '<div class="panel help-panel"><h2>' + GS.t("helpTitle") + "</h2>" +
        "<h3>Save and pause</h3><ul>" +
        "<li><b>Esc</b> opens the pause menu (chart, battle, sandbox).</li>" +
        "<li><b>Space</b> soft-pauses a fight; on the chart it lands the selected isle.</li>" +
        "<li><b>F5</b> quicksaves to autosave; the pause menu writes manual slots 1–3.</li>" +
        "<li><b>F9</b> loads the latest save, or pick a slot in the load menu.</li>" +
        "<li>A battle save restores the same engagement.</li>" +
        "<li>Switching browser tabs auto-pauses a fight.</li>" +
        "<li><b>I</b> toggles Chinese / English (pause menu has a button too).</li>" +
        "</ul><h3>Fieldcraft</h3><ul>" +
        "<li>Deploy is only a <strong>form-up point</strong>: after the horn, companies <strong>hunt northmen</strong> (houses first). Facing arrows sit on the form-up tile. RMB / R / Turn / Shift+wheel rotate; you can face before placing.</li>" +
        "<li>Default four companies (two shields, one bow, one pike). You can hire <strong>skirmishers ‡</strong>. Bows/javelins kite; shields/pikes charge threats to houses.</li>" +
        "<li><b>U horn</b>: once per battle (twice with Horn-stone), briefly slows all northmen — including longships.</li>" +
        "<li><b>Beacons ¥</b>: nearby archers gain range and bite.</li>" +
        "<li>Struck houses send <strong>militia</strong>. South-lamp adds one more.</li>" +
        "<li>Each isle has an <strong>omen</strong> (this fight) and a <strong>relic</strong> (kept if you hold). Voyages present choices.</li>" +
        "<li>Click a friendly to select; click the same company again to turn. Open ground places/re-forms.</li>" +
        "<li><b>LMB click</b> place/select, <b>LMB drag</b> pans. <b>WASD</b> hold-to-pan; arrows / HJKL move the cursor. Wheel zooms. Map edges nudge the camera.</li>" +
        "<li>Northmen always arrive by longship from deep water, then beach.</li>" +
        "</ul><h3>Phone</h3><ul>" +
        "<li>Tap ground to place; tap a soldier to select, tap the same company to turn. Drag pans, pinch zooms. On the chart tap an isle, then tap or hold to land.</li>" +
        "<li>Turn (dock or hold) shows facing. Dock opens intel / troops sheets. Tap Fight. Bars zoom and change speed.</li>" +
        "<li>Sandbox paint / spawn / new isle live in the Intel sheet so they do not cover the map.</li>" +
        "<li>Narrow screens use smaller isles and lower FX.</li>" +
        "</ul><h3>Desktop</h3><pre class=\"keys\">" +
        "LMB              click = select/place    drag = pan\n" +
        "RMB              click = turn    drag = pan    wheel zoom\n" +
        "Shift+wheel      rotate facing    MMB / Alt+LMB also pans\n" +
        "WASD             hold to pan    Shift faster\n" +
        "Arrows / HJKL    move cursor (keyboard place)\n" +
        ", . or =         zoom    F / Home focus selected company\n" +
        "[  ]             speed    G fight    E evacuate    U horn\n" +
        "I                Chinese / English\n" +
        "Chart            drag/wheel/WASD pan zoom    tap isle, tap again to land\n" +
        "                 RMB lands now    Tab cycle isles    Enter / Space land\n" +
        "                 F focus    0 / End fit all    Q / Esc pause\n" +
        "</pre><h3>Relics and omens</h3><ul>" +
        "<li>Each chart isle hides a relic. Hold it and it stays with the host (South-lamp, Salt-wind, Eyrie-stone, Horn-stone, …).</li>" +
        "<li>Before landing you see the omen: sea fog, storm, dusk, high tide, harvest moon, crows.</li>" +
        "<li>Biomes: verdant, rocky, marsh, frost, ash, and <strong>pine</strong>. Northmen include the <strong>tide shaman Ψ</strong> (ranged hex) and <strong>hounds d</strong> (hunt soldiers, not houses).</li>" +
        "</ul>" +
        '<div class="menu"><button data-act="resume-or-title"><kbd>Q</kbd> ' + GS.t("back") + "</button></div></div>";
    }
    return '<div class="panel help-panel"><h2>' + GS.t("helpTitle") + "</h2>" +
      "<h3>保存与暂停</h3><ul>" +
      "<li><b>Esc</b> 打开/关闭暂停菜单（战役、战斗、沙盒）。</li>" +
      "<li><b>空格</b> 战斗中软暂停；海图上空格登陆当前岛。</li>" +
      "<li><b>F5</b> 快速写入自动档；暂停菜单可写入 1–3 号手动档。</li>" +
      "<li><b>F9</b> 快速读取最近存档；亦可在读档界面选槽。</li>" +
      "<li>战斗中存档会保存岛屿战局，读档后可继续同一场。</li>" +
      "<li>切换浏览器标签会自动暂停战斗。</li>" +
      "<li><b>I</b> 切换中文 / English（暂停菜单也有按钮）。</li>" +
      "</ul><h3>战地技巧</h3><ul>" +
      "<li>布置只是<strong>就位点</strong>：开战后天兵整团去<strong>歼灭北蛮</strong>（优先保屋舍）。朝向用箭头画在就位点上，右键 / R / 转向按钮 / Shift+滚轮旋转；未落子也可以先转向。</li>" +
      "<li>每局默认四支部队（两盾、一弓、一枪）。可再招募<strong>投矛手 ‡</strong>。弓手/投矛会拉开身位；盾兵/枪兵冲向威胁屋舍的北蛮。</li>" +
      "<li><b>U 号角</b>：每场一次（持有号角石可两次），短时减缓全部北蛮（含长船）。</li>" +
      "<li><b>烽火台 ¥</b>：弓手靠近可提升射程与伤害。</li>" +
      "<li>屋舍遇袭时会冲出<strong>乡勇</strong>拖延敌人。持南灯则多一人。</li>" +
      "<li>每座岛有<strong>征兆</strong>（本场）与<strong>圣物</strong>（守住后永久）。航程中会遇到抉择事件。</li>" +
      "<li>点击己方士兵选中该兵团；再点同一兵团会旋转朝向。点空地才布置/换阵。</li>" +
      "<li><b>左键点</b>就位/选中，<b>左键拖</b>平移镜头。<b>WASD</b> 持续平移；方向键 / HJKL 移光标。滚轮缩放。画布边缘会慢速推镜。</li>" +
      "<li>北蛮一律乘长船从深海驶向海滩，靠岸后才下船。</li>" +
      "</ul><h3>手机</h3><ul>" +
      "<li>点空地就位；点士兵选中，再点同一兵团转向。拖动画布平移，双指缩放。海图点岛选中，再点或长按登陆。</li>" +
      "<li>转向（底栏或长按）会弹出朝向。底栏打开情报 / 部队抽屉，点开战。条上可缩放与变速。</li>" +
      "<li>沙盒的刷地 / 刷兵 / 新岛在「情报」抽屉里，避免挡住地图。</li>" +
      "<li>窄屏会自动用较小岛屿、降低特效，避免卡顿。</li>" +
      "</ul><h3>桌面操作</h3><pre class=\"keys\">" +
      "鼠标左键        点＝选中/就位　　拖＝平移镜头\n" +
      "鼠标右键        点＝转向　　拖＝平移　　滚轮缩放\n" +
      "Shift+滚轮      旋转朝向　　中键 / Alt+左键也可拖镜\n" +
      "WASD            平移镜头（按住）　　Shift 加速\n" +
      "方向键 / HJKL   移动光标（键盘落子）\n" +
      ", . 或 =        缩放　　F / Home 对准选中兵团\n" +
      "[  ]            变速　　G 开战　　E 撤退　　U 号角\n" +
      "I               中文 / English\n" +
      "海图            拖/滚轮/WASD 平移缩放　　点岛选中，再点登陆\n" +
      "                右键立刻登陆　　Tab 换岛　　Enter / 空格登陆\n" +
      "                F 对准　　0 / End 看全图　　Q / Esc 暂停\n" +
      "</pre><h3>圣物与征兆</h3><ul>" +
      "<li>海图上每座岛藏一件圣物。守住后加入编制，全军常驻（南灯、盐风旗、鹰巢石、号角石等）。</li>" +
      "<li>登岛前会看到本场征兆：海雾、风暴、昏暮、大潮、收获月、鸦群。</li>" +
      "<li>生态含沃野、岩礁、泽地、霜岛、火山与<strong>松林</strong>。北蛮新增<strong>潮萨满 Ψ</strong>（远程诅咒减速）与<strong>猎犬 d</strong>（追兵不追屋）。</li>" +
      "</ul>" +
      '<div class="menu"><button data-act="resume-or-title"><kbd>Q</kbd> ' + GS.t("back") + "</button></div></div>";
  };

  function patch(obj, en) {
    if (!obj) return;
    var k;
    for (k in en) if (Object.prototype.hasOwnProperty.call(en, k) && obj[k] !== undefined) {
      if (typeof en[k] === "string") obj[k + "En"] = en[k];
    }
  }

  GS.I18N.patchCatalogs = function () {
    if (!GS.TILE || !GS.T) return;
    var T = GS.T, tile = GS.TILE;
    var looks = {};
    looks[T.DEEP] = ["Deep sea", "Cold water. North longships sail here."];
    looks[T.SHALLOW] = ["Shoal", "Shallow water. Ships slow as they beach."];
    looks[T.BEACH] = ["Beach", "Sand and shells. Raiders land here."];
    looks[T.GRASS] = ["Grass", "Salt-wind grass of the South. Firm footing."];
    looks[T.HILL] = ["Hill", "High ground. Archers shoot farther and harder."];
    looks[T.ROCK] = ["Rock", "Bare stone. Impassable."];
    looks[T.CLIFF] = ["Cliff", "A steep break. Blocks march and sight."];
    looks[T.RAMP] = ["Ramp", "A slope up to the heights."];
    looks[T.TREE] = ["Tree", "A southern tree. Cover, slightly slower."];
    looks[T.SHRUB] = ["Shrub", "Low brush."];
    looks[T.PATH] = ["Path", "A track worn by villagers."];
    looks[T.WALL] = ["Wall", "Old stone. Still stops arrows and men."];
    looks[T.FLOOR] = ["Flagstone", "Laid ground."];
    looks[T.MUD] = ["Mud", "Ankle-deep mire. Slow going."];
    looks[T.SNOW] = ["Snow", "A thin crust of snow."];
    looks[T.ASH] = ["Ash", "Volcanic ash underfoot."];
    looks[T.LAVA] = ["Lava", "Hot rock. Do not fall in."];
    looks[T.HOUSE] = ["House", "A southern home. Hold it."];
    looks[T.RUIN] = ["Ruin", "Burned footings. People lived here."];
    looks[T.REEF] = ["Reef", "Shoals that slow ships."];
    looks[T.ICE] = ["Ice shore", "Frozen strand. Unsteady."];
    looks[T.CROPS] = ["Fields", "Grain almost ready."];
    looks[T.BEACON] = ["Beacon", "A hill-fire. Nearby archers gain range and bite."];
    var id;
    for (id in looks) {
      if (tile[id]) {
        tile[id].nameEn = looks[id][0];
        tile[id].lookEn = looks[id][1];
      }
    }
    patch(GS.BIOMES.verdant, { name: "Verdant", flavor: "Green southern fields" });
    patch(GS.BIOMES.rocky, { name: "Rocky", flavor: "Grey cliffs and scree" });
    patch(GS.BIOMES.marsh, { name: "Marsh", flavor: "Mire and reeds" });
    patch(GS.BIOMES.snow, { name: "Frost", flavor: "A snow-capped northern skerry" });
    patch(GS.BIOMES.ash, { name: "Ash", flavor: "A burned volcanic isle" });
    patch(GS.BIOMES.pine, { name: "Pine", flavor: "A pine-dark southern wood" });
    var roles = {
      infantry: ["Shields", "Melee infantry. Hold beaches and choke points."],
      archer: ["Archers", "Ranged. Strong on hills; fragile if closed."],
      pike: ["Pikes", "Front-stab. Brutal into charges, weak on the flanks."],
      skirmisher: ["Skirmishers", "Mid-range javelins. Back off when pressed."],
      raider: ["Raider", ""],
      brute: ["Brute", ""],
      thrower: ["Axe-thrower", ""],
      shield: ["Shield wall", ""],
      berserk: ["Berserk", ""],
      jarl: ["Jarl", ""],
      shaman: ["Tide shaman", ""],
      hound: ["Hound", ""],
      militia: ["Militia", "Villagers with tools. They buy a moment."],
    };
    for (id in roles) {
      if (GS.ROLES[id]) {
        GS.ROLES[id].nameEn = roles[id][0];
        if (roles[id][1]) GS.ROLES[id].descEn = roles[id][1];
      }
    }
    var traits = {
      tough: ["Hardy", "+22% hit points"],
      swift: ["Swift", "+18% speed"],
      eagle: ["Eagle-eye", "+1.4 range (archers)"],
      wall: ["Shield-wall", "−18% damage taken (shields)"],
      wrath: ["Wrath", "More damage when wounded"],
      veteran: ["Veteran", "+10% hit and damage"],
      captain: ["Captain", "+12% HP, +8% damage"],
      skirmish: ["Skirmish", "+0.7 skirmisher range"],
    };
    if (GS.TRAITS) {
      for (var i = 0; i < GS.TRAITS.length; i++) {
        var tr = traits[GS.TRAITS[i].id];
        if (tr) { GS.TRAITS[i].nameEn = tr[0]; GS.TRAITS[i].descEn = tr[1]; }
      }
    }
    if (GS.DIRS) {
      GS.DIRS[0].nameEn = "North";
      GS.DIRS[1].nameEn = "East";
      GS.DIRS[2].nameEn = "South";
      GS.DIRS[3].nameEn = "West";
    }
    var relics = {
      southlamp: ["South-lamp", "One extra militia when a house is struck."],
      saltwind: ["Salt-wind flag", "Friendly speed +8%."],
      eagle: ["Eyrie-stone", "Archer range +0.9."],
      hornstone: ["Horn-stone", "Two warhorns per battle."],
      tidestone: ["Tide-gate", "Longships approach slower."],
      bloodstone: ["Blood-stone", "The host gains wrath."],
      wheat: ["Wheat-seal", "+2 coin after every victory."],
      wallstone: ["Old brick", "Shields take 10% less."],
      frostbrand: ["Frost-fang", "Northmen −8% speed."],
      pineheart: ["Pine-heart", "Skirmisher damage +12%."],
    };
    for (id in relics) {
      if (GS.RELICS && GS.RELICS[id]) {
        GS.RELICS[id].nameEn = relics[id][0];
        GS.RELICS[id].descEn = relics[id][1];
      }
    }
    var omens = {
      calm: ["Fair tide", "No extra omen."],
      fog: ["Sea fog", "Ranged reach shortens."],
      storm: ["Storm", "Longships wallow in the swell."],
      dusk: ["Dusk", "Northmen move faster."],
      hightide: ["High tide", "A sneak wave soon after the horn."],
      harvest: ["Harvest moon", "Militia turn out thicker."],
      crows: ["Crows", "One extra militia, but northmen aim truer."],
    };
    for (id in omens) {
      if (GS.OMENS && GS.OMENS[id]) {
        GS.OMENS[id].nameEn = omens[id][0];
        GS.OMENS[id].descEn = omens[id][1];
      }
    }
    var voyages = {
      wreck: {
        title: "A merchant aground",
        text: "Fog lifts on a wreck on the reef. There are crates — and wounded groans.",
        a: "Loot the hold  +3 coin",
        b: "Tend the wounded  +1 soldier each",
      },
      deserter: {
        title: "A stray skirmisher",
        text: "A southern javelin-man paddles over. Northmen burned his village.",
        a: "Take him in (free skirmish captain)",
        b: "Pay him off  +4 coin",
      },
      shrine: {
        title: "A tidal shrine",
        text: "An unwatched shrine on the rocks. Taking the offering might offend the sea — or not.",
        a: "Take the offering (random relic)",
        b: "Row on in silence",
      },
      wounded: {
        title: "Fever aboard",
        text: "A captain burns with fever. Buy herbs, or let him tough it out.",
        a: "Buy herbs (−3 coin, +2 soldiers each)",
        b: "Endure (one captain −2 soldiers)",
      },
      merchant: {
        title: "A salt trader",
        text: "A southern salt-boat will trade cargo for escort.",
        a: "Pay 5 coin to expand (+2 max and refill)",
        b: "Take a gift  +2 coin",
      },
      omen: {
        title: "Birds that will not rest",
        text: "Sailors say the next isle is black with crows. You can swing wide, or sail in.",
        a: "Swing wide (next open isle becomes Fair tide)",
        b: "Sail in (next isle Crows, +3 coin)",
      },
    };
    if (GS.VOYAGE) {
      for (i = 0; i < GS.VOYAGE.length; i++) {
        var v = voyages[GS.VOYAGE[i].id];
        if (!v) continue;
        GS.VOYAGE[i].titleEn = v.title;
        GS.VOYAGE[i].textEn = v.text;
        if (GS.VOYAGE[i].a) GS.VOYAGE[i].a.labelEn = v.a;
        if (GS.VOYAGE[i].b) GS.VOYAGE[i].b.labelEn = v.b;
      }
    }
    if (GS.CONFIG && GS.CONFIG.hire) {
      GS.CONFIG.hire.infantry.nameEn = "Shields";
      GS.CONFIG.hire.archer.nameEn = "Archers";
      GS.CONFIG.hire.pike.nameEn = "Pikes";
      GS.CONFIG.hire.skirmisher.nameEn = "Skirmishers";
    }
    if (GS.CONFIG && GS.CONFIG.ui) {
      GS.CONFIG.ui.paletteNamesEn = { df: "Classic DF", green: "Phosphor", amber: "Amber" };
    }
    if (GS.CONFIG && GS.CONFIG.battle) {
      GS.CONFIG.battle.deployHintEn = "Tap open ground to place. After the horn they hunt on their own.";
    }
  };

  GS.I18N.applyChrome = function () {
    if (typeof document === "undefined") return;
    var t = GS.t;
    if (document.title != null) document.title = t("docTitle");
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", GS.LANG === "en"
      ? "GOOD SOUTH — DF-style ASCII island tower-defense sandbox in the spirit of Bad North"
      : "GOOD SOUTH — 矮人要塞风格 ASCII 岛屿塔防沙盒，玩法模仿 Bad North");
    var leftH = document.querySelector("#left h3");
    var leftP = document.querySelector("#left p");
    if (leftH) leftH.textContent = t("south");
    if (leftP) leftP.textContent = t("southIntro");
    var rightH = document.querySelector("#right h3");
    var legend = document.querySelector("#right pre.legend");
    if (rightH) rightH.textContent = t("legend");
    if (legend) legend.textContent = t("legendBody");
    var canvas = document.getElementById("view");
    if (canvas) canvas.setAttribute("aria-label", GS.LANG === "en" ? "Game view" : "游戏画面");
    var tools = document.getElementById("sandbox-tools");
    if (tools) {
      var labels = tools.querySelectorAll("label");
      if (labels[0] && labels[0].firstChild) labels[0].firstChild.textContent = t("seed") + " ";
      if (labels[1] && labels[1].firstChild) labels[1].firstChild.textContent = t("biome") + " ";
      if (labels[2] && labels[2].firstChild) labels[2].firstChild.textContent = t("diff") + " ";
      if (labels[3] && labels[3].firstChild) labels[3].firstChild.textContent = t("size") + " ";
      var biome = document.getElementById("biomebox");
      if (biome) {
        var ids = ["verdant", "rocky", "marsh", "snow", "ash", "pine"];
        for (var i = 0; i < biome.options.length && i < ids.length; i++) {
          var b = GS.BIOMES && GS.BIOMES[ids[i]];
          biome.options[i].textContent = b ? GS.loc(b, "name") : ids[i];
        }
      }
      var size = document.getElementById("sizebox");
      if (size && size.options.length >= 3) {
        size.options[0].textContent = t("sizeS");
        size.options[1].textContent = t("sizeM");
        size.options[2].textContent = t("sizeL");
      }
      var gen = document.getElementById("genbtn");
      if (gen) gen.textContent = t("genIsle");
    }
  };

  if (GS.TILE && GS.ROLES) GS.I18N.patchCatalogs();
})(typeof window !== "undefined" ? window : globalThis);
