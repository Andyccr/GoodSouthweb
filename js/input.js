/* Good South — desktop + touch input → game.dispatch(actions) */
(function (g) {
  var GS = g.GS || (g.GS = {});
  var $ = GS.util.$;

  function Input(game) {
    this.game = game;
    this.pointer = { x: 0, y: 0, down: false, button: 0, pan: false, lastX: 0, lastY: 0 };
    this.keys = {};
    this._pts = {};
    this._gesture = null;
    this._longTimer = 0;
  }

  Input.prototype.bind = function () {
    var self = this;
    var game = this.game;
    var view = $("view");
    if (view) view.tabIndex = 0;

    window.addEventListener("keydown", function (e) { self.onKey(e); });
    window.addEventListener("keyup", function (e) { self.keys[e.key] = false; });

    if (view) {
      view.addEventListener("pointerdown", function (e) { self.onPointerDown(e); });
      view.addEventListener("pointermove", function (e) { self.onPointerMove(e); });
      view.addEventListener("pointerup", function (e) { self.onPointerUp(e); });
      view.addEventListener("pointercancel", function (e) { self.onPointerUp(e); });
      view.addEventListener("pointerleave", function (e) {
        if (e.pointerType === "touch") return;
        self.pointer.down = false;
        self.pointer.pan = false;
        game.hover = { x: -1, y: -1 };
        game.ui.hideTooltip();
      });
      view.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      view.addEventListener("wheel", function (e) {
        if (game.mode !== "battle" && game.mode !== "sandbox") return;
        e.preventDefault();
        if (e.shiftKey) game.dispatch("rotate-wheel", e.deltaY > 0 ? 1 : -1);
        else game.dispatch("zoom", e.deltaY > 0 ? -1 : 1);
      }, { passive: false });
      view.addEventListener("touchstart", function (e) { e.preventDefault(); }, { passive: false });
      view.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: false });
    }

    window.addEventListener("pointerup", function (e) {
      if (self._pts[e.pointerId]) self.onPointerUp(e);
    });
    window.addEventListener("resize", function () {
      game.applyDevice();
      game.hudDirty = true;
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", function () {
        game.applyDevice();
        game.hudDirty = true;
      });
    }
    document.body.addEventListener("pointerdown", function () { GS.audio.unlock(); }, { once: true });

    ["left", "right", "dock"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("click", function (e) {
        var t = e.target.closest("[data-act]");
        if (!t) return;
        game.dispatch(t.getAttribute("data-act"), t.getAttribute("data-arg"));
      });
    });
    var scrim = $("sheet-scrim");
    if (scrim) {
      scrim.addEventListener("click", function () { game.dispatch("toggle-sheet", "close"); });
    }

    var gen = $("genbtn");
    if (gen) gen.addEventListener("click", function () { game.dispatch("gen"); });
    ["seedbox", "biomebox", "diffbox", "sizebox"].forEach(function (id) {
      var n = $(id);
      if (!n) return;
      n.addEventListener("keydown", function (e) { e.stopPropagation(); });
      n.addEventListener("mousedown", function (e) { e.stopPropagation(); });
      n.addEventListener("change", function () { n.setAttribute("data-touched", "1"); });
    });
  };

  Input.prototype._ids = function () {
    return Object.keys(this._pts);
  };

  Input.prototype._clearLong = function () {
    if (this._longTimer) {
      clearTimeout(this._longTimer);
      this._longTimer = 0;
    }
  };

  Input.prototype.onKey = function (e) {
    if (GS.util.isTypingTarget()) return;
    this.keys[e.key] = true;
    var game = this.game;
    var k = e.key;

    if (k === "F5") { e.preventDefault(); game.dispatch("quicksave"); return; }
    if (k === "F9") { e.preventDefault(); game.dispatch("quickload"); return; }
    if (k === "F1" || k === "?") { e.preventDefault(); game.dispatch("help"); return; }

    if (game.menuOpen) {
      if (k === "Escape") {
        e.preventDefault();
        if (game.mode === "title") {
          game.closeMenu(true);
          game.setMode("title");
        } else if (game.menuKind === "save" || game.menuKind === "load" || game.menuKind === "help") {
          game.openPauseMenu();
        } else {
          game.dispatch("resume");
        }
      }
      return;
    }

    if (game.mode === "title") {
      if (k === "a" || k === "A" || k === "Enter") game.dispatch("campaign");
      if (k === "b" || k === "B") game.dispatch("sandbox");
      if (k === "c" || k === "C") game.dispatch("help");
      if (k === "d" || k === "D") game.dispatch("continue");
      if (k === "l" || k === "L") game.dispatch("load-menu");
      return;
    }

    if (game.mode === "campaign") {
      this._campKey(e);
      return;
    }

    if (game.mode === "preview") {
      if (k === "g" || k === "G") game.dispatch("fight");
      if (k === "q" || k === "Q" || k === "Escape") game.dispatch("back-camp");
      if (k === "n" || k === "N") game.dispatch("hire");
      return;
    }
    if (game.mode === "hire") {
      if (k === "q" || k === "Q" || k === "Escape") game.dispatch("back-camp");
      return;
    }
    if (game.mode === "help") {
      if (k === "Escape" || k === "q" || k === "Q") game.dispatch("resume-or-title");
      return;
    }
    if (game.mode === "result") {
      if (k === "Enter" || k === " " || k === "Escape" || k === "q" || k === "Q") game.dispatch("next");
      return;
    }
    if (game.mode === "battle" || game.mode === "sandbox") this._battleKey(e);
  };

  Input.prototype._campKey = function (e) {
    var game = this.game;
    var k = e.key;
    var ids = GS.Campaign.visibleIslands(game.campaign).map(function (i) { return i.id; });
    var idx = ids.indexOf(game.campCursor);
    if (idx < 0) idx = 0;
    if (["ArrowRight", "l", "L", "d", "D"].indexOf(k) >= 0) idx = Math.min(ids.length - 1, idx + 1);
    if (["ArrowLeft", "h", "H", "a", "A"].indexOf(k) >= 0) idx = Math.max(0, idx - 1);
    if (["ArrowDown", "j", "J", "s", "S"].indexOf(k) >= 0) idx = Math.min(ids.length - 1, idx + 1);
    if (["ArrowUp", "k", "K", "w", "W"].indexOf(k) >= 0) idx = Math.max(0, idx - 1);
    if (ids[idx] !== game.campCursor) {
      game.campCursor = ids[idx];
      game.hudDirty = true;
      e.preventDefault();
    }
    if (k === "Enter" || k === "g" || k === "G") game.dispatch("open-island", String(game.campCursor));
    if (k === "n" || k === "N") game.dispatch("hire");
    if (k === "q") game.dispatch("title");
    if (k === "Escape") { e.preventDefault(); game.dispatch("pause-menu"); }
    if (k === "p" || k === "P") game.dispatch("pal");
    if (k === "-" || k === "_") game.dispatch("mute");
    if (k === "F5") game.dispatch("quicksave");
  };

  Input.prototype._battleKey = function (e) {
    var game = this.game;
    var b = game.battle;
    if (!b) return;
    var k = e.key;
    var prevent = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Tab", "w", "a", "s", "d", "W", "A", "S", "D"].indexOf(k) >= 0;
    if (prevent) e.preventDefault();

    var dx = 0, dy = 0;
    if (k === "ArrowLeft" || k === "h" || k === "H" || k === "a" || k === "A") dx = -1;
    if (k === "ArrowRight" || k === "l" || k === "L" || k === "d" || k === "D") dx = 1;
    if (k === "ArrowUp" || k === "k" || k === "w" || k === "W") dy = -1;
    if (k === "ArrowDown" || k === "j" || k === "J" || k === "s" || k === "S") dy = 1;

    if (k === "K" || k === "'" || k === ";") { game.dispatch("look"); return; }
    if (dx || dy) {
      b.cursor.x = Math.max(0, Math.min(b.w - 1, b.cursor.x + dx));
      b.cursor.y = Math.max(0, Math.min(b.h - 1, b.cursor.y + dy));
      game.hover = { x: b.cursor.x, y: b.cursor.y };
      if (b.look) game.lookText = b.lookAt(b.cursor.x, b.cursor.y);
      if (game.renderer && game.renderer._followLock) game.renderer._followLock = 0;
      game.hudDirty = true;
      return;
    }

    if (/^[1-9]$/.test(k)) {
      game.dispatch("select-squad-index", String((+k) - 1));
      return;
    }
    if (k === "Tab") { e.preventDefault(); game.dispatch("next-squad"); return; }
    if (k === "r" || k === "R") game.dispatch("rotate");
    if (k === "Enter") game.dispatch("place");
    if (k === "g" || k === "G") {
      if (game.mode === "sandbox" && e.shiftKey) game.dispatch("gen");
      else game.dispatch("start");
    }
    if (k === " ") game.dispatch("pause");
    if (k === "]") game.dispatch("spd-up");
    if (k === "[") game.dispatch("spd-down");
    if (k === "e" || k === "E") game.dispatch("evac");
    if (k === "u" || k === "U") { game.dispatch("warhorn"); return; }
    if ((k === "m" || k === "M") && game.mode === "battle") game.dispatch("back-camp");
    if (k === "Escape") { e.preventDefault(); game.dispatch("pause-menu"); return; }
    if (k === "q" || k === "Q") {
      game.dispatch("pause-menu");
      return;
    }
    if (k === "p" || k === "P") game.dispatch("pal");
    if (k === "-" || k === "_") game.dispatch("mute");

    if (game.mode === "sandbox") {
      if (k === "t" || k === "T") game.dispatch("brush-next");
      if (k === "n" || k === "N") game.dispatch("spawn-enemy");
      if (k === "b" || k === "B") game.dispatch("spawn-ship");
      if (k === "c" || k === "C") game.dispatch("spawn-ally");
      if (k === "v" || k === "V") game.dispatch("spawn-jarl");
      if (k === "x" || k === "X") game.dispatch("spawn-thrower");
      if (k === "z" || k === "Z") game.dispatch("tool-place");
    }
  };

  Input.prototype._tile = function (e) {
    var game = this.game;
    if (game.mode === "campaign" && game.campaign) {
      return game.renderer.tileAtPointer(e.clientX, e.clientY, game.campaign.w, game.campaign.h);
    }
    if (game.battle) {
      return game.renderer.tileAtPointer(e.clientX, e.clientY, game.battle.w, game.battle.h);
    }
    return null;
  };

  Input.prototype._applyTap = function (e) {
    var game = this.game;
    var tile = this._tile(e);
    if (!tile) return;

    if (game.mode === "campaign") {
      game.pointerCampaign(tile);
      return;
    }
    if (game.mode !== "battle" && game.mode !== "sandbox") return;
    var b = game.battle;
    b.cursor.x = tile.x;
    b.cursor.y = tile.y;
    game.hover = { x: tile.x, y: tile.y };

    var sid = b.squadAt(tile.x, tile.y);
    if (sid) {
      if (sid !== b.selected) game.dispatch("select-squad", sid);
      return;
    }
    game.dispatch("place");
  };

  Input.prototype._mid = function () {
    var ids = this._ids();
    if (ids.length < 2) return null;
    var a = this._pts[ids[0]], b = this._pts[ids[1]];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  Input.prototype._span = function () {
    var ids = this._ids();
    if (ids.length < 2) return 0;
    var a = this._pts[ids[0]], b = this._pts[ids[1]];
    return GS.util.touch.dist(a.x, a.y, b.x, b.y);
  };

  Input.prototype.onPointerDown = function (e) {
    var game = this.game;
    var view = $("view");
    if (view) {
      view.focus();
      if (view.setPointerCapture) {
        try { view.setPointerCapture(e.pointerId); } catch (err) {}
      }
    }
    this.pointer.down = true;
    this.pointer.button = e.button;
    this.pointer.lastX = e.clientX;
    this.pointer.lastY = e.clientY;
    this._pts[e.pointerId] = { x: e.clientX, y: e.clientY, type: e.pointerType, button: e.button };

    var touch = e.pointerType === "touch";
    var n = this._ids().length;

    if (touch && n >= 2) {
      e.preventDefault();
      this._clearLong();
      this._gesture = {
        pinch: true,
        pan: false,
        tap: false,
        startDist: this._span(),
        startZoom: game.renderer.zoom,
        lastMid: this._mid(),
      };
      game.ui.hideTooltip();
      return;
    }

    if ((game.mode === "battle" || game.mode === "sandbox") && (e.button === 1 || (e.button === 0 && e.altKey))) {
      e.preventDefault();
      this.pointer.pan = true;
      this._gesture = { pinch: false, pan: true, tap: false };
      return;
    }

    if (touch) {
      e.preventDefault();
      this._gesture = { pinch: false, pan: false, tap: true, long: false, sx: e.clientX, sy: e.clientY };
      var self = this;
      this._clearLong();
      this._longTimer = setTimeout(function () {
        self._longTimer = 0;
        if (!self._gesture || self._gesture.pan || self._gesture.pinch) return;
        self._gesture.long = true;
        self._gesture.tap = false;
        if (game.mode === "battle" || game.mode === "sandbox") game.dispatch("rotate");
        else if (game.mode === "campaign") game.dispatch("open-island", String(game.campCursor));
      }, 420);
      var preview = this._tile(e);
      if (preview && (game.mode === "battle" || game.mode === "sandbox")) {
        game.hover = preview;
      }
      return;
    }

    var tile = this._tile(e);
    if (!tile) return;

    if (game.mode === "campaign") {
      game.pointerCampaign(tile);
      return;
    }
    if (game.mode !== "battle" && game.mode !== "sandbox") return;
    var b = game.battle;
    b.cursor.x = tile.x;
    b.cursor.y = tile.y;
    game.hover = { x: tile.x, y: tile.y };

    if (e.button === 2) { game.dispatch("rotate"); return; }
    if (e.button !== 0) return;
    this._applyTap(e);
  };

  Input.prototype.onPointerMove = function (e) {
    var game = this.game;
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    if (this._pts[e.pointerId]) {
      this._pts[e.pointerId].x = e.clientX;
      this._pts[e.pointerId].y = e.clientY;
    }

    if (this._gesture && this._gesture.pinch && this._ids().length >= 2 &&
        (game.mode === "battle" || game.mode === "sandbox") && game.battle) {
      e.preventDefault();
      var dist = this._span();
      var z = GS.util.touch.pinchZoom(this._gesture.startDist, dist, this._gesture.startZoom);
      var mid = this._mid();
      var tile = game.renderer.tileAtPointer(mid.x, mid.y, game.battle.w, game.battle.h);
      game.renderer.setZoom(z, game.battle.w, game.battle.h, tile ? tile.x : null, tile ? tile.y : null);
      if (this._gesture.lastMid) {
        var r = game.renderer;
        r.pan(
          (this._gesture.lastMid.x - mid.x) / (r.tw || 16),
          (this._gesture.lastMid.y - mid.y) / (r.th || 16),
          game.battle.w, game.battle.h
        );
      }
      this._gesture.lastMid = mid;
      this.pointer.lastX = e.clientX;
      this.pointer.lastY = e.clientY;
      return;
    }

    if (this._gesture && this._gesture.tap && !this._gesture.pinch &&
        (game.mode === "battle" || game.mode === "sandbox")) {
      var dx0 = e.clientX - this._gesture.sx;
      var dy0 = e.clientY - this._gesture.sy;
      if (GS.util.touch.shouldPan(dx0, dy0, 12)) {
        this._gesture.pan = true;
        this._gesture.tap = false;
        this._clearLong();
        this.pointer.pan = true;
        game.ui.hideTooltip();
      }
    }

    if (this.pointer.pan && game.battle && (game.mode === "battle" || game.mode === "sandbox")) {
      var r2 = game.renderer;
      var dx = (this.pointer.lastX - e.clientX) / (r2.tw || 16);
      var dy = (this.pointer.lastY - e.clientY) / (r2.th || 16);
      r2.pan(dx, dy, game.battle.w, game.battle.h);
      this.pointer.lastX = e.clientX;
      this.pointer.lastY = e.clientY;
      return;
    }
    var tile = this._tile(e);
    if (!tile) {
      if (e.pointerType !== "touch") {
        game.hover = { x: -1, y: -1 };
        game.ui.hideTooltip();
      }
      return;
    }
    game.hover = tile;

    if (game.mode === "campaign") {
      game.hoverCampaign(tile, e.clientX, e.clientY);
      return;
    }
    if (game.mode !== "battle" && game.mode !== "sandbox") return;
    var b = game.battle;
    if (this.pointer.down && this.pointer.button === 0 && game.mode === "sandbox" && game.sandboxTool === "paint" && e.pointerType !== "touch") {
      if (b.cursor.x !== tile.x || b.cursor.y !== tile.y) {
        b.cursor.x = tile.x;
        b.cursor.y = tile.y;
        game.dispatch("place");
      }
    } else if (!this.pointer.down) {
      b.cursor.x = tile.x;
      b.cursor.y = tile.y;
    }
    if (e.pointerType !== "touch") game.updateBattleTooltip(tile, e.clientX, e.clientY);
  };

  Input.prototype.onPointerUp = function (e) {
    var game = this.game;
    var was = this._pts[e.pointerId];
    delete this._pts[e.pointerId];
    this._clearLong();

    var n = this._ids().length;
    if (this._gesture && this._gesture.pinch) {
      if (n < 2) this._gesture.pinch = false;
      if (n === 0) {
        this._gesture = null;
        this.pointer.down = false;
        this.pointer.pan = false;
      }
      return;
    }

    var tap = this._gesture && this._gesture.tap && !this._gesture.pan && !this._gesture.long && was && was.type === "touch";
    this.pointer.down = n > 0;
    this.pointer.pan = false;
    if (tap) this._applyTap(e);
    if (n === 0) this._gesture = null;
  };

  GS.Input = Input;
})(typeof window !== "undefined" ? window : globalThis);
