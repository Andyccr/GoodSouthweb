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
    this._campZoom = null;
    this._campArmed = null;
    this._kbCursor = false;

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
      if ($("view")) $("view").classList.remove("is-chart");
      return;
    }
    if (mode === "help") { this.screens.help(); return; }
    if (mode === "hire") { this.screens.hire(this.army); return; }
    if (mode === "preview") { this.screens.preview(this.island, this.army, this.campaign); return; }
    if (mode === "result") { this.screens.result(this.island, this.army, data || this.battle.outcome); return; }
    if (mode === "voyage") { this.screens.voyage(this.pendingVoyage); return; }
    if (mode === "campaign") {
      this.battle = null;
      this.screens.hide();
      this.ui.hideTooltip();
      if ($("sandbox-tools")) $("sandbox-tools").classList.remove("visible");
      if ($("phase-banner")) $("phase-banner").classList.add("hidden");
      if ($("view")) {
        $("view").classList.add("is-chart");
        $("view").focus();
      }
      this._fitCampaignCam();
      return;
    }
    if ($("view")) $("view").classList.remove("is-chart");
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
    if (s.lang) GS.setLang(s.lang);
    else if (GS.I18N && GS.I18N.applyChrome) GS.I18N.applyChrome();
  };

  Game.prototype._persistSettings = function () {
    GS.Save.saveSettings({
      palette: this.palette,
      muted: GS.audio.muted(),
      lang: GS.LANG || "zh",
    });
  };

  Game.prototype.toggleLang = function () {
    GS.setLang(GS.LANG === "en" ? "zh" : "en");
    this._persistSettings();
    this.ui.toast(GS.t("toastLang"), "ok");
    this.hudDirty = true;
    if (this.mode === "title") this.screens.title();
    else if (this.mode === "help" && !this.menuOpen) this.screens.help();
    else if (this.mode === "hire") this.screens.hire(this.army);
    else if (this.mode === "preview") this.screens.preview(this.island, this.army, this.campaign);
    else if (this.mode === "result" && this.battle && this.battle.outcome) this.screens.result(this.island, this.army, this.battle.outcome);
    else if (this.mode === "voyage") this.screens.voyage(this.pendingVoyage);
    else if (this.menuKind === "pause") this.openPauseMenu();
    else if (this.menuKind === "save") this.screens.saveMenu();
    else if (this.menuKind === "load") this.screens.loadMenu();
    else if (this.menuKind === "help") this.screens.help();
    return GS.LANG;
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
    this.renderer._followLock = 0;
  };

  Game.prototype._fitCampaignCam = function () {
    if (!this.renderer || !this.campaign) return;
    var cfg = GS.CONFIG.campaign || {};
    if (this._campZoom == null) {
      this._campZoom = this.compact ? (cfg.zoomMobile || 28) : (cfg.zoomDefault || 22);
    }
    this.renderer.zoom = this._campZoom;
    this.renderer.layoutView(this.campaign.w, this.campaign.h);
    this.renderer._followLock = 0;
    this._focusIsland(this.campCursor);
  };

  Game.prototype._focusIsland = function (id) {
    if (!this.campaign || !this.renderer) return;
    var node = this.campaign.islands[id];
    if (!node) return;
    this.renderer.centerOn(node.mx, node.my, this.campaign.w, this.campaign.h);
    this.renderer._followLock = 90;
  };

  Game.prototype._tickCamera = function (dt) {
    if (!this.input || GS.util.isTypingTarget()) return;
    var keys = this.input.keys || {};
    var dx = 0, dy = 0;
    if (keys.w || keys.W) dy -= 1;
    if (keys.s || keys.S) dy += 1;
    if (keys.a || keys.A) dx -= 1;
    if (keys.d || keys.D) dx += 1;
    if (this.mode === "campaign") {
      if (keys.ArrowLeft || keys.h || keys.H) dx -= 1;
      if (keys.ArrowRight || keys.l || keys.L) dx += 1;
      if (keys.ArrowUp || keys.k || keys.K) dy -= 1;
      if (keys.ArrowDown || keys.j || keys.J) dy += 1;
    }
    var map = null, cfg = GS.CONFIG.battle || {};
    if (this.mode === "campaign" && this.campaign) {
      map = { w: this.campaign.w, h: this.campaign.h };
      cfg = GS.CONFIG.campaign || cfg;
    } else if ((this.mode === "battle" || this.mode === "sandbox") && this.battle) {
      map = { w: this.battle.w, h: this.battle.h };
    }
    if (map && (dx || dy)) {
      var fast = !!(keys.Shift);
      var sp = (fast ? (cfg.camShift || 36) : (cfg.camSpeed || 22)) * dt;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      this.renderer.pan((dx / len) * sp, (dy / len) * sp, map.w, map.h);
    }
    if (map) this._tickEdgePan(dt, map, cfg);
  };

  Game.prototype._tickEdgePan = function (dt, map, cfg) {
    if (this.compact || this.touch || this.input.pointer.down) return;
    var view = $("view");
    if (!view || !this.renderer) return;
    var box = view.getBoundingClientRect();
    var px = this.input.pointer.x, py = this.input.pointer.y;
    if (!px && !py) return;
    if (px < box.left || py < box.top || px > box.right || py > box.bottom) return;
    cfg = cfg || GS.CONFIG.battle || {};
    var m = cfg.edgePan || (GS.CONFIG.battle && GS.CONFIG.battle.edgePan) || 22;
    var dx = 0, dy = 0;
    if (px < box.left + m) dx = -1;
    if (px > box.right - m) dx = 1;
    if (py < box.top + m) dy = -1;
    if (py > box.bottom - m) dy = 1;
    if (!dx && !dy) return;
    var sp = (cfg.camSpeed || 22) * 0.85 * dt;
    this.renderer.pan(dx * sp, dy * sp, map.w, map.h);
  };

  Game.prototype._fitAllChart = function () {
    if (!this.campaign || !this.renderer) return;
    var vis = GS.Campaign.visibleIslands(this.campaign);
    if (!vis.length) return;
    var cfg = GS.CONFIG.campaign || {};
    var minX = vis[0].mx, maxX = vis[0].mx, minY = vis[0].my, maxY = vis[0].my;
    var i;
    for (i = 1; i < vis.length; i++) {
      minX = Math.min(minX, vis[i].mx);
      maxX = Math.max(maxX, vis[i].mx);
      minY = Math.min(minY, vis[i].my);
      maxY = Math.max(maxY, vis[i].my);
    }
    var pad = 6;
    this.renderer.layoutView(this.campaign.w, this.campaign.h);
    var needW = Math.max(8, maxX - minX + pad * 2);
    var needH = Math.max(6, maxY - minY + pad * 2);
    var zW = this.renderer.cssW / needW;
    var zH = this.renderer.cssH / (needH * 1.12);
    var z = Math.max(cfg.zoomMin || 14, Math.min(cfg.zoomMax || 40, Math.min(zW, zH)));
    this.renderer.setZoom(z, this.campaign.w, this.campaign.h, (minX + maxX) / 2, (minY + maxY) / 2, cfg);
    this.renderer.centerOn((minX + maxX) / 2, (minY + maxY) / 2, this.campaign.w, this.campaign.h);
    this._campZoom = this.renderer.zoom;
    this.renderer._followLock = 0;
  };

  Game.prototype._bindLifecycle = function () {
    var self = this;
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        if (self.input) self.input.keys = {};
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
      this.ui.toast(GS.t("toastPaused"), "info");
    } else {
      this.battle.setSpeed(this._resumeSpeed > 0 ? this._resumeSpeed : 1);
      this.ui.toast(GS.t("toastResume", this.battle.speed), "ok");
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
      "zoom", "center-cam", "fit-cam", "select-island",
      "toggle-sheet",
      "save-menu", "load-menu", "save-slot", "load-slot", "quicksave", "quickload",
      "resume-or-title", "confirm-new-campaign", "warhorn", "voyage-pick",
      "spawn-shaman", "spawn-hound",
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
      if (/第 |长船|胜利|陷落|点燃|开战|角声|Wave |longship|Victory|Fallen|horn|held /i.test(p.msg)) {
        self.ui.toast(p.msg, /陷落|点燃|fallen|burn/i.test(p.msg) ? "bad" : /胜利|守住|held|Victory/i.test(p.msg) ? "ok" : "warn");
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

    if (this.menuOpen) {
      this.renderWorld();
      this.hud.render();
      return;
    }

    this._tickCamera(dt);

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
        followCursor: !!this._kbCursor,
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
      case "lang": return this.toggleLang();
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
          this.ui.toast(GS.t("toastNoSave"), "warn");
          return;
        }
        this.menuOpen = true;
        this.menuKind = "save";
        // sandbox without campaign: create ephemeral campaign shell? skip — only campaign
        if (!this.campaign) {
          this.ui.toast(GS.t("toastSandboxSave"), "warn");
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
          this.ui.toast(this.touch ? GS.t("toastPickSquad") : GS.t("toastPickSquadDesk"), "warn");
          return;
        }
        this.battle.rotateSquad(rsq.id);
        this.ui.toast(GS.t("toastFacing", GS.loc(GS.DIRS[rsq.facing]), GS.DIRS[rsq.facing].ch), "info");
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
      case "zoom": {
        var zdir = arg > 0 ? 1 : -1;
        if (this.mode === "campaign" && this.campaign) {
          var focus = this.hover && this.hover.x >= 0 ? this.hover : null;
          var node = this.campaign.islands[this.campCursor];
          this.renderer.setZoom(
            this.renderer.zoom + zdir,
            this.campaign.w, this.campaign.h,
            focus ? focus.x : (node ? node.mx : null),
            focus ? focus.y : (node ? node.my : null),
            GS.CONFIG.campaign
          );
          this._campZoom = this.renderer.zoom;
          this.hudDirty = true;
          return;
        }
        if (!this.battle) return;
        var zf = (this.hover && this.hover.x >= 0) ? this.hover : this.battle.cursor;
        this.renderer.setZoom(this.renderer.zoom + zdir, this.battle.w, this.battle.h, zf.x, zf.y);
        this.hudDirty = true;
        return;
      }
      case "fit-cam":
        if (this.mode === "campaign") this._fitAllChart();
        else this.dispatch("center-cam");
        this.hudDirty = true;
        return;
      case "select-island": {
        var sid = +arg;
        if (!this.campaign || !this.campaign.islands[sid] || this.campaign.islands[sid].status === "hidden") return;
        this.campCursor = sid;
        this._campArmed = sid;
        this._focusIsland(sid);
        this.hudDirty = true;
        return;
      }
      case "center-cam": {
        if (this.mode === "campaign") {
          this._focusIsland(this.campCursor);
          return;
        }
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
          this.ui.toast(this.battle.warhornReady ? GS.t("toastHornMore") : GS.t("toastHorn"), "warn");
          this.hudDirty = true;
        } else {
          this.ui.toast(this.battle.warhornReady ? GS.t("toastHornWait") : GS.t("toastHornSpent"), "info");
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
        this.ui.toast(m ? GS.t("toastMuted") : GS.t("toastUnmute"), "info");
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
          this.ui.toast(GS.t("toastSelect", GS.loc(sqs[n])), "info");
          this._centerSelectedSquad(true);
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
        this._centerSelectedSquad(true);
        this.hudDirty = true;
        return;
      }
      case "place": return this.tryPlace();
      case "tool-place":
        this.sandboxTool = "place";
        this.ui.toast(GS.t("toastPlaceMode"), "info");
        this.hudDirty = true;
        return;
      case "tool-paint":
        this.sandboxTool = "paint";
        this.ui.toast(GS.t("toastBrush", GS.loc(GS.tileDef(this.sandboxBrush))), "info");
        this.hudDirty = true;
        return;
      case "brush-next": {
        var brushes = GS.configBrushes();
        var bi = brushes.indexOf(this.sandboxBrush);
        this.sandboxBrush = brushes[(bi + 1) % brushes.length];
        this.sandboxTool = "paint";
        this.ui.toast(GS.t("toastBrush", GS.loc(GS.tileDef(this.sandboxBrush))), "info");
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
        var roles = ["infantry", "archer", "pike", "skirmisher"];
        this.battle.spawnPlayerUnit(roles[(Math.random() * 4) | 0], this.battle.cursor.x, this.battle.cursor.y);
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
      case "spawn-shaman":
        if (this.battle) this.battle.spawnShip(null, ["shaman", "raider", "hound"]);
        this.hudDirty = true;
        return;
      case "spawn-hound":
        if (this.battle) this.battle.spawnShip(null, ["hound", "hound", "raider", "raider"]);
        this.hudDirty = true;
        return;
      case "voyage-pick":
        return this._applyVoyage(arg);
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
        title: GS.t("confirmNew"),
        msg: GS.t("confirmNewMsg"),
        yes: GS.t("confirmYes"),
        yesAct: "confirm-new-campaign",
        no: GS.t("cancel"),
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
    this._campZoom = null;
    this._campArmed = null;
    this._resultShown = false;
    this.autosave(GS.t("slotNewCampaign"));
    this.ui.toast(GS.t("toastVoyageStart"), "ok");
    this.setMode("campaign");
  };

  Game.prototype.autosave = function (label) {
    if (!this.army || !this.campaign) return false;
    var opts = { label: label || GS.t("autoSlot") };
    if ((this.mode === "battle" || this.mode === "sandbox") && this.battle && this.battle.phase !== "over") {
      opts.battle = GS.Save.captureBattle(this);
    }
    return GS.Save.writeSlot("auto", this.army, this.campaign, opts);
  };

  Game.prototype.saveToSlot = function (slot) {
    if (!this.army || !this.campaign) {
      this.ui.toast(GS.t("toastNothing"), "warn");
      return false;
    }
    var opts = { label: slot === "auto" ? GS.t("autoSlot") : GS.t("manualSlot", slot) };
    if ((this.mode === "battle" || this.mode === "sandbox") && this.battle && this.battle.phase !== "over") {
      opts.battle = GS.Save.captureBattle(this);
    }
    var ok = GS.Save.writeSlot(String(slot), this.army, this.campaign, opts);
    if (ok) {
      this.ui.toast(slot === "auto" ? GS.t("toastSavedAuto") : GS.t("toastSavedSlot", slot), "ok");
      this.openPauseMenu();
    } else {
      this.ui.toast(GS.t("toastSaveFail"), "bad");
    }
    return ok;
  };

  Game.prototype.quicksave = function () {
    if (!this.army || !this.campaign) {
      this.ui.toast(GS.t("toastNoQsave"), "warn");
      return;
    }
    var opts = { label: GS.t("slotQuick") };
    if ((this.mode === "battle" || this.mode === "sandbox") && this.battle && this.battle.phase !== "over") {
      opts.battle = GS.Save.captureBattle(this);
    }
    if (GS.Save.writeSlot("auto", this.army, this.campaign, opts)) {
      this.ui.toast(GS.t("toastQsave"), "ok");
    } else this.ui.toast(GS.t("toastQsaveFail"), "bad");
  };

  Game.prototype.loadLatest = function () {
    var latest = GS.Save.latest();
    if (!latest) {
      this.ui.toast(GS.t("toastNoLoad"), "warn");
      return false;
    }
    return this.loadFromSlot(latest.slot);
  };

  Game.prototype.quickload = function () {
    var latest = GS.Save.latest();
    if (!latest) {
      this.ui.toast(GS.t("toastNoLoad"), "warn");
      return false;
    }
    return this.loadFromSlot(latest.slot);
  };

  Game.prototype.loadFromSlot = function (slot) {
    var data = GS.Save.readSlot(String(slot));
    if (!data) {
      this.ui.toast(GS.t("toastEmptySlot"), "warn");
      return false;
    }
    this.army = data.army;
    this.campaign = data.campaign;
    this.campCursor = this.campaign.current || 0;
    this._campArmed = null;
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
        this.ui.toast(GS.t("toastLoadBattle", GS.loc(this.island)), "ok");
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
    this.ui.toast(GS.t("toastLoad"), "ok");
    this.setMode("campaign");
    return true;
  };

  // legacy name
  Game.prototype.load = function () { return this.loadLatest(); };

  Game.prototype.openIsland = function (id) {
    var node = GS.Campaign.getNode(this.campaign, id);
    if (!node || node.status === "hidden") return;
    if (node.status === "cleared") {
      this.ui.toast(GS.t("toastCleared", GS.loc(node)), "info");
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
    this.ui.toast(this.touch ? GS.t("toastDeployTouch") : (GS.LANG === "en" && GS.CONFIG.battle.deployHintEn ? GS.CONFIG.battle.deployHintEn : GS.CONFIG.battle.deployHint), "info");
    this.autosave(GS.t("slotLand"));
  };

  Game.prototype.buy = function (cls) {
    var res = GS.Army.hire(this.army, this.rng, cls);
    if (!res.ok) {
      this.ui.toast(res.reason === "coins" ? GS.t("toastNoCoins") : GS.t("toastNoHire"), "bad");
      this.setMode("hire");
      return;
    }
    if (GS.audio) GS.audio.coin();
    this.autosave(GS.t("slotHire"));
    this.ui.toast(GS.t("toastHired"), "ok");
    this.setMode("hire");
  };

  Game.prototype._startFight = function () {
    if (!this.battle) return;
    this.battle.startFight();
    this.ui.toast(GS.t("toastHornStart"), "warn");
    this.hudDirty = true;
  };

  Game.prototype._onBattleOver = function () {
    if (this._resultShown) return;
    this._resultShown = true;
    var o = this.battle.outcome;
    var id = this.campaign.current;
    if (o.kind === "victory") {
      GS.Campaign.markCleared(this.campaign, id);
      var node = GS.Campaign.getNode(this.campaign, id);
      if (node && node.relic && GS.Army.grantRelic(this.army, node.relic)) {
        o.relic = GS.Meta.relic(node.relic);
      }
      GS.Army.applyBattleOutcome(this.army, o);
    } else if (o.kind === "defeat") {
      GS.Campaign.markLost(this.campaign, id);
      GS.Army.applyBattleOutcome(this.army, o);
    } else {
      // retreat — keep scouted
      GS.Army.applyBattleOutcome(this.army, o);
    }
    GS.Save.writeSlot("auto", this.army, this.campaign, { label: GS.t("slotAfter") });
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
    if (this.battle && this.battle.outcome && this.battle.outcome.kind === "victory") {
      var ev = GS.Meta && GS.Meta.rollVoyage(this.rng || GS.rng(Date.now()), this.army, this.campaign);
      if (ev) {
        this.pendingVoyage = ev;
        this.setMode("voyage");
        return;
      }
    }
    this.setMode("campaign");
  };

  Game.prototype._applyVoyage = function (pick) {
    var ev = this.pendingVoyage;
    if (ev && GS.Meta) {
      GS.Meta.applyVoyage(ev, pick, {
        army: this.army,
        campaign: this.campaign,
        rng: this.rng || GS.rng(1),
      });
      this.ui.toast(GS.t("toastVoyageOk"), "ok");
      this.autosave(GS.t("slotVoyage"));
    }
    this.pendingVoyage = null;
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
    this.ui.toast(this.touch ? GS.t("toastSandboxReadyTouch", this.island.w, this.island.h) : GS.t("toastSandboxReady", this.island.w, this.island.h), "info");
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
    this.ui.toast(GS.t("toastNewIsle", GS.loc(this.island), this.island.w, this.island.h), "ok");
  };

  Game.prototype._centerSelectedSquad = function (force) {
    if (!this.battle || !this.renderer) return;
    var sq = this.battle.getSquad(this.battle.selected);
    if (!sq || !sq.placed) return;
    if (!force && this.renderer._followLock > 0) return;
    this.renderer.centerOn(sq.tx, sq.ty, this.battle.w, this.battle.h);
    this.renderer._followLock = 90;
  };

  Game.prototype.tryPlace = function () {
    var b = this.battle;
    if (!b) return false;
    if (this.mode === "sandbox" && this.sandboxTool === "paint") {
      b.paintTile(b.cursor.x, b.cursor.y, this.sandboxBrush);
      if (this.sandboxBrush === GS.T.HOUSE) {
        var exists = b.houses.some(function (h) { return h.x === b.cursor.x && h.y === b.cursor.y; });
        if (!exists) {
          var hn = GS.names.housePair ? GS.names.housePair(b.rng) : { name: GS.names.house(b.rng) };
          b.houses.push({
            id: b.houses.length, x: b.cursor.x, y: b.cursor.y,
            name: hn.name, nameEn: hn.nameEn || hn.name,
            hp: 100, maxHp: 100, coins: 1, alive: true, villagers: 3, burning: 0,
          });
        }
      }
      this.hudDirty = true;
      return true;
    }
    if (!b.selected) {
      this.ui.toast(this.touch ? GS.t("toastPickSquad") : GS.t("toastNeedSquad"), "warn");
      return false;
    }
    var ok = b.placeSquad(b.selected, b.cursor.x, b.cursor.y);
    if (!ok) {
      var why = b.placeError;
      if (why === "cooldown") this.ui.toast(GS.t("toastCd"), "warn");
      else if (why === "house") this.ui.toast(GS.t("toastOnHouse"), "bad");
      else this.ui.toast(GS.t("toastBadTile"), "bad");
    }
    this.hudDirty = true;
    if (ok && GS.audio && GS.audio.place) GS.audio.place();
    return ok;
  };

  Game.prototype.cyclePalette = function () {
    var list = GS.CONFIG.ui.palettes;
    var i = list.indexOf(this.palette);
    this.palette = list[(i + 1) % list.length];
    this.renderer.setPalette(this.palette);
    var pal = (GS.LANG === "en" && GS.CONFIG.ui.paletteNamesEn && GS.CONFIG.ui.paletteNamesEn[this.palette])
      || GS.CONFIG.ui.paletteNames[this.palette];
    this.ui.toast(GS.t("toastPal", pal), "info");
  };

  /* ---------- pointer helpers used by Input ---------- */

  Game.prototype.pointerCampaign = function (tile, opts) {
    opts = opts || {};
    if (!tile || !this.campaign) return;
    var cfg = GS.CONFIG.campaign || {};
    var hit = GS.Campaign.pickAt(this.campaign, tile.x, tile.y, cfg.pickRadius);
    if (!hit) return;
    var intent = GS.Campaign.tapIntent({
      island: hit.island,
      dist: hit.dist,
      selectedId: this.campCursor,
      armedId: this._campArmed,
      openRadius: cfg.openRadius,
      forceLand: !!opts.forceLand,
    });
    this.campCursor = hit.island.id;
    this.hudDirty = true;
    if (intent.action === "land") {
      this._campArmed = null;
      this.openIsland(hit.island.id);
      return;
    }
    this._campArmed = hit.island.id;
    this._focusIsland(hit.island.id);
    if (intent.hint) this.ui.toast(GS.t("toastArm", GS.loc(hit.island)), "info");
  };

  Game.prototype.hoverCampaign = function (tile, cx, cy) {
    var hit = GS.Campaign.pickAt(this.campaign, tile.x, tile.y, (GS.CONFIG.campaign && GS.CONFIG.campaign.pickRadius) || 4);
    if (hit) {
      var best = hit.island;
      var st = { scouted: GS.t("unfought"), cleared: GS.t("recovered"), lost: GS.t("fallen") }[best.status] || best.status;
      var om = best.omen && GS.Meta ? GS.Meta.omen(best.omen) : null;
      var landHint = best.status !== "scouted"
        ? GS.t("already", st)
        : (this.touch ? GS.t("hoverLandTouch") : GS.t("hoverLand"));
      this.ui.setTooltip(
        '<div class="tt-title">' + GS.loc(best) + "</div>" +
        '<div class="tt-sub">' + GS.loc(GS.BIOMES[best.biome]) + " · " + GS.t("threat") + " " + best.difficulty + " · " + st +
        (om && om.id !== "calm" ? " · " + GS.loc(om) : "") + "</div>" +
        "<div>" + landHint + "</div>",
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
      lines.push('<div class="tt-title">' + def.ch + " " + GS.loc(def) + "</div>");
      lines.push('<div class="tt-sub">' + (GS.loc(def, "look") || def.look) + "</div>");
    }
    for (var i = 0; i < b.entities.length; i++) {
      var e = b.entities[i];
      if (!e.alive) continue;
      if ((e.x | 0) === tile.x && (e.y | 0) === tile.y) {
        var role = GS.loc(GS.ROLES[e.role] || { name: e.kind }) || e.kind;
        lines.push("<div>" + e.ch + " <b>" + GS.loc(e) + "</b> " + role + " " + Math.ceil(e.hp) + "/" + e.maxHp + "</div>");
      }
    }
    for (i = 0; i < b.houses.length; i++) {
      var h = b.houses[i];
      if (h.x === tile.x && h.y === tile.y) {
        lines.push("<div>⌂ " + GS.houseName(h, b) + " " + Math.max(0, h.hp | 0) + "/" + h.maxHp + (h.alive ? "" : " " + GS.t("burnedShort")) + "</div>");
      }
    }
    if (this.mode === "sandbox" && this.sandboxTool === "paint") {
      lines.push("<div>" + GS.t("paintBrush", GS.loc(GS.tileDef(this.sandboxBrush))) + "</div>");
    }
    this.ui.setTooltip(lines.join(""), cx, cy);
  };

  GS.Game = Game;
})(typeof window !== "undefined" ? window : globalThis);
