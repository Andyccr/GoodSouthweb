/* Good South — screens, HUD, input, campaign & sandbox loop */
(function (g) {
  var GS = g.GS || (g.GS = {});
  var C = GS.C;
  var $ = function (id) { return document.getElementById(id); };

  var HIRE = {
    infantry: { cost: 6, soldiers: 10, name: "盾兵" },
    archer: { cost: 8, soldiers: 8, name: "弓手" },
    pike: { cost: 7, soldiers: 9, name: "枪兵" },
  };

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
    this.mode = "title"; // title | campaign | deploy-preview | battle | result | sandbox | help | hire
    this.rng = GS.rng(Date.now() >>> 0);
    this.army = newArmy(this.rng);
    this.campaign = null;
    this.battle = null;
    this.island = null;
    this.campCursor = 0;
    this.renderer = new GS.Renderer($("view"));
    this.hover = { x: -1, y: -1 };
    this.sandboxTool = "place";
    this.sandboxBrush = GS.T.GRASS;
    this.seedInput = String((Math.random() * 99999) | 0);
    this.helpPage = 0;
    this.last = 0;
    this.keys = {};
    this.lookText = "";
    this.palette = "df";
    this._bind();
    this.showTitle();
    var self = this;
    requestAnimationFrame(function loop(t) { self.frame(t); requestAnimationFrame(loop); });
  }

  App.prototype._bind = function () {
    var self = this;
    window.addEventListener("keydown", function (e) { self.onKey(e); });
    window.addEventListener("keyup", function (e) { self.keys[e.key] = false; });
    $("view").addEventListener("mousedown", function (e) { self.onClick(e); });
    $("view").addEventListener("mousemove", function (e) { self.onMove(e); });
    $("view").addEventListener("contextmenu", function (e) {
      e.preventDefault();
      if (self.battle) self.battle.rotateSquad(self.battle.selected);
    });
    window.addEventListener("resize", function () { self.render(); });
    document.body.addEventListener("click", function () { GS.audio.unlock(); }, { once: true });
  };

  App.prototype.frame = function (t) {
    if (!this.last) this.last = t;
    var dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    if (this.battle && (this.mode === "battle" || this.mode === "sandbox")) {
      this.battle.tick(dt);
      if (this.battle.phase === "over" && this.mode === "battle") this.showResult();
    }
    this.render();
    if (!this._hudT || t - this._hudT > 90) {
      this.renderHud();
      this._hudT = t;
    }
  };

  App.prototype.showTitle = function () {
    this.mode = "title";
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
      '<button data-act="campaign">a  战役模式 — 群岛远征</button>' +
      '<button data-act="sandbox">b  沙盒模式 — 随机构图 / 刷子 / 刷兵</button>' +
      '<button data-act="help">c  手册 — 规则与按键</button>' +
      "</div>" +
      '<div class="hint">模仿 Bad North 的岛屿防守：布置兵团、面朝登陆点、保护民居。地图由种子随机生成。</div>' +
      "</div>";
    this._menuButtons();
  };

  App.prototype._menuButtons = function () {
    var self = this;
    $("overlay").querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        GS.audio.ui();
        self.handleAct(btn.getAttribute("data-act"), btn.getAttribute("data-arg"));
      });
    });
  };

  App.prototype.handleAct = function (act, arg) {
    if (act === "campaign") this.startCampaign();
    else if (act === "sandbox") this.startSandbox();
    else if (act === "help") this.showHelp();
    else if (act === "title") this.showTitle();
    else if (act === "close") this.hideOverlay();
    else if (act === "fight") this.enterBattle();
    else if (act === "hire") this.showHire();
    else if (act === "buy") this.buyCommander(arg);
    else if (act === "back-camp") this.showCampaign();
    else if (act === "evac") { if (this.battle) this.battle.evacuate(); }
    else if (act === "pause") { if (this.battle) this.battle.setSpeed(this.battle.speed ? 0 : 1); }
    else if (act === "spd") { if (this.battle) this.battle.setSpeed(+arg); }
    else if (act === "next") this.afterResult();
    else if (act === "retry") this.retryIsland();
    else if (act === "gen") this.regenSandbox();
    else if (act === "pal") { this.cyclePalette(); }
  };

  App.prototype.startCampaign = function () {
    var seed = (Math.random() * 0x7fffffff) | 0;
    this.rng = GS.rng(seed);
    this.army = newArmy(this.rng);
    this.campaign = GS.mapgen.campaign(seed, 12);
    this.campCursor = 0;
    this.showCampaign();
  };

  App.prototype.showCampaign = function () {
    this.mode = "campaign";
    this.battle = null;
    $("overlay").classList.add("hidden");
    this.renderHud();
  };

  App.prototype.openIsland = function (id) {
    var node = this.campaign.islands[id];
    if (!node || node.status === "hidden") return;
    if (node.status === "cleared") {
      this.lookText = node.name + " 已经收复。";
      return;
    }
    this.campaign.current = id;
    this.island = GS.mapgen.island(node.seed, {
      biome: node.biome,
      difficulty: node.difficulty,
      name: node.name,
    });
    this.mode = "preview";
    $("overlay").classList.remove("hidden");
    var landings = this.island.landingDirs.map(function (d) { return GS.DIRS[d].name; }).join("、");
    $("overlay").innerHTML =
      '<div class="panel preview-panel">' +
      "<h2>将至 · " + this.island.name + "</h2>" +
      '<div class="flavor">' + this.island.flavor + "  ·  " + GS.BIOMES[this.island.biome].name +
      "  ·  威胁 " + "▲".repeat(this.island.difficulty) + "</div>" +
      "<pre class=\"mini\">" + this._asciiMini(this.island) + "</pre>" +
      "<p>屋舍 " + this.island.houses.length + " 座。登陆方向：" + landings + "。</p>" +
      "<p>民居：" + this.island.houses.map(function (h) { return h.name; }).join("、") + "。</p>" +
      '<div class="menu">' +
      '<button data-act="fight">g  登陆布置兵团</button>' +
      '<button data-act="hire">n  招募 / 钱币 ' + this.army.coins + "</button>" +
      '<button data-act="back-camp">q  返回海图</button>' +
      "</div></div>";
    this._menuButtons();
  };

  App.prototype._asciiMini = function (island) {
    var stepX = Math.max(1, Math.ceil(island.w / 48));
    var stepY = Math.max(1, Math.ceil(island.h / 16));
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
    this.renderHud();
  };

  App.prototype.showHire = function () {
    this.mode = "hire";
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
      '<button data-act="back-camp">返回</button>' +
      "</div><p class=\"hint\">战役中阵亡的队长无法复活。胜利后按残存屋舍获得钱币，并可能晋升等级。</p></div>";
    this._menuButtons();
  };

  App.prototype.buyCommander = function (cls) {
    var h = HIRE[cls];
    if (!h) return;
    if (this.army.coins < h.cost) {
      this.lookText = "钱币不够。";
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
    this.showHire();
  };

  App.prototype.showResult = function () {
    if (this.mode === "result") return;
    this.mode = "result";
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
    this.renderHud();
  };

  App.prototype.regenSandbox = function () {
    var seed = $("seedbox") ? $("seedbox").value : this.seedInput;
    this.seedInput = seed || String((Math.random() * 99999) | 0);
    var biome = $("biomebox") ? $("biomebox").value : "verdant";
    var diff = $("diffbox") ? +$("diffbox").value : 3;
    this.island = GS.mapgen.island(GS.hashStr(String(this.seedInput)), { difficulty: diff, biome: biome, name: undefined });
    this.army = this.army || newArmy(GS.rng(GS.hashStr(this.seedInput)));
    this.battle = new GS.Battle(this.island, this.army, { sandbox: true });
    this.mode = "sandbox";
    $("overlay").classList.add("hidden");
  };

  App.prototype.showHelp = function () {
    this.mode = "help";
    $("overlay").classList.remove("hidden");
    $("overlay").innerHTML =
      '<div class="panel help-panel"><h2>南境手册</h2>' +
      "<h3>这是什么</h3>" +
      "<p>网页版岛屿塔防沙盒，玩法模仿 <b>Bad North</b>：随机生成小岛，从海滩抵挡北蛮登陆，保护屋舍。画面用矮人要塞式 ASCII 字符与 16 色。</p>" +
      "<h3>战役</h3>" +
      "<ul>" +
      "<li>海图上选相邻已侦察的岛，登陆后先<b>布置</b>兵团，按 G 开战。</li>" +
      "<li>屋舍被拆光则岛陷落。守住所有波次则按残存屋舍得钱币。</li>" +
      "<li>盾兵抗打、弓手要高地与视野、枪兵<b>正面</b>克冲锋。</li>" +
      "<li>右键或 R 旋转朝向。战斗中仍可重新落子（有冷却）。E 弃岛撤退保兵。</li>" +
      "</ul>" +
      "<h3>按键</h3>" +
      "<pre class=\"keys\">" +
      "方向键/HJKL  移动光标          鼠标左键  布置/选中\n" +
      "Tab           切换兵团          鼠标右键  旋转\n" +
      "G             开战              空格      暂停\n" +
      "1 2 3         一/二/三倍速      K         观察模式\n" +
      "E             撤退              ?/F1      手册\n" +
      "M             海图              Q         返回\n" +
      "沙盒:  T 循环地形刷  N 刷北蛮  B 放船  C 刷己方  [G] 新地图\n" +
      "</pre>" +
      "<h3>图例</h3>" +
      "<pre class=\"keys\">" +
      "≈ 深海   ~ 浅海   . 沙滩   , 草地   n 丘陵   ▲ 悬崖   # 岩石\n" +
      "♣ 树木   + 斜坡   : 小径   █ 石墙   ⌂ 屋舍   $ 钱币   % 尸体\n" +
      "☻/@ 盾兵  } 弓手   ↑ 枪兵   v 掠袭   V 蛮力   x 投斧   Ω 领主\n" +
      "</pre>" +
      '<div class="menu"><button data-act="title">返回标题</button></div></div>';
    this._menuButtons();
  };

  App.prototype.hideOverlay = function () {
    $("overlay").classList.add("hidden");
  };

  App.prototype.cyclePalette = function () {
    this.palette = this.palette === "df" ? "green" : this.palette === "green" ? "amber" : "df";
    this.renderer.setPalette(this.palette);
  };

  App.prototype.onKey = function (e) {
    this.keys[e.key] = true;
    var k = e.key;
    if (k === "F1" || k === "?") { e.preventDefault(); this.showHelp(); return; }
    if (this.mode === "title") {
      if (k === "a" || k === "A" || k === "Enter") this.startCampaign();
      if (k === "b" || k === "B") this.startSandbox();
      if (k === "c" || k === "C") this.showHelp();
      return;
    }
    if ($("overlay") && !$("overlay").classList.contains("hidden") && this.mode !== "preview" && this.mode !== "hire" && this.mode !== "result" && this.mode !== "help") {
      /* overlay blocking */
    }
    if (this.mode === "campaign") {
      this._campKey(e);
      return;
    }
    if (this.mode === "preview") {
      if (k === "g" || k === "G") this.enterBattle();
      if (k === "q" || k === "Q" || k === "Escape") this.showCampaign();
      if (k === "n" || k === "N") this.showHire();
      return;
    }
    if (this.mode === "hire") {
      if (k === "q" || k === "Escape") this.showCampaign();
      return;
    }
    if (this.mode === "help" || this.mode === "result") {
      if (k === "Escape" || k === "q") this.showTitle();
      return;
    }
    if (this.mode === "battle" || this.mode === "sandbox") this._battleKey(e);
  };

  App.prototype._campKey = function (e) {
    var k = e.key;
    var ids = this.campaign.islands.filter(function (i) { return i.status !== "hidden"; }).map(function (i) { return i.id; });
    var idx = ids.indexOf(this.campCursor);
    if (idx < 0) idx = 0;
    if (k === "ArrowRight" || k === "l" || k === "L") idx = Math.min(ids.length - 1, idx + 1);
    if (k === "ArrowLeft" || k === "h" || k === "H") idx = Math.max(0, idx - 1);
    if (k === "ArrowDown" || k === "j" || k === "J") idx = Math.min(ids.length - 1, idx + 1);
    if (k === "ArrowUp" || k === "k" || k === "K") idx = Math.max(0, idx - 1);
    this.campCursor = ids[idx];
    if (k === "Enter" || k === "g" || k === "G") this.openIsland(this.campCursor);
    if (k === "n" || k === "N") this.showHire();
    if (k === "q" || k === "Escape") this.showTitle();
    if (k === "p" || k === "P") this.cyclePalette();
  };

  App.prototype._battleKey = function (e) {
    var b = this.battle;
    if (!b) return;
    var k = e.key;
    var prevent = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Tab"].indexOf(k) >= 0;
    if (prevent) e.preventDefault();
    var dx = 0, dy = 0;
    if (k === "ArrowLeft" || k === "h" || k === "H") dx = -1;
    if (k === "ArrowRight" || k === "l" || k === "L") dx = 1;
    if (k === "ArrowUp" || k === "k" && !b.look) dy = -1;
    if (k === "ArrowDown" || k === "j" || k === "J") dy = 1;
    if (k === "k" && !e.shiftKey) {
      /* DF: k is north; also look. If used as look via capital K */
    }
    if (k === "K" || k === "'" || k === ";") {
      b.look = !b.look;
      this.lookText = b.lookAt(b.cursor.x, b.cursor.y);
      return;
    }
    if (dx || dy) {
      b.cursor.x = Math.max(0, Math.min(b.w - 1, b.cursor.x + dx));
      b.cursor.y = Math.max(0, Math.min(b.h - 1, b.cursor.y + dy));
      if (b.look) this.lookText = b.lookAt(b.cursor.x, b.cursor.y);
      return;
    }
    if (k === "Tab") {
      e.preventDefault();
      var sqs = b.squads.filter(function (s) { return s.soldiers > 0; });
      if (!sqs.length) return;
      var i = 0;
      for (; i < sqs.length; i++) if (sqs[i].id === b.selected) break;
      b.selected = sqs[(i + 1) % sqs.length].id;
      return;
    }
    if (k === "r" || k === "R") b.rotateSquad(b.selected);
    if (k === "Enter" || k === "d" || k === "D") this._tryPlace();
    if (k === "g" || k === "G") {
      if (this.mode === "sandbox" && e.shiftKey) this.regenSandbox();
      else b.startFight();
    }
    if (k === " ") b.setSpeed(b.speed ? 0 : 1);
    if (k === "1") b.setSpeed(1);
    if (k === "2") b.setSpeed(2);
    if (k === "3") b.setSpeed(3);
    if (k === "e" || k === "E") b.evacuate();
    if (k === "m" || k === "M") {
      if (this.mode === "battle") this.showCampaign();
    }
    if (k === "q" || k === "Escape") {
      if (this.mode === "sandbox") this.showTitle();
      else this.showCampaign();
    }
    if (k === "p" || k === "P") this.cyclePalette();
    if (this.mode === "sandbox") this._sandboxKey(k);
  };

  App.prototype._sandboxKey = function (k) {
    var b = this.battle;
    var types = [GS.T.GRASS, GS.T.BEACH, GS.T.HILL, GS.T.TREE, GS.T.WALL, GS.T.HOUSE, GS.T.SHALLOW, GS.T.ROCK, GS.T.CLIFF, GS.T.PATH, GS.T.MUD];
    if (k === "t" || k === "T") {
      var i = types.indexOf(this.sandboxBrush);
      this.sandboxBrush = types[(i + 1) % types.length];
      this.sandboxTool = "paint";
      this.lookText = "地形刷：" + GS.tileDef(this.sandboxBrush).name;
    }
    if (k === "n" || k === "N") {
      b.spawnEnemy("raider", b.cursor.x, b.cursor.y);
      this.lookText = "刷入掠袭者。";
    }
    if (k === "b" || k === "B") b.spawnShip();
    if (k === "c" || k === "C") {
      var roles = ["infantry", "archer", "pike"];
      b.spawnPlayerUnit(roles[(Math.random() * 3) | 0], b.cursor.x, b.cursor.y);
    }
    if (k === "v" || k === "V") b.spawnEnemy("jarl", b.cursor.x, b.cursor.y);
    if (k === "x" || k === "X") b.spawnEnemy("thrower", b.cursor.x, b.cursor.y);
    if (k === "z" || k === "Z") {
      this.sandboxTool = "place";
      this.lookText = "布置模式。";
    }
  };

  App.prototype._tryPlace = function () {
    var b = this.battle;
    if (!b) return;
    if (this.mode === "sandbox" && this.sandboxTool === "paint") {
      b.paintTile(b.cursor.x, b.cursor.y, this.sandboxBrush);
      if (this.sandboxBrush === GS.T.HOUSE) {
        b.houses.push({
          id: b.houses.length, x: b.cursor.x, y: b.cursor.y, name: GS.names.house(b.rng),
          hp: 100, maxHp: 100, coins: 1, alive: true, villagers: 3, burning: 0,
        });
      }
      return;
    }
    b.placeSquad(b.selected, b.cursor.x, b.cursor.y);
  };

  App.prototype.onClick = function (e) {
    if (this.mode === "campaign") {
      var t = this.renderer.screenToTile(e.clientX, e.clientY);
      var best = null, bd = 4;
      for (var i = 0; i < this.campaign.islands.length; i++) {
        var is = this.campaign.islands[i];
        if (is.status === "hidden") continue;
        var d = Math.abs(is.mx - t.x) + Math.abs(is.my - t.y);
        if (d < bd) { bd = d; best = is; }
      }
      if (best) {
        this.campCursor = best.id;
        this.openIsland(best.id);
      }
      return;
    }
    if (this.mode !== "battle" && this.mode !== "sandbox") return;
    var b = this.battle;
    var tile = this.renderer.screenToTile(e.clientX, e.clientY);
    b.cursor.x = tile.x;
    b.cursor.y = tile.y;
    var picked = false;
    for (var i = 0; i < b.entities.length; i++) {
      var en = b.entities[i];
      if (en.alive && en.kind === "soldier" && (en.x | 0) === tile.x && (en.y | 0) === tile.y) {
        if (en.squadId !== b.selected) {
          b.selected = en.squadId;
          picked = true;
        }
        break;
      }
    }
    if (!picked) this._tryPlace();
  };

  App.prototype.onMove = function (e) {
    if (this.mode !== "battle" && this.mode !== "sandbox" && this.mode !== "campaign") return;
    this.hover = this.renderer.screenToTile(e.clientX, e.clientY);
    if ((this.mode === "battle" || this.mode === "sandbox") && this.battle && this.battle.look) {
      this.lookText = this.battle.lookAt(this.hover.x, this.hover.y);
    }
  };

  App.prototype.render = function () {
    if (this.mode === "campaign") {
      this.renderer.drawCampaign(this.campaign, this.army, this.campCursor);
    } else if (this.battle && (this.mode === "battle" || this.mode === "sandbox")) {
      this.renderer.drawBattle(this.battle, this.hover);
    }
  };

  App.prototype.renderHud = function () {
    var left = $("left");
    var right = $("right");
    var top = $("topbar");
    var bot = $("bottom");
    var tools = $("sandbox-tools");
    if (tools) tools.classList.toggle("visible", this.mode === "sandbox");
    if (this.mode === "title" || this.mode === "help" || this.mode === "hire" || this.mode === "preview" || this.mode === "result") {
      top.textContent = "GOOD SOUTH  ·  南境据点";
      return;
    }
    if (this.mode === "campaign") {
      var node = this.campaign.islands[this.campCursor];
      top.innerHTML = "<b>GOOD SOUTH</b>  海图  钱币 " + this.army.coins + "  已收复 " + this.army.islandsCleared +
        "  调色 " + this.palette;
      left.innerHTML = this._campLeft(node);
      right.innerHTML = this._rosterHtml() + this._legendHtml();
      bot.textContent = "方向键选岛  Enter 登陆  N 招募  P 调色  Q 标题  点击海图上的岛";
      return;
    }
    if (!this.battle) return;
    var b = this.battle;
    var cnt = b.counts();
    var waveDone = b.waves.filter(function (w) { return w.launched; }).length;
    top.innerHTML = "<b>" + b.island.name + "</b>  " + GS.BIOMES[b.island.biome].name +
      "  " + (b.phase === "deploy" ? "布置中" : b.phase === "over" ? "结束" : (b.speed ? "×" + b.speed : "暂停")) +
      "  屋舍 " + cnt.houses + "/" + b.houses.length +
      "  我军 " + cnt.soldiers + "  北蛮 " + cnt.enemies +
      (b.waves.length ? "  波次 " + waveDone + "/" + b.waves.length : "  沙盒") +
      "  t=" + b.t.toFixed(1);
    left.innerHTML = this._battleLeft(b);
    right.innerHTML = this._squadList(b) + this._logHtml(b) + this._legendHtml();
    bot.textContent = this.mode === "sandbox"
      ? "左键布置/刷地  右键旋转  T地形  N北蛮  B船  C己方  V领主  G开战  Shift+G新图  空格暂停  Q标题"
      : "左键布置  右键/R旋转  Tab切换  G开战  空格暂停  123变速  K观察  E撤退  Q海图";
  };

  App.prototype._campLeft = function (node) {
    if (!node) return "<p>选一座岛。</p>";
    var st = { hidden: "未知", scouted: "未攻", cleared: "已收复", lost: "已陷" }[node.status] || node.status;
    return "<h3>" + node.name + "</h3>" +
      "<p>" + GS.BIOMES[node.biome].flavor + "</p>" +
      "<p>威胁 " + "▲".repeat(node.difficulty) + "  " + st + "</p>" +
      "<p>航线：" + node.edges.map(function (id, _, arr) {
        return this.campaign.islands[id].name;
      }.bind(this)).join("、") + "</p>" +
      "<p class=\"hint\">只可进攻已侦察、尚未收复的岛。</p>";
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
        "  朝" + GS.DIRS[sq.facing].name + "<br>兵 " + sq.soldiers + "/" + sq.maxSoldiers +
        (trait ? "<br>特质 [" + trait + "]" : "") +
        (sq.placed ? "" : "<br><span class='warn'>尚未落子</span>") + "</p>";
      html += "<p class=\"hint\">" + role.desc + "</p>";
    }
    html += "<h3>屋舍</h3><ul>";
    for (i = 0; i < b.houses.length; i++) {
      var h = b.houses[i];
      var bar = Math.max(0, Math.round(10 * h.hp / h.maxHp));
      html += "<li>" + (h.alive ? "⌂" : "%") + " " + h.name + " " + "█".repeat(bar) + "░".repeat(10 - bar) + "</li>";
    }
    html += "</ul>";
    if (this.mode === "sandbox") {
      html += "<h3>沙盒</h3><p>工具 " + this.sandboxTool +
        (this.sandboxTool === "paint" ? " / " + GS.tileDef(this.sandboxBrush).name : "") + "</p>";
      html += "<p class=\"hint\">T 循环地形　Z 布置　N 蛮兵　B 长船　C 己方　V 领主</p>";
    }
    return html;
  };

  App.prototype._squadList = function (b) {
    var html = "<h3>兵团</h3><ul>";
    for (var i = 0; i < b.squads.length; i++) {
      var s = b.squads[i];
      var role = GS.ROLES[s.role];
      html += "<li class='" + (s.id === b.selected ? "sel" : "") + "'>" + role.ch + " " + s.name +
        " " + s.soldiers + (s.placed ? "" : " ·") + "</li>";
    }
    html += "</ul>";
    return html;
  };

  App.prototype._logHtml = function (b) {
    var html = "<h3>纪事</h3><ul class='log'>";
    var logs = b.log.slice(-10);
    for (var i = 0; i < logs.length; i++) {
      html += "<li style='color:" + logs[i].color + "'>" + this.escape(logs[i].msg) + "</li>";
    }
    html += "</ul>";
    return html;
  };

  App.prototype._rosterHtml = function () {
    var html = "<h3>编制  钱币 " + this.army.coins + "</h3><ul>";
    for (var i = 0; i < this.army.commanders.length; i++) {
      var c = this.army.commanders[i];
      var role = GS.ROLES[c.cls];
      html += "<li>" + (c.dead ? "<s>" : "") + role.ch + " " + c.name + " " + c.soldiers + (c.dead ? "</s>" : "") + "</li>";
    }
    html += "</ul>";
    return html;
  };

  App.prototype._legendHtml = function () {
    return "<h3>图例</h3><pre class='legend'>≈深海 ~浅 .滩 ,草 n丘\n▲崖 #岩 ♣树 ⌂屋 █墙\n☻盾 }弓 ↑枪 v蛮 V力</pre>";
  };

  App.prototype.escape = function (s) {
    return String(s).replace(/[&<>]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]; });
  };

  GS.boot = function () {
    GS.app = new App();
  };
})(typeof window !== "undefined" ? window : globalThis);
