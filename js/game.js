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
    this.compact = false;
    this.touch = false;
    this.lowFx = false;
    this.sheet = null;

    // pause / menu
    this.menuOpen = false;
    this.menuKind = null; // pause | save | load | help-from-pause
    this._resumeSpeed = 1;
    this._pausedByBlur = false;
    this._returnAfterLoad = null;

    this._applySettings(GS.Save.loadSettings());
    this._wireUi();
    this._wireBus();
    this.applyDevice();
    this.input.bind();
    this._bindLifecycle();
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
    this.closeMenu(true);
    this.toggleSheet("close");
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

  Game.prototype._applySettings = function (s) {
    if (!s) return;
    this.palette = s.palette || "df";
    this.renderer.setPalette(this.palette);
    if (GS.audio && GS.audio.setMuted) GS.audio.setMuted(!!s.muted);
  };

  Game.prototype._persistSettings = function () {
    GS.Save.saveSettings({
      palette: this.palette,
      muted: GS.audio.muted(),
    });
  };

  Game.prototype.applyDevice = function () {
    var d = GS.util.device.apply();
    this.compact = d.compact;
    this.touch = d.touch;
    this.lowFx = d.lowFx;
    if (this.renderer) {
      this.renderer.lowFx = d.lowFx;
      this.renderer._resizeKey = "";
    }
    var size = $("sizebox");
    if (size) {
      if (d.compact && size.value === "large" && !size.getAttribute("data-touched")) {
        size.value = "small";
      }
    }
    var dock = $("dock");
    if (dock) dock.classList.toggle("hidden", !d.compact);
    if (!d.compact) this.toggleSheet("close");
    this.hudDirty = true;
  };

  Game.prototype.toggleSheet = function (which) {
    var left = $("left"), right = $("right"), scrim = $("sheet-scrim");
    var want = which === "left" || which === "right" ? which : null;
    if (want && this.sheet === want) want = null;
    if (left) left.classList.toggle("open", want === "left");
    if (right) right.classList.toggle("open", want === "right");
    this.sheet = want;
    if (scrim) scrim.classList.toggle("hidden", !want);
  };

  Game.prototype._fitBattleCam = function () {
    if (!this.renderer || !this.island) return;
    if (this.compact) {
      this.renderer.zoom = (GS.CONFIG.battle && GS.CONFIG.battle.zoomMobile) || 18;
    }
    this.renderer.layoutView(this.island.w, this.island.h);
    this.renderer.centerOn(this.island.w / 2, this.island.h / 2, this.island.w, this.island.h);
  };

  Game.prototype._bindLifecycle = function () {
    var self = this;
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        if ((self.mode === "battle" || self.mode === "sandbox") && self.battle && self.battle.phase === "fight" && self.battle.speed > 0 && !self.menuOpen) {
          self._resumeSpeed = self.battle.speed;
          self.battle.setSpeed(0);
          self._pausedByBlur = true;
          self.hudDirty = true;
        }
      } else if (self._pausedByBlur && self.battle && !self.menuOpen) {
        self._pausedByBlur = false;
        // stay paused; open menu so player consciously resumes
        self.openPauseMenu();
      }
    });
  };

  /* ---------- pause menu ---------- */

  Game.prototype.openPauseMenu = function () {
    if (this.mode === "title" || this.mode === "result" || this.mode === "preview" || this.mode === "hire" || this.mode === "help") {
      return;
    }
    if (this.battle && this.battle.phase === "fight" && this.battle.speed > 0) {
      this._resumeSpeed = this.battle.speed;
      this.battle.setSpeed(0);
    } else if (this.battle && this.battle.phase === "deploy") {
      this._resumeSpeed = 0;
    } else if (this.battle) {
      this._resumeSpeed = this.battle.speed || 1;
    }
    this.toggleSheet("close");
    this.menuOpen = true;
    this.menuKind = "pause";
    this.screens.pause({
      inBattle: this.mode === "battle" || this.mode === "sandbox",
      canSave: !!(this.army && this.campaign) || this.mode === "sandbox",
      mode: this.mode,
    });
    this.hudDirty = true;
  };

  Game.prototype.closeMenu = function (silent) {
    if (!this.menuOpen && !silent) return;
    this.menuOpen = false;
    this.menuKind = null;
    if (!silent && (this.mode === "campaign" || this.mode === "battle" || this.mode === "sandbox")) {
      this.screens.hide();
      if ($("view")) $("view").focus();
    }
  };

  Game.prototype.resume = function () {
    this.closeMenu();
    if (this.battle && this.battle.phase === "fight") {
      this.battle.setSpeed(this._resumeSpeed > 0 ? this._resumeSpeed : 1);
    }
    this._pausedByBlur = false;
    this.hudDirty = true;
  };

  Game.prototype.toggleSoftPause = function () {
    if (!this.battle) return;
    if (this.menuOpen) {
      this.resume();
      return;
    }
    if (this.battle.phase === "deploy") {
      this.openPauseMenu();
      return;
    }
    if (this.battle.speed > 0) {
      this._resumeSpeed = this.battle.speed;
      this.battle.setSpeed(0);
      this.ui.toast("已暂停（Esc 打开菜单）", "info");
    } else {
      this.battle.setSpeed(this._resumeSpeed > 0 ? this._resumeSpeed : 1);
      this.ui.toast("继续 ×" + this.battle.speed, "ok");
    }
    this.hudDirty = true;
  };

  /* ---------- wiring ---------- */

  Game.prototype._wireUi = function () {
    var self = this;
    var acts = [
      "campaign", "continue", "sandbox", "help", "title", "fight", "hire", "buy",
      "back-camp", "next", "retry", "start", "pause", "pause-menu", "resume", "spd", "rotate", "look",
      "evac", "pal", "mute", "select-squad", "open-island", "tool-place", "tool-paint",
      "brush-next", "spawn-enemy", "spawn-ship", "spawn-ally", "gen", "place",
      "zoom", "center-cam",
      "toggle-sheet",
      "save-menu", "load-menu", "save-slot", "load-slot", "quicksave", "quickload",
      "resume-or-title", "confirm-new-campaign", "warhorn",
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
    if (typeof document !== "undefined" && document.hidden) {
      this.last = t;
      return;
    }
    if (!this.last) this.last = t;
    var dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;

    if (this.battle && (this.mode === "battle" || this.mode === "sandbox") && !this.menuOpen) {
      var before = this.battle.log.length;
      this.battle.tick(dt);
      if (this.battle.log.length > before) {
        var last = this.battle.log[this.battle.log.length - 1];
        GS.bus.emit(GS.EV.BATTLE_ANNOUNCE, last);
      }
      if (this.battle.phase === "over" && this.mode === "battle" && this.battle.outcome) {
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
      case "help":
        if (this.menuOpen || this.mode === "campaign" || this.mode === "battle" || this.mode === "sandbox") {
          this.menuOpen = true;
          this.menuKind = "help";
          this.screens.help();
          return;
        }
        return this.setMode("help");
      case "campaign": return this.startCampaign();
      case "confirm-new-campaign": return this._startCampaignNow();
      case "continue": return this.loadLatest();
      case "sandbox": return this.startSandbox();
      case "back-camp":
        this.closeMenu();
        return this.setMode("campaign");
      case "hire": return this.setMode("hire");
      case "buy": return this.buy(arg);
      case "open-island": return this.openIsland(+arg);
      case "fight": return this.enterBattle();
      case "next": return this.afterResult();
      case "retry": return this.retryIsland();
      case "start": return this._startFight();
      case "pause": return this.toggleSoftPause();
      case "pause-menu": return this.openPauseMenu();
      case "resume": return this.resume();
      case "resume-or-title":
        if (this.mode === "title" || this.mode === "help") return this.setMode("title");
        if (this.menuOpen) return this.resume();
        return this.setMode("title");
      case "save-menu":
        if (!(this.army && this.campaign) && this.mode !== "sandbox") {
          this.ui.toast("当前没有可保存的战役。", "warn");
          return;
        }
        this.menuOpen = true;
        this.menuKind = "save";
        // sandbox without campaign: create ephemeral campaign shell? skip — only campaign
        if (!this.campaign) {
          this.ui.toast("沙盒请用战役存档位：先开始战役。", "warn");
          this.openPauseMenu();
          return;
        }
        if (this.battle && this.battle.phase === "fight" && this.battle.speed > 0) {
          this._resumeSpeed = this.battle.speed;
          this.battle.setSpeed(0);
        }
        this.screens.saveMenu();
        return;
      case "load-menu":
        this.menuOpen = true;
        this.menuKind = "load";
        this._returnAfterLoad = this.mode;
        if (this.battle && this.battle.speed > 0) {
          this._resumeSpeed = this.battle.speed;
          this.battle.setSpeed(0);
        }
        this.screens.loadMenu();
        return;
      case "save-slot": return this.saveToSlot(arg);
      case "load-slot": return this.loadFromSlot(arg);
      case "quicksave": return this.quicksave();
      case "quickload": return this.quickload();
      case "spd":
        if (this.menuOpen) return;
        if (this.battle) this.battle.setSpeed(+arg);
        this.hudDirty = true;
        return;
      case "spd-up":
        if (this.menuOpen) return;
        if (this.battle) this.battle.setSpeed(Math.min(GS.CONFIG.battle.maxSpeed, (this.battle.speed || 1) + 1));
        this.hudDirty = true;
        return;
      case "spd-down":
        if (this.menuOpen) return;
        if (this.battle) {
          if (this.battle.phase === "deploy") this.battle.startFight();
          this.battle.setSpeed(Math.max(0, (this.battle.speed || 1) - 1));
        }
        this.hudDirty = true;
        return;
      case "rotate": {
        if (!this.battle) return;
        var rsq = this.battle.getSquad(this.battle.selected);
        if (!rsq) {
          this.ui.toast(this.touch ? "先点选一个兵团。" : "先选中兵团再转向。", "warn");
          return;
        }
        this.battle.rotateSquad(rsq.id);
        this.ui.toast("朝向 " + GS.DIRS[rsq.facing].name + " " + GS.DIRS[rsq.facing].ch, "info");
        this.hudDirty = true;
        return;
      }
      case "rotate-wheel":
        if (!this.battle) return;
        var sqw = this.battle.getSquad(this.battle.selected);
        if (!sqw) return;
        this.battle.rotateSquad(this.battle.selected, (sqw.facing + (arg > 0 ? 1 : 3)) & 3);
        this.hudDirty = true;
        return;
      case "zoom":
        if (!this.battle) return;
        this.renderer.setZoom(this.renderer.zoom + (arg > 0 ? 1 : -1), this.battle.w, this.battle.h, this.battle.cursor.x, this.battle.cursor.y);
        this.hudDirty = true;
        return;
      case "center-cam": {
        if (!this.battle || !this.renderer) return;
        var csq = this.battle.getSquad(this.battle.selected);
        var cx = (csq && csq.placed) ? csq.tx : this.battle.cursor.x;
        var cy = (csq && csq.placed) ? csq.ty : this.battle.cursor.y;
        this.renderer.centerOn(cx, cy, this.battle.w, this.battle.h);
        this.renderer._followLock = 120;
        return;
      }
      case "toggle-sheet":
        this.toggleSheet(arg);
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
      case "warhorn":
        if (!this.battle) return;
        if (this.battle.blowWarhorn()) {
          this.ui.toast("号角！北蛮减速", "warn");
          this.hudDirty = true;
        } else {
          this.ui.toast(this.battle.warhornReady ? "开战后方可吹号" : "本场号角已用过", "info");
        }
        return;
      case "pal":
        this.cyclePalette();
        this._persistSettings();
        if (this.menuKind === "pause") this.openPauseMenu();
        return;
      case "mute": {
        var m = GS.audio.toggle();
        this._persistSettings();
        this.ui.toast(m ? "已静音" : "音效开启", "info");
        this.hudDirty = true;
        if (this.menuKind === "pause") this.openPauseMenu();
        return;
      }
      case "select-squad":
        if (this.battle && arg) this.battle.selected = arg;
        this.hudDirty = true;
        if ($("view")) $("view").focus();
        return;
      case "select-squad-index": {
        if (!this.battle) return;
        var sqs = this.battle.livingSquads();
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
        var list = this.battle.livingSquads();
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
        if (this.battle) this.battle.spawnShip(null, ["raider", "raider", "raider"]);
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
        if (this.battle) this.battle.spawnShip(null, ["jarl", "raider", "raider"]);
        this.hudDirty = true;
        return;
      case "spawn-thrower":
        if (this.battle) this.battle.spawnShip(null, ["thrower", "thrower", "raider"]);
        this.hudDirty = true;
        return;
      case "gen": return this.regenSandbox();
      default:
        return;
    }
  };

  /* ---------- campaign flow ---------- */

  Game.prototype.startCampaign = function () {
    if (GS.Save.hasAny()) {
      this.menuOpen = true;
      this.menuKind = "confirm";
      this.screens.confirm({
        title: "开始新战役？",
        msg: "已有存档。新战役不会立刻覆盖手动档，但自动档会在推进时更新。确定开始？",
        yes: "开始新战役",
        yesAct: "confirm-new-campaign",
        no: "取消",
        noAct: this.mode === "title" ? "title" : "resume",
      });
      return;
    }
    this._startCampaignNow();
  };

  Game.prototype._startCampaignNow = function () {
    var seed = (Math.random() * 0x7fffffff) | 0;
    this.rng = GS.rng(seed);
    this.army = GS.Army.create(this.rng);
    this.campaign = GS.Campaign.create(seed);
    this.campCursor = 0;
    this._resultShown = false;
    this.autosave("新战役");
    this.ui.toast("远征开始。西侧家园已侦察。", "ok");
    this.setMode("campaign");
  };

  Game.prototype.autosave = function (label) {
    if (!this.army || !this.campaign) return false;
    var opts = { label: label || "自动" };
    if ((this.mode === "battle" || this.mode === "sandbox") && this.battle && this.battle.phase !== "over") {
      opts.battle = GS.Save.captureBattle(this);
    }
    return GS.Save.writeSlot("auto", this.army, this.campaign, opts);
  };

  Game.prototype.saveToSlot = function (slot) {
    if (!this.army || !this.campaign) {
      this.ui.toast("没有可保存的战役。", "warn");
      return false;
    }
    var opts = { label: slot === "auto" ? "自动" : ("手动 " + slot) };
    if ((this.mode === "battle" || this.mode === "sandbox") && this.battle && this.battle.phase !== "over") {
      opts.battle = GS.Save.captureBattle(this);
    }
    var ok = GS.Save.writeSlot(String(slot), this.army, this.campaign, opts);
    if (ok) {
      this.ui.toast("已保存到" + (slot === "auto" ? "自动档" : ("存档位 " + slot)), "ok");
      this.openPauseMenu();
    } else {
      this.ui.toast("保存失败（存储空间？）", "bad");
    }
    return ok;
  };

  Game.prototype.quicksave = function () {
    if (!this.army || !this.campaign) {
      this.ui.toast("当前无法快速存档。", "warn");
      return;
    }
    var opts = { label: "快速" };
    if ((this.mode === "battle" || this.mode === "sandbox") && this.battle && this.battle.phase !== "over") {
      opts.battle = GS.Save.captureBattle(this);
    }
    if (GS.Save.writeSlot("auto", this.army, this.campaign, opts)) {
      this.ui.toast("快速存档完成（自动档）", "ok");
    } else this.ui.toast("快速存档失败", "bad");
  };

  Game.prototype.loadLatest = function () {
    var latest = GS.Save.latest();
    if (!latest) {
      this.ui.toast("没有可用存档。", "warn");
      return false;
    }
    return this.loadFromSlot(latest.slot);
  };

  Game.prototype.quickload = function () {
    var latest = GS.Save.latest();
    if (!latest) {
      this.ui.toast("没有可用存档。", "warn");
      return false;
    }
    return this.loadFromSlot(latest.slot);
  };

  Game.prototype.loadFromSlot = function (slot) {
    var data = GS.Save.readSlot(String(slot));
    if (!data) {
      this.ui.toast("存档为空。", "warn");
      return false;
    }
    this.army = data.army;
    this.campaign = data.campaign;
    this.campCursor = this.campaign.current || 0;
    this._resultShown = false;
    this.closeMenu(true);

    if (data.battle && data.battle.snapshot) {
      var restored = GS.Battle.deserialize(data.battle.snapshot, this.army);
      if (restored) {
        this.battle = restored;
        this.island = restored.island;
        this.sandboxTool = data.battle.sandboxTool || "place";
        this.sandboxBrush = data.battle.sandboxBrush != null ? data.battle.sandboxBrush : this.sandboxBrush;
        this.seedInput = data.battle.seedInput || this.seedInput;
        var mode = data.battle.mode || "battle";
        this.mode = mode;
        this.menuOpen = false;
        this.screens.hide();
        this.ui.toast("已读取战斗存档 · " + this.island.name, "ok");
        // keep paused so player can orient
        if (this.battle.phase === "fight") {
          this._resumeSpeed = 1;
          this.battle.setSpeed(0);
          this.openPauseMenu();
        }
        this.hudDirty = true;
        if ($("view")) $("view").focus();
        return true;
      }
    }

    this.battle = null;
    this.ui.toast("已读取征程。", "ok");
    this.setMode("campaign");
    return true;
  };

  // legacy name
  Game.prototype.load = function () { return this.loadLatest(); };

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
    this._fitBattleCam();
    this.ui.toast(this.touch ? "点空地就位，拖动画布，双指缩放。" : GS.CONFIG.battle.deployHint, "info");
    this.autosave("登岛");
  };

  Game.prototype.buy = function (cls) {
    var res = GS.Army.hire(this.army, this.rng, cls);
    if (!res.ok) {
      this.ui.toast(res.reason === "coins" ? "钱币不够。" : "无法招募。", "bad");
      this.setMode("hire");
      return;
    }
    if (GS.audio) GS.audio.coin();
    this.autosave("招募");
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
    GS.Save.writeSlot("auto", this.army, this.campaign, { label: "战后" });
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
    var size = ($("sizebox") && $("sizebox").value) || GS.CONFIG.sandbox.defaultSize || "medium";
    this.island = GS.mapgen.island(GS.hashStr(this.seedInput), {
      difficulty: GS.CONFIG.sandbox.defaultDifficulty,
      biome: GS.CONFIG.sandbox.defaultBiome,
      size: size,
    });
    this.battle = new GS.Battle(this.island, this.army, { sandbox: true });
    this.sandboxTool = "place";
    this.setMode("sandbox");
    this._fitBattleCam();
    this.ui.toast("沙盒就绪 " + this.island.w + "×" + this.island.h + (this.touch ? "。点地布置，拖动画布。" : "。滚轮缩放，中键拖镜头。"), "info");
  };

  Game.prototype.regenSandbox = function () {
    var seed = $("seedbox") ? $("seedbox").value : this.seedInput;
    this.seedInput = seed || String((Math.random() * 99999) | 0);
    if ($("seedbox")) $("seedbox").value = this.seedInput;
    var biome = $("biomebox") ? $("biomebox").value : GS.CONFIG.sandbox.defaultBiome;
    var diff = $("diffbox") ? +$("diffbox").value : GS.CONFIG.sandbox.defaultDifficulty;
    var size = $("sizebox") ? $("sizebox").value : (GS.CONFIG.sandbox.defaultSize || "medium");
    this.island = GS.mapgen.island(GS.hashStr(String(this.seedInput)), {
      difficulty: diff, biome: biome, size: size,
    });
    this.army = this.army || GS.Army.create(GS.rng(GS.hashStr(this.seedInput)));
    this.battle = new GS.Battle(this.island, this.army, { sandbox: true });
    this.setMode("sandbox");
    this._fitBattleCam();
    this.ui.toast("新岛：" + this.island.name + "（" + this.island.w + "×" + this.island.h + "）", "ok");
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
    if (!b.selected) {
      this.ui.toast(this.touch ? "先点选一个兵团。" : "先点选一个兵团（1–9 或点击士兵）。", "warn");
      return false;
    }
    var ok = b.placeSquad(b.selected, b.cursor.x, b.cursor.y);
    if (!ok) {
      var why = b.placeError;
      if (why === "cooldown") this.ui.toast("换阵冷却中。", "warn");
      else if (why === "house") this.ui.toast("屋舍上无法列阵。", "bad");
      else this.ui.toast("无法落在此处。", "bad");
    }
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
