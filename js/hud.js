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

  Hud.prototype._setTop = function (brand, chipsHtml) {
    var b = $("top-brand");
    var c = $("top-chips");
    if (b && b.textContent !== (brand || "GOOD SOUTH")) b.textContent = brand || "GOOD SOUTH";
    GS.util.setHtml(c, chipsHtml || "");
  };

  Hud.prototype._setHint = function (text) {
    var h = $("bot-hint");
    if (h) h.textContent = text || "";
  };

  Hud.prototype.noteChrome = function () {
    var top = $("topbar");
    var bot = $("bottom");
    if (!this.game.renderer) return;
    var h = (top ? top.offsetHeight : 0) + (bot ? bot.offsetHeight : 0);
    if (this._chromeH == null || h !== this._chromeH) this.game.renderer._needMeasure = true;
    this._chromeH = h;
    if (top && typeof document !== "undefined") {
      document.documentElement.style.setProperty("--chrome-top", top.offsetHeight + "px");
    }
  };

  Hud.prototype.render = function (force) {
    var game = this.game;
    var now = performance.now ? performance.now() : Date.now();
    var gap = game.compact ? 180 : (GS.CONFIG.battle.hudIntervalMs || 120);
    if (game.hudDirty) gap = Math.min(gap, 48);
    if (!force && now - this._last < gap) return;
    game.hudDirty = false;
    this._last = now;

    var mode = game.mode;
    var ui = game.ui;
    var left = $("left-body") || $("left");
    var right = $("right");
    var tools = $("sandbox-tools");
    var banner = $("phase-banner");
    if (tools) {
      var showTools = mode === "sandbox";
      if (tools.classList.contains("visible") !== showTools) {
        tools.classList.toggle("visible", showTools);
        if (game.renderer) game.renderer._needMeasure = true;
      }
    }

    if (mode === "setup" || mode === "rank") {
      this._setTop("GOOD SOUTH", ui.chip(GS.t("mode"), mode === "setup" ? GS.t("setupTitle") : GS.t("rankTitle"), "hi"));
      this._setHint(GS.t("hintTitle"));
      ui.setToolbar([]);
      ui.setCommands([]);
      this._dock(game, []);
      if (banner) banner.classList.add("hidden");
      this.noteChrome();
      return;
    }

    if (mode === "title" || mode === "help" || mode === "hire" || mode === "preview" || mode === "result" || mode === "voyage") {
      this._setTop("GOOD SOUTH", ui.chip(GS.t("mode"), GS.t("menu"), "cyan"));
      this._setHint(game.touch ? GS.t("tapStart") : GS.t("hintTitle"));
      ui.setToolbar([]);
      ui.setCommands([]);
      this._dock(game, [
        { act: "campaign", label: GS.t("chart") },
        { act: "sandbox", label: GS.t("sandboxMode") },
        { act: "help", label: GS.t("handbook") },
        { act: "load-menu", label: GS.t("loadSave") },
        { act: "lang", label: GS.t("langToggle") },
      ]);
      if (banner) banner.classList.add("hidden");
      this.noteChrome();
      return;
    }

    if (mode === "campaign") {
      this._campaign(game, left, right, banner);
      this.noteChrome();
      return;
    }

    if ((mode === "battle" || mode === "sandbox") && game.battle) {
      this._battle(game, left, right, banner);
    }
    this.noteChrome();
  };

  Hud.prototype._campaign = function (game, left, right, banner) {
    if (banner) banner.classList.add("hidden");
    var node = GS.Campaign.getNode(game.campaign, game.campCursor);
    var ui = game.ui;
    this._setTop("GOOD SOUTH",
      ui.chip(GS.t("coins"), game.army.coins, "hi") +
      ui.chip(GS.t("cleared"), game.army.islandsCleared, "ok") +
      ui.chip(GS.t("relics"), (game.army.relics || []).length) +
      ui.chip(GS.t("pact"), GS.t(game.campaign.threat === "hold" ? "threatHold" : game.campaign.threat === "blood" ? "threatBlood" : "threatWar")));
    GS.util.setHtml(left, this.campLeft(game, node));
    GS.util.setHtml(right, this.roster(game.army) + this.relicList(game.army) + this.islandList(game) + this.legend());
    this._setHint(game.touch ? GS.t("hintChartTouch") : GS.t("hintChart"));
    ui.setToolbar([]);
    var campCmds = node && node.status === "scouted" ? [
      { act: "open-island", arg: String(node.id), label: GS.t("landThisName", GS.loc(node)), primary: true },
    ] : [];
    if (game.compact) {
      campCmds = campCmds.concat([
        { act: "zoom", arg: "1", label: "+" },
        { act: "zoom", arg: "-1", label: "−" },
        { act: "center-cam", label: GS.t("center") },
        { act: "fit-cam", label: GS.t("fit") },
      ]);
    }
    ui.setCommands(campCmds);
    this._dock(game, [
      { act: "toggle-sheet", arg: "left", label: GS.t("intel"), on: game.sheet === "left" },
      { act: "toggle-sheet", arg: "right", label: GS.t("roster"), on: game.sheet === "right" },
      { act: "hire", label: GS.t("hireTitle") },
      { act: "pause-menu", label: GS.t("menu") },
    ]);
  };

  Hud.prototype._battle = function (game, left, right, banner) {
    var b = game.battle;
    var ui = game.ui;
    var cnt = b.counts();
    var waveDone = GS.Waves.launchedCount(b.waves);
    var phaseLabel = b.phase === "deploy" ? GS.t("phaseDeploy") : b.phase === "over" ? GS.t("phaseOver") : (b.speed ? "×" + b.speed : GS.t("paused"));

    if (banner) {
      var coach = (GS.Meta && GS.Meta.coachLine) ? GS.Meta.coachLine(b) : null;
      if (b.phase === "deploy") {
        banner.classList.remove("hidden");
        var unplaced = 0;
        for (var si = 0; si < b.squads.length; si++) {
          if (b.squads[si].soldiers > 0 && !b.squads[si].placed) unplaced++;
        }
        var landTxt = GS.joinList((b.island.landingDirs || []).map(function (d) { return GS.loc(GS.DIRS[d]); }));
        if (coach) banner.textContent = GS.t(coach);
        else if (game.compact || game.touch) banner.textContent = GS.t("bannerDeployTouch");
        else if (unplaced > 0) banner.textContent = GS.t("bannerDeployCount", unplaced, landTxt);
        else banner.textContent = GS.t("bannerDeployReady", landTxt);
      } else if (b.phase === "fight" && b.speed === 0) {
        banner.classList.remove("hidden");
        banner.textContent = GS.t("paused");
      } else if (coach) {
        banner.classList.remove("hidden");
        banner.textContent = GS.t(coach);
      } else banner.classList.add("hidden");
      banner.classList.toggle("paused", b.phase === "fight" && !b.speed);
    }

    this._setTop(GS.loc(b.island) || b.island.name,
      ui.chip(GS.t("stage"), phaseLabel, b.phase === "deploy" ? "hi" : "") +
      ui.chip(GS.t("houses"), cnt.houses + "/" + b.houses.length, cnt.houses < b.houses.length ? "warn" : "ok") +
      ui.chip(GS.t("ours"), cnt.soldiers) +
      ui.chip(GS.t("northmen"), cnt.enemies, cnt.enemies ? "warn" : "") +
      (function () {
        if (game.mode !== "battle" || !b.omen || b.omen === "calm") return "";
        var om = GS.Meta && GS.Meta.omen(b.omen);
        return om ? ui.chip(GS.t("omen"), GS.loc(om), om.kind === "bad" ? "warn" : "hi") : "";
      }()) +
      (b.waves.length ? (function () {
        var nw = GS.Waves.nextPending && GS.Waves.nextPending(b.waves);
        var done = ui.chip(GS.t("waves"), waveDone + "/" + b.waves.length);
        if (!nw || b.phase === "deploy") return done;
        var eta = Math.max(0, nw.t - b.t);
        var brief = GS.Waves.blurb ? GS.Waves.blurb(nw) : "";
        return done + ui.chip(GS.t("nextWave"), brief + " " + eta.toFixed(0) + "s", eta < 6 ? "warn" : "hi");
      }()) : ui.chip(GS.t("mode"), GS.t("sandboxMode"), "cyan")));

    GS.util.setHtml(left, this.battleLeft(game, b));
    GS.util.setHtml(right, this.squadList(b) + this.logHtml(b) + this.legend());
    this._setHint((game.touch || game.compact)
      ? GS.t("hintBattleTouch")
      : (game.mode === "sandbox" ? GS.t("hintSandbox") : GS.t("hintBattle")));

    this.battleToolbar(game, b);
  };

  Hud.prototype.battleToolbar = function (game, b) {
    var ui = game.ui;
    var items = [];
    if (b.phase === "deploy") {
      items.push({ act: "start", label: GS.t("startFight"), primary: true });
      if (game.mode === "battle") items.push({ act: "form-up", label: GS.t("formUp") });
    } else if (b.phase === "fight") {
      items.push({ act: "pause", label: b.speed ? GS.t("pause") : GS.t("resume"), active: !b.speed });
      items.push({ act: "spd", arg: "1", label: "1×", active: b.speed === 1 });
      items.push({ act: "spd", arg: "2", label: "2×", active: b.speed === 2 });
      items.push({ act: "spd", arg: "3", label: "3×", active: b.speed === 3 });
      if (game.mode === "battle") {
        items.push({
          act: "warhorn",
          label: b.warhornReady ? (b.warhornCharges > 1 ? GS.t("warhornN", b.warhornCharges) : GS.t("warhorn")) : GS.t("hornUsed"),
          active: b.warhornT > 0,
          disabled: !b.warhornReady && b.warhornT <= 0,
        });
        items.push({ act: "evac", label: GS.t("evacShort"), danger: true });
      }
    }
    items.push({ act: "pause-menu", label: GS.t("menu") });
    ui.setToolbar(game.compact ? [] : items);

    var cmds = [];
    var sqs = b.livingSquads();
    for (var i = 0; i < Math.min(sqs.length, 9); i++) {
      cmds.push({
        act: "select-squad",
        arg: sqs[i].id,
        glyph: GS.ROLES[sqs[i].role].ch,
        name: GS.loc(sqs[i]).split(/[· ]/)[0],
        title: GS.loc(sqs[i]),
        kbd: String(i + 1),
        active: sqs[i].id === b.selected,
      });
    }
    if (game.compact) {
      var lead = [
        { act: "rotate", label: GS.t("rotate"), title: GS.t("rotate") },
        { act: "cycle-order", label: GS.t("orderCycle"), title: GS.t("orderCycle") },
      ];
      if (b.phase === "fight") {
        lead.push({ act: "spd", arg: "1", label: "1×", active: b.speed === 1 });
        lead.push({ act: "spd", arg: "2", label: "2×", active: b.speed === 2 });
        lead.push({ act: "spd", arg: "3", label: "3×", active: b.speed === 3 });
      }
      lead.push({ act: "zoom", arg: "1", label: "+", title: GS.t("zoomIn") });
      lead.push({ act: "zoom", arg: "-1", label: "−", title: GS.t("zoomOut") });
      lead.push({ act: "center-cam", label: GS.t("center"), title: GS.t("center") });
      cmds = cmds.concat(lead);
    }
    ui.setCommands(cmds);
    var dockItems = [
      { act: "toggle-sheet", arg: "left", label: GS.t("intel"), on: game.sheet === "left" },
      { act: "toggle-sheet", arg: "right", label: GS.t("troops"), on: game.sheet === "right" },
    ];
    if (b.phase === "deploy") {
      if (game.mode === "battle") dockItems.push({ act: "form-up", label: GS.t("formUp") });
      dockItems.push({ act: "start", label: GS.t("startFight"), primary: true });
    } else if (b.phase === "fight") {
      dockItems.push({
        act: "pause",
        label: b.speed ? GS.t("pause") : GS.t("resume"),
        on: !b.speed,
      });
      if (game.mode === "battle") {
        dockItems.push({
          act: "warhorn",
          label: b.warhornReady ? (b.warhornCharges > 1 ? GS.t("warhornN", b.warhornCharges) : GS.t("warhorn")) : GS.t("hornUsed"),
          on: b.warhornT > 0,
          disabled: !b.warhornReady && b.warhornT <= 0,
        });
      }
    }
    dockItems.push({ act: "pause-menu", label: GS.t("menu") });
    this._dock(game, dockItems);
  };

  Hud.prototype._dock = function (game, items) {
    var dock = $("dock");
    if (!dock) return;
    if (!game.compact) {
      GS.util.setHtml(dock, "");
      return;
    }
    GS.util.setHtml(dock, (items || []).map(function (it) {
      var cls = (it.on ? " on" : "") + (it.primary ? " primary" : "");
      return '<button type="button" class="' + cls.trim() + '" data-act="' + it.act + '"' +
        (it.arg != null ? ' data-arg="' + it.arg + '"' : "") +
        (it.on ? ' aria-pressed="true"' : "") +
        (it.disabled ? " disabled" : "") + ">" + it.label + "</button>";
    }).join(""));
  };

  Hud.prototype.campLeft = function (game, node) {
    if (!node) return "<p>" + GS.t("pickIsle") + "</p>";
    var stMap = { hidden: GS.t("unknown"), scouted: GS.t("unfought"), cleared: GS.t("recovered"), lost: GS.t("fallen") };
    var st = stMap[node.status] || node.status;
    var om = node.omen && GS.Meta ? GS.Meta.omen(node.omen) : null;
    var relic = node.relic && GS.Meta ? GS.Meta.relic(node.relic) : null;
    return "<h3>" + GS.loc(node) + "</h3>" +
      "<p>" + GS.loc(GS.BIOMES[node.biome], "flavor") + "</p>" +
      "<p>" + GS.t("threatLine", "▲".repeat(node.difficulty)) + "　<span class='chip'>" + st + "</span></p>" +
      (om ? "<p>" + GS.t("omenP", GS.loc(om), GS.loc(om, "desc")) + "</p>" : "") +
      (relic && node.status === "scouted" ? "<p>" + GS.t("relicP", relic.ch || "", GS.loc(relic), GS.loc(relic, "desc")) + "</p>" : "") +
      "<p>" + GS.t("routesLine") + GS.joinList(node.edges.map(function (id) {
        return GS.loc(game.campaign.islands[id]);
      })) + "</p>" +
      (node.status === "scouted"
        ? '<p><button data-act="open-island" data-arg="' + node.id + '">' + GS.t("landThis") + "</button></p>"
        : "") +
      "<p class=\"hint\">" + GS.t("chartHint") + "</p>";
  };

  Hud.prototype.islandList = function (game) {
    var html = "<h3>" + GS.t("knownIsles") + "</h3><p class=\"hint\">" + GS.t("listHint") + "</p>";
    for (var i = 0; i < game.campaign.islands.length; i++) {
      var is = game.campaign.islands[i];
      if (is.status === "hidden") continue;
      var omShort = (is.omen && is.status === "scouted" && GS.Meta) ? GS.loc(GS.Meta.omen(is.omen)) : "";
      var stLabel = { hidden: GS.t("unknown"), scouted: GS.t("unfought"), cleared: GS.t("recovered"), lost: GS.t("fallen") }[is.status] || is.status;
      html += '<div class="island-item' + (is.id === game.campCursor ? " sel" : "") +
        '" data-act="select-island" data-arg="' + is.id + '">' +
        "<span>" + GS.loc(is) + "</span><span class=\"hint\">" + stLabel + " ▲" + is.difficulty +
        (omShort ? " · " + omShort : "") + "</span></div>";
    }
    return html;
  };

  Hud.prototype.battleLeft = function (game, b) {
    var tile = b.island.tiles[b.cursor.y] && b.island.tiles[b.cursor.y][b.cursor.x];
    var def = tile ? GS.tileDef(tile.type) : null;
    var sq = b.getSquad(b.selected);
    var html = "";
    if (sq) {
      var role = GS.ROLES[sq.role];
      var trait = "";
      if (sq.trait) for (var i = 0; i < GS.TRAITS.length; i++) if (GS.TRAITS[i].id === sq.trait) trait = GS.loc(GS.TRAITS[i]);
      html += "<h3>" + GS.t("selected") + "</h3><p>" + role.ch + " <b>" + GS.loc(sq) + "</b><br>" + GS.loc(role) +
        "　" + GS.t("facingAt", GS.loc(GS.DIRS[sq.facing]) + "\u00a0" + GS.DIRS[sq.facing].ch) + "<br>" + GS.t("soldiersOf", sq.soldiers, sq.maxSoldiers) +
        (trait ? "<br>" + GS.t("trait") + " [" + trait + "]" : "") +
        (sq.doctrine ? "<br>" + GS.t("doctrine") + " [" + (function () {
          for (var di = 0; di < GS.TRAITS.length; di++) if (GS.TRAITS[di].id === sq.doctrine) return GS.loc(GS.TRAITS[di]);
          return sq.doctrine;
        })() + "]" : "") +
        (sq.placed ? "" : "<br><span class='warn'>" + GS.t("notPlaced") + "</span>") +
        "<br>" + GS.t("orderNow", GS.Battle.orderMark(sq.order), GS.t(GS.Battle.orderKey(sq.order))) +
        "<br>" + GS.t("xpOf", sq.xp || 0, (sq.level || 1) * 12) + " · Lv" + (sq.level || 1) +
        (sq.moveCd > 0 ? "<br><span class='hint'>" + GS.t("moveCd") + " " + sq.moveCd.toFixed(1) + "s</span>" : "") +
        "</p><p class=\"sheet-actions\">" +
        "<button type=\"button\" data-act=\"rotate\">" + GS.t("rotate") + "</button>" +
        "<button type=\"button\" data-act=\"cycle-order\">" + GS.t("orderCycle") + "</button></p>" +
        "<p class=\"hint\">" + (GS.loc(role, "desc") || role.desc) + "</p>";
    }
    if (game.lookText) html += "<pre class=\"look\">" + GS.util.escapeHtml(game.lookText) + "</pre>";
    html += "<details class=\"legend-fold\"><summary>" + GS.t("observe") + "</summary>" +
      "<p>" + GS.t("cursorAt", b.cursor.x, b.cursor.y, def ? def.ch + " " + GS.loc(def) : "") + "</p>" +
      (def && !game.lookText ? "<p class=\"look\">" + (GS.loc(def, "look") || def.look) + "</p>" : "") +
      "</details>";
    html += "<h3>" + GS.t("houses") + "</h3>";
    var houseList = b.houses.slice().sort(function (a, c) {
      var ra = a.alive ? a.hp / Math.max(1, a.maxHp) : -1;
      var rc = c.alive ? c.hp / Math.max(1, c.maxHp) : -1;
      return ra - rc;
    });
    var hurt = [];
    for (i = 0; i < houseList.length; i++) {
      var h = houseList[i];
      var pressed = h.alive && b.houseUnderSiege && b.houseUnderSiege(h);
      if (!h.alive || h.hp < h.maxHp || pressed) hurt.push(h);
    }
    if (!hurt.length) html += "<p class=\"hint\">" + GS.t("housesSound") + "</p>";
    else {
      html += "<ul>";
      for (i = 0; i < hurt.length; i++) {
        h = hurt[i];
        html += "<li>" + (h.alive ? "⌂" : "%") + " " + GS.houseName(h, b) + " " + game.ui.hpBar(h.hp, h.maxHp) +
          (h.alive && b.houseUnderSiege && b.houseUnderSiege(h) ? " <span class='warn'>" + GS.t("siegeMark") + "</span>" : "") +
          "</li>";
      }
      html += "</ul>";
    }
    if (game.mode === "sandbox") {
      var workshop =
        '<p class="hint">' + GS.t("sheetSandboxHint") + "</p>" +
        '<p class="sheet-actions">' +
        '<button type="button" data-act="tool-place"' + (game.sandboxTool === "place" ? ' class="primary"' : "") + ">" + GS.t("place") + "</button>" +
        '<button type="button" data-act="tool-paint"' + (game.sandboxTool === "paint" ? ' class="primary"' : "") + ">" + GS.t("paint") + "</button>" +
        '<button type="button" data-act="brush-next">' + GS.loc(GS.tileDef(game.sandboxBrush)) + "</button>" +
        "</p><p class=\"sheet-actions\">" +
        '<button type="button" data-act="spawn-enemy">' + GS.t("raiders") + "</button>" +
        '<button type="button" data-act="spawn-ship">' + GS.t("longship") + "</button>" +
        '<button type="button" data-act="spawn-ally">' + GS.t("allies") + "</button>" +
        '<button type="button" data-act="gen">' + GS.t("newIsle") + "</button>" +
        "</p><p class=\"sheet-actions\">" +
        '<button type="button" data-act="spawn-shaman">' + GS.t("shaman") + "</button>" +
        '<button type="button" data-act="spawn-hound">' + GS.t("hound") + "</button>" +
        "</p>";
      html += game.compact
        ? "<h3>" + GS.t("sandboxMode") + "</h3>" + workshop
        : "<details class=\"legend-fold\"><summary>" + GS.t("sandboxMode") + "</summary>" + workshop + "</details>";
    }
    return html;
  };

  Hud.prototype.squadList = function (b) {
    var html = "<h3>" + GS.t("troops") + "</h3>";
    var list = b.livingSquads ? b.livingSquads() : b.squads;
    if (!list.length) return html + "<p class=\"hint\">" + GS.t("troopsEmpty") + "</p>";
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var role = GS.ROLES[s.role];
      var idx = i < 9 ? String(i + 1) : "·";
      html += '<div class="squad-item' + (s.id === b.selected ? " sel" : "") +
        '" data-act="select-squad" data-arg="' + s.id + '">' +
        '<span class="idx">' + idx + "</span>" +
        "<span>" + role.ch + " " + GS.loc(s) + "</span>" +
        "<span class=\"hint\">" + (GS.DIRS[s.facing] ? GS.DIRS[s.facing].ch + " " : "") +
        GS.Battle.orderMark(s.order) + " " + s.soldiers + (s.placed ? "" : " ·") + "</span></div>";
    }
    return html;
  };

  Hud.prototype.logHtml = function (b) {
    var logs = b.log.slice(-8);
    if (!logs.length) return "<p class=\"hint\">" + GS.t("logEmpty") + "</p>";
    var html = "<details class=\"legend-fold\"><summary>" + GS.t("log") + "</summary><ul class='log'>";
    for (var i = 0; i < logs.length; i++) {
      html += "<li style='color:" + logs[i].color + "'>" + GS.util.escapeHtml(GS.logText ? GS.logText(logs[i]) : logs[i].msg) + "</li>";
    }
    return html + "</ul></details>";
  };

  Hud.prototype.roster = function (army) {
    var html = "<h3>" + GS.t("roster") + "　" + GS.t("coins") + " " + army.coins + "</h3><ul>";
    for (var i = 0; i < army.commanders.length; i++) {
      var c = army.commanders[i];
      var role = GS.ROLES[c.cls];
      html += "<li>" + (c.dead ? "<s>" : "") + role.ch + " " + GS.loc(c) + " " + c.soldiers + (c.dead ? "</s>" : "") + "</li>";
    }
    return html + "</ul>";
  };

  Hud.prototype.relicList = function (army) {
    var ids = (army && army.relics) || [];
    var html = "<h3>" + GS.t("relics") + "</h3>";
    if (!ids.length) return html + "<p class=\"hint\">" + GS.t("relicEmpty") + "</p>";
    html += "<ul>";
    for (var i = 0; i < ids.length; i++) {
      var r = GS.Meta && GS.Meta.relic(ids[i]);
      html += "<li>" + (r ? r.ch + " <b>" + GS.loc(r) + "</b> " + GS.loc(r, "desc") : ids[i]) + "</li>";
    }
    return html + "</ul>";
  };

  Hud.prototype.legend = function () {
    return "<details class=\"legend-fold\"><summary>" + GS.t("legend") + "</summary><pre class='legend'>" + GS.t("legendBody") + "</pre></details>";
  };

  GS.Hud = Hud;
})(typeof window !== "undefined" ? window : globalThis);
