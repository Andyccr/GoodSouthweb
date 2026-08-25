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
        ? '<span class="slot-empty">空</span>'
        : '<span class="slot-meta">' + sum.time +
          '</span><span class="slot-meta">钱币 ' + sum.coins +
          ' · 收复 ' + sum.cleared + "/" + sum.islandCount +
          ' · 队长 ' + sum.living +
          (sum.inBattle ? ' · <b class="warn">战斗中</b>' : "") +
          "</span><span class=\"slot-meta\">当前岛 " + GS.util.escapeHtml(sum.currentName) + "</span>";
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
        '<button data-act="continue"><kbd>D</kbd> 继续征程 — ' + latest.name +
        "　" + s.time + "　收复 " + s.cleared + "　钱币 " + s.coins +
        (s.inBattle ? "　(战斗中)" : "") + "</button>";
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
      '<div class="sub">南 境 据 点  ·  矮人要塞风格 ASCII 塔防沙盒</div>' +
      '<div class="flavor">北蛮的长船正在南下。你是南境的寨主。守住屋舍，别让盐风草被烧成灰。</div>' +
      '<div class="menu">' +
      cont +
      '<button data-act="load-menu"><kbd>L</kbd> 读取存档 — 多槽位</button>' +
      '<button data-act="campaign"><kbd>A</kbd> 新的战役 — 群岛远征</button>' +
      '<button data-act="sandbox"><kbd>B</kbd> 沙盒模式 — 随机构图 / 刷子 / 刷兵</button>' +
      '<button data-act="help"><kbd>C</kbd> / <kbd>F1</kbd> 手册</button>' +
      "</div>" +
      '<div class="hint">Esc 暂停菜单 · F5 快速存档 · F9 快速读档 · 空格战斗内暂停</div>' +
      "</div>"
    );
  };

  Screens.prototype.pause = function (ctx) {
    ctx = ctx || {};
    var inBattle = ctx.inBattle;
    var canSave = !!ctx.canSave;
    this.show(
      '<div class="panel pause-panel">' +
      "<h2>暂停</h2>" +
      '<p class="flavor">' + (inBattle ? "战斗已冻结。可存档后离开，稍后从同一战局继续。" : "海图暂停。") + "</p>" +
      '<div class="menu">' +
      '<button data-act="resume"><kbd>Esc</kbd> 继续</button>' +
      (canSave ? '<button data-act="save-menu"><kbd>F5</kbd> 保存进度</button>' : "") +
      '<button data-act="load-menu"><kbd>F9</kbd> 读取存档</button>' +
      '<button data-act="pal">调色板</button>' +
      '<button data-act="mute">' + (GS.audio.muted() ? "开启音效" : "静音") + "</button>" +
      (inBattle && ctx.mode === "battle"
        ? '<button data-act="evac" class="danger-outline">弃岛撤退（保兵）</button>' +
          '<button data-act="back-camp">返回海图（不存战斗）</button>'
        : "") +
      (ctx.mode === "sandbox" ? '<button data-act="title">返回标题</button>' : "") +
      (ctx.mode === "campaign" ? '<button data-act="title">返回标题</button>' : "") +
      (inBattle && ctx.mode === "battle" ? "" : "") +
      '<button data-act="help">手册</button>' +
      "</div></div>"
    );
  };

  Screens.prototype.saveMenu = function () {
    this.show(
      '<div class="panel save-panel">' +
      "<h2>保存进度</h2>" +
      '<p class="hint">自动档会在关键节点写入；手动档不会被自动覆盖。战斗中存档可恢复战局。</p>' +
      '<div class="slot-list">' + this._slotRows("save") + "</div>" +
      '<div class="menu"><button data-act="resume"><kbd>Esc</kbd> 返回</button></div></div>'
    );
  };

  Screens.prototype.loadMenu = function () {
    this.show(
      '<div class="panel save-panel">' +
      "<h2>读取存档</h2>" +
      '<p class="hint">选择一个槽位。若存档含战斗快照，将直接回到该战局。</p>' +
      '<div class="slot-list">' + this._slotRows("load") + "</div>" +
      '<div class="menu"><button data-act="resume-or-title"><kbd>Esc</kbd> 返回</button></div></div>'
    );
  };

  Screens.prototype.confirm = function (opts) {
    opts = opts || {};
    this.show(
      '<div class="panel confirm-panel">' +
      "<h2>" + (opts.title || "确认") + "</h2>" +
      "<p>" + (opts.msg || "") + "</p>" +
      '<div class="menu row">' +
      '<button data-act="' + (opts.yesAct || "confirm-yes") + '" data-arg="' + (opts.yesArg || "") + '">' + (opts.yes || "确定") + "</button>" +
      '<button data-act="' + (opts.noAct || "resume") + '">' + (opts.no || "取消") + "</button>" +
      "</div></div>"
    );
  };

  Screens.prototype.help = function () {
    this.show(
      '<div class="panel help-panel"><h2>南境手册</h2>' +
      "<h3>保存与暂停</h3>" +
      "<ul>" +
      "<li><b>Esc</b> 打开/关闭暂停菜单（战役、战斗、沙盒）。</li>" +
      "<li><b>空格</b> 战斗中软暂停（仅冻结时间，不开菜单）。</li>" +
      "<li><b>F5</b> 快速写入自动档；暂停菜单可写入 1–3 号手动档。</li>" +
      "<li><b>F9</b> 快速读取最近存档；亦可在读档界面选槽。</li>" +
      "<li>战斗中存档会保存岛屿战局，读档后可继续同一场。</li>" +
      "<li>切换浏览器标签会自动暂停战斗。</li>" +
      "</ul>" +
      "<h3>战地技巧</h3>" +
      "<ul>" +
      "<li>布置只是<strong>就位点</strong>：开战后天兵按威胁权重<strong>整团</strong>接战（保屋舍、打北蛮）。朝向用箭头画在就位点上，右键 / R / 转向按钮 / Shift+滚轮旋转；未落子也可以先转向。</li>" +
      "<li>每局默认四支部队（两盾、一弓、一枪）。弓手会拉开身位射击；盾兵/枪兵会冲向威胁屋舍的北蛮。无敌人时回到就位点。</li>" +
      "<li><b>U 号角</b>：每场一次，短时减缓全部北蛮。</li>" +
      "<li><b>烽火台 ¥</b>：弓手靠近可提升射程与伤害。</li>" +
      "<li>屋舍遇袭时会冲出<strong>乡勇</strong>拖延敌人。</li>" +
      "<li>点击己方士兵只选中该兵团；再点空地才布置/换阵。点到乡勇不会取消选中。</li>" +
      "<li><b>滚轮</b>缩放地图，<b>中键拖拽</b>（或 Alt+左键）平移镜头。</li>" +
      "<li>北蛮一律乘长船从深海驶向海滩，靠岸后才下船。</li>" +
      "</ul>" +
      "<h3>手机</h3>" +
      "<ul>" +
      "<li>点空地就位；点士兵选中兵团。拖动画布，双指缩放。地图不会被底栏挡住。</li>" +
      "<li>转向（底栏或长按）会弹出朝向，地图上有箭头。底栏打开情报 / 部队抽屉，点开战。</li>" +
      "<li>沙盒的刷地 / 刷兵 / 新岛在「情报」抽屉里，避免挡住地图。</li>" +
      "<li>窄屏会自动用较小岛屿、降低特效，避免卡顿。</li>" +
      "</ul>" +
      "<h3>桌面操作</h3>" +
      "<pre class=\"keys\">" +
      "鼠标左键        点士兵选中 / 点空地就位（开战后天兵自寻敌）\n" +
      "鼠标中键拖拽    平移镜头　　滚轮缩放\n" +
      "Shift+滚轮      旋转朝向　　右键也可转向\n" +
      "WASD / 方向键   移动光标　　1–9 选兵团\n" +
      "[  ]            变速　　G 开战　　E 撤退　　U 号角\n" +
      "</pre>" +
      '<div class="menu"><button data-act="resume-or-title"><kbd>Q</kbd> 返回</button></div></div>'
    );
  };

  Screens.prototype.preview = function (island, army) {
    var landings = island.landingDirs.map(function (d) { return GS.DIRS[d].name; }).join("、");
    this.show(
      '<div class="panel preview-panel">' +
      "<h2>将至 · " + island.name + "</h2>" +
      '<div class="flavor">' + island.flavor + "  ·  " + GS.BIOMES[island.biome].name +
      "  ·  威胁 " + "▲".repeat(island.difficulty) + "</div>" +
      "<pre class=\"mini\">" + GS.util.asciiMini(island) + "</pre>" +
      "<p>屋舍 " + island.houses.length + " 座 · 版图 " + island.w + "×" + island.h +
      (island.beacons && island.beacons.length ? " · 烽火台 " + island.beacons.length : "") +
      "。登陆方向：<b>" + landings + "</b>。</p>" +
      "<p>民居：" + island.houses.map(function (h) { return h.name; }).join("、") + "。</p>" +
      '<div class="menu">' +
      '<button data-act="fight"><kbd>G</kbd> 登陆布置兵团</button>' +
      '<button data-act="hire"><kbd>N</kbd> 招募 / 钱币 ' + army.coins + "</button>" +
      '<button data-act="back-camp"><kbd>Q</kbd> 返回海图</button>' +
      "</div></div>"
    );
  };

  Screens.prototype.hire = function (army) {
    var list = army.commanders.map(function (c) {
      var role = GS.ROLES[c.cls];
      var trait = "";
      if (c.trait) {
        for (var i = 0; i < GS.TRAITS.length; i++) if (GS.TRAITS[i].id === c.trait) trait = GS.TRAITS[i].name;
      }
      return "<li>" + (c.dead ? "<s>" : "") + role.ch + " " + c.name + "  " + role.name +
        "  Lv" + c.level + "  兵" + c.soldiers + "/" + c.maxSoldiers +
        (trait ? "  [" + trait + "]" : "") + (c.dead ? "</s> 阵亡" : "") + "</li>";
    }).join("");
    var H = GS.CONFIG.hire;
    this.show(
      '<div class="panel">' +
      "<h2>招募厅  ·  钱币 " + army.coins + "</h2>" +
      "<ul class=\"roster\">" + list + "</ul>" +
      '<div class="menu">' +
      '<button data-act="buy" data-arg="infantry">招募盾兵  (' + H.infantry.cost + ")</button>" +
      '<button data-act="buy" data-arg="archer">招募弓手  (' + H.archer.cost + ")</button>" +
      '<button data-act="buy" data-arg="pike">招募枪兵  (' + H.pike.cost + ")</button>" +
      '<button data-act="back-camp"><kbd>Q</kbd> 返回</button>' +
      "</div><p class=\"hint\">阵亡队长无法复活。胜利按残存屋舍得钱。</p></div>"
    );
  };

  Screens.prototype.result = function (island, army, outcome) {
    var living = GS.Army.living(army).length;
    this.show(
      '<div class="panel">' +
      "<h2>" + (outcome.kind === "victory" ? "胜利" : outcome.kind === "retreat" ? "撤退" : "陷落") +
      " — " + island.name + "</h2>" +
      "<p>" + outcome.msg + "</p>" +
      "<p>残存屋舍 " + outcome.housesLeft + "/" + outcome.housesTotal +
      "　获得钱币 " + outcome.coins + "　现有 " + army.coins + "</p>" +
      "<p>仍可作战的队长：" + living + "</p>" +
      '<div class="menu">' +
      (living ? '<button data-act="next">继续海图</button>' : '<button data-act="title">南境沦陷 · 返回标题</button>') +
      (outcome.kind !== "victory" && living ? '<button data-act="retry">再攻此岛</button>' : "") +
      "</div></div>"
    );
  };

  Screens.prototype.finale = function (army) {
    this.show(
      '<div class="panel"><h2>群岛纪事终章</h2><p>南境的岛链或守或弃，潮水暂时平了。收复 ' +
      army.islandsCleared + " 座岛。钱币 " + army.coins + "。</p>" +
      '<div class="menu"><button data-act="title">返回标题</button></div></div>'
    );
  };

  GS.Screens = Screens;
})(typeof window !== "undefined" ? window : globalThis);
