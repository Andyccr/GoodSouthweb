/* Good South — shared helpers */
(function (g) {
  var GS = g.GS || (g.GS = {});

  GS.util = {
    $: function (id) {
      return typeof document !== "undefined" ? document.getElementById(id) : null;
    },

    clamp: function (v, a, b) {
      return v < a ? a : v > b ? b : v;
    },

    escapeHtml: function (s) {
      return String(s).replace(/[&<>]/g, function (c) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c];
      });
    },

    uid: function (prefix) {
      return (prefix || "id") + Math.random().toString(36).slice(2, 9);
    },

    isTypingTarget: function () {
      if (typeof document === "undefined") return false;
      var a = document.activeElement;
      if (!a) return false;
      var tag = (a.tagName || "").toLowerCase();
      return tag === "input" || tag === "select" || tag === "textarea" || a.isContentEditable;
    },

    asciiMini: function (island, maxW, maxH) {
      maxW = maxW || 52;
      maxH = maxH || 18;
      var stepX = Math.max(1, Math.ceil(island.w / maxW));
      var stepY = Math.max(1, Math.ceil(island.h / maxH));
      var lines = [];
      for (var y = 0; y < island.h; y += stepY) {
        var row = "";
        for (var x = 0; x < island.w; x += stepX) row += island.tiles[y][x].ch;
        lines.push(row);
      }
      return lines.join("\n");
    },

    deepClone: function (obj) {
      return JSON.parse(JSON.stringify(obj));
    },

    /** Viewport / pointer heuristics. Pass a window-like object for tests. */
    device: {
      compact: function (win) {
        win = win || (typeof window !== "undefined" ? window : null);
        if (!win) return false;
        var w = win.innerWidth || 1024;
        var h = win.innerHeight || 768;
        var coarse = false;
        try {
          coarse = !!(win.matchMedia && win.matchMedia("(pointer: coarse)").matches);
        } catch (e) {}
        var nav = win.navigator || {};
        var touch = (nav.maxTouchPoints || 0) > 0 || typeof win.ontouchstart !== "undefined";
        return w <= 900 || h <= 620 || ((touch || coarse) && w <= 1180);
      },
      touch: function (win) {
        win = win || (typeof window !== "undefined" ? window : null);
        if (!win) return false;
        var coarse = false;
        try {
          coarse = !!(win.matchMedia && win.matchMedia("(pointer: coarse)").matches);
        } catch (e) {}
        var nav = win.navigator || {};
        return coarse || (nav.maxTouchPoints || 0) > 0;
      },
      lowFx: function (win) {
        win = win || (typeof window !== "undefined" ? window : null);
        if (!win) return false;
        if (GS.util.device.compact(win)) return true;
        try {
          if (win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
        } catch (e2) {}
        var conn = win.navigator && win.navigator.connection;
        if (conn && (conn.saveData || conn.effectiveType === "2g" || conn.effectiveType === "slow-2g")) return true;
        return false;
      },
      apply: function (win) {
        win = win || (typeof window !== "undefined" ? window : null);
        if (!win || !win.document || !win.document.documentElement) {
          return { compact: false, touch: false, lowFx: false };
        }
        var compact = GS.util.device.compact(win);
        var touch = GS.util.device.touch(win);
        var lowFx = GS.util.device.lowFx(win);
        var root = win.document.documentElement;
        root.classList.toggle("is-compact", compact);
        root.classList.toggle("is-touch", touch);
        root.classList.toggle("low-fx", lowFx);
        return { compact: compact, touch: touch, lowFx: lowFx };
      },
    },

    touch: {
      dist: function (ax, ay, bx, by) {
        var dx = ax - bx, dy = ay - by;
        return Math.sqrt(dx * dx + dy * dy);
      },
      shouldPan: function (dx, dy, threshold) {
        threshold = threshold == null ? 12 : threshold;
        return dx * dx + dy * dy >= threshold * threshold;
      },
      pinchZoom: function (startDist, nowDist, startZoom) {
        if (!startDist || startDist < 1) return startZoom;
        return startZoom * (nowDist / startDist);
      },
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
