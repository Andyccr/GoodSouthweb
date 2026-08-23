/* Good South — save / load with schema versioning */
(function (g) {
  var GS = g.GS || (g.GS = {});

  function storage() {
    try { return typeof localStorage !== "undefined" ? localStorage : null; } catch (e) { return null; }
  }

  function has() {
    var s = storage();
    if (!s) return false;
    return !!(s.getItem(GS.CONFIG.saveKey) || s.getItem(GS.CONFIG.legacySaveKey));
  }

  function write(army, campaign) {
    var s = storage();
    if (!s || !army || !campaign) return false;
    var payload = {
      v: GS.CONFIG.saveVersion,
      gameVersion: GS.CONFIG.version,
      savedAt: Date.now(),
      army: GS.Army.serialize(army),
      campaign: GS.Campaign.serialize(campaign),
    };
    try {
      s.setItem(GS.CONFIG.saveKey, JSON.stringify(payload));
      GS.bus.emit(GS.EV.SAVE_OK, payload);
      return true;
    } catch (e) {
      GS.bus.emit(GS.EV.SAVE_FAIL, { error: String(e) });
      return false;
    }
  }

  function migrate(raw) {
    if (!raw) return null;
    // v2
    if (raw.v === 2 && raw.army && raw.campaign) {
      return {
        army: GS.Army.deserialize(raw.army),
        campaign: GS.Campaign.deserialize(raw.campaign),
      };
    }
    // legacy unversioned { army, campaign }
    if (raw.army && raw.campaign) {
      return {
        army: GS.Army.deserialize(raw.army),
        campaign: GS.Campaign.deserialize(raw.campaign),
      };
    }
    return null;
  }

  function read() {
    var s = storage();
    if (!s) return null;
    var text = s.getItem(GS.CONFIG.saveKey) || s.getItem(GS.CONFIG.legacySaveKey);
    if (!text) return null;
    try {
      return migrate(JSON.parse(text));
    } catch (e) {
      return null;
    }
  }

  function clear() {
    var s = storage();
    if (!s) return;
    s.removeItem(GS.CONFIG.saveKey);
    s.removeItem(GS.CONFIG.legacySaveKey);
  }

  GS.Save = { has: has, write: write, read: read, clear: clear, migrate: migrate };
})(typeof window !== "undefined" ? window : globalThis);
