/* Good South — relics, omens, voyage events (campaign meta) */
(function (g) {
  var GS = g.GS || (g.GS = {});

  GS.RELICS = {
    southlamp: { id: "southlamp", name: "南灯", ch: "¥", desc: "屋舍遇袭时多冲出一名乡勇。" },
    saltwind: { id: "saltwind", name: "盐风旗", ch: "~", desc: "己方移速 +8%。" },
    eagle: { id: "eagle", name: "鹰巢石", ch: "}", desc: "弓手射程 +0.9。" },
    hornstone: { id: "hornstone", name: "号角石", ch: "U", desc: "每场战斗可吹两次号角。" },
    tidestone: { id: "tidestone", name: "潮门", ch: "≈", desc: "北蛮长船驶岸更慢。" },
    bloodstone: { id: "bloodstone", name: "血石", ch: "!", desc: "全军获得血怒（残血加伤）。" },
    wheat: { id: "wheat", name: "麦仓印", ch: "τ", desc: "每场胜利额外 +2 钱币。" },
    wallstone: { id: "wallstone", name: "古墙砖", ch: "█", desc: "盾兵受伤再减 10%。" },
    frostbrand: { id: "frostbrand", name: "霜牙", ch: "=", desc: "北蛮移速 −8%。" },
    pineheart: { id: "pineheart", name: "松心", ch: "♣", desc: "投矛手伤害 +12%。" },
  };

  GS.OMENS = {
    calm: { id: "calm", name: "晴潮", desc: "无额外异象。", kind: "ok" },
    fog: { id: "fog", name: "海雾", desc: "远程射程缩短。", kind: "bad" },
    storm: { id: "storm", name: "风暴", desc: "长船在浪里减速。", kind: "ok" },
    dusk: { id: "dusk", name: "昏暮", desc: "北蛮脚步更快。", kind: "bad" },
    hightide: { id: "hightide", name: "大潮", desc: "开战不久会多一波偷袭。", kind: "bad" },
    harvest: { id: "harvest", name: "收获月", desc: "乡勇更踊跃。", kind: "ok" },
    crows: { id: "crows", name: "鸦群", desc: "乡勇多一人，但北蛮更准。", kind: "warn" },
  };

  GS.VOYAGE = [
    {
      id: "wreck",
      title: "搁浅的商船",
      text: "雾散后看见一艘破商船卡在暗礁上。舱里还有箱子，也有伤员的呻吟。",
      a: { label: "搜刮货舱  +3 钱币", apply: function (ctx) { ctx.army.coins += 3; } },
      b: { label: "救治伤员  全军 +1 兵", apply: function (ctx) { GS.Meta.healArmy(ctx.army, 1); } },
    },
    {
      id: "deserter",
      title: "投奔的散兵",
      text: "一名南境投矛手划着小艇靠过来，说北蛮烧了他的渔村。",
      a: { label: "收编入列（免费投矛队长）", apply: function (ctx) {
        var cmd = GS.Army.createCommander(ctx.rng, "skirmisher");
        cmd.trait = "swift";
        ctx.army.commanders.push(cmd);
      } },
      b: { label: "赠他钱币打发  +4 钱币", apply: function (ctx) { ctx.army.coins += 4; } },
    },
    {
      id: "shrine",
      title: "潮间神龛",
      text: "礁石上有一座无人看管的神龛。拿走供品或许会得罪海，也许只是石头。",
      a: { label: "取走供品（随机圣物）", apply: function (ctx) {
        var ids = GS.Meta.relicIds().filter(function (id) {
          return (ctx.army.relics || []).indexOf(id) < 0;
        });
        if (ids.length) GS.Army.grantRelic(ctx.army, ctx.rng.pick(ids));
        else ctx.army.coins += 2;
      } },
      b: { label: "默默划开", apply: function () {} },
    },
    {
      id: "wounded",
      title: "船上的热病",
      text: "一名队长发起了高烧。用钱买草药，或让他硬扛。",
      a: { label: "买药（−3 钱币，全军回 2 兵）", apply: function (ctx) {
        ctx.army.coins = Math.max(0, ctx.army.coins - 3);
        GS.Meta.healArmy(ctx.army, 2);
      } },
      b: { label: "硬扛（一名队长 −2 兵）", apply: function (ctx) {
        var living = GS.Army.living(ctx.army);
        if (!living.length) return;
        var c = ctx.rng.pick(living);
        c.soldiers = Math.max(1, c.soldiers - 2);
      } },
    },
    {
      id: "merchant",
      title: "盐商路过",
      text: "一条南境盐船愿意用货换保护。",
      a: { label: "付 5 钱扩编（全军 +2 上限并补员）", apply: function (ctx) {
        if (ctx.army.coins < 5) { GS.Meta.healArmy(ctx.army, 1); return; }
        ctx.army.coins -= 5;
        for (var i = 0; i < ctx.army.commanders.length; i++) {
          var c = ctx.army.commanders[i];
          if (c.dead) continue;
          c.maxSoldiers = Math.min(16, c.maxSoldiers + 2);
          c.soldiers = Math.min(c.maxSoldiers, c.soldiers + 2);
        }
      } },
      b: { label: "只要谢礼  +2 钱币", apply: function (ctx) { ctx.army.coins += 2; } },
    },
    {
      id: "driftwood",
      title: "漂来的拒马",
      titleEn: "Driftwood stakes",
      text: "一捆削尖的木桩挂在礁上，还能用。下一座岛的滩头会难走许多。",
      textEn: "A bundle of sharpened stakes hangs on the reef. The next beach could be much harder to cross.",
      a: { label: "拖去下一座岛（免费滩头拒马）", labelEn: "Tow them to the next isle (free stakes)", apply: function (ctx) {
        var n = GS.Campaign.nextScouted(ctx.campaign);
        if (!n) { ctx.army.coins += 2; return; }
        n.works = n.works || {};
        if (n.works.stakes) ctx.army.coins += 2;
        else n.works.stakes = true;
      } },
      b: { label: "劈成柴卖掉  +2 钱币", labelEn: "Sell as firewood  +2 coin", apply: function (ctx) { ctx.army.coins += 2; } },
    },
    {
      id: "oath",
      title: "炉边的誓言",
      titleEn: "An oath by the hearth",
      text: "一名队长要在炉边立誓。誓言会改他下一战的打法。",
      textEn: "A captain wants to swear by the hearth. The oath changes how he fights next.",
      a: { label: "立誓（一名队长获得兵法）", labelEn: "Swear (one captain gains a doctrine)", apply: function (ctx) {
        var living = GS.Army.living(ctx.army);
        if (!living.length) return;
        var c = null;
        for (var i = 0; i < living.length; i++) if (!living[i].doctrine) { c = living[i]; break; }
        if (!c) { GS.Meta.healArmy(ctx.army, 1); return; }
        var offer = GS.Army.rankOffer(ctx.rng, c);
        if (offer) c.doctrine = offer.options[0];
        else GS.Meta.healArmy(ctx.army, 1);
      } },
      b: { label: "只要酒钱  +3 钱币", labelEn: "Take the drink-money  +3 coin", apply: function (ctx) { ctx.army.coins += 3; } },
    },
    {
      id: "omen",
      title: "海鸟不歇",
      text: "水手说下一座岛上鸦群遮天。可以绕开外海，或照旧驶入。",
      a: { label: "绕开（下一座未攻岛改为晴潮）", apply: function (ctx) {
        var n = GS.Campaign.nextScouted(ctx.campaign);
        if (n) n.omen = "calm";
      } },
      b: { label: "照旧驶入（下一座岛改为鸦群，+3 钱币）", apply: function (ctx) {
        var n = GS.Campaign.nextScouted(ctx.campaign);
        if (n) n.omen = "crows";
        ctx.army.coins += 3;
      } },
    },
  ];

  function relicIds() {
    return Object.keys(GS.RELICS);
  }

  function omenIds() {
    return Object.keys(GS.OMENS);
  }

  function relic(id) {
    return GS.RELICS[id] || null;
  }

  function omen(id) {
    return GS.OMENS[id] || GS.OMENS.calm;
  }

  GS.WORKS = [
    { id: "timber", cost: 2, name: "加固屋舍", nameEn: "Shore up houses", desc: "本岛屋舍耐久 +40%。", descEn: "Houses on this isle gain +40% durability." },
    { id: "stakes", cost: 3, name: "滩头拒马", nameEn: "Beach stakes", desc: "北蛮踏上沙滩时移速减半。", descEn: "Northmen on the sand move at half speed." },
    { id: "levy", cost: 2, name: "征乡勇", nameEn: "Call the levy", desc: "每座屋舍多冲出一名乡勇。", descEn: "Each house sends one more militia." },
    { id: "watch", cost: 2, name: "添薪", nameEn: "Feed the beacons", desc: "烽火更烈；弓手即使不靠烽火也略增射程。", descEn: "Beacons burn hotter. Archers gain a little range even away from them." },
  ];

  function workById(id) {
    for (var i = 0; i < GS.WORKS.length; i++) if (GS.WORKS[i].id === id) return GS.WORKS[i];
    return null;
  }

  function lengthCount(id) {
    var map = (GS.CONFIG.campaign && GS.CONFIG.campaign.lengths) || { short: 8, south: 16, far: 24 };
    return map[id] || map.south || 16;
  }

  function threatOf(id) {
    var map = (GS.CONFIG.campaign && GS.CONFIG.campaign.threats) || {};
    return map[id] || map.war || { id: "war", mul: 1, coin: 1, name: "正战" };
  }

  function buyWork(army, node, id) {
    var w = workById(id);
    if (!w || !army || !node) return { ok: false, reason: "unknown" };
    node.works = node.works || {};
    if (node.works[id]) return { ok: false, reason: "owned" };
    if (army.coins < w.cost) return { ok: false, reason: "coins" };
    army.coins -= w.cost;
    node.works[id] = true;
    if (GS.Army && GS.Army.noteBattle) {
      if (!army.stats) army.stats = GS.Army.blankStats();
      army.stats.works = (army.stats.works || 0) + 1;
    }
    if (GS.bus && GS.EV) GS.bus.emit(GS.EV.ARMY_CHANGED, { army: army, reason: "work", work: id });
    return { ok: true, work: w };
  }

  function foldWorks(battle) {
    if (!battle || !battle.works || !battle.mods || battle._worksFolded) return battle;
    battle._worksFolded = true;
    if (battle.works.levy) battle.mods.militiaBonus += 1;
    return battle;
  }

  function stampHouses(battle) {
    if (!battle || !battle.works || !battle.works.timber || battle._timberStamped) return battle;
    battle._timberStamped = true;
    for (var i = 0; i < battle.houses.length; i++) {
      var h = battle.houses[i];
      var hp = Math.round((h.maxHp || h.hp || 100) * 1.4);
      h.maxHp = hp;
      if (h.alive !== false) h.hp = hp;
    }
    return battle;
  }

  function coachLine(battle) {
    if (!battle || !battle.guide || battle.sandbox) return null;
    if (battle.phase === "deploy") {
      for (var i = 0; i < battle.squads.length; i++) {
        if (battle.squads[i].soldiers > 0 && !battle.squads[i].placed) return "coachPlace";
      }
      return "coachFace";
    }
    if (battle.phase === "fight") {
      if (battle.t < 8) return "coachFight";
      var launched = false;
      var waves = battle.waves || [];
      for (var w = 0; w < waves.length; w++) if (waves[w].launched) launched = true;
      if (launched && battle.warhornCharges > 0 && battle.t < 38) return "coachHorn";
    }
    return null;
  }

  function healArmy(army, n) {
    for (var i = 0; i < army.commanders.length; i++) {
      var c = army.commanders[i];
      if (c.dead || c.soldiers <= 0) continue;
      c.soldiers = Math.min(c.maxSoldiers, c.soldiers + n);
    }
  }

  function modsFrom(relics, omenId) {
    var m = {
      soldierSpeed: 1,
      archerRange: 0,
      skirmishDmg: 1,
      infantryResist: 0,
      enemySpeed: 1,
      enemyAcc: 0,
      shipSpeed: 1,
      militiaBonus: 0,
      extraHorn: 0,
      wrathAll: false,
      fogRange: 0,
      extraWave: false,
      wheatCoins: 0,
    };
    relics = relics || [];
    for (var i = 0; i < relics.length; i++) {
      switch (relics[i]) {
        case "southlamp": m.militiaBonus += 1; break;
        case "saltwind": m.soldierSpeed *= 1.08; break;
        case "eagle": m.archerRange += 0.9; break;
        case "hornstone": m.extraHorn += 1; break;
        case "tidestone": m.shipSpeed *= 0.72; break;
        case "bloodstone": m.wrathAll = true; break;
        case "wheat": m.wheatCoins += 2; break;
        case "wallstone": m.infantryResist += 0.1; break;
        case "frostbrand": m.enemySpeed *= 0.92; break;
        case "pineheart": m.skirmishDmg *= 1.12; break;
      }
    }
    switch (omenId) {
      case "fog": m.fogRange = 1.15; break;
      case "storm": m.shipSpeed *= 0.7; break;
      case "dusk": m.enemySpeed *= 1.12; break;
      case "hightide": m.extraWave = true; break;
      case "harvest": m.militiaBonus += 1; break;
      case "crows": m.militiaBonus += 1; m.enemyAcc += 0.06; break;
    }
    return m;
  }

  function prepareBattle(battle) {
    if (!battle) return;
    var army = battle.army || {};
    var omenId = battle.omen || (battle.island && battle.island.omen) || "calm";
    battle.omen = omenId;
    battle.mods = modsFrom(army.relics, omenId);
    if (battle.mods.extraHorn) battle.warhornCharges = 1 + battle.mods.extraHorn;
    else battle.warhornCharges = 1;
    var om = omen(omenId);
    if (om && om.id !== "calm") {
      battle.announce((GS.t ? GS.t("omenLine", GS.loc(om), GS.loc(om, "desc")) : ("征兆：" + om.name + " — " + om.desc)), om.kind === "bad" ? GS.C.LRED : GS.C.YELLOW);
    }
    if (army.relics && army.relics.length) {
      battle.announce(GS.t ? GS.t("relicsCarry", army.relics.length) : ("携带圣物 " + army.relics.length + " 件。"), GS.C.LCYAN);
    }
    if (battle.mods.extraWave && battle.waves && battle.waves.length && !battle.sandbox) {
      var dirs = (battle.island.landingDirs && battle.island.landingDirs.length)
        ? battle.island.landingDirs : [2];
      battle.waves.push({
        id: battle.waves.length,
        t: 9.5,
        dir: dirs[battle.waves.length % dirs.length],
        units: ["raider", "raider", "hound", "raider"],
        launched: false,
        extraDir: null,
        extraUnits: null,
        sneak: true,
      });
    }
  }

  function applyToSoldier(e, mods) {
    if (!e || !mods) return e;
    e.speed *= mods.soldierSpeed || 1;
    if (e.role === "archer") e.range += mods.archerRange || 0;
    if (e.role === "skirmisher") e.dmg *= mods.skirmishDmg || 1;
    if (e.role === "infantry") e.resist = (e.resist || 0) + (mods.infantryResist || 0);
    if (mods.wrathAll) e.wrath = true;
    if (mods.fogRange && e.range > 1.8) e.range = Math.max(1.9, e.range - mods.fogRange);
    return e;
  }

  function applyToEnemy(e, mods) {
    if (!e || !mods) return e;
    e.speed *= mods.enemySpeed || 1;
    e.acc = Math.min(0.95, (e.acc || 0.7) + (mods.enemyAcc || 0));
    if (mods.fogRange && e.range > 1.8) e.range = Math.max(1.9, e.range - mods.fogRange);
    return e;
  }

  function decorateCampaign(camp, rng) {
    if (!camp || !camp.islands) return camp;
    var ids = relicIds().slice();
    rng.shuffle(ids);
    var omens = omenIds().filter(function (id) { return id !== "calm"; });
    for (var i = 0; i < camp.islands.length; i++) {
      camp.islands[i].relic = ids[i % ids.length];
      camp.islands[i].omen = i === 0 ? "calm" : rng.pick(omens);
    }
    return camp;
  }

  function rollVoyage(rng, army, camp) {
    if (!army || !camp) return null;
    if (!rng.chance(0.48)) return null;
    var ev = rng.pick(GS.VOYAGE);
    return {
      id: ev.id,
      title: ev.title,
      titleEn: ev.titleEn,
      text: ev.text,
      textEn: ev.textEn,
      a: { label: ev.a.label, labelEn: ev.a.labelEn },
      b: { label: ev.b.label, labelEn: ev.b.labelEn },
    };
  }

  function applyVoyage(ev, pick, ctx) {
    if (!ev) return;
    var full = null;
    for (var i = 0; i < GS.VOYAGE.length; i++) if (GS.VOYAGE[i].id === ev.id) full = GS.VOYAGE[i];
    if (!full) return;
    var side = pick === "b" ? full.b : full.a;
    if (side && side.apply) side.apply(ctx);
    if (GS.bus && GS.EV) GS.bus.emit(GS.EV.ARMY_CHANGED, { army: ctx.army, reason: "voyage", event: ev.id, pick: pick });
  }

  GS.Meta = {
    relicIds: relicIds,
    omenIds: omenIds,
    relic: relic,
    omen: omen,
    modsFrom: modsFrom,
    prepareBattle: prepareBattle,
    applyToSoldier: applyToSoldier,
    applyToEnemy: applyToEnemy,
    decorateCampaign: decorateCampaign,
    rollVoyage: rollVoyage,
    applyVoyage: applyVoyage,
    healArmy: healArmy,
    workById: workById,
    lengthCount: lengthCount,
    threatOf: threatOf,
    buyWork: buyWork,
    foldWorks: foldWorks,
    stampHouses: stampHouses,
    coachLine: coachLine,
  };
})(typeof window !== "undefined" ? window : globalThis);
