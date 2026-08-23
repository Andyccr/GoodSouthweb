/* Good South — overlay screens (title / help / hire / preview / result) */
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
  };

  Screens.prototype.hide = function () {
    var o = this.overlay();
    o.classList.add("hidden");
    o.innerHTML = "";
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

  Screens.prototype.title = function () {
    var hasSave = GS.Save.has();
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
      (hasSave ? '<button data-act="continue"><kbd>D</kbd> 继续征程 — 读取上次海图</button>' : "") +
      '<button data-act="campaign"><kbd>A</kbd> 战役模式 — 群岛远征</button>' +
      '<button data-act="sandbox"><kbd>B</kbd> 沙盒模式 — 随机构图 / 刷子 / 刷兵</button>' +
      '<button data-act="help"><kbd>C</kbd> / <kbd>F1</kbd> 手册 — 规则与按键</button>' +
      "</div>" +
      '<div class="hint">架构：事件总线 · 军制/战役域模型 · 模式状态机 · 渲染/UI 分离。桌面：悬停预览 · WASD · 1–9 选兵</div>' +
      "</div>"
    );
  };

  Screens.prototype.help = function () {
    this.show(
      '<div class="panel help-panel"><h2>南境手册</h2>' +
      "<h3>系统分层</h3>" +
      "<p><b>域模型</b> Army / Campaign / Waves　·　<b>模拟</b> Battle　·　<b>表现</b> Renderer / UI　·　<b>编排</b> Game 状态机</p>" +
      "<h3>桌面操作</h3>" +
      "<pre class=\"keys\">" +
      "鼠标左键        布置 / 选中兵团 / 刷地（拖拽）\n" +
      "鼠标右键/滚轮   旋转朝向\n" +
      "WASD / 方向键   移动光标　　1–9 选兵团\n" +
      "[  ]            变速　　空格 暂停　　G 开战\n" +
      "E 撤退　P 调色　- 静音　F1 手册\n" +
      "</pre>" +
      '<div class="menu"><button data-act="title"><kbd>Q</kbd> 返回标题</button></div></div>'
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
      "<p>屋舍 " + island.houses.length + " 座。登陆方向：<b>" + landings + "</b>。</p>" +
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
