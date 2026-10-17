/* Good South — army / commander domain model */
(function (g) {
  var GS = g.GS || (g.GS = {});

  function hireTable() {
    return GS.CONFIG.hire;
  }

  var TRAIT_FIT = {
    infantry: ["tough", "wall", "wrath", "veteran", "captain", "swift"],
    archer: ["eagle", "swift", "veteran", "captain", "tough", "wrath"],
    pike: ["veteran", "tough", "captain", "wrath", "swift", "wall"],
    skirmisher: ["skirmish", "swift", "veteran", "captain", "tough", "wrath"],
  };

  function traitsFor(cls) {
    return (TRAIT_FIT[cls] || ["veteran", "tough", "swift", "captain"]).slice();
  }

  function traitFits(cls, id) {
    return traitsFor(cls).indexOf(id) >= 0;
  }

  function pickTrait(rng, cls) {
    var ids = traitsFor(cls);
    var pool = (GS.TRAITS || []).filter(function (t) { return ids.indexOf(t.id) >= 0; });
    if (!pool.length) return null;
    return rng.pick(pool).id;
  }

  function blankStats() {
    return { slain: 0, housesLost: 0, housesSaved: 0, horns: 0, works: 0, retreats: 0, defeats: 0 };
  }

  function ensureStats(army) {
    if (!army.stats) army.stats = blankStats();
    return army.stats;
  }

  function createCommander(rng, cls) {
    var h = hireTable()[cls];
    if (!h) throw new Error("unknown class " + cls);
    var nm = GS.names.dwarfPair ? GS.names.dwarfPair(rng) : { name: GS.names.dwarf(rng) };
    return {
      id: GS.util.uid("c"),
      name: nm.name,
      nameEn: nm.nameEn || nm.name,
      cls: cls,
      level: 1,
      xp: 0,
      soldiers: h.soldiers,
      maxSoldiers: h.soldiers + (h.maxBonus || 2),
      trait: rng.chance(0.55) ? pickTrait(rng, cls) : null,
      doctrine: null,
      dead: false,
    };
  }

  function createArmy(rng, opts) {
    opts = opts || {};
    var cfg = GS.CONFIG.campaign;
    var starter = cfg.starter || ["infantry", "infantry", "archer", "pike"];
    var commanders = opts.commanders;
    if (!commanders) {
      commanders = [];
      for (var i = 0; i < starter.length; i++) commanders.push(createCommander(rng, starter[i]));
    }
    return {
      coins: opts.coins != null ? opts.coins : cfg.startCoins,
      commanders: commanders,
      islandsCleared: opts.islandsCleared || 0,
      relics: opts.relics ? opts.relics.slice() : [],
      stats: opts.stats || blankStats(),
      pendingRanks: opts.pendingRanks ? opts.pendingRanks.slice() : [],
    };
  }

  function livingCommanders(army) {
    return army.commanders.filter(function (c) { return !c.dead && c.soldiers > 0; });
  }

  function canHire(army, cls) {
    var h = hireTable()[cls];
    return !!(h && army.coins >= h.cost);
  }

  function hire(army, rng, cls) {
    var h = hireTable()[cls];
    if (!h) return { ok: false, reason: "unknown" };
    if (army.coins < h.cost) return { ok: false, reason: "coins" };
    army.coins -= h.cost;
    var cmd = createCommander(rng, cls);
    if (!rng.chance(0.62)) cmd.trait = null;
    army.commanders.push(cmd);
    GS.bus.emit(GS.EV.ARMY_CHANGED, { army: army, reason: "hire", commander: cmd });
    return { ok: true, commander: cmd };
  }

  function grantRelic(army, relicId) {
    if (!army || !relicId) return false;
    army.relics = army.relics || [];
    if (army.relics.indexOf(relicId) >= 0) return false;
    army.relics.push(relicId);
    GS.bus.emit(GS.EV.ARMY_CHANGED, { army: army, reason: "relic", relic: relicId });
    return true;
  }

  function applyBattleOutcome(army, outcome) {
    var cfg = GS.CONFIG.campaign;
    if (outcome.kind === "victory") {
      army.coins += outcome.coins || 0;
      if (outcome.wheatCoins) army.coins += outcome.wheatCoins;
      army.islandsCleared++;
      for (var i = 0; i < army.commanders.length; i++) {
        var c = army.commanders[i];
        if (c.dead || c.soldiers <= 0) continue;
        if (cfg.recruitHealOnVictory === "full") c.soldiers = c.maxSoldiers;
        else c.soldiers = Math.min(c.maxSoldiers, c.soldiers + (cfg.recruitHealOnVictory || 0));
      }
    }
    GS.bus.emit(GS.EV.ARMY_CHANGED, { army: army, reason: "battle", outcome: outcome });
    return army;
  }

  function rankOffer(rng, cmd) {
    if (!cmd || cmd.dead || cmd.doctrine) return null;
    var ids = traitsFor(cmd.cls).filter(function (id) { return id !== cmd.trait && id !== cmd.doctrine; });
    var bag = ids.slice();
    rng.shuffle(bag);
    if (bag.length < 2) return null;
    return {
      id: cmd.id,
      name: cmd.name,
      nameEn: cmd.nameEn || cmd.name,
      cls: cmd.cls,
      options: [bag[0], bag[1]],
    };
  }

  function applyDoctrine(army, id, traitId) {
    if (!army || !traitId) return false;
    for (var i = 0; i < army.commanders.length; i++) {
      var c = army.commanders[i];
      if (c.id !== id || c.dead) continue;
      if (!traitFits(c.cls, traitId)) return false;
      c.doctrine = traitId;
      GS.bus.emit(GS.EV.ARMY_CHANGED, { army: army, reason: "doctrine", commander: c });
      return true;
    }
    return false;
  }

  function noteBattle(army, outcome) {
    if (!army || !outcome) return army;
    var s = ensureStats(army);
    s.slain += outcome.slain || 0;
    s.horns += outcome.horns || 0;
    var lost = Math.max(0, (outcome.housesTotal || 0) - (outcome.housesLeft || 0));
    s.housesLost += lost;
    if (outcome.kind === "victory") s.housesSaved += outcome.housesLeft || 0;
    if (outcome.kind === "retreat") s.retreats++;
    if (outcome.kind === "defeat") s.defeats++;
    return army;
  }

  function serialize(army) {
    return GS.util.deepClone(army);
  }

  function deserialize(data) {
    if (!data || !data.commanders) return null;
    return {
      coins: data.coins | 0,
      commanders: data.commanders,
      islandsCleared: data.islandsCleared | 0,
      relics: data.relics ? data.relics.slice() : [],
      stats: data.stats || blankStats(),
      pendingRanks: data.pendingRanks || [],
    };
  }

  GS.Army = {
    create: createArmy,
    createCommander: createCommander,
    living: livingCommanders,
    canHire: canHire,
    hire: hire,
    grantRelic: grantRelic,
    applyBattleOutcome: applyBattleOutcome,
    traitsFor: traitsFor,
    traitFits: traitFits,
    rankOffer: rankOffer,
    applyDoctrine: applyDoctrine,
    noteBattle: noteBattle,
    blankStats: blankStats,
    serialize: serialize,
    deserialize: deserialize,
    hireTable: hireTable,
  };
})(typeof window !== "undefined" ? window : globalThis);
