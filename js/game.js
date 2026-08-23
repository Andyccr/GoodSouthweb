/* Good South — Game facade & mode state machine */
(function (g) {
  var GS = g.GS || (g.GS = {});
  var $ = GS.util.$;

  function Game() {
    this.mode = "boot";
    this.rng = GS.rng(Date.now() >>> 0);
    this.army = null;
    this.campaign = null;
    this.island = null;
    this.battle = null;
    this.campCursor = 0;

    this.renderer = new GS.Renderer($("view"));
    this.ui = new GS.UI();
    this.screens = new GS.Screens(this);
    this.hud = new GS.Hud(this);
    this.input = new GS.Input(this);

    this.hover = { x: -1, y: -1 };
    this.lookText = "";
    this.palette = "df";
    this.sandboxTool = "place";
    this.sandboxBrush = GS.configBrushes()[0];
    this.seedInput = "south";
    this.hudDirty = true;
    this.last = 0;
    this._logWatch = 0;

    this._wireUi();
    this._wireBus();
    this.input.bind();
    this.setMode("title");

    var self = this;
    requestAnimationFrame(function loop(t) {
      self.frame(t);
      requestAnimationFrame(loop);
    });
  }

  /* ---------- mode ---------- */

  Game.prototype.setMode = function (mode, data) {
    var prev = this.mode;
    this.mode = mode;
    GS.bus.emit(GS.EV.MODE_CHANGE, { from: prev, to: mode, data: data });
    this.hudDirty = true;

    if (mode === "title") {
      this.battle = null;
      this.ui.hideTooltip();
      if ($("sandbox-tools")) $("sandbox-tools").classList.remove("visible");
      if ($("phase-banner")) $("phase-banner").classList.add("hidden");
      this.screens.title();
      return;
    }
    if (mode === "help") { this.screens.help(); return; }
    if (mode === "hire") { this.screens.hire(this.army); return; }
    if (mode === "preview") { this.screens.preview(this.island, this.army); return; }
    if (mode === "result") { this.screens.result(this.island, this.army, data || this.battle.outcome); return; }
    if (mode === "campaign") {
      this.battle = null;
      this.screens.hide();
      this.ui.hideTooltip();
      if ($("sandbox-tools")) $("sandbox-tools").classList.remove("visible");
      if ($("phase-banner")) $("phase-banner").classList.add("hidden");
      if ($("view")) $("view").focus();
      return;
    }
    if (mode === "battle" || mode === "sandbox") {
      this.screens.hide();
      if ($("view")) $("view").focus();
    }
  };

  /* ---------- wiring ---------- */

  Game.prototype._wireUi = function () {
    var self = this;
    var acts = [
      "campaign", "continue", "sandbox", "help", "title", "fight", "hire", "buy",
      "back-camp", "next", "retry", "start", "pause", "spd", "rotate", "look",
      "evac", "pal", "mute", "select-squad", "open-island", "tool-place", "tool-paint",
      "brush-next", "spawn-enemy", "spawn-ship", "spawn-ally", "gen", "place",
    ];
    acts.forEach(function (a) {
      self.ui.on(a, function (arg) { self.dispatch(a, arg); });
    });
  };

  Game.prototype._wireBus = function () {
    var self = this;
    GS.bus.on(GS.EV.TOAST, function (p) {
      self.ui.toast(p.msg, p.kind || "info");
    });
    GS.bus.on(GS.EV.HUD_DIRTY, function () { self.hudDirty = true; });
    GS.bus.on(GS.EV.BATTLE_ANNOUNCE, function (p) {
      if (!p || !p.msg) return;
      if (/第 |长船|胜利|陷落|点燃|开战|角声/.test(p.msg)) {
        self.ui.toast(p.msg, /陷落|点燃/.test(p.msg) ? "bad" : /胜利|守住/.test(p.msg) ? "ok" : "warn");
      }
      self.hudDirty = true;
    });
    GS.bus.on(GS.EV.BATTLE_OVER, function () {
      if (self.mode === "battle") self._onBattleOver();
    });
  };

  /* ---------- frame ---------- */

  Game.prototype.frame = function (t) {
    if (!this.last) this.last = t;
    var dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;

    if (this.battle && (this.mode === "battle" || this.mode === "sandbox")) {
      var before = this.battle.log.length;
      this.battle.tick(dt);
      if (this.battle.log.length > before) {
        var last = this.battle.log[this.battle.log.length - 1];
        GS.bus.emit(GS.EV.BATTLE_ANNOUNCE, last);
      }
      if (this.battle.phase === "over" && this.mode === "battle" && this.battle.outcome) {
        // sim emits end; ensure UI once
        if (!this._resultShown) this._onBattleOver();
      }
    }

    this.renderWorld();
    this.hud.render();
  };

  Game.prototype.renderWorld = function () {
    if (this.mode === "campaign" && this.campaign) {
      this.renderer.drawCampaign(this.campaign, this.army, this.campCursor, this.hover);
    } else if (this.battle && (this.mode === "battle" || this.mode === "sandbox")) {
      this.renderer.drawBattle(this.battle, this.hover, {
        tool: this.sandboxTool,
        brush: this.sandboxBrush,
      });
    }
  };

  /* ---------- dispatch (single action funnel) ---------- */

  Game.prototype.dispatch = function (act, arg) {
    GS.bus.emit(GS.EV.ACTION, { act: act, arg: arg, mode: this.mode });

    switch (act) {
      case "title": return this.setMode("title");
      case "help": return this.setMode("help");
      case "campaign": return this.startCampaign();
      case "continue": return this.load();
      case "sandbox": return this.startSandbox();
      case "back-camp": return this.setMode("campaign");
      case "hire": return this.setMode("hire");
      case "buy": return this.buy(arg);
      case "open-island": return this.openIsland(+arg);
      case "fight": return this.enterBattle();
      case "next": return this.afterResult();
      case "retry": return this.retryIsland();
      case "start": return this._startFight();
      case "pause":
        if (this.battle) this.battle.setSpeed(this.battle.speed ? 0 : 1);
        this.hudDirty = true;
        return;
      case "spd":
        if (this.battle) this.battle.setSpeed(+arg);
        this.hudDirty = true;
        return;
      case "spd-up":
        if (this.battle) this.battle.setSpeed(Math.min(GS.CONFIG.battle.maxSpeed, (this.battle.speed || 1) + 1));
        this.hudDirty = true;
        return;
      case "spd-down":
        if (this.battle) {
          if (this.battle.phase === "deploy") this.battle.startFight();
          this.battle.setSpeed(Math.max(0, (this.battle.speed || 1) - 1));
        }
        this.hudDirty = true;
        return;
      case "rotate":
        if (this.battle) this.battle.rotateSquad(this.battle.selected);
        this.hudDirty = true;
        return;
      case "rotate-wheel":
        if (!this.battle) return;
        var sq = this.battle.getSquad(this.battle.selected);
        if (!sq) return;
        this.battle.rotateSquad(this.battle.selected, (sq.facing + (arg > 0 ? 1 : 3)) & 3);
        this.hudDirty = true;
        return;
      case "look":
        if (!this.battle) return;
        this.battle.look = !this.battle.look;
        this.lookText = this.battle.lookAt(this.battle.cursor.x, this.battle.cursor.y);
        this.hudDirty = true;
        return;
      case "look-at":
        if (!this.battle || !arg) return;
        this.battle.look = true;
        this.battle.cursor.x = arg.x;
        this.battle.cursor.y = arg.y;
        this.lookText = this.battle.lookAt(arg.x, arg.y);
        this.hudDirty = true;
        return;
      case "evac":
        if (this.battle) this.battle.evacuate();
        return;
      case "pal": return this.cyclePalette();
      case "mute": {
        var m = GS.audio.toggle();
        this.ui.toast(m ? "已静音" : "音效开启", "info");
        this.hudDirty = true;
        return;
      }
      case "select-squad":
        if (this.battle) this.battle.selected = arg;
        this.hudDirty = true;
        if ($("view")) $("view").focus();
        return;
      case "select-squad-index": {
        if (!this.battle) return;
        var sqs = this.battle.squads.filter(function (s) { return s.soldiers > 0; });
        var n = +arg;
        if (sqs[n]) {
          this.battle.selected = sqs[n].id;
          this.ui.toast("选中 " + sqs[n].name, "info");
          this.hudDirty = true;
        }
        return;
      }
      case "next-squad": {
        if (!this.battle) return;
        var list = this.battle.squads.filter(function (s) { return s.soldiers > 0; });
        if (!list.length) return;
        var i = 0;
        for (; i < list.length; i++) if (list[i].id === this.battle.selected) break;
        this.battle.selected = list[(i + 1) % list.length].id;
        this.hudDirty = true;
        return;
      }
      case "place": return this.tryPlace();
      case "tool-place":
        this.sandboxTool = "place";
        this.ui.toast("布置模式", "info");
        this.hudDirty = true;
        return;
      case "tool-paint":
        this.sandboxTool = "paint";
        this.ui.toast("地形刷：" + GS.tileDef(this.sandboxBrush).name, "info");
        this.hudDirty = true;
        return;
      case "brush-next": {
        var brushes = GS.configBrushes();
        var bi = brushes.indexOf(this.sandboxBrush);
        this.sandboxBrush = brushes[(bi + 1) % brushes.length];
        this.sandboxTool = "paint";
        this.ui.toast("地形刷：" + GS.tileDef(this.sandboxBrush).name, "info");
        this.hudDirty = true;
        return;
      }
      case "spawn-enemy":
        if (this.battle) this.battle.spawnEnemy("raider", this.battle.cursor.x, this.battle.cursor.y);
        this.hudDirty = true;
        return;
      case "spawn-ship":
        if (this.battle) this.battle.spawnShip();
        this.hudDirty = true;
        return;
      case "spawn-ally":
        if (!this.battle) return;
        var roles = ["infantry", "archer", "pike"];
        this.battle.spawnPlayerUnit(roles[(Math.random() * 3) | 0], this.battle.cursor.x, this.battle.cursor.y);
        this.hudDirty = true;
        return;
      case "spawn-jarl":
        if (this.battle) this.battle.spawnEnemy("jarl", this.battle.cursor.x, this.battle.cursor.y);
        this.hudDirty = true;
        return;
      case "spawn-thrower":
        if (this.battle) this.battle.spawnEnemy("thrower", this.battle.cursor.x, this.battle.cursor.y);
        this.hudDirty = true;
        return;
      case "gen": return this.regenSandbox();
      default:
        return;
    }
  };

  /* ---------- campaign flow ---------- */

  Game.prototype.startCampaign = function () {
    var seed = (Math.random() * 0x7fffffff) | 0;
    this.rng = GS.rng(seed);
    this.army = GS.Army.create(this.rng);
    this.campaign = GS.Campaign.create(seed);
    this.campCursor = 0;
    this._resultShown = false;
    GS.Save.write(this.army, this.campaign);
    this.ui.toast("远征开始。西侧家园已侦察。", "ok");
    this.setMode("campaign");
  };

  Game.prototype.load = function () {
    var data = GS.Save.read();
    if (!data) {
      this.ui.toast("没有可用存档。", "warn");
      return false;
    }
    this.army = data.army;
    this.campaign = data.campaign;
    this.campCursor = this.campaign.current || 0;
    this.ui.toast("已读取征程。", "ok");
    this.setMode("campaign");
    return true;
  };

  Game.prototype.openIsland = function (id) {
    var node = GS.Campaign.getNode(this.campaign, id);
    if (!node || node.status === "hidden") return;
    if (node.status === "cleared") {
      this.ui.toast(node.name + " 已经收复。", "info");
      return;
    }
    this.campaign.current = id;
    this.campCursor = id;
    this.island = GS.Campaign.generateIsland(node);
    this.setMode("preview");
  };

  Game.prototype.enterBattle = function () {
    this._resultShown = false;
    this.battle = new GS.Battle(this.island, this.army, { sandbox: false });
    this.sandboxTool = "place";
    this.setMode("battle");
    this.ui.toast(GS.CONFIG.battle.deployHint, "info");
  };

  Game.prototype.buy = function (cls) {
    var res = GS.Army.hire(this.army, this.rng, cls);
    if (!res.ok) {
      this.ui.toast(res.reason === "coins" ? "钱币不够。" : "无法招募。", "bad");
      this.setMode("hire");
      return;
    }
    if (GS.audio) GS.audio.coin();
    GS.Save.write(this.army, this.campaign);
    this.ui.toast("新队长入列。", "ok");
    this.setMode("hire");
  };

  Game.prototype._startFight = function () {
    if (!this.battle) return;
    this.battle.startFight();
    this.ui.toast("角声响起。", "warn");
    this.hudDirty = true;
  };

  Game.prototype._onBattleOver = function () {
    if (this._resultShown) return;
    this._resultShown = true;
    var o = this.battle.outcome;
    var id = this.campaign.current;
    if (o.kind === "victory") {
      GS.Campaign.markCleared(this.campaign, id);
      GS.Army.applyBattleOutcome(this.army, o);
    } else if (o.kind === "defeat") {
      GS.Campaign.markLost(this.campaign, id);
      GS.Army.applyBattleOutcome(this.army, o);
    } else {
      // retreat — keep scouted
      GS.Army.applyBattleOutcome(this.army, o);
    }
    GS.Save.write(this.army, this.campaign);
    this.setMode("result", o);
  };

  Game.prototype.afterResult = function () {
    var living = GS.Army.living(this.army).length;
    if (!living) {
      this.setMode("title");
      return;
    }
    if (GS.Campaign.isFinished(this.campaign)) {
      this.mode = "result";
      this.screens.finale(this.army);
      return;
    }
    this.setMode("campaign");
  };

  Game.prototype.retryIsland = function () {
    var node = GS.Campaign.resetForRetry(this.campaign, this.campaign.current);
    this.island = GS.Campaign.generateIsland(node);
    this.enterBattle();
  };

  /* ---------- sandbox ---------- */

  Game.prototype.startSandbox = function () {
    this.seedInput = String((Math.random() * 99999) | 0);
    if ($("seedbox")) $("seedbox").value = this.seedInput;
    this.rng = GS.rng(GS.hashStr("sandbox" + this.seedInput));
    this.army = GS.Army.create(this.rng);
    this.island = GS.mapgen.island(GS.hashStr(this.seedInput), {
      difficulty: GS.CONFIG.sandbox.defaultDifficulty,
      biome: GS.CONFIG.sandbox.defaultBiome,
    });
    this.battle = new GS.Battle(this.island, this.army, { sandbox: true });
    this.sandboxTool = "place";
    this.setMode("sandbox");
    this.ui.toast("沙盒就绪。T 刷地，Z 布置。", "info");
  };

  Game.prototype.regenSandbox = function () {
    var seed = $("seedbox") ? $("seedbox").value : this.seedInput;
    this.seedInput = seed || String((Math.random() * 99999) | 0);
    if ($("seedbox")) $("seedbox").value = this.seedInput;
    var biome = $("biomebox") ? $("biomebox").value : GS.CONFIG.sandbox.defaultBiome;
    var diff = $("diffbox") ? +$("diffbox").value : GS.CONFIG.sandbox.defaultDifficulty;
    this.island = GS.mapgen.island(GS.hashStr(String(this.seedInput)), { difficulty: diff, biome: biome });
    this.army = this.army || GS.Army.create(GS.rng(GS.hashStr(this.seedInput)));
    this.battle = new GS.Battle(this.island, this.army, { sandbox: true });
    this.setMode("sandbox");
    this.ui.toast("新岛：" + this.island.name, "ok");
  };

  Game.prototype.tryPlace = function () {
    var b = this.battle;
    if (!b) return false;
    if (this.mode === "sandbox" && this.sandboxTool === "paint") {
      b.paintTile(b.cursor.x, b.cursor.y, this.sandboxBrush);
      if (this.sandboxBrush === GS.T.HOUSE) {
        var exists = b.houses.some(function (h) { return h.x === b.cursor.x && h.y === b.cursor.y; });
        if (!exists) {
          b.houses.push({
            id: b.houses.length, x: b.cursor.x, y: b.cursor.y, name: GS.names.house(b.rng),
            hp: 100, maxHp: 100, coins: 1, alive: true, villagers: 3, burning: 0,
          });
        }
      }
      this.hudDirty = true;
      return true;
    }
    var ok = b.placeSquad(b.selected, b.cursor.x, b.cursor.y);
    if (!ok) this.ui.toast("无法落在此处。", "bad");
    this.hudDirty = true;
    return ok;
  };

  Game.prototype.cyclePalette = function () {
    var list = GS.CONFIG.ui.palettes;
    var i = list.indexOf(this.palette);
    this.palette = list[(i + 1) % list.length];
    this.renderer.setPalette(this.palette);
    this.ui.toast("调色：" + GS.CONFIG.ui.paletteNames[this.palette], "info");
  };

  /* ---------- pointer helpers used by Input ---------- */

  Game.prototype.pointerCampaign = function (tile) {
    var best = null, bd = 3;
    for (var i = 0; i < this.campaign.islands.length; i++) {
      var is = this.campaign.islands[i];
      if (is.status === "hidden") continue;
      var d = Math.abs(is.mx - tile.x) + Math.abs(is.my - tile.y);
      if (d < bd) { bd = d; best = is; }
    }
    if (best) {
      this.campCursor = best.id;
      this.hudDirty = true;
      if (bd <= 1) this.openIsland(best.id);
    }
  };

  Game.prototype.hoverCampaign = function (tile, cx, cy) {
    var best = null, bd = 2;
    for (var i = 0; i < this.campaign.islands.length; i++) {
      var is = this.campaign.islands[i];
      if (is.status === "hidden") continue;
      var d = Math.abs(is.mx - tile.x) + Math.abs(is.my - tile.y);
      if (d < bd) { bd = d; best = is; }
    }
    if (best) {
      var st = { scouted: "未攻", cleared: "已收复", lost: "已陷" }[best.status] || best.status;
      this.ui.setTooltip(
        '<div class="tt-title">' + best.name + "</div>" +
        '<div class="tt-sub">' + GS.BIOMES[best.biome].name + " · 威胁 " + best.difficulty + " · " + st + "</div>" +
        "<div>点击登陆</div>",
        cx, cy
      );
    } else this.ui.hideTooltip();
  };

  Game.prototype.updateBattleTooltip = function (tile, cx, cy) {
    var b = this.battle;
    if (!b) return;
    if (b.look) {
      this.lookText = b.lookAt(tile.x, tile.y);
      this.hudDirty = true;
    }
    var lines = [];
    var cell = b.island.tiles[tile.y] && b.island.tiles[tile.y][tile.x];
    if (cell) {
      var def = GS.tileDef(cell.type);
      lines.push('<div class="tt-title">' + def.ch + " " + def.name + "</div>");
      lines.push('<div class="tt-sub">' + def.look + "</div>");
    }
    for (var i = 0; i < b.entities.length; i++) {
      var e = b.entities[i];
      if (!e.alive) continue;
      if ((e.x | 0) === tile.x && (e.y | 0) === tile.y) {
        var role = (GS.ROLES[e.role] || {}).name || e.kind;
        lines.push("<div>" + e.ch + " <b>" + e.name + "</b> " + role + " " + Math.ceil(e.hp) + "/" + e.maxHp + "</div>");
      }
    }
    for (i = 0; i < b.houses.length; i++) {
      var h = b.houses[i];
      if (h.x === tile.x && h.y === tile.y) {
        lines.push("<div>⌂ " + h.name + " " + Math.max(0, h.hp | 0) + "/" + h.maxHp + (h.alive ? "" : " 已焚") + "</div>");
      }
    }
    if (this.mode === "sandbox" && this.sandboxTool === "paint") {
      lines.push("<div>刷：" + GS.tileDef(this.sandboxBrush).name + "（拖拽连涂）</div>");
    }
    this.ui.setTooltip(lines.join(""), cx, cy);
  };

  GS.Game = Game;
})(typeof window !== "undefined" ? window : globalThis);
