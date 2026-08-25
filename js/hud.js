/* Good South — side panels + top/bottom chrome builders */
(function (g) {
  var GS = g.GS || (g.GS = {});
  var $ = GS.util.$;

  function Hud(game) {
    this.game = game;
    this._last = 0;
  }

  Hud.prototype.dirty = function () {
    this.game.hudDirty = true;
  };

  Hud.prototype.render = function (force) {
    var game = this.game;
    var now = performance.now ? performance.now() : Date.now();
    if (!force && !game.hudDirty && now - this._last < ((game.compact ? 180 : 0) || GS.CONFIG.battle.hudIntervalMs)) return;
    game.hudDirty = false;
    this._last = now;

    var mode = game.mode;
    var ui = game.ui;
    var top = $("topbar");
    var bot = $("bottom");
    var left = $("left");
    var right = $("right");
    var tools = $("sandbox-tools");
    var banner = $("phase-banner");
    if (tools) tools.classList.toggle("visible", mode === "sandbox");

    if (mode === "title" || mode === "help" || mode === "hire" || mode === "preview" || mode === "result") {
      top.innerHTML = '<span class="brand">GOOD SOUTH</span><span class="chips">' +
        ui.chip("模式", "菜单", "cyan") + "</span>";
      bot.innerHTML = '<div class="hint-line">' + (game.touch ? "点按钮开始" : "A 战役 · B 沙盒 · C 手册 · F1 帮助") + "</div>";
      ui.setToolbar([]);
      ui.setCommands([]);
      this._dock(game, [
        { act: "campaign", label: "战役" },
        { act: "sandbox", label: "沙盒" },
        { act: "help", label: "手册" },
        { act: "load-menu", label: "读档" },
      ]);
      if (banner) banner.classList.add("hidden");
      return;
    }

    if (mode === "campaign") {
      this._campaign(game, top, bot, left, right, banner);
      return;
    }

    if ((mode === "battle" || mode === "sandbox") && game.battle) {
      this._battle(game, top, bot, left, right, banner);
    }
  };

  Hud.prototype._campaign = function (game, top, bot, left, right, banner) {
    if (banner) banner.classList.add("hidden");
    var node = GS.Campaign.getNode(game.campaign, game.campCursor);
    var ui = game.ui;
    top.innerHTML = '<span class="brand">GOOD SOUTH</span><span class="chips">' +
      ui.chip("海图", "群岛", "cyan") +
      ui.chip("钱币", game.army.coins, "hi") +
      ui.chip("收复", game.army.islandsCleared, "ok") +
      ui.chip("调色", game.palette) +
      "</span>";
    left.innerHTML = this.campLeft(game, node);
    right.innerHTML = this.roster(game.army) + this.islandList(game) + this.legend();
    bot.innerHTML = '<div class="hint-line">' + (game.touch ? "点岛登陆 · 底栏打开编制" : "WASD选岛 · Enter登陆 · Esc菜单 · F5保存 · N招募 · Q标题") + "</div>";
    ui.setToolbar(game.compact ? [
      { act: "save-menu", label: "保存", kbd: "F5" },
      { act: "pal", label: "调色", kbd: "P" },
      { act: "mute", label: GS.audio.muted() ? "音效" : "静音", kbd: "-" },
      { act: "help", label: "手册", kbd: "?" },
    ] : [
      { act: "pause-menu", label: "菜单", kbd: "Esc" },
      { act: "save-menu", label: "保存", kbd: "F5" },
      { act: "hire", label: "招募", kbd: "N" },
      { act: "pal", label: "调色", kbd: "P" },
      { act: "mute", label: GS.audio.muted() ? "音效" : "静音", kbd: "-" },
      { act: "help", label: "手册", kbd: "?" },
      { sep: true },
      { act: "title", label: "标题", kbd: "Q" },
    ]);
    ui.setCommands(node && node.status === "scouted" ? [
      { act: "open-island", arg: String(node.id), label: "登陆 " + node.name, kbd: "G" },
    ] : []);
    this._dock(game, [
      { act: "toggle-sheet", arg: "left", label: "情报" },
      { act: "toggle-sheet", arg: "right", label: "编制" },
      { act: "hire", label: "招募" },
      { act: "pause-menu", label: "菜单" },
    ]);
  };

  Hud.prototype._battle = function (game, top, bot, left, right, banner) {
    var b = game.battle;
    var ui = game.ui;
    var cnt = b.counts();
    var waveDone = GS.Waves.launchedCount(b.waves);
    var phaseLabel = b.phase === "deploy" ? "布置" : b.phase === "over" ? "结束" : (b.speed ? "×" + b.speed : "暂停");

    if (banner) {
      if (b.phase === "deploy") {
        banner.classList.remove("hidden");
        banner.textContent = game.touch ? "点空地放下 · 转向看箭头朝向 · 拖动画布" : "就位 — 点空地放下兵团，R 转向（箭头），开战后天兵整团接战 · G 开战";
      } else if (b.phase === "fight" && b.speed === 0) {
        banner.classList.remove("hidden");
        banner.textContent = "暂停";
      } else banner.classList.add("hidden");
    }

    top.innerHTML = '<span class="brand">' + b.island.name + '</span><span class="chips">' +
      (game.compact ? "" : ui.chip("生态", GS.BIOMES[b.island.biome].name)) +
      ui.chip("阶段", phaseLabel, b.phase === "deploy" ? "hi" : "cyan") +
      (function () {
        var sel = b.getSquad(b.selected);
        if (!sel) return "";
        var d = GS.DIRS[sel.facing] || GS.DIRS[2];
        return ui.chip("朝向", d.name + d.ch, "cyan");
      }()) +
      ui.chip("屋舍", cnt.houses + "/" + b.houses.length, cnt.houses < b.houses.length ? "warn" : "ok") +
      ui.chip("我军", cnt.soldiers) +
      ui.chip("北蛮", cnt.enemies, cnt.enemies ? "warn" : "") +
      (b.waves.length ? ui.chip("波次", waveDone + "/" + b.waves.length) : ui.chip("模式", "沙盒", "cyan")) +
      (game.compact ? "" : ui.chip("t", b.t.toFixed(1))) +
      "</span>";

    left.innerHTML = this.battleLeft(game, b);
    right.innerHTML = this.squadList(b) + this.logHtml(b) + this.legend();
    bot.innerHTML = '<div class="hint-line">' + (game.touch
      ? "点空地就位 · 拖动画布 · 双指缩放 · 长按转向"
      : (game.mode === "sandbox"
        ? "Esc菜单 · 中键拖镜头 · 滚轮缩放 · T地形 · B长船"
        : "Esc菜单 · 点空地就位 · 天兵会自行接战 · U号角")) + "</div>";

    this.battleToolbar(game, b);
  };

  Hud.prototype.battleToolbar = function (game, b) {
    var ui = game.ui;
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
      if (game.mode === "battle") {
        items.push({
          act: "warhorn",
          label: b.warhornReady ? "号角" : "号角已用",
          kbd: "U",
          active: b.warhornT > 0,
          disabled: !b.warhornReady && b.warhornT <= 0,
        });
        items.push({ act: "evac", label: "撤退", kbd: "E", danger: true });
      }
    }
    if (game.mode === "sandbox") {
      items.push({ sep: true });
      items.push({ act: "tool-place", label: "布置", kbd: "Z", active: game.sandboxTool === "place" });
      items.push({ act: "tool-paint", label: "刷地", kbd: "T", active: game.sandboxTool === "paint" });
      items.push({ act: "brush-next", label: GS.tileDef(game.sandboxBrush).name });
      items.push({ act: "spawn-enemy", label: "蛮兵", kbd: "N" });
      items.push({ act: "spawn-ship", label: "长船", kbd: "B" });
      items.push({ act: "spawn-ally", label: "己方", kbd: "C" });
      items.push({ act: "gen", label: "新岛" });
    }
    items.push({ sep: true });
    if (game.compact) {
      items.push({ act: "zoom", arg: "1", label: "+" });
      items.push({ act: "zoom", arg: "-1", label: "−" });
    }
    if (game.army && game.campaign) items.push({ act: "quicksave", label: "快存", kbd: "F5" });
    items.push({ act: "mute", label: GS.audio.muted() ? "音效" : "静音", kbd: "-" });
    if (!game.compact) items.push({ act: "pause-menu", label: "菜单", kbd: "Esc" });
    if (game.compact) {
      var hideDockDup = {
        start: true, pause: true,
        "tool-place": true, "tool-paint": true, "brush-next": true,
        "spawn-enemy": true, "spawn-ship": true, "spawn-ally": true, gen: true,
      };
      items = items.filter(function (it) {
        if (it.sep) return false;
        return !hideDockDup[it.act];
      });
    }
    ui.setToolbar(items);

    var cmds = [];
    var sqs = b.livingSquads();
    for (var i = 0; i < Math.min(sqs.length, 9); i++) {
      cmds.push({
        act: "select-squad",
        arg: sqs[i].id,
        label: GS.ROLES[sqs[i].role].ch + " " + sqs[i].name.split("·")[0],
        kbd: String(i + 1),
      });
    }
    ui.setCommands(cmds);
    this._dock(game, [
      { act: "toggle-sheet", arg: "left", label: "情报" },
      { act: "toggle-sheet", arg: "right", label: "部队" },
      b.phase === "deploy"
        ? { act: "start", label: "开战" }
        : { act: "pause", label: b.speed ? "暂停" : "继续" },
      { act: "rotate", label: "转向" },
      { act: "pause-menu", label: "菜单" },
    ]);
  };

  Hud.prototype._dock = function (game, items) {
    var dock = $("dock");
    if (!dock) return;
    if (!game.compact) {
      dock.innerHTML = "";
      return;
    }
    dock.innerHTML = (items || []).map(function (it) {
      return '<button type="button" data-act="' + it.act + '"' +
        (it.arg != null ? ' data-arg="' + it.arg + '"' : "") + ">" + it.label + "</button>";
    }).join("");
  };

  Hud.prototype.campLeft = function (game, node) {
    if (!node) return "<p>选一座岛。</p>";
    var st = { hidden: "未知", scouted: "未攻", cleared: "已收复", lost: "已陷" }[node.status] || node.status;
    return "<h3>" + node.name + "</h3>" +
      "<p>" + GS.BIOMES[node.biome].flavor + "</p>" +
      "<p>威胁 " + "▲".repeat(node.difficulty) + "　<span class='chip'>" + st + "</span></p>" +
      "<p>航线：" + node.edges.map(function (id) {
        return game.campaign.islands[id].name;
      }).join("、") + "</p>" +
      (node.status === "scouted"
        ? '<p><button data-act="open-island" data-arg="' + node.id + '">登陆此岛</button></p>'
        : "") +
      "<p class=\"hint\">只可进攻已侦察、尚未收复的岛。</p>";
  };

  Hud.prototype.islandList = function (game) {
    var html = "<h3>已知岛屿</h3>";
    for (var i = 0; i < game.campaign.islands.length; i++) {
      var is = game.campaign.islands[i];
      if (is.status === "hidden") continue;
      html += '<div class="island-item' + (is.id === game.campCursor ? " sel" : "") +
        '" data-act="open-island" data-arg="' + is.id + '">' +
        "<span>" + is.name + "</span><span class=\"hint\">" + is.status + " ▲" + is.difficulty + "</span></div>";
    }
    return html;
  };

  Hud.prototype.battleLeft = function (game, b) {
    var tile = b.island.tiles[b.cursor.y] && b.island.tiles[b.cursor.y][b.cursor.x];
    var def = tile ? GS.tileDef(tile.type) : null;
    var sq = b.getSquad(b.selected);
    var html = "<h3>观察</h3>";
    html += "<p>光标 (" + b.cursor.x + "," + b.cursor.y + ") " + (def ? def.ch + " " + def.name : "") + "</p>";
    if (game.lookText) html += "<pre class=\"look\">" + GS.util.escapeHtml(game.lookText) + "</pre>";
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
      html += "<li>" + (h.alive ? "⌂" : "%") + " " + h.name + " " + game.ui.hpBar(h.hp, h.maxHp) + "</li>";
    }
    html += "</ul>";
    if (game.mode === "sandbox") {
      html += "<h3>沙盒</h3>";
      if (game.compact) {
        html += '<p class="hint">刷地后点地图改地形；新岛用当前种子/生态。</p>' +
          '<p class="sheet-actions">' +
          '<button type="button" data-act="tool-place"' + (game.sandboxTool === "place" ? ' class="primary"' : "") + ">布置</button>" +
          '<button type="button" data-act="tool-paint"' + (game.sandboxTool === "paint" ? ' class="primary"' : "") + ">刷地</button>" +
          '<button type="button" data-act="brush-next">' + GS.tileDef(game.sandboxBrush).name + "</button>" +
          "</p><p class=\"sheet-actions\">" +
          '<button type="button" data-act="spawn-enemy">蛮兵</button>' +
          '<button type="button" data-act="spawn-ship">长船</button>' +
          '<button type="button" data-act="spawn-ally">己方</button>' +
          '<button type="button" data-act="gen">新岛</button>' +
          "</p>";
      } else {
        html += "<p>工具 <b>" + (game.sandboxTool === "paint" ? "刷地 / " + GS.tileDef(game.sandboxBrush).name : "布置") +
          "</b></p>";
      }
    }
    return html;
  };

  Hud.prototype.squadList = function (b) {
    var html = "<h3>兵团</h3>";
    var list = b.livingSquads ? b.livingSquads() : b.squads;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
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

  Hud.prototype.logHtml = function (b) {
    var html = "<h3>纪事</h3><ul class='log'>";
    var logs = b.log.slice(-12);
    for (var i = 0; i < logs.length; i++) {
      html += "<li style='color:" + logs[i].color + "'>" + GS.util.escapeHtml(logs[i].msg) + "</li>";
    }
    return html + "</ul>";
  };

  Hud.prototype.roster = function (army) {
    var html = "<h3>编制　钱币 " + army.coins + "</h3><ul>";
    for (var i = 0; i < army.commanders.length; i++) {
      var c = army.commanders[i];
      var role = GS.ROLES[c.cls];
      html += "<li>" + (c.dead ? "<s>" : "") + role.ch + " " + c.name + " " + c.soldiers + (c.dead ? "</s>" : "") + "</li>";
    }
    return html + "</ul>";
  };

  Hud.prototype.legend = function () {
    return "<h3>图例</h3><pre class='legend'>≈深海 ~浅 .滩 ,草 n丘\n▲崖 #岩 ♣树 ⌂屋 █墙 ¥烽\n☻盾 }弓 ↑枪 ☺乡勇\nv蛮 V力 x投 ▼盾 Ω领\n黄闪箭头 = 登陆点</pre>";
  };

  GS.Hud = Hud;
})(typeof window !== "undefined" ? window : globalThis);
