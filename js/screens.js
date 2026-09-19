/* Good South — overlay screens (title / pause / save / load / help / …) */
(function (g) {
  var GS = g.GS || (g.GS = {});
  var $ = GS.util.$;

  function Screens(game) {
    this.game = game;
  }

  Screens.prototype.overlay = function () {
    return $("overlay");
  };

  Screens.prototype.show = function (html) {
    var o = this.overlay();
    o.classList.remove("hidden");
    o.innerHTML = html;
    this.bind(o);
    var dock = $("dock");
    if (dock) dock.classList.add("under-overlay");
  };

  Screens.prototype.hide = function () {
    var o = this.overlay();
    o.classList.add("hidden");
    o.innerHTML = "";
    var dock = $("dock");
    if (dock) dock.classList.remove("under-overlay");
  };

  Screens.prototype.bind = function (root) {
    var game = this.game;
    root.querySelectorAll("button[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (GS.audio) GS.audio.ui();
        game.dispatch(btn.getAttribute("data-act"), btn.getAttribute("data-arg"));
      });
    });
  };

  Screens.prototype._slotRows = function (mode) {
    // mode: "save" | "load"
    var slots = GS.Save.listSlots();
    return slots.map(function (s) {
      var sum = s.summary;
      var body = s.empty
        ? '<span class="slot-empty">' + GS.t("empty") + "</span>"
        : '<span class="slot-meta">' + sum.time +
          '</span><span class="slot-meta">' + GS.t("slotCoins", sum.coins) +
          " · " + GS.t("slotCleared", sum.cleared, sum.islandCount) +
          " · " + GS.t("slotCaps", sum.living) +
          (sum.relics ? " · " + GS.t("slotRelics", sum.relics) : "") +
          (sum.inBattle ? ' · <b class="warn">' + GS.t("inBattle") + "</b>" : "") +
          "</span><span class=\"slot-meta\">" + GS.t("slotIsland", GS.util.escapeHtml(GS.loc({ name: sum.currentName, nameEn: sum.currentNameEn }) || sum.currentName)) + "</span>";
      var act = mode === "save" ? "save-slot" : "load-slot";
      var disabled = mode === "load" && s.empty ? " disabled" : "";
      return '<button class="slot-btn" data-act="' + act + '" data-arg="' + s.slot + '"' + disabled + ">" +
        "<div class=\"slot-name\">" + s.name + "</div>" + body + "</button>";
    }).join("");
  };

  Screens.prototype.title = function () {
    var latest = GS.Save.latest();
    var cont = "";
    if (latest && latest.summary) {
      var s = latest.summary;
      cont =
        '<button data-act="continue"><kbd>D</kbd> ' + GS.t("continueAs", latest.name) +
        "　" + s.time + "　" + GS.t("cleared") + " " + s.cleared + "　" + GS.t("coins") + " " + s.coins +
        (s.inBattle ? "　" + GS.t("inBattleMark") : "") + "</button>";
    }
    this.show(
      '<div class="panel title-panel">' +
      "<pre class=\"ascii-logo\">" +
      "  ██████╗  ██████╗  ██████╗ ██████╗     ███████╗ ██████╗ ██╗   ██╗████████╗██╗  ██╗\n" +
      " ██╔════╝ ██╔═══██╗██╔═══██╗██╔══██╗    ██╔════╝██╔═══██╗██║   ██║╚══██╔══╝██║  ██║\n" +
      " ██║  ███╗██║   ██║██║   ██║██║  ██║    ███████╗██║   ██║██║   ██║   ██║   ███████║\n" +
      " ██║   ██║██║   ██║██║   ██║██║  ██║    ╚════██║██║   ██║██║   ██║   ██║   ██╔══██║\n" +
      " ╚██████╔╝╚██████╔╝╚██████╔╝██████╔╝    ███████║╚██████╔╝╚██████╔╝   ██║   ██║  ██║\n" +
      "  ╚═════╝  ╚═════╝  ╚═════╝ ╚═════╝     ╚══════╝ ╚═════╝  ╚═════╝    ╚═╝   ╚═╝  ╚═╝\n" +
      "</pre>" +
      '<div class="sub">' + GS.t("subtitle") + "</div>" +
      '<div class="flavor">' + GS.t("flavor") + "</div>" +
      '<div class="menu">' +
      cont +
      '<button data-act="load-menu"><kbd>L</kbd> ' + GS.t("loadSlots") + "</button>" +
      '<button data-act="campaign"><kbd>A</kbd> ' + GS.t("newCampaign") + "</button>" +
      '<button data-act="sandbox"><kbd>B</kbd> ' + GS.t("sandbox") + "</button>" +
      '<button data-act="help"><kbd>C</kbd> / <kbd>F1</kbd> ' + GS.t("handbook") + "</button>" +
      '<button data-act="lang"><kbd>I</kbd> ' + GS.t("langToggle") + "</button>" +
      "</div>" +
      '<div class="hint">' + GS.t("titleHint") + "</div>" +
      "</div>"
    );
  };

  Screens.prototype.pause = function (ctx) {
    ctx = ctx || {};
    var inBattle = ctx.inBattle;
    var canSave = !!ctx.canSave;
    this.show(
      '<div class="panel pause-panel">' +
      "<h2>" + GS.t("pause") + "</h2>" +
      '<p class="flavor">' + (inBattle ? GS.t("pauseBattle") : GS.t("pauseChart")) + "</p>" +
      '<div class="menu">' +
      '<button data-act="resume"><kbd>Esc</kbd> ' + GS.t("resume") + "</button>" +
      (canSave ? '<button data-act="save-menu"><kbd>F5</kbd> ' + GS.t("saveProgress") + "</button>" : "") +
      '<button data-act="load-menu"><kbd>F9</kbd> ' + GS.t("loadSave") + "</button>" +
      '<button data-act="pal">' + GS.t("palette") + "</button>" +
      '<button data-act="mute">' + (GS.audio.muted() ? GS.t("muteOn") : GS.t("muteOff")) + "</button>" +
      '<button data-act="lang"><kbd>I</kbd> ' + GS.t("langToggle") + "</button>" +
      (inBattle && ctx.mode === "battle"
        ? '<button data-act="evac" class="danger-outline">' + GS.t("evac") + "</button>" +
          '<button data-act="back-camp">' + GS.t("backChart") + "</button>"
        : "") +
      (ctx.mode === "sandbox" ? '<button data-act="title">' + GS.t("backTitle") + "</button>" : "") +
      (ctx.mode === "campaign" ? '<button data-act="title">' + GS.t("backTitle") + "</button>" : "") +
      (inBattle && ctx.mode === "battle" ? "" : "") +
      '<button data-act="help">' + GS.t("handbook") + "</button>" +
      "</div></div>"
    );
  };

  Screens.prototype.saveMenu = function () {
    this.show(
      '<div class="panel save-panel">' +
      "<h2>" + GS.t("saveProgress") + "</h2>" +
      '<p class="hint">' + GS.t("saveHint") + "</p>" +
      '<div class="slot-list">' + this._slotRows("save") + "</div>" +
      '<div class="menu"><button data-act="resume"><kbd>Esc</kbd> ' + GS.t("back") + "</button></div></div>"
    );
  };

  Screens.prototype.loadMenu = function () {
    this.show(
      '<div class="panel save-panel">' +
      "<h2>" + GS.t("loadSave") + "</h2>" +
      '<p class="hint">' + GS.t("loadHint") + "</p>" +
      '<div class="slot-list">' + this._slotRows("load") + "</div>" +
      '<div class="menu"><button data-act="resume-or-title"><kbd>Esc</kbd> ' + GS.t("back") + "</button></div></div>"
    );
  };

  Screens.prototype.confirm = function (opts) {
    opts = opts || {};
    this.show(
      '<div class="panel confirm-panel">' +
      "<h2>" + (opts.title || GS.t("confirm")) + "</h2>" +
      "<p>" + (opts.msg || "") + "</p>" +
      '<div class="menu row">' +
      '<button data-act="' + (opts.yesAct || "confirm-yes") + '" data-arg="' + (opts.yesArg || "") + '">' + (opts.yes || GS.t("ok")) + "</button>" +
      '<button data-act="' + (opts.noAct || "resume") + '">' + (opts.no || GS.t("cancel")) + "</button>" +
      "</div></div>"
    );
  };

  Screens.prototype.help = function () {
    this.show(GS.I18N.helpHtml());
  };

  Screens.prototype.preview = function (island, army) {
    var landings = GS.joinList(island.landingDirs.map(function (d) { return GS.loc(GS.DIRS[d]); }));
    var om = island.omen && GS.Meta ? GS.Meta.omen(island.omen) : null;
    var relic = island.relic && GS.Meta ? GS.Meta.relic(island.relic) : null;
    var biome = GS.BIOMES[island.biome] || {};
    this.show(
      '<div class="panel preview-panel">' +
      "<h2>" + GS.t("arrivingIsle", GS.loc(island)) + "</h2>" +
      '<div class="flavor">' + GS.t("previewMeta", GS.loc(biome, "flavor") || island.flavor, GS.loc(biome), "▲".repeat(island.difficulty)) + "</div>" +
      "<pre class=\"mini\">" + GS.util.asciiMini(island) + "</pre>" +
      "<p>" + GS.t("previewCounts", island.houses.length, island.w, island.h) +
      (island.beacons && island.beacons.length ? GS.t("previewBeacons", island.beacons.length) : "") +
      GS.t("previewLand") + "<b>" + landings + "</b>。</p>" +
      (om && om.id !== "calm" ? "<p class=\"omen\">" + GS.t("omenP", GS.loc(om), GS.loc(om, "desc")) + "</p>" : "") +
      (relic ? "<p class=\"relic-line\">" + GS.t("relicP", relic.ch, GS.loc(relic), GS.loc(relic, "desc")) + "</p>" : "") +
      "<p>" + GS.t("previewHomes") + GS.joinList(island.houses.map(function (h) { return GS.houseName ? GS.houseName(h, { island: island }) : GS.loc(h); })) + ".</p>" +
      '<div class="menu">' +
      '<button data-act="fight"><kbd>G</kbd> ' + GS.t("deployG") + "</button>" +
      '<button data-act="hire"><kbd>N</kbd> ' + GS.t("hireNCoins", army.coins) + "</button>" +
      '<button data-act="back-camp"><kbd>Q</kbd> ' + GS.t("backChart") + "</button>" +
      "</div></div>"
    );
  };

  Screens.prototype.hire = function (army) {
    var list = army.commanders.map(function (c) {
      var role = GS.ROLES[c.cls];
      var trait = "";
      if (c.trait) {
        for (var i = 0; i < GS.TRAITS.length; i++) if (GS.TRAITS[i].id === c.trait) trait = GS.loc(GS.TRAITS[i]);
      }
      return "<li>" + (c.dead ? "<s>" : "") + role.ch + " " + GS.loc(c) + "  " + GS.loc(role) +
        "  Lv" + c.level + "  " + GS.t("troopsN") + " " + c.soldiers + "/" + c.maxSoldiers +
        (trait ? "  [" + trait + "]" : "") + (c.dead ? "</s>" + GS.t("deadMark") : "") + "</li>";
    }).join("");
    var H = GS.CONFIG.hire;
    this.show(
      '<div class="panel">' +
      "<h2>" + GS.t("hireHall", army.coins) + "</h2>" +
      "<ul class=\"roster\">" + list + "</ul>" +
      '<div class="menu">' +
      '<button data-act="buy" data-arg="infantry">' + GS.t("hireBtn", GS.t("hireInf"), H.infantry.cost) + "</button>" +
      '<button data-act="buy" data-arg="archer">' + GS.t("hireBtn", GS.t("hireArc"), H.archer.cost) + "</button>" +
      '<button data-act="buy" data-arg="pike">' + GS.t("hireBtn", GS.t("hirePike"), H.pike.cost) + "</button>" +
      '<button data-act="buy" data-arg="skirmisher">' + GS.t("hireBtn", GS.t("hireSkirm"), H.skirmisher.cost) + "</button>" +
      '<button data-act="back-camp"><kbd>Q</kbd> ' + GS.t("back") + "</button>" +
      "</div><p class=\"hint\">" + GS.t("hireHint") + "</p></div>"
    );
  };

  Screens.prototype.result = function (island, army, outcome) {
    var living = GS.Army.living(army).length;
    var extra = "";
    if (outcome.relic) extra += "<p class=\"relic-line\">" + GS.t("gotRelic") + " <b>" + outcome.relic.ch + " " + GS.loc(outcome.relic) + "</b> — " + GS.loc(outcome.relic, "desc") + "</p>";
    if (outcome.wheatCoins) extra += "<p>" + GS.t("wheatBonus", outcome.wheatCoins) + "</p>";
    if (outcome.promotions && outcome.promotions.length) {
      extra += "<p>" + outcome.promotions.join(GS.LANG === "en" ? "; " : "；") + "</p>";
    }
    var kindLabel = outcome.kind === "victory" ? GS.t("victory") : outcome.kind === "retreat" ? GS.t("retreat") : GS.t("defeat");
    this.show(
      '<div class="panel">' +
      "<h2>" + GS.t("resultHead", kindLabel, GS.loc(island)) + "</h2>" +
      "<p>" + outcome.msg + "</p>" +
      "<p>" + GS.t("resultStats", outcome.housesLeft, outcome.housesTotal, outcome.coins, army.coins) + "</p>" +
      extra +
      "<p>" + GS.t("captainsLeft") + living + (army.relics && army.relics.length ? "　" + GS.t("relics") + " " + army.relics.length : "") + "</p>" +
      '<div class="menu">' +
      (living ? '<button data-act="next">' + GS.t("nextChart") + "</button>" : '<button data-act="title">' + GS.t("southLost") + "</button>") +
      (outcome.kind !== "victory" && living ? '<button data-act="retry">' + GS.t("retryIsland") + "</button>" : "") +
      "</div></div>"
    );
  };

  Screens.prototype.voyage = function (ev) {
    if (!ev) {
      this.hide();
      return;
    }
    this.show(
      '<div class="panel voyage-panel">' +
      "<h2>" + GS.t("voyageHead", GS.loc(ev, "title") || ev.title) + "</h2>" +
      "<p>" + (GS.loc(ev, "text") || ev.text) + "</p>" +
      '<div class="menu">' +
      '<button data-act="voyage-pick" data-arg="a"><kbd>1</kbd> ' + (GS.loc(ev.a, "label") || ev.a.label) + "</button>" +
      '<button data-act="voyage-pick" data-arg="b"><kbd>2</kbd> ' + (GS.loc(ev.b, "label") || ev.b.label) + "</button>" +
      "</div></div>"
    );
  };

  Screens.prototype.finale = function (army) {
    var relics = (army.relics || []).map(function (id) {
      var r = GS.Meta && GS.Meta.relic(id);
      return r ? GS.loc(r) : id;
    });
    this.show(
      '<div class="panel"><h2>' + GS.t("voyageEnd") + "</h2><p>" + GS.t("voyageEndBody", army.islandsCleared) +
      " " + GS.t("coins") + " " + army.coins +
      (relics.length ? GS.t("finaleRelics") + GS.joinList(relics) : "") + ".</p>" +
      '<div class="menu"><button data-act="title">' + GS.t("backTitle") + "</button></div></div>"
    );
  };

  GS.Screens = Screens;
})(typeof window !== "undefined" ? window : globalThis);
