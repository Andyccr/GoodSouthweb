/* Good South — DOM chrome: toolbar, toasts, tooltip, command strip */
(function (g) {
  var GS = g.GS || (g.GS = {});

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function UI() {
    this.root = document.getElementById("ui-chrome") || this._mount();
    this.toolbar = document.getElementById("toolbar") || this.root.querySelector("#toolbar");
    this.toasts = this.root.querySelector("#toasts");
    this.tooltip = this.root.querySelector("#tooltip");
    this.commands = document.getElementById("commands") || this.root.querySelector("#commands");
    this._toastTimer = null;
    this._handlers = {};
  }

  UI.prototype._mount = function () {
    var tbHost = document.getElementById("toolbar-host");
    var cmdHost = document.getElementById("commands-host");
    var root = el("div", "", "");
    root.id = "ui-chrome";
    var toolbar = el("div", "toolbar hidden");
    toolbar.id = "toolbar";
    var commands = el("div", "commands hidden");
    commands.id = "commands";
    if (tbHost) tbHost.appendChild(toolbar);
    else root.appendChild(toolbar);
    if (cmdHost) cmdHost.appendChild(commands);
    else root.appendChild(commands);
    var extras = el("div", "", "");
    extras.innerHTML =
      '<div id="toasts" class="toasts" aria-live="polite"></div>' +
      '<div id="tooltip" class="tooltip hidden"></div>';
    while (extras.firstChild) root.appendChild(extras.firstChild);
    document.body.appendChild(root);
    return root;
  };

  UI.prototype.on = function (act, fn) {
    this._handlers[act] = fn;
  };

  UI.prototype._fire = function (act, arg) {
    if (GS.audio) GS.audio.ui();
    if (this._handlers[act]) this._handlers[act](arg);
  };

  UI.prototype.bindClicks = function (node) {
    var self = this;
    if (!node) return;
    node.querySelectorAll("[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        self._fire(btn.getAttribute("data-act"), btn.getAttribute("data-arg"));
      });
    });
  };

  UI.prototype.toast = function (msg, kind) {
    var t = el("div", "toast toast-" + (kind || "info"), msg);
    this.toasts.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 280);
    }, 2600);
  };

  UI.prototype.setTooltip = function (html, clientX, clientY) {
    if (!html) {
      this.tooltip.classList.add("hidden");
      this.tooltip.innerHTML = "";
      return;
    }
    this.tooltip.innerHTML = html;
    this.tooltip.classList.remove("hidden");
    var pad = 14;
    var tw = this.tooltip.offsetWidth || 180;
    var th = this.tooltip.offsetHeight || 60;
    var x = clientX + pad;
    var y = clientY + pad;
    if (x + tw > window.innerWidth - 8) x = clientX - tw - pad;
    if (y + th > window.innerHeight - 8) y = clientY - th - pad;
    this.tooltip.style.left = Math.max(4, x) + "px";
    this.tooltip.style.top = Math.max(4, y) + "px";
  };

  UI.prototype.hideTooltip = function () {
    this.setTooltip("");
  };

  UI.prototype.setToolbar = function (items) {
    if (!items || !items.length) {
      this.toolbar.classList.add("hidden");
      this.toolbar.innerHTML = "";
      return;
    }
    this.toolbar.classList.remove("hidden");
    this.toolbar.innerHTML = items.map(function (it) {
      if (it.sep) return '<span class="tb-sep"></span>';
      var cls = "tb-btn" + (it.active ? " active" : "") + (it.danger ? " danger" : "") + (it.primary ? " primary" : "");
      return '<button type="button" class="' + cls + '" data-act="' + it.act + '"' +
        (it.arg != null ? ' data-arg="' + it.arg + '"' : "") +
        (it.title ? ' title="' + it.title + '"' : "") +
        (it.disabled ? " disabled" : "") + ">" +
        (it.kbd ? '<kbd>' + it.kbd + "</kbd>" : "") +
        "<span>" + it.label + "</span></button>";
    }).join("");
    this.bindClicks(this.toolbar);
  };

  UI.prototype.setCommands = function (items) {
    var app = document.getElementById("app");
    if (!items || !items.length) {
      this.commands.classList.add("hidden");
      this.commands.innerHTML = "";
      if (app) app.classList.remove("has-cmd-strip");
      return;
    }
    this.commands.classList.remove("hidden");
    this.commands.innerHTML = items.map(function (it) {
      var cls = "cmd-btn" + (it.active ? " active" : "");
      return '<button type="button" class="' + cls + '" data-act="' + it.act + '"' +
        (it.arg != null ? ' data-arg="' + it.arg + '"' : "") +
        (it.disabled ? " disabled" : "") + ">" +
        (it.kbd ? "<kbd>" + it.kbd + "</kbd> " : "") + it.label + "</button>";
    }).join("");
    this.bindClicks(this.commands);
    if (app) app.classList.add("has-cmd-strip");
  };

  UI.prototype.kbd = function (s) {
    return "<kbd>" + s + "</kbd>";
  };

  UI.prototype.chip = function (label, value, cls) {
    return '<span class="chip ' + (cls || "") + '"><span class="chip-l">' + label +
      '</span><span class="chip-v">' + value + "</span></span>";
  };

  UI.prototype.hpBar = function (cur, max, width) {
    width = width || 10;
    var n = Math.max(0, Math.min(width, Math.round((cur / Math.max(1, max)) * width)));
    return '<span class="hpbar"><span class="hp-fill" style="width:' + (n / width * 100) +
      '%"></span></span> <span class="hpnum">' + Math.max(0, cur | 0) + "/" + max + "</span>";
  };

  GS.UI = UI;
})(typeof window !== "undefined" ? window : globalThis);
