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
  };
})(typeof window !== "undefined" ? window : globalThis);
