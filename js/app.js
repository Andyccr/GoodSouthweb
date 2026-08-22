/* Good South — mode orchestration, desktop input, HUD */
(function (g) {
  var GS = g.GS || (g.GS = {});
  var C = GS.C;
  var $ = function (id) { return document.getElementById(id); };

  var HIRE = {
    infantry: { cost: 6, soldiers: 10, name: "盾兵" },
    archer: { cost: 8, soldiers: 8, name: "弓手" },
    pike: { cost: 7, soldiers: 9, name: "枪兵" },
  };

  var BRUSHES = [
    GS.T.GRASS, GS.T.BEACH, GS.T.HILL, GS.T.TREE, GS.T.WALL,
    GS.T.HOUSE, GS.T.SHALLOW, GS.T.ROCK, GS.T.CLIFF, GS.T.PATH, GS.T.MUD,
  ];

  function newArmy(rng) {
    function cmd(cls) {
      return {
        id: "c" + Math.random().toString(36).slice(2, 8),
        name: GS.names.dwarf(rng),
        cls: cls,
        level: 1,
        xp: 0,
        soldiers: HIRE[cls].soldiers,
        maxSoldiers: HIRE[cls].soldiers + 2,
        trait: rng.chance(0.45) ? rng.pick(GS.TRAITS).id : null,
        dead: false,
      };
    }
    return {
      coins: 10,
      commanders: [cmd("infantry"), cmd("infantry"), cmd("archer")],
      islandsCleared: 0,
    };
  }

  function App() {
    this.mode = "title";
    this.rng = GS.rng(Date.now() >>> 0);
    this.army = newArmy(this.rng);
    this.campaign = null;
    this.battle = null;
    this.island = null;
    this.campCursor = 0;
    this.renderer = new GS.Renderer($("view"));
    this.ui = new GS.UI();
    this.hover = { x: -1, y: -1 };
    this.pointer = { x: 0, y: 0, down: false, button: 0 };
    this.sandboxTool = "place";
    this.sandboxBrush = GS.T.GRASS;
    this.seedInput = String((Math.random() * 99999) | 0);
    this.last = 0;
    this.keys = {};
    this.lookText = "";
    this.palette = "df";
    this.hudDirty = true;
    this._lastAnnounce = -1;
    this._bind();
    this._wireUI();
    this.showTitle();
    var self = this;
    requestAnimationFrame(function loop(t) {
      self.frame(t);
      requestAnimationFrame(loop);
    });
  }

  App.prototype._bind = function () {
    var self = this;
    var view = $("view");
    view.tabIndex = 0;

    window.addEventListener("keydown", function (e) { self.onKey(e); });
    window.addEventListener("keyup", function (e) { self.keys[e.key] = false; });

    view.addEventListener("pointerdown", function (e) { self.onPointerDown(e); });
    view.addEventListener("pointermove", function (e) { self.onPointerMove(e); });
    view.addEventListener("pointerup", function (e) { self.onPointerUp(e); });
    view.addEventListener("pointerleave", function () {
      self.pointer.down = false;
      self.ui.hideTooltip();
      self.hover = { x: -1, y: -1 };
    });
    view.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    view.addEventListener("wheel", function (e) {
      if (self.mode !== "battle" && self.mode !== "sandbox") return;
      e.preventDefault();
      if (!self.battle) return;
      var sq = self.battle.getSquad(self.battle.selected);
      if (!sq) return;
      if (e.deltaY > 0) self.battle.rotateSquad(self.battle.selected, (sq.facing + 1) & 3);
      else self.battle.rotateSquad(self.battle.selected, (sq.facing + 3) & 3);
      self.hudDirty = true;
    }, { passive: false });

    window.addEventListener("resize", function () {
      self.hudDirty = true;
      self.render();
    });
    document.body.addEventListener("pointerdown", function () { GS.audio.unlock(); }, { once: true });

    // side panel delegation
    ["left", "right"].forEach(function (id) {
      $(id).addEventListener("click", function (e) {
        var t = e.target.closest("[data-act]");
        if (!t) return;
        self.handleAct(t.getAttribute("data-act"), t.getAttribute("data-arg"));
      });
    });

    $("genbtn").addEventListener("click", function () { self.regenSandbox(); });
    ["seedbox", "biomebox", "diffbox"].forEach(function (id) {
      var n = $(id);
      if (!n) return;
      n.addEventListener("keydown", function (e) { e.stopPropagation(); });
      n.addEventListener("mousedown", function (e) { e.stopPropagation(); });
    });
  };

  App.prototype._wireUI = function () {
    var self = this;
    this.ui.on("fight", function () { self.enterBattle(); });
    this.ui.on("start", function () { if (self.battle) self.battle.startFight(); self.hudDirty = true; self.ui.toast("开战。", "warn"); });
    this.ui.on("pause", function () {
      if (!self.battle) return;
      self.battle.setSpeed(self.battle.speed ? 0 : 1);
      self.hudDirty = true;
    });
    this.ui.on("spd", function (a) { if (self.battle) self.battle.setSpeed(+a); self.hudDirty = true; });
    this.ui.on("rotate", function () { if (self.battle) self.battle.rotateSquad(self.battle.selected); self.hudDirty = true; });
    this.ui.on("evac", function () { if (self.battle) self.battle.evacuate(); });
    this.ui.on("look", function () {
      if (!self.battle) return;
      self.battle.look = !self.battle.look;
      self.lookText = self.battle.lookAt(self.battle.cursor.x, self.battle.cursor.y);
      self.hudDirty = true;
    });
    this.ui.on("hire", function () { self.showHire(); });
    this.ui.on("back-camp", function () { self.showCampaign(); });
    this.ui.on("title", function () { self.showTitle(); });
    this.ui.on("help", function () { self.showHelp(); });
    this.ui.on("pal", function () { self.cyclePalette(); self.hudDirty = true; });
    this.ui.on("mute", function () {
      var m = GS.audio.toggle();
      self.ui.toast(m ? "已静音" : "音效开启", "info");
      self.hudDirty = true;
    });
    this.ui.on("select-squad", function (id) {
      if (self.battle) self.battle.selected = id;
      self.hudDirty = true;
      $("view").focus();
    });
    this.ui.on("open-island", function (id) { self.openIsland(+id); });
    this.ui.on("tool-place", function () {
      self.sandboxTool = "place";
      self.ui.toast("布置模式", "info");
      self.hudDirty = true;
    });
    this.ui.on("tool-paint", function () {
      self.sandboxTool = "paint";
      self.ui.toast("地形刷：" + GS.tileDef(self.sandboxBrush).name, "info");
      self.hudDirty = true;
    });
    this.ui.on("brush-next", function () {
      var i = BRUSHES.indexOf(self.sandboxBrush);
      self.sandboxBrush = BRUSHES[(i + 1) % BRUSHES.length];
      self.sandboxTool = "paint";
      self.ui.toast("地形刷：" + GS.tileDef(self.sandboxBrush).name, "info");
      self.hudDirty = true;
    });
    this.ui.on("spawn-enemy", function () {
      if (!self.battle) return;
      self.battle.spawnEnemy("raider", self.battle.cursor.x, self.battle.cursor.y);
      self.hudDirty = true;
    });
    this.ui.on("spawn-ship", function () { if (self.battle) self.battle.spawnShip(); self.hudDirty = true; });
    this.ui.on("spawn-ally", function () {
      if (!self.battle) return;
      var roles = ["infantry", "archer", "pike"];
      self.battle.spawnPlayerUnit(roles[(Math.random() * 3) | 0], self.battle.cursor.x, self.battle.cursor.y);
      self.hudDirty = true;
    });
    this.ui.on("gen", function () { self.regenSandbox(); });
    this.ui.on("campaign", function () { self.startCampaign(); });
    this.ui.on("continue", function () { self.load(); });
    this.ui.on("sandbox", function () { self.startSandbox(); });
    this.ui.on("buy", function (a) { self.buyCommander(a); });
    this.ui.on("next", function () { self.afterResult(); });
    this.ui.on("retry", function () { self.retryIsland(); });
  };

  App.prototype.frame = function (t) {
    if (!this.last) this.last = t;
    var dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    if (this.battle && (this.mode === "battle" || this.mode === "sandbox")) {
      var before = this.battle.log.length;
      this.battle.tick(dt);
      if (this.battle.log.length > before) {
        var last = this.battle.log[this.battle.log.length - 1];
        if (/第 |长船|胜利|陷落|点燃|开战/.test(last.msg)) {
          this.ui.toast(last.msg, /陷落|点燃|完了/.test(last.msg) ? "bad" : /胜利|守住/.test(last.msg) ? "ok" : "warn");
        }
        this.hudDirty = true;
      }
      if (this.battle.phase === "over" && this.mode === "battle") this.showResult();
    }
    this.render();
    if (this.hudDirty || !this._hudT || t - this._hudT > 120) {
      this.renderHud();
      this.hudDirty = false;
      this._hudT = t;
    }
  };

  App.prototype._typing = function () {
    var a = document.activeElement;
    if (!a) return false;
    var tag = (a.tagName || "").toLowerCase();
    return tag === "input" || tag === "select" || tag === "textarea" || a.isContentEditable;
  };

  App.prototype.showTitle = function () {
    this.mode = "title";
    this.battle = null;
    this.ui.setToolbar([]);
    this.ui.setCommands([]);
    this.ui.hideTooltip();
    $("sandbox-tools").classList.remove("visible");
    $("phase-banner").classList.add("hidden");
    $("overlay").classList.remove("hidden");
    $("overlay").innerHTML =
      '<div class="panel title-panel">' +
      "<pre class=\"ascii-logo\">" +
      "  ██████╗  ██████╗  ██████╗ ██████╗     ███████╗ ██████╗ ██╗   ██╗████████╗██╗  ██╗\n" +
      " ██╔════╝ ██╔═══██╗██╔═══██╗██╔══██╗    ██╔════╝██╔═══██╗██║   ██║╚══██╔══╝██║  ██║\n" +
      " ██║  ███╗██║   ██║██║   ██║██║  ██║    ███████╗██║   ██║██║   ██║   ██║   ███████║\n" +
      " ██║   ██║██║   ██║██║   ██║██║  ██║    ╚════██║██║   ██║██║   ██║   ██║   ██╔══██║\n" +
      " ╚██████╔╝╚██████╔╝╚██████╔╝██████╔╝    ███████║╚██████╔╝╚██████╔╝   ██║   ██║  ██║\n" +
      "  ╚═════╝  ╚═════╝  ╚═════╝ ╚═════╝     ╚══════╝ ╚═════╝  ╚═════╝    ╚═╝   ╚═╝  ╚═╝\n" +
      "</pre>" +
      '<div class="sub">南 境 据 点  ·  矮人要塞风格 ASCII 塔防沙盒</div>' +
      '<div class="flavor">北蛮的长船正在南下。你是南境的寨主。守住屋舍，别让盐风草被烧成灰。</div>' +
      '<div class="menu">' +
      (this._hasSave() ? '<button data-act="continue"><kbd>D</kbd> 继续征程 — 读取上次海图</button>' : "") +
      '<button data-act="campaign"><kbd>A</kbd> 战役模式 — 群岛远征</button>' +
      '<button data-act="sandbox"><kbd>B</kbd> 沙盒模式 — 随机构图 / 刷子 / 刷兵</button>' +
      '<button data-act="help"><kbd>C</kbd> / <kbd>F1</kbd> 手册 — 规则与按键</button>' +
      "</div>" +
      '<div class="hint">桌面推荐：鼠标悬停预览阵型 · 左键布置 · 右键/滚轮转向 · WASD 移光标 · 1–9 选兵团</div>' +
      "</div>";
    this._menuButtons();
    this.hudDirty = true;
  };

  App.prototype._menuButtons = function () {
    var self = this;
    $("overlay").querySelectorAll("button[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        GS.audio.ui();
        self.handleAct(btn.getAttribute("data-act"), btn.getAttribute("data-arg"));
      });
    });
  };

  App.prototype.handleAct = function (act, arg) {
    if (this.ui._handlers[act]) {
      this.ui._handlers[act](arg);
      return;
    }
    if (act === "campaign") this.startCampaign();
    else if (act === "continue") this.load();
    else if (act === "sandbox") this.startSandbox();
    else if (act === "help") this.showHelp();
    else if (act === "title") this.showTitle();
    else if (act === "fight") this.enterBattle();
    else if (act === "hire") this.showHire();
    else if (act === "buy") this.buyCommander(arg);
    else if (act === "back-camp") this.showCampaign();
    else if (act === "next") this.afterResult();
    else if (act === "retry") this.retryIsland();
  };

  App.prototype.startCampaign = function () {
    var seed = (Math.random() * 0x7fffffff) | 0;
    this.rng = GS.rng(seed);
    this.army = newArmy(this.rng);
    this.campaign = GS.mapgen.campaign(seed, 12);
    this.campCursor = 0;
    this.save();
    this.ui.toast("远征开始。西侧家园已侦察。", "ok");
    this.showCampaign();
  };

  App.prototype._hasSave = function () {
    try { return !!localStorage.getItem("goodsouth-save"); } catch (e) { return false; }
  };

  App.prototype.save = function () {
    if (!this.campaign || !this.army) return;
    try {
      localStorage.setItem("goodsouth-save", JSON.stringify({ army: this.army, campaign: this.campaign }));
    } catch (e) { /* ignore */ }
  };

  App.prototype.load = function () {
    try {
      var s = JSON.parse(localStorage.getItem("goodsouth-save") || "null");
      if (!s || !s.campaign || !s.army) {
        this.ui.toast("没有可用存档。", "warn");
        return false;
      }
      this.army = s.army;
      this.campaign = s.campaign;
      this.campCursor = this.campaign.current || 0;
      this.ui.toast("已读取征程。", "ok");
      this.showCampaign();
      return true;
    } catch (e) {
      return false;
    }
  };

  App.prototype.showCampaign = function () {
    this.mode = "campaign";
    this.battle = null;
    $("overlay").classList.add("hidden");
    $("sandbox-tools").classList.remove("visible");
    $("phase-banner").classList.add("hidden");
    this.ui.hideTooltip();
    this.hudDirty = true;
    $("view").focus();
  };

  App.prototype.openIsland = function (id) {
    var node = this.campaign.islands[id];
    if (!node || node.status === "hidden") return;
    if (node.status === "cleared") {
      this.ui.toast(node.name + " 已经收复。", "info");
      return;
    }
    this.campaign.current = id;
    this.island = GS.mapgen.island(node.seed, {
      biome: node.biome,
      difficulty: node.difficulty,
      name: node.name,
    });
    this.mode = "preview";
    this.ui.setToolbar([]);
    this.ui.setCommands([]);
    $("overlay").classList.remove("hidden");
    var landings = this.island.landingDirs.map(function (d) { return GS.DIRS[d].name; }).join("、");
    $("overlay").innerHTML =
      '<div class="panel preview-panel">' +
      "<h2>将至 · " + this.island.name + "</h2>" +
      '<div class="flavor">' + this.island.flavor + "  ·  " + GS.BIOMES[this.island.biome].name +
      "  ·  威胁 " + "▲".repeat(this.island.difficulty) + "</div>" +
      "<pre class=\"mini\">" + this._asciiMini(this.island) + "</pre>" +
      "<p>屋舍 " + this.island.houses.length + " 座。登陆方向：<b>" + landings + "</b>。</p>" +
      "<p>民居：" + this.island.houses.map(function (h) { return h.name; }).join("、") + "。</p>" +
      '<div class="menu">' +
      '<button data-act="fight"><kbd>G</kbd> 登陆布置兵团</button>' +
      '<button data-act="hire"><kbd>N</kbd> 招募 / 钱币 ' + this.army.coins + "</button>" +
      '<button data-act="back-camp"><kbd>Q</kbd> 返回海图</button>' +
      "</div></div>";
    this._menuButtons();
  };

  App.prototype._asciiMini = function (island) {
    var stepX = Math.max(1, Math.ceil(island.w / 52));
    var stepY = Math.max(1, Math.ceil(island.h / 18));
    var lines = [];
    for (var y = 0; y < island.h; y += stepY) {
      var row = "";
      for (var x = 0; x < island.w; x += stepX) row += island.tiles[y][x].ch;
      lines.push(row);
    }
    return lines.join("\n");
  };

  App.prototype.enterBattle = function () {
    $("overlay").classList.add("hidden");
    this.mode = "battle";
    this.battle = new GS.Battle(this.island, this.army, { sandbox: false });
    this.sandboxTool = "place";
    this.hudDirty = true;
    $("view").focus();
    this.ui.toast("布置兵团，面朝黄闪登陆点。", "info");
  };

  App.prototype.showHire = function () {
    this.mode = "hire";
    this.ui.setToolbar([]);
    this.ui.setCommands([]);
    $("overlay").classList.remove("hidden");
    var list = this.army.commanders.map(function (c) {
      var role = GS.ROLES[c.cls];
      var trait = "";
      if (c.trait) {
        for (var i = 0; i < GS.TRAITS.length; i++) if (GS.TRAITS[i].id === c.trait) trait = GS.TRAITS[i].name;
      }
      return "<li>" + (c.dead ? "<s>" : "") + role.ch + " " + c.name + "  " + role.name +
        "  Lv" + c.level + "  兵" + c.soldiers + "/" + c.maxSoldiers +
        (trait ? "  [" + trait + "]" : "") + (c.dead ? "</s> 阵亡" : "") + "</li>";
    }).join("");
    $("overlay").innerHTML =
      '<div class="panel">' +
      "<h2>招募厅  ·  钱币 " + this.army.coins + "</h2>" +
      "<ul class=\"roster\">" + list + "</ul>" +
      '<div class="menu">' +
      '<button data-act="buy" data-arg="infantry">招募盾兵  (' + HIRE.infantry.cost + ")</button>" +
      '<button data-act="buy" data-arg="archer">招募弓手  (' + HIRE.archer.cost + ")</button>" +
      '<button data-act="buy" data-arg="pike">招募枪兵  (' + HIRE.pike.cost + ")</button>" +
      '<button data-act="back-camp"><kbd>Q</kbd> 返回</button>' +
      "</div><p class=\"hint\">阵亡队长无法复活。胜利按残存屋舍得钱，并可能晋升。</p></div>";
    this._menuButtons();
  };

  App.prototype.buyCommander = function (cls) {
    var h = HIRE[cls];
    if (!h) return;
    if (this.army.coins < h.cost) {
      this.ui.toast("钱币不够。", "bad");
      this.showHire();
      return;
    }
    this.army.coins -= h.cost;
    var rng = this.rng;
    this.army.commanders.push({
      id: "c" + Math.random().toString(36).slice(2, 8),
      name: GS.names.dwarf(rng),
      cls: cls,
      level: 1,
      xp: 0,
      soldiers: h.soldiers,
      maxSoldiers: h.soldiers + 2,
      trait: rng.chance(0.4) ? rng.pick(GS.TRAITS).id : null,
      dead: false,
    });
    GS.audio.coin();
    this.save();
    this.ui.toast("新队长入列。", "ok");
    this.showHire();
  };

  App.prototype.showResult = function () {
    if (this.mode === "result") return;
    this.mode = "result";
    this.ui.setToolbar([]);
    this.ui.setCommands([]);
    $("phase-banner").classList.add("hidden");
    var o = this.battle.outcome;
    var node = this.campaign.islands[this.campaign.current];
    if (o.kind === "victory") {
      node.status = "cleared";
      this.army.coins += o.coins;
      this.army.islandsCleared++;
      for (var r = 0; r < this.army.commanders.length; r++) {
        var cmd = this.army.commanders[r];
        if (!cmd.dead) cmd.soldiers = Math.min(cmd.maxSoldiers, cmd.soldiers + 2);
      }
      for (var i = 0; i < node.edges.length; i++) {
        var n = this.campaign.islands[node.edges[i]];
        if (n.status === "hidden") n.status = "scouted";
      }
    } else if (o.kind === "defeat") {
      node.status = "lost";
      for (i = 0; i < node.edges.length; i++) {
        n = this.campaign.islands[node.edges[i]];
        if (n.status === "hidden") n.status = "scouted";
      }
    }
    this.save();
    var living = this.army.commanders.filter(function (c) { return !c.dead && c.soldiers > 0; }).length;
    $("overlay").classList.remove("hidden");
    $("overlay").innerHTML =
      '<div class="panel">' +
      "<h2>" + (o.kind === "victory" ? "胜利" : o.kind === "retreat" ? "撤退" : "陷落") + " — " + this.island.name + "</h2>" +
      "<p>" + o.msg + "</p>" +
      "<p>残存屋舍 " + o.housesLeft + "/" + o.housesTotal + "　获得钱币 " + o.coins + "　现有 " + this.army.coins + "</p>" +
      "<p>仍可作战的队长：" + living + "</p>" +
      '<div class="menu">' +
      (living ? '<button data-act="next">继续海图</button>' : '<button data-act="title">南境沦陷 · 返回标题</button>') +
      (o.kind !== "victory" && living ? '<button data-act="retry">再攻此岛</button>' : "") +
      "</div></div>";
    this._menuButtons();
  };

  App.prototype.afterResult = function () {
    var living = this.army.commanders.filter(function (c) { return !c.dead && c.soldiers > 0; }).length;
    if (!living) {
      this.showTitle();
      return;
    }
    var allDone = this.campaign.islands.every(function (i) { return i.status === "cleared" || i.status === "lost"; });
    if (allDone) {
      $("overlay").innerHTML =
        '<div class="panel"><h2>群岛纪事终章</h2><p>南境的岛链或守或弃，潮水暂时平了。收复 ' +
        this.army.islandsCleared + " 座岛。钱币 " + this.army.coins + "。</p>" +
        '<div class="menu"><button data-act="title">返回标题</button></div></div>';
      this._menuButtons();
      return;
    }
    this.showCampaign();
  };

  App.prototype.retryIsland = function () {
    var node = this.campaign.islands[this.campaign.current];
    node.status = "scouted";
    this.island = GS.mapgen.island(node.seed, { biome: node.biome, difficulty: node.difficulty, name: node.name });
    this.enterBattle();
  };

  App.prototype.startSandbox = function () {
    this.mode = "sandbox";
    this.seedInput = String((Math.random() * 99999) | 0);
    if ($("seedbox")) $("seedbox").value = this.seedInput;
    this.army = newArmy(GS.rng(GS.hashStr("sandbox" + this.seedInput)));
    this.island = GS.mapgen.island(GS.hashStr(this.seedInput), { difficulty: 3, biome: "verdant" });
    this.battle = new GS.Battle(this.island, this.army, { sandbox: true });
    this.sandboxTool = "place";
    $("overlay").classList.add("hidden");
    this.hudDirty = true;
    $("view").focus();
    this.ui.toast("沙盒就绪。T 刷地，Z 布置。", "info");
  };

  App.prototype.regenSandbox = function () {
    var seed = $("seedbox") ? $("seedbox").value : this.seedInput;
    this.seedInput = seed || String((Math.random() * 99999) | 0);
    if ($("seedbox")) $("seedbox").value = this.seedInput;
    var biome = $("biomebox") ? $("biomebox").value : "verdant";
    var diff = $("diffbox") ? +$("diffbox").value : 3;
    this.island = GS.mapgen.island(GS.hashStr(String(this.seedInput)), { difficulty: diff, biome: biome });
    this.army = this.army || newArmy(GS.rng(GS.hashStr(this.seedInput)));
    this.battle = new GS.Battle(this.island, this.army, { sandbox: true });
    this.mode = "sandbox";
    $("overlay").classList.add("hidden");
    this.hudDirty = true;
    this.ui.toast("新岛：" + this.island.name, "ok");
    $("view").focus();
  };

  App.prototype.showHelp = function () {
    this.mode = "help";
    this.ui.setToolbar([]);
    this.ui.setCommands([]);
    $("overlay").classList.remove("hidden");
    $("overlay").innerHTML =
      '<div class="panel help-panel"><h2>南境手册</h2>' +
      "<h3>这是什么</h3>" +
      "<p>网页版岛屿塔防沙盒，玩法模仿 <b>Bad North</b>。画面用矮人要塞式 ASCII / 16 色。</p>" +
      "<h3>桌面操作</h3>" +
      "<pre class=\"keys\">" +
      "鼠标左键        布置 / 选中兵团 / 刷地（按住拖拽）\n" +
      "鼠标右键        旋转朝向\n" +
      "鼠标滚轮        旋转朝向\n" +
      "鼠标中键 / '    观察格详细信息\n" +
      "悬停            阵型预览（青=可落 红=不可）\n" +
      "WASD / 方向键   移动光标（亦可 HJKL）\n" +
      "1–9             选中对应兵团\n" +
      "[  ]            减速 / 加速\n" +
      "空格            暂停 / 继续\n" +
      "G               开战          R 旋转     Tab 下一兵团\n" +
      "E               撤退          P 调色     - 静音\n" +
      "沙盒 T 地形刷  Z 布置  N 蛮兵  B 船  C 己方  Shift+G 新图\n" +
      "</pre>" +
      "<h3>图例</h3>" +
      "<pre class=\"keys\">" +
      "≈深海 ~浅海 .沙滩 ,草地 n丘陵 ▲悬崖 #岩石 ♣树 ⌂屋 █墙\n" +
      "☻盾 }弓 ↑枪   黄闪箭头=登陆点   选中兵团前方有朝向箭头\n" +
      "</pre>" +
      '<div class="menu"><button data-act="title"><kbd>Q</kbd> 返回标题</button></div></div>';
    this._menuButtons();
  };

  App.prototype.cyclePalette = function () {
    this.palette = this.palette === "df" ? "green" : this.palette === "green" ? "amber" : "df";
    this.renderer.setPalette(this.palette);
    this.ui.toast("调色：" + ({ df: "经典 DF", green: "绿磷", amber: "琥珀" })[this.palette], "info");
  };

  /* ---------- input ---------- */

  App.prototype.onKey = function (e) {
    if (this._typing()) return;
    this.keys[e.key] = true;
    var k = e.key;

    if (k === "F1" || k === "?") { e.preventDefault(); this.showHelp(); return; }

    if (this.mode === "title") {
      if (k === "a" || k === "A" || k === "Enter") this.startCampaign();
      if (k === "b" || k === "B") this.startSandbox();
      if (k === "c" || k === "C") this.showHelp();
      if (k === "d" || k === "D") this.load();
      return;
    }
    if (this.mode === "campaign") { this._campKey(e); return; }
    if (this.mode === "preview") {
      if (k === "g" || k === "G") this.enterBattle();
      if (k === "q" || k === "Q" || k === "Escape") this.showCampaign();
      if (k === "n" || k === "N") this.showHire();
      return;
    }
    if (this.mode === "hire") {
      if (k === "q" || k === "Q" || k === "Escape") this.showCampaign();
      return;
    }
    if (this.mode === "help") {
      if (k === "Escape" || k === "q" || k === "Q") this.showTitle();
      return;
    }
    if (this.mode === "result") {
      if (k === "Enter" || k === " ") this.afterResult();
      if (k === "Escape" || k === "q" || k === "Q") this.afterResult();
      return;
    }
    if (this.mode === "battle" || this.mode === "sandbox") this._battleKey(e);
  };

  App.prototype._campKey = function (e) {
    var k = e.key;
    var ids = this.campaign.islands.filter(function (i) { return i.status !== "hidden"; }).map(function (i) { return i.id; });
    var idx = ids.indexOf(this.campCursor);
    if (idx < 0) idx = 0;
    if (["ArrowRight", "l", "L", "d", "D"].indexOf(k) >= 0) idx = Math.min(ids.length - 1, idx + 1);
    if (["ArrowLeft", "h", "H", "a", "A"].indexOf(k) >= 0) idx = Math.max(0, idx - 1);
    if (["ArrowDown", "j", "J", "s", "S"].indexOf(k) >= 0) idx = Math.min(ids.length - 1, idx + 1);
    if (["ArrowUp", "k", "K", "w", "W"].indexOf(k) >= 0) idx = Math.max(0, idx - 1);
    if (ids[idx] !== this.campCursor) {
      this.campCursor = ids[idx];
      this.hudDirty = true;
      e.preventDefault();
    }
    if (k === "Enter" || k === "g" || k === "G") this.openIsland(this.campCursor);
    if (k === "n" || k === "N") this.showHire();
    if (k === "q" || k === "Escape") this.showTitle();
    if (k === "p" || k === "P") this.cyclePalette();
    if (k === "-" || k === "_") GS.audio.toggle();
  };

  App.prototype._battleKey = function (e) {
    var b = this.battle;
    if (!b) return;
    var k = e.key;
    var prevent = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Tab", "w", "a", "s", "d", "W", "A", "S", "D"].indexOf(k) >= 0;
    if (prevent) e.preventDefault();

    var dx = 0, dy = 0;
    if (k === "ArrowLeft" || k === "h" || k === "H" || k === "a" || k === "A") dx = -1;
    if (k === "ArrowRight" || k === "l" || k === "L" || k === "d" || k === "D") dx = 1;
    if (k === "ArrowUp" || k === "k" || k === "w" || k === "W") dy = -1;
    if (k === "ArrowDown" || k === "j" || k === "J" || k === "s" || k === "S") dy = 1;

    if (k === "K" || k === "'" || k === ";") {
      b.look = !b.look;
      this.lookText = b.lookAt(b.cursor.x, b.cursor.y);
      this.hudDirty = true;
      return;
    }
    if (dx || dy) {
      b.cursor.x = Math.max(0, Math.min(b.w - 1, b.cursor.x + dx));
      b.cursor.y = Math.max(0, Math.min(b.h - 1, b.cursor.y + dy));
      this.hover = { x: b.cursor.x, y: b.cursor.y };
      if (b.look) this.lookText = b.lookAt(b.cursor.x, b.cursor.y);
      this.hudDirty = true;
      return;
    }

    // 1-9 select squad
    if (/^[1-9]$/.test(k) && !e.altKey) {
      var sqs = b.squads.filter(function (s) { return s.soldiers > 0; });
      var n = (+k) - 1;
      if (sqs[n]) {
        b.selected = sqs[n].id;
        this.ui.toast("选中 " + sqs[n].name, "info");
        this.hudDirty = true;
      }
      return;
    }

    if (k === "Tab") {
      e.preventDefault();
      sqs = b.squads.filter(function (s) { return s.soldiers > 0; });
      if (!sqs.length) return;
      var i = 0;
      for (; i < sqs.length; i++) if (sqs[i].id === b.selected) break;
      b.selected = sqs[(i + 1) % sqs.length].id;
      this.hudDirty = true;
      return;
    }

    if (k === "r" || k === "R") { b.rotateSquad(b.selected); this.hudDirty = true; }
    if (k === "Enter") this._tryPlace();
    if (k === "g" || k === "G") {
      if (this.mode === "sandbox" && e.shiftKey) this.regenSandbox();
      else {
        b.startFight();
        this.ui.toast("角声响起。", "warn");
        this.hudDirty = true;
      }
    }
    if (k === " ") { b.setSpeed(b.speed ? 0 : 1); this.hudDirty = true; }
    if (k === "]") { b.setSpeed(Math.min(3, (b.speed || 1) + 1)); this.hudDirty = true; }
    if (k === "[") {
      if (b.phase === "deploy") b.startFight();
      b.setSpeed(Math.max(0, (b.speed || 1) - 1));
      this.hudDirty = true;
    }
    if (k === "e" || k === "E") b.evacuate();
    if ((k === "m" || k === "M") && this.mode === "battle") this.showCampaign();
    if (k === "q" || k === "Escape") {
      if (this.mode === "sandbox") this.showTitle();
      else this.showCampaign();
    }
    if (k === "p" || k === "P") this.cyclePalette();
    if (k === "-" || k === "_") {
      var muted = GS.audio.toggle();
      this.ui.toast(muted ? "已静音" : "音效开启", "info");
    }
    if (this.mode === "sandbox") this._sandboxKey(k);
  };

  App.prototype._sandboxKey = function (k) {
    var b = this.battle;
    if (k === "t" || k === "T") {
      var i = BRUSHES.indexOf(this.sandboxBrush);
      this.sandboxBrush = BRUSHES[(i + 1) % BRUSHES.length];
      this.sandboxTool = "paint";
      this.ui.toast("地形刷：" + GS.tileDef(this.sandboxBrush).name, "info");
      this.hudDirty = true;
    }
    if (k === "n" || k === "N") {
      b.spawnEnemy("raider", b.cursor.x, b.cursor.y);
      this.hudDirty = true;
    }
    if (k === "b" || k === "B") { b.spawnShip(); this.hudDirty = true; }
    if (k === "c" || k === "C") {
      var roles = ["infantry", "archer", "pike"];
      b.spawnPlayerUnit(roles[(Math.random() * 3) | 0], b.cursor.x, b.cursor.y);
      this.hudDirty = true;
    }
    if (k === "v" || k === "V") { b.spawnEnemy("jarl", b.cursor.x, b.cursor.y); this.hudDirty = true; }
    if (k === "x" || k === "X") { b.spawnEnemy("thrower", b.cursor.x, b.cursor.y); this.hudDirty = true; }
    if (k === "z" || k === "Z") {
      this.sandboxTool = "place";
      this.ui.toast("布置模式", "info");
      this.hudDirty = true;
    }
  };

  App.prototype._tryPlace = function () {
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

  App.prototype.onPointerDown = function (e) {
    $("view").focus();
    this.pointer.down = true;
    this.pointer.button = e.button;
    var tile = this._tileFromEvent(e);
    if (!tile) return;

    if (this.mode === "campaign") {
      this._campaignClick(tile);
      return;
    }
    if (this.mode !== "battle" && this.mode !== "sandbox") return;
    var b = this.battle;
    b.cursor.x = tile.x;
    b.cursor.y = tile.y;
    this.hover = { x: tile.x, y: tile.y };

    if (e.button === 2) {
      b.rotateSquad(b.selected);
      this.hudDirty = true;
      return;
    }
    if (e.button === 1) {
      e.preventDefault();
      b.look = true;
      this.lookText = b.lookAt(tile.x, tile.y);
      this.hudDirty = true;
      return;
    }
    if (e.button !== 0) return;

    // select squad under cursor
    for (var i = 0; i < b.entities.length; i++) {
      var en = b.entities[i];
      if (en.alive && en.kind === "soldier" && (en.x | 0) === tile.x && (en.y | 0) === tile.y) {
        if (en.squadId !== b.selected) {
          b.selected = en.squadId;
          this.hudDirty = true;
          GS.audio.ui();
          return;
        }
        break;
      }
    }
    this._tryPlace();
  };

  App.prototype.onPointerMove = function (e) {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    var tile = this._tileFromEvent(e);
    if (!tile) {
      this.hover = { x: -1, y: -1 };
      this.ui.hideTooltip();
      return;
    }
    this.hover = tile;

    if (this.mode === "campaign") {
      this._campaignHover(tile, e.clientX, e.clientY);
      return;
    }
    if (this.mode !== "battle" && this.mode !== "sandbox") return;
    var b = this.battle;
    if (this.pointer.down && this.pointer.button === 0 && this.mode === "sandbox" && this.sandboxTool === "paint") {
      if (b.cursor.x !== tile.x || b.cursor.y !== tile.y) {
        b.cursor.x = tile.x;
        b.cursor.y = tile.y;
        this._tryPlace();
      }
    } else if (!this.pointer.down) {
      // soft-follow cursor for keyboardless placement
      b.cursor.x = tile.x;
      b.cursor.y = tile.y;
    }
    this._updateBattleTooltip(tile, e.clientX, e.clientY);
  };

  App.prototype.onPointerUp = function () {
    this.pointer.down = false;
  };

  App.prototype._tileFromEvent = function (e) {
    if (this.mode === "campaign" && this.campaign) {
      return this.renderer.tileAtPointer(e.clientX, e.clientY, this.campaign.w, this.campaign.h);
    }
    if (this.battle) {
      return this.renderer.tileAtPointer(e.clientX, e.clientY, this.battle.w, this.battle.h);
    }
    return null;
  };

  App.prototype._campaignClick = function (tile) {
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
      if (bd === 0 || bd === 1) this.openIsland(best.id);
    }
  };

  App.prototype._campaignHover = function (tile, cx, cy) {
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

  App.prototype._updateBattleTooltip = function (tile, cx, cy) {
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

  /* ---------- render ---------- */

  App.prototype.render = function () {
    if (this.mode === "campaign") {
      this.renderer.drawCampaign(this.campaign, this.army, this.campCursor, this.hover);
    } else if (this.battle && (this.mode === "battle" || this.mode === "sandbox")) {
      this.renderer.drawBattle(this.battle, this.hover, {
        tool: this.sandboxTool,
        brush: this.sandboxBrush,
      });
    }
  };

  App.prototype.renderHud = function () {
    var left = $("left");
    var right = $("right");
    var top = $("topbar");
    var bot = $("bottom");
    var tools = $("sandbox-tools");
    var banner = $("phase-banner");
    if (tools) tools.classList.toggle("visible", this.mode === "sandbox");

    if (this.mode === "title" || this.mode === "help" || this.mode === "hire" || this.mode === "preview" || this.mode === "result") {
      top.innerHTML = '<span class="brand">GOOD SOUTH</span><span class="chips">' +
        this.ui.chip("模式", "菜单", "cyan") + "</span>";
      bot.innerHTML = '<div class="hint-line">A 战役 · B 沙盒 · C 手册 · F1 随时打开帮助</div>';
      this.ui.setToolbar([]);
      this.ui.setCommands([]);
      return;
    }

    if (this.mode === "campaign") {
      banner.classList.add("hidden");
      var node = this.campaign.islands[this.campCursor];
      top.innerHTML = '<span class="brand">GOOD SOUTH</span><span class="chips">' +
        this.ui.chip("海图", "群岛", "cyan") +
        this.ui.chip("钱币", this.army.coins, "hi") +
        this.ui.chip("收复", this.army.islandsCleared, "ok") +
        this.ui.chip("调色", this.palette) +
        "</span>";
      left.innerHTML = this._campLeft(node);
      right.innerHTML = this._rosterHtml() + this._campIslandList() + this._legendHtml();
      bot.innerHTML = '<div class="hint-line">WASD/方向键选岛 · Enter/点击登陆 · N 招募 · P 调色 · Q 标题</div>';
      this.ui.setToolbar([
        { act: "hire", label: "招募", kbd: "N" },
        { act: "pal", label: "调色", kbd: "P" },
        { act: "mute", label: GS.audio.muted() ? "音效" : "静音", kbd: "-" },
        { act: "help", label: "手册", kbd: "?" },
        { sep: true },
        { act: "title", label: "标题", kbd: "Q" },
      ]);
      this.ui.setCommands(node && node.status === "scouted" ? [
        { act: "open-island", arg: String(node.id), label: "登陆 " + node.name, kbd: "G" },
      ] : []);
      return;
    }

    if (!this.battle) return;
    var b = this.battle;
    var cnt = b.counts();
    var waveDone = b.waves.filter(function (w) { return w.launched; }).length;
    var phaseLabel = b.phase === "deploy" ? "布置" : b.phase === "over" ? "结束" : (b.speed ? "×" + b.speed : "暂停");

    if (b.phase === "deploy") {
      banner.classList.remove("hidden");
      banner.textContent = "布置阶段 — 面向黄闪登陆点 · G 开战";
    } else if (b.phase === "fight" && b.speed === 0) {
      banner.classList.remove("hidden");
      banner.textContent = "暂停";
    } else {
      banner.classList.add("hidden");
    }

    top.innerHTML = '<span class="brand">' + b.island.name + "</span><span class=\"chips\">" +
      this.ui.chip("生态", GS.BIOMES[b.island.biome].name) +
      this.ui.chip("阶段", phaseLabel, b.phase === "deploy" ? "hi" : "cyan") +
      this.ui.chip("屋舍", cnt.houses + "/" + b.houses.length, cnt.houses < b.houses.length ? "warn" : "ok") +
      this.ui.chip("我军", cnt.soldiers) +
      this.ui.chip("北蛮", cnt.enemies, cnt.enemies ? "warn" : "") +
      (b.waves.length ? this.ui.chip("波次", waveDone + "/" + b.waves.length) : this.ui.chip("模式", "沙盒", "cyan")) +
      this.ui.chip("t", b.t.toFixed(1)) +
      "</span>";

    left.innerHTML = this._battleLeft(b);
    right.innerHTML = this._squadList(b) + this._logHtml(b) + this._legendHtml();
    bot.innerHTML = '<div class="hint-line">' + (this.mode === "sandbox"
      ? "拖拽刷地 · 右键/滚轮转向 · T地形 Z布置 · N蛮兵 B船 C己方 · G开战 Shift+G新图"
      : "悬停预览阵型 · 左键布置 · 右键/滚轮转向 · 1–9选兵 · [ ]变速 · 空格暂停 · G开战") + "</div>";

    this._updateBattleChrome(b);
  };

  App.prototype._updateBattleChrome = function (b) {
    var items = [];
    if (b.phase === "deploy") {
      items.push({ act: "start", label: "开战", kbd: "G", primary: true });
      items.push({ act: "rotate", label: "转向", kbd: "R" });
      items.push({ act: "look", label: b.look ? "观察中" : "观察", kbd: "'", active: b.look });
    } else if (b.phase === "fight") {
      items.push({ act: "pause", label: b.speed ? "暂停" : "继续", kbd: "␣", active: !b.speed });
      items.push({ act: "spd", arg: "1", label: "1×", active: b.speed === 1 });
      items.push({ act: "spd", arg: "2", label: "2×", active: b.speed === 2 });
      items.push({ act: "spd", arg: "3", label: "3×", active: b.speed === 3 });
      items.push({ sep: true });
      items.push({ act: "rotate", label: "转向", kbd: "R" });
      if (this.mode === "battle") items.push({ act: "evac", label: "撤退", kbd: "E", danger: true });
    }
    if (this.mode === "sandbox") {
      items.push({ sep: true });
      items.push({ act: "tool-place", label: "布置", kbd: "Z", active: this.sandboxTool === "place" });
      items.push({ act: "tool-paint", label: "刷地", kbd: "T", active: this.sandboxTool === "paint" });
      items.push({ act: "brush-next", label: GS.tileDef(this.sandboxBrush).name });
      items.push({ act: "spawn-enemy", label: "蛮兵", kbd: "N" });
      items.push({ act: "spawn-ship", label: "长船", kbd: "B" });
      items.push({ act: "spawn-ally", label: "己方", kbd: "C" });
      items.push({ act: "gen", label: "新岛" });
    }
    items.push({ sep: true });
    items.push({ act: "mute", label: GS.audio.muted() ? "音效" : "静音", kbd: "-" });
    items.push({ act: this.mode === "sandbox" ? "title" : "back-camp", label: this.mode === "sandbox" ? "标题" : "海图", kbd: "Q" });
    this.ui.setToolbar(items);

    var cmds = [];
    var sqs = b.squads.filter(function (s) { return s.soldiers > 0; });
    for (var i = 0; i < Math.min(sqs.length, 9); i++) {
      cmds.push({
        act: "select-squad",
        arg: sqs[i].id,
        label: GS.ROLES[sqs[i].role].ch + " " + sqs[i].name.split("·")[0],
        kbd: String(i + 1),
      });
    }
    this.ui.setCommands(cmds);
  };

  App.prototype._campLeft = function (node) {
    if (!node) return "<p>选一座岛。</p>";
    var st = { hidden: "未知", scouted: "未攻", cleared: "已收复", lost: "已陷" }[node.status] || node.status;
    return "<h3>" + node.name + "</h3>" +
      "<p>" + GS.BIOMES[node.biome].flavor + "</p>" +
      "<p>威胁 " + "▲".repeat(node.difficulty) + "　<span class='chip'>" + st + "</span></p>" +
      "<p>航线：" + node.edges.map(function (id) {
        return this.campaign.islands[id].name;
      }.bind(this)).join("、") + "</p>" +
      (node.status === "scouted"
        ? '<p><button data-act="open-island" data-arg="' + node.id + '">登陆此岛</button></p>'
        : "") +
      "<p class=\"hint\">只可进攻已侦察、尚未收复的岛。悬停海图可见简报。</p>";
  };

  App.prototype._campIslandList = function () {
    var html = "<h3>已知岛屿</h3>";
    for (var i = 0; i < this.campaign.islands.length; i++) {
      var is = this.campaign.islands[i];
      if (is.status === "hidden") continue;
      html += '<div class="island-item' + (is.id === this.campCursor ? " sel" : "") +
        '" data-act="open-island" data-arg="' + is.id + '">' +
        "<span>" + is.name + "</span><span class=\"hint\">" + is.status + " ▲" + is.difficulty + "</span></div>";
    }
    return html;
  };

  App.prototype._battleLeft = function (b) {
    var tile = b.island.tiles[b.cursor.y] && b.island.tiles[b.cursor.y][b.cursor.x];
    var def = tile ? GS.tileDef(tile.type) : null;
    var sq = b.getSquad(b.selected);
    var html = "<h3>观察</h3>";
    html += "<p>光标 (" + b.cursor.x + "," + b.cursor.y + ") " + (def ? def.ch + " " + def.name : "") + "</p>";
    if (this.lookText) html += "<pre class=\"look\">" + this.escape(this.lookText) + "</pre>";
    else if (def) html += "<p class=\"look\">" + def.look + "</p>";
    if (sq) {
      var role = GS.ROLES[sq.role];
      var trait = "";
      if (sq.trait) for (var i = 0; i < GS.TRAITS.length; i++) if (GS.TRAITS[i].id === sq.trait) trait = GS.TRAITS[i].name;
      html += "<h3>选中兵团</h3><p>" + role.ch + " <b>" + sq.name + "</b><br>" + role.name +
        "　朝" + GS.DIRS[sq.facing].name + GS.DIRS[sq.facing].ch + "<br>兵 " + sq.soldiers + "/" + sq.maxSoldiers +
        (trait ? "<br>特质 [" + trait + "]" : "") +
        (sq.placed ? "" : "<br><span class='warn'>尚未落子</span>") +
        (sq.moveCd > 0 ? "<br><span class='hint'>换阵冷却 " + sq.moveCd.toFixed(1) + "s</span>" : "") +
        "</p><p class=\"hint\">" + role.desc + "</p>";
    }
    html += "<h3>屋舍</h3><ul>";
    for (i = 0; i < b.houses.length; i++) {
      var h = b.houses[i];
      html += "<li>" + (h.alive ? "⌂" : "%") + " " + h.name + " " + this.ui.hpBar(h.hp, h.maxHp) + "</li>";
    }
    html += "</ul>";
    if (this.mode === "sandbox") {
      html += "<h3>沙盒</h3><p>工具 <b>" + (this.sandboxTool === "paint" ? "刷地 / " + GS.tileDef(this.sandboxBrush).name : "布置") +
        "</b></p><p class=\"hint\">顶栏可点选工具；按住左键拖拽连涂。</p>";
    }
    return html;
  };

  App.prototype._squadList = function (b) {
    var html = "<h3>兵团</h3>";
    var living = b.squads.filter(function (s) { return true; });
    for (var i = 0; i < living.length; i++) {
      var s = living[i];
      var role = GS.ROLES[s.role];
      var idx = i < 9 ? String(i + 1) : "·";
      html += '<div class="squad-item' + (s.id === b.selected ? " sel" : "") +
        '" data-act="select-squad" data-arg="' + s.id + '">' +
        '<span class="idx">' + idx + "</span>" +
        "<span>" + role.ch + " " + s.name + "</span>" +
        "<span class=\"hint\">" + s.soldiers + (s.placed ? "" : " ·") + "</span></div>";
    }
    return html;
  };

  App.prototype._logHtml = function (b) {
    var html = "<h3>纪事</h3><ul class='log'>";
    var logs = b.log.slice(-12);
    for (var i = 0; i < logs.length; i++) {
      html += "<li style='color:" + logs[i].color + "'>" + this.escape(logs[i].msg) + "</li>";
    }
    html += "</ul>";
    return html;
  };

  App.prototype._rosterHtml = function () {
    var html = "<h3>编制　钱币 " + this.army.coins + "</h3><ul>";
    for (var i = 0; i < this.army.commanders.length; i++) {
      var c = this.army.commanders[i];
      var role = GS.ROLES[c.cls];
      html += "<li>" + (c.dead ? "<s>" : "") + role.ch + " " + c.name + " " + c.soldiers + (c.dead ? "</s>" : "") + "</li>";
    }
    html += "</ul>";
    return html;
  };

  App.prototype._legendHtml = function () {
    return "<h3>图例</h3><pre class='legend'>≈深海 ~浅 .滩 ,草 n丘\n▲崖 #岩 ♣树 ⌂屋 █墙\n☻盾 }弓 ↑枪 v蛮 V力\n黄闪箭头 = 登陆点</pre>";
  };

  App.prototype.escape = function (s) {
    return String(s).replace(/[&<>]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]; });
  };

  GS.boot = function () {
    GS.app = new App();
  };
})(typeof window !== "undefined" ? window : globalThis);
