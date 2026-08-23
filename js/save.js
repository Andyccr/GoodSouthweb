/* Good South — save slots, settings, campaign + battle snapshots */
(function (g) {
  var GS = g.GS || (g.GS = {});

  var SLOTS = ["auto", "1", "2", "3"];

  function storage() {
    try { return typeof localStorage !== "undefined" ? localStorage : null; } catch (e) { return null; }
  }

  function slotKey(slot) {
    return GS.CONFIG.saveKey + ":slot:" + slot;
  }

  function settingsKey() {
    return GS.CONFIG.settingsKey;
  }

  function formatTime(ts) {
    if (!ts) return "—";
    try {
      var d = new Date(ts);
      var p = function (n) { return (n < 10 ? "0" : "") + n; };
      return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
        " " + p(d.getHours()) + ":" + p(d.getMinutes());
    } catch (e) {
      return String(ts);
    }
  }

  function summarize(payload) {
    if (!payload || !payload.army || !payload.campaign) return null;
    var cleared = 0, lost = 0, scouted = 0;
    var islands = payload.campaign.islands || [];
    for (var i = 0; i < islands.length; i++) {
      if (islands[i].status === "cleared") cleared++;
      else if (islands[i].status === "lost") lost++;
      else if (islands[i].status === "scouted") scouted++;
    }
    var living = (payload.army.commanders || []).filter(function (c) {
      return !c.dead && c.soldiers > 0;
    }).length;
    var cur = islands[payload.campaign.current];
    return {
      savedAt: payload.savedAt,
      time: formatTime(payload.savedAt),
      coins: payload.army.coins | 0,
      cleared: cleared,
      lost: lost,
      scouted: scouted,
      living: living,
      islandCount: islands.length,
      currentName: cur ? cur.name : "—",
      inBattle: !!(payload.battle && payload.battle.snapshot),
      label: payload.label || "",
      seed: payload.campaign.seed,
    };
  }

  function migrate(raw) {
    if (!raw) return null;
    if ((raw.v === 2 || raw.v === 3) && raw.army && raw.campaign) {
      return {
        v: raw.v,
        gameVersion: raw.gameVersion,
        savedAt: raw.savedAt,
        label: raw.label,
        army: GS.Army.deserialize(raw.army),
        campaign: GS.Campaign.deserialize(raw.campaign),
        battle: raw.battle || null,
      };
    }
    if (raw.army && raw.campaign) {
      return {
        v: 2,
        savedAt: raw.savedAt || Date.now(),
        army: GS.Army.deserialize(raw.army),
        campaign: GS.Campaign.deserialize(raw.campaign),
        battle: null,
      };
    }
    return null;
  }

  function writeRaw(key, payload) {
    var s = storage();
    if (!s) return false;
    try {
      s.setItem(key, JSON.stringify(payload));
      return true;
    } catch (e) {
      GS.bus.emit(GS.EV.SAVE_FAIL, { error: String(e), key: key });
      return false;
    }
  }

  function readRaw(key) {
    var s = storage();
    if (!s) return null;
    var text = s.getItem(key);
    if (!text) return null;
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  function buildPayload(army, campaign, opts) {
    opts = opts || {};
    return {
      v: GS.CONFIG.saveVersion,
      gameVersion: GS.CONFIG.version,
      savedAt: Date.now(),
      label: opts.label || "",
      army: GS.Army.serialize(army),
      campaign: GS.Campaign.serialize(campaign),
      battle: opts.battle || null,
    };
  }

  /** Write campaign (+ optional battle snapshot) to a slot */
  function writeSlot(slot, army, campaign, opts) {
    if (SLOTS.indexOf(String(slot)) < 0) slot = "auto";
    var payload = buildPayload(army, campaign, opts);
    var ok = writeRaw(slotKey(slot), payload);
    if (ok) {
      // keep legacy single-key mirror for auto
      if (slot === "auto") writeRaw(GS.CONFIG.saveKey, payload);
      GS.bus.emit(GS.EV.SAVE_OK, { slot: slot, payload: payload, summary: summarize(payload) });
    }
    return ok;
  }

  function readSlot(slot) {
    if (SLOTS.indexOf(String(slot)) < 0) slot = "auto";
    var raw = readRaw(slotKey(slot));
    if (!raw && slot === "auto") {
      raw = readRaw(GS.CONFIG.saveKey) || readRaw(GS.CONFIG.legacySaveKey);
    }
    return migrate(raw);
  }

  function clearSlot(slot) {
    var s = storage();
    if (!s) return;
    s.removeItem(slotKey(slot));
    if (slot === "auto") {
      s.removeItem(GS.CONFIG.saveKey);
      s.removeItem(GS.CONFIG.legacySaveKey);
    }
  }

  function listSlots() {
    return SLOTS.map(function (slot) {
      var data = readSlot(slot);
      return {
        slot: slot,
        empty: !data,
        name: slot === "auto" ? "自动存档" : ("存档位 " + slot),
        summary: data ? summarize(data) : null,
        data: data,
      };
    });
  }

  function hasAny() {
    return listSlots().some(function (s) { return !s.empty; });
  }

  function latest() {
    var best = null;
    listSlots().forEach(function (s) {
      if (s.empty) return;
      if (!best || (s.summary.savedAt || 0) > (best.summary.savedAt || 0)) best = s;
    });
    return best;
  }

  /* ---- settings (palette / mute) ---- */

  function loadSettings() {
    var raw = readRaw(settingsKey()) || {};
    return {
      palette: raw.palette || "df",
      muted: !!raw.muted,
    };
  }

  function saveSettings(settings) {
    return writeRaw(settingsKey(), {
      palette: settings.palette || "df",
      muted: !!settings.muted,
      savedAt: Date.now(),
    });
  }

  /* ---- battle snapshot helpers (delegate to Battle if present) ---- */

  function captureBattle(game) {
    if (!game || !game.battle || !GS.Battle || !GS.Battle.serialize) return null;
    return {
      mode: game.mode,
      snapshot: GS.Battle.serialize(game.battle),
      sandboxTool: game.sandboxTool,
      sandboxBrush: game.sandboxBrush,
      seedInput: game.seedInput,
    };
  }

  // Compatibility shims used by older call sites
  function has() { return hasAny(); }
  function write(army, campaign) { return writeSlot("auto", army, campaign, { label: "自动" }); }
  function read() { return readSlot("auto"); }
  function clear() { clearSlot("auto"); }

  GS.Save = {
    SLOTS: SLOTS,
    formatTime: formatTime,
    summarize: summarize,
    writeSlot: writeSlot,
    readSlot: readSlot,
    clearSlot: clearSlot,
    listSlots: listSlots,
    hasAny: hasAny,
    latest: latest,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    captureBattle: captureBattle,
    // shims
    has: has,
    write: write,
    read: read,
    clear: clear,
    migrate: migrate,
  };
})(typeof window !== "undefined" ? window : globalThis);
