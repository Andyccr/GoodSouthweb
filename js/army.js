/* Good South — army / commander domain model */
(function (g) {
  var GS = g.GS || (g.GS = {});

  function hireTable() {
    return GS.CONFIG.hire;
  }

  function createCommander(rng, cls) {
    var h = hireTable()[cls];
    if (!h) throw new Error("unknown class " + cls);
    return {
      id: GS.util.uid("c"),
      name: GS.names.dwarf(rng),
      cls: cls,
      level: 1,
      xp: 0,
      soldiers: h.soldiers,
      maxSoldiers: h.soldiers + (h.maxBonus || 2),
      trait: rng.chance(0.45) ? rng.pick(GS.TRAITS).id : null,
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
    // hire trait slightly less often than starter
    if (rng.chance(0.4)) cmd.trait = rng.pick(GS.TRAITS).id;
    else cmd.trait = null;
    army.commanders.push(cmd);
    GS.bus.emit(GS.EV.ARMY_CHANGED, { army: army, reason: "hire", commander: cmd });
    return { ok: true, commander: cmd };
  }

  function applyBattleOutcome(army, outcome) {
    var cfg = GS.CONFIG.campaign;
    if (outcome.kind === "victory") {
      army.coins += outcome.coins || 0;
      army.islandsCleared++;
      for (var i = 0; i < army.commanders.length; i++) {
        var c = army.commanders[i];
        if (!c.dead) c.soldiers = Math.min(c.maxSoldiers, c.soldiers + cfg.recruitHealOnVictory);
      }
    }
    GS.bus.emit(GS.EV.ARMY_CHANGED, { army: army, reason: "battle", outcome: outcome });
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
    };
  }

  GS.Army = {
    create: createArmy,
    createCommander: createCommander,
    living: livingCommanders,
    canHire: canHire,
    hire: hire,
    applyBattleOutcome: applyBattleOutcome,
    serialize: serialize,
    deserialize: deserialize,
    hireTable: hireTable,
  };
})(typeof window !== "undefined" ? window : globalThis);
