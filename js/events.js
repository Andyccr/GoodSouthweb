/* Good South — tiny event bus for cross-layer signals */
(function (g) {
  var GS = g.GS || (g.GS = {});

  function EventBus() {
    this._map = Object.create(null);
  }

  EventBus.prototype.on = function (type, fn) {
    if (!this._map[type]) this._map[type] = [];
    this._map[type].push(fn);
    return this;
  };

  EventBus.prototype.off = function (type, fn) {
    var list = this._map[type];
    if (!list) return this;
    if (!fn) {
      delete this._map[type];
      return this;
    }
    this._map[type] = list.filter(function (f) { return f !== fn; });
    return this;
  };

  EventBus.prototype.emit = function (type, payload) {
    var list = this._map[type];
    if (!list || !list.length) return this;
    // copy so listeners can unsubscribe mid-emit
    var copy = list.slice();
    for (var i = 0; i < copy.length; i++) {
      try { copy[i](payload, type); } catch (err) {
        if (typeof console !== "undefined" && console.error) console.error("[GS.bus]", type, err);
      }
    }
    return this;
  };

  EventBus.prototype.once = function (type, fn) {
    var self = this;
    function wrap(payload) {
      self.off(type, wrap);
      fn(payload, type);
    }
    return this.on(type, wrap);
  };

  /** Shared singleton used by systems & UI */
  GS.bus = new EventBus();
  GS.EventBus = EventBus;

  /** Canonical event names (stringly-typed, documented here) */
  GS.EV = {
    MODE_CHANGE: "mode:change",
    TOAST: "ui:toast",
    HUD_DIRTY: "ui:hud-dirty",
    BATTLE_ANNOUNCE: "battle:announce",
    BATTLE_OVER: "battle:over",
    BATTLE_WAVE: "battle:wave",
    BATTLE_HOUSE_BURN: "battle:house-burn",
    ARMY_CHANGED: "army:changed",
    CAMPAIGN_CHANGED: "campaign:changed",
    SAVE_OK: "save:ok",
    SAVE_FAIL: "save:fail",
    ACTION: "action", // generic UI / input action { act, arg }
  };
})(typeof window !== "undefined" ? window : globalThis);
