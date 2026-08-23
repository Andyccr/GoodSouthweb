/* Good South — desktop input → game.dispatch(actions) */
(function (g) {
  var GS = g.GS || (g.GS = {});
  var $ = GS.util.$;

  function Input(game) {
    this.game = game;
    this.pointer = { x: 0, y: 0, down: false, button: 0 };
    this.keys = {};
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
      view.addEventListener("pointerup", function () { self.pointer.down = false; });
      view.addEventListener("pointerleave", function () {
        self.pointer.down = false;
        game.hover = { x: -1, y: -1 };
        game.ui.hideTooltip();
      });
      view.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      view.addEventListener("wheel", function (e) {
        if (game.mode !== "battle" && game.mode !== "sandbox") return;
        e.preventDefault();
        game.dispatch("rotate-wheel", e.deltaY > 0 ? 1 : -1);
      }, { passive: false });
    }

    window.addEventListener("resize", function () { game.hudDirty = true; });
    document.body.addEventListener("pointerdown", function () { GS.audio.unlock(); }, { once: true });

    ["left", "right"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("click", function (e) {
        var t = e.target.closest("[data-act]");
        if (!t) return;
        game.dispatch(t.getAttribute("data-act"), t.getAttribute("data-arg"));
      });
    });

    var gen = $("genbtn");
    if (gen) gen.addEventListener("click", function () { game.dispatch("gen"); });
    ["seedbox", "biomebox", "diffbox"].forEach(function (id) {
      var n = $(id);
      if (!n) return;
      n.addEventListener("keydown", function (e) { e.stopPropagation(); });
      n.addEventListener("mousedown", function (e) { e.stopPropagation(); });
    });
  };

  Input.prototype.onKey = function (e) {
    if (GS.util.isTypingTarget()) return;
    this.keys[e.key] = true;
    var game = this.game;
    var k = e.key;

    if (k === "F1" || k === "?") { e.preventDefault(); game.dispatch("help"); return; }

    if (game.mode === "title") {
      if (k === "a" || k === "A" || k === "Enter") game.dispatch("campaign");
      if (k === "b" || k === "B") game.dispatch("sandbox");
      if (k === "c" || k === "C") game.dispatch("help");
      if (k === "d" || k === "D") game.dispatch("continue");
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
      if (k === "Escape" || k === "q" || k === "Q") game.dispatch("title");
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
    if (k === "q" || k === "Escape") game.dispatch("title");
    if (k === "p" || k === "P") game.dispatch("pal");
    if (k === "-" || k === "_") game.dispatch("mute");
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
    if ((k === "m" || k === "M") && game.mode === "battle") game.dispatch("back-camp");
    if (k === "q" || k === "Escape") game.dispatch(game.mode === "sandbox" ? "title" : "back-camp");
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

  Input.prototype.onPointerDown = function (e) {
    var game = this.game;
    var view = $("view");
    if (view) view.focus();
    this.pointer.down = true;
    this.pointer.button = e.button;
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
    if (e.button === 1) { e.preventDefault(); game.dispatch("look-at", tile); return; }
    if (e.button !== 0) return;

    for (var i = 0; i < b.entities.length; i++) {
      var en = b.entities[i];
      if (en.alive && en.kind === "soldier" && (en.x | 0) === tile.x && (en.y | 0) === tile.y) {
        if (en.squadId !== b.selected) {
          game.dispatch("select-squad", en.squadId);
          return;
        }
        break;
      }
    }
    game.dispatch("place");
  };

  Input.prototype.onPointerMove = function (e) {
    var game = this.game;
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    var tile = this._tile(e);
    if (!tile) {
      game.hover = { x: -1, y: -1 };
      game.ui.hideTooltip();
      return;
    }
    game.hover = tile;

    if (game.mode === "campaign") {
      game.hoverCampaign(tile, e.clientX, e.clientY);
      return;
    }
    if (game.mode !== "battle" && game.mode !== "sandbox") return;
    var b = game.battle;
    if (this.pointer.down && this.pointer.button === 0 && game.mode === "sandbox" && game.sandboxTool === "paint") {
      if (b.cursor.x !== tile.x || b.cursor.y !== tile.y) {
        b.cursor.x = tile.x;
        b.cursor.y = tile.y;
        game.dispatch("place");
      }
    } else if (!this.pointer.down) {
      b.cursor.x = tile.x;
      b.cursor.y = tile.y;
    }
    game.updateBattleTooltip(tile, e.clientX, e.clientY);
  };

  GS.Input = Input;
})(typeof window !== "undefined" ? window : globalThis);
