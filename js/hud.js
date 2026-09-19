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
    if (b) b.textContent = brand || "GOOD SOUTH";
    if (c) c.innerHTML = chipsHtml || "";
  };

  Hud.prototype._setHint = function (text) {
    var h = $("bot-hint");
    if (h) h.textContent = text || "";
  };

  Hud.prototype.render = function (force) {
    var game = this.game;
    var now = performance.now ? performance.now() : Date.now();
    if (!force && !game.hudDirty && now - this._last < ((game.compact ? 180 : 0) || GS.CONFIG.battle.hudIntervalMs)) return;
    game.hudDirty = false;
    this._last = now;

    var mode = game.mode;
    var ui = game.ui;
    var left = $("left");
    var right = $("right");
    var tools = $("sandbox-tools");
    var banner = $("phase-banner");
    if (tools) tools.classList.toggle("visible", mode === "sandbox");

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
      return;
    }

    if (mode === "campaign") {
      this._campaign(game, left, right, banner);
      return;
    }

    if ((mode === "battle" || mode === "sandbox") && game.battle) {
      this._battle(game, left, right, banner);
    }
  };

  Hud.prototype._campaign = function (game, left, right, banner) {
    if (banner) banner.classList.add("hidden");
    var node = GS.Campaign.getNode(game.campaign, game.campCursor);
    var ui = game.ui;
    this._setTop("GOOD SOUTH",
      ui.chip(GS.t("chart"), GS.t("isles"), "cyan") +
      ui.chip(GS.t("coins"), game.army.coins, "hi") +
      ui.chip(GS.t("cleared"), game.army.islandsCleared, "ok") +
      ui.chip(GS.t("relics"), (game.army.relics || []).length, "cyan") +
      ui.chip(GS.t("palette"), game.palette));
    left.innerHTML = this.campLeft(game, node);
    right.innerHTML = this.roster(game.army) + this.relicList(game.army) + this.islandList(game) + this.legend();
    this._setHint(game.touch ? GS.t("hintChartTouch") : GS.t("hintChart"));
    if (game.compact) {
      ui.setToolbar([]);
    } else {
      ui.setToolbar([
        { act: "pause-menu", label: GS.t("menu"), kbd: "Esc" },
        { act: "save-menu", label: GS.t("save"), kbd: "F5" },
        { act: "hire", label: GS.t("hireTitle"), kbd: "N" },
        { act: "pal", label: GS.t("palette"), kbd: "P" },
        { act: "mute", label: GS.audio.muted() ? GS.t("muteOn") : GS.t("muteOff"), kbd: "-" },
        { act: "lang", label: GS.t("langToggle"), kbd: "I" },
        { act: "help", label: GS.t("handbook"), kbd: "?" },
        { sep: true },
        { act: "zoom", arg: "1", label: "+", kbd: ".", title: GS.t("zoomIn") },
        { act: "zoom", arg: "-1", label: "−", kbd: ",", title: GS.t("zoomOut") },
        { act: "center-cam", label: GS.t("center"), kbd: "F" },
        { act: "fit-cam", label: GS.t("fit"), kbd: "0" },
        { sep: true },
        { act: "title", label: GS.t("title") },
      ]);
    }
    var campCmds = node && node.status === "scouted" ? [
      { act: "open-island", arg: String(node.id), label: GS.t("landThisName", GS.loc(node)), kbd: "G" },
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
      { act: "toggle-sheet", arg: "left", label: GS.t("intel") },
      { act: "toggle-sheet", arg: "right", label: GS.t("roster") },
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
      if (b.phase === "deploy") {
        banner.classList.remove("hidden");
        banner.textContent = (game.compact || game.touch) ? GS.t("bannerDeployTouch") : GS.t("bannerDeploy");
      } else if (b.phase === "fight" && b.speed === 0) {
        banner.classList.remove("hidden");
        banner.textContent = GS.t("paused");
      } else banner.classList.add("hidden");
    }

    this._setTop(GS.loc(b.island) || b.island.name,
      (game.compact ? "" : ui.chip(GS.t("eco"), GS.loc(GS.BIOMES[b.island.biome]))) +
      ui.chip(GS.t("stage"), phaseLabel, b.phase === "deploy" ? "hi" : "cyan") +
      (function () {
        var sel = b.getSquad(b.selected);
        if (!sel) return "";
        var d = GS.DIRS[sel.facing] || GS.DIRS[2];
        return ui.chip(GS.t("facing"), GS.loc(d) + "\u00a0" + d.ch, "cyan");
      }()) +
      ui.chip(GS.t("houses"), cnt.houses + "/" + b.houses.length, cnt.houses < b.houses.length ? "warn" : "ok") +
      ui.chip(GS.t("ours"), cnt.soldiers) +
      ui.chip(GS.t("northmen"), cnt.enemies, cnt.enemies ? "warn" : "") +
      (function () {
        if (game.mode !== "battle" || !b.omen || b.omen === "calm") return "";
        var om = GS.Meta && GS.Meta.omen(b.omen);
        return om ? ui.chip(GS.t("omen"), GS.loc(om), om.kind === "bad" ? "warn" : "hi") : "";
      }()) +
      (b.waves.length ? ui.chip(GS.t("waves"), waveDone + "/" + b.waves.length) : ui.chip(GS.t("mode"), GS.t("sandboxMode"), "cyan")) +
      (game.compact ? "" : ui.chip("t", b.t.toFixed(1))));

    left.innerHTML = this.battleLeft(game, b);
    right.innerHTML = this.squadList(b) + this.logHtml(b) + this.legend();
    this._setHint((game.touch || game.compact)
      ? GS.t("hintBattleTouch")
      : (game.mode === "sandbox" ? GS.t("hintSandbox") : GS.t("hintBattle")));

    this.battleToolbar(game, b);
  };

  Hud.prototype.battleToolbar = function (game, b) {
    var ui = game.ui;
    var items = [];
    if (b.phase === "deploy") {
      items.push({ act: "start", label: GS.t("startFight"), kbd: "G", primary: true });
      items.push({ act: "rotate", label: GS.t("rotate"), kbd: "R" });
      items.push({ act: "zoom", arg: "1", label: "+", kbd: ".", title: GS.t("zoomIn") });
      items.push({ act: "zoom", arg: "-1", label: "−", kbd: ",", title: GS.t("zoomOut") });
      items.push({ act: "center-cam", label: GS.t("center"), kbd: "F" });
      items.push({ act: "look", label: b.look ? GS.t("looking") : GS.t("look"), kbd: "'", active: b.look });
    } else if (b.phase === "fight") {
      items.push({ act: "pause", label: b.speed ? GS.t("pause") : GS.t("resume"), kbd: "␣", active: !b.speed });
      items.push({ act: "spd", arg: "1", label: "1×", active: b.speed === 1 });
      items.push({ act: "spd", arg: "2", label: "2×", active: b.speed === 2 });
      items.push({ act: "spd", arg: "3", label: "3×", active: b.speed === 3 });
      items.push({ sep: true });
      items.push({ act: "rotate", label: GS.t("rotate"), kbd: "R" });
      items.push({ act: "zoom", arg: "1", label: "+", kbd: ".", title: GS.t("zoomIn") });
      items.push({ act: "zoom", arg: "-1", label: "−", kbd: ",", title: GS.t("zoomOut") });
      items.push({ act: "center-cam", label: GS.t("center"), kbd: "F" });
      if (game.mode === "battle") {
        items.push({
          act: "warhorn",
          label: b.warhornReady ? (b.warhornCharges > 1 ? GS.t("warhornN", b.warhornCharges) : GS.t("warhorn")) : GS.t("hornUsed"),
          kbd: "U",
          active: b.warhornT > 0,
          disabled: !b.warhornReady && b.warhornT <= 0,
        });
        items.push({ act: "evac", label: GS.t("evacShort"), kbd: "E", danger: true });
      }
    }
    if (game.mode === "sandbox") {
      items.push({ sep: true });
      items.push({ act: "tool-place", label: GS.t("place"), kbd: "Z", active: game.sandboxTool === "place" });
      items.push({ act: "tool-paint", label: GS.t("paint"), kbd: "T", active: game.sandboxTool === "paint" });
      items.push({ act: "brush-next", label: GS.loc(GS.tileDef(game.sandboxBrush)) });
      items.push({ act: "spawn-enemy", label: GS.t("raiders"), kbd: "N" });
      items.push({ act: "spawn-ship", label: GS.t("longship"), kbd: "B" });
      items.push({ act: "spawn-ally", label: GS.t("allies"), kbd: "C" });
      items.push({ act: "spawn-shaman", label: GS.t("shaman"), kbd: "Y" });
      items.push({ act: "spawn-hound", label: GS.t("hound"), kbd: "I" });
      items.push({ act: "gen", label: GS.t("newIsle") });
    }
    items.push({ sep: true });
    if (game.army && game.campaign) items.push({ act: "quicksave", label: GS.t("qsave"), kbd: "F5" });
    items.push({ act: "mute", label: GS.audio.muted() ? GS.t("muteOn") : GS.t("muteOff"), kbd: "-" });
    items.push({ act: "lang", label: GS.t("langToggle"), kbd: "I" });
    items.push({ act: "pause-menu", label: GS.t("menu"), kbd: "Esc" });
    ui.setToolbar(game.compact ? [] : items);

    var cmds = [];
    var sqs = b.livingSquads();
    for (var i = 0; i < Math.min(sqs.length, 9); i++) {
      cmds.push({
        act: "select-squad",
        arg: sqs[i].id,
        label: GS.ROLES[sqs[i].role].ch + " " + GS.loc(sqs[i]).split(/[· ]/)[0],
        kbd: String(i + 1),
        active: sqs[i].id === b.selected,
      });
    }
    if (game.compact) {
      cmds.push({ act: "zoom", arg: "1", label: "+" });
      cmds.push({ act: "zoom", arg: "-1", label: "−" });
      cmds.push({ act: "center-cam", label: GS.t("center") });
      if (b.phase === "fight") {
        cmds.push({ act: "spd", arg: "1", label: "1×", active: b.speed === 1 });
        cmds.push({ act: "spd", arg: "2", label: "2×", active: b.speed === 2 });
        cmds.push({ act: "spd", arg: "3", label: "3×", active: b.speed === 3 });
        if (game.mode === "battle") {
          cmds.push({
            act: "warhorn",
            label: b.warhornReady ? (b.warhornCharges > 1 ? GS.t("warhornN", b.warhornCharges) : GS.t("warhorn")) : GS.t("hornUsed"),
            active: b.warhornT > 0,
            disabled: !b.warhornReady && b.warhornT <= 0,
          });
        }
      }
    }
    ui.setCommands(cmds);
    this._dock(game, [
      { act: "toggle-sheet", arg: "left", label: GS.t("intel") },
      { act: "toggle-sheet", arg: "right", label: GS.t("troops") },
      b.phase === "deploy"
        ? { act: "start", label: GS.t("startFight") }
        : { act: "pause", label: b.speed ? GS.t("pause") : GS.t("resume") },
      { act: "rotate", label: GS.t("rotate") },
      { act: "pause-menu", label: GS.t("menu") },
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
      html += '<div class="island-item' + (is.id === game.campCursor ? " sel" : "") +
        '" data-act="select-island" data-arg="' + is.id + '">' +
        "<span>" + GS.loc(is) + "</span><span class=\"hint\">" + is.status + " ▲" + is.difficulty +
        (omShort ? " · " + omShort : "") + "</span></div>";
    }
    return html;
  };

  Hud.prototype.battleLeft = function (game, b) {
    var tile = b.island.tiles[b.cursor.y] && b.island.tiles[b.cursor.y][b.cursor.x];
    var def = tile ? GS.tileDef(tile.type) : null;
    var sq = b.getSquad(b.selected);
    var html = "<h3>" + GS.t("observe") + "</h3>";
    html += "<p>" + GS.t("cursorAt", b.cursor.x, b.cursor.y, def ? def.ch + " " + GS.loc(def) : "") + "</p>";
    if (game.lookText) html += "<pre class=\"look\">" + GS.util.escapeHtml(game.lookText) + "</pre>";
    else if (def) html += "<p class=\"look\">" + (GS.loc(def, "look") || def.look) + "</p>";
    if (sq) {
      var role = GS.ROLES[sq.role];
      var trait = "";
      if (sq.trait) for (var i = 0; i < GS.TRAITS.length; i++) if (GS.TRAITS[i].id === sq.trait) trait = GS.loc(GS.TRAITS[i]);
      html += "<h3>" + GS.t("selected") + "</h3><p>" + role.ch + " <b>" + GS.loc(sq) + "</b><br>" + GS.loc(role) +
        "　" + GS.t("facingAt", GS.loc(GS.DIRS[sq.facing]) + "\u00a0" + GS.DIRS[sq.facing].ch) + "<br>" + GS.t("soldiersOf", sq.soldiers, sq.maxSoldiers) +
        (trait ? "<br>" + GS.t("trait") + " [" + trait + "]" : "") +
        (sq.placed ? "" : "<br><span class='warn'>" + GS.t("notPlaced") + "</span>") +
        (sq.moveCd > 0 ? "<br><span class='hint'>" + GS.t("moveCd") + " " + sq.moveCd.toFixed(1) + "s</span>" : "") +
        "</p><p class=\"hint\">" + (GS.loc(role, "desc") || role.desc) + "</p>";
    }
    html += "<h3>" + GS.t("houses") + "</h3><ul>";
    for (i = 0; i < b.houses.length; i++) {
      var h = b.houses[i];
      html += "<li>" + (h.alive ? "⌂" : "%") + " " + GS.houseName(h, b) + " " + game.ui.hpBar(h.hp, h.maxHp) + "</li>";
    }
    html += "</ul>";
    if (game.mode === "sandbox") {
      html += "<h3>" + GS.t("sandboxMode") + "</h3>";
      if (game.compact) {
        html += '<p class="hint">' + GS.t("sheetSandboxHint") + "</p>" +
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
      } else {
        html += "<p>" + GS.t("tool") + " <b>" + (game.sandboxTool === "paint" ? GS.t("paint") + " / " + GS.loc(GS.tileDef(game.sandboxBrush)) : GS.t("place")) +
          "</b></p>";
      }
    }
    return html;
  };

  Hud.prototype.squadList = function (b) {
    var html = "<h3>" + GS.t("troops") + "</h3>";
    var list = b.livingSquads ? b.livingSquads() : b.squads;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var role = GS.ROLES[s.role];
      var idx = i < 9 ? String(i + 1) : "·";
      html += '<div class="squad-item' + (s.id === b.selected ? " sel" : "") +
        '" data-act="select-squad" data-arg="' + s.id + '">' +
        '<span class="idx">' + idx + "</span>" +
        "<span>" + role.ch + " " + GS.loc(s) + "</span>" +
        "<span class=\"hint\">" + s.soldiers + (s.placed ? "" : " ·") + "</span></div>";
    }
    return html;
  };

  Hud.prototype.logHtml = function (b) {
    var html = "<h3>" + GS.t("log") + "</h3><ul class='log'>";
    var logs = b.log.slice(-12);
    for (var i = 0; i < logs.length; i++) {
      html += "<li style='color:" + logs[i].color + "'>" + GS.util.escapeHtml(logs[i].msg) + "</li>";
    }
    return html + "</ul>";
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
    return "<h3>" + GS.t("legend") + "</h3><pre class='legend'>" + GS.t("legendBody") + "</pre>";
  };

  GS.Hud = Hud;
})(typeof window !== "undefined" ? window : globalThis);
