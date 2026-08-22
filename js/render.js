/* Good South — ASCII / Dwarf Fortress canvas renderer */
(function (g) {
  var GS = g.GS || (g.GS = {});
  var C = GS.C;

  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.tw = 16;
    this.th = 18;
    this.ox = 0;
    this.oy = 0;
    this.shake = 0;
    this.time = 0;
    this.palette = "df";
    this.fit = true;
    this.showLandings = true;
  }

  Renderer.prototype.setPalette = function (p) {
    this.palette = p;
  };

  Renderer.prototype.tint = function (hex) {
    if (this.palette === "df") return hex;
    if (this.palette === "green") return this._mix(hex, "#55ff55", 0.55);
    if (this.palette === "amber") return this._mix(hex, "#ffb000", 0.55);
    return hex;
  };

  Renderer.prototype._mix = function (a, b, t) {
    function p(h) {
      h = h.replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    var A = p(a), B = p(b);
    var r = (A[0] + (B[0] - A[0]) * t) | 0;
    var g2 = (A[1] + (B[1] - A[1]) * t) | 0;
    var bl = (A[2] + (B[2] - A[2]) * t) | 0;
    return "rgb(" + r + "," + g2 + "," + bl + ")";
  };

  Renderer.prototype.resize = function (cols, rows) {
    var wrap = this.canvas.parentElement;
    var cw = wrap.clientWidth || 800;
    var ch = wrap.clientHeight || 600;
    // Fit whole map; prefer nearly square cells for readability on desktop
    var tw = Math.max(9, Math.floor(cw / cols));
    var th = Math.max(11, Math.floor(ch / rows));
    var cell = Math.min(tw, Math.floor(th * 0.9));
    cell = Math.max(9, Math.min(22, cell));
    this.tw = cell;
    this.th = Math.min(th, Math.max(11, Math.round(cell * 1.15)));
    var w = cols * this.tw;
    var h = rows * this.th;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, w * dpr);
    this.canvas.height = Math.max(1, h * dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cols = cols;
    this.rows = rows;
    this.cssW = w;
    this.cssH = h;
  };

  Renderer.prototype.clear = function (bg) {
    this.ctx.fillStyle = this.tint(bg || "#000000");
    this.ctx.fillRect(0, 0, this.cssW || this.canvas.width, this.cssH || this.canvas.height);
  };

  Renderer.prototype.cell = function (x, y, ch, fg, bg) {
    var ctx = this.ctx;
    var px = x * this.tw + this.ox;
    var py = y * this.th + this.oy;
    if (this.shake > 0) {
      px += (Math.random() - 0.5) * this.shake;
      py += (Math.random() - 0.5) * this.shake;
    }
    if (bg) {
      ctx.fillStyle = this.tint(bg);
      ctx.fillRect(px, py, this.tw, this.th);
    }
    if (!ch) return;
    ctx.fillStyle = this.tint(fg || "#AAAAAA");
    ctx.font = "600 " + Math.max(10, this.th - 3) + "px 'IBM Plex Mono', 'Source Code Pro', 'DejaVu Sans Mono', 'Consolas', ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, px + this.tw / 2, py + this.th / 2 + 0.5);
  };

  Renderer.prototype.drawBattle = function (battle, hover, opts) {
    opts = opts || {};
    var island = battle.island;
    this.resize(island.w, island.h);
    this.clear("#000000");
    this.time += 0.016;
    this.shake *= 0.85;
    var t = this.time;
    var x, y, i;

    // landing highlights under tiles during deploy
    var landingMap = {};
    if (this.showLandings && battle.phase === "deploy") {
      for (i = 0; i < island.landings.length; i++) {
        var L = island.landings[i];
        landingMap[L.x + "," + L.y] = L.dir;
      }
    }

    for (y = 0; y < island.h; y++) {
      for (x = 0; x < island.w; x++) {
        var tile = island.tiles[y][x];
        var ch = tile.ch;
        var fg = tile.fg;
        var bg = tile.bg;
        if (tile.type === GS.T.DEEP || tile.type === GS.T.SHALLOW || tile.type === GS.T.REEF || tile.type === GS.T.LAVA) {
          var wave = ((x + y + (t * (tile.type === GS.T.LAVA ? 8 : 3))) | 0) % 4;
          ch = wave === 0 ? "≈" : wave === 1 ? "~" : wave === 2 ? "∼" : "≈";
        }
        if (tile.type === GS.T.HOUSE) {
          var h = null;
          for (i = 0; i < battle.houses.length; i++) if (battle.houses[i].x === x && battle.houses[i].y === y) h = battle.houses[i];
          if (h && !h.alive) {
            ch = ((t * 6) | 0) % 2 ? "*" : "%";
            fg = C.YELLOW;
            bg = C.RED;
          }
        }
        var lk = landingMap[x + "," + y];
        if (lk != null) {
          bg = "#3a2a00";
          if (((t * 3) | 0) % 2 === 0) {
            ch = GS.DIRS[lk].ch;
            fg = C.YELLOW;
          }
        }
        this.cell(x, y, ch, fg, bg);
      }
    }

    for (i = 0; i < battle.corpses.length; i++) {
      var k = battle.corpses[i];
      this.cell(k.x | 0, k.y | 0, k.ch, k.fg, null);
    }

    var ents = battle.entities.filter(function (e) { return e.alive; });
    ents.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < ents.length; i++) {
      var e = ents[i];
      var ex = e.x | 0, ey = e.y | 0;
      var bg2 = null;
      if (e.kind === "soldier" && e.squadId === battle.selected) bg2 = "#003344";
      if (e.hp < e.maxHp * 0.35) bg2 = "#330000";
      if (hover && (hover.x | 0) === ex && (hover.y | 0) === ey) bg2 = "#224466";
      this.cell(ex, ey, e.ch, e.fg, bg2);
    }

    // facing arrow for selected squad centroid
    var sq = battle.getSquad(battle.selected);
    if (sq && sq.placed) {
      var fx = sq.tx + GS.DIRS[sq.facing].dx;
      var fy = sq.ty + GS.DIRS[sq.facing].dy;
      if (fx >= 0 && fy >= 0 && fx < island.w && fy < island.h) {
        this.ctx.globalAlpha = 0.85;
        this.cell(fx, fy, GS.DIRS[sq.facing].ch, C.LCYAN, null);
        this.ctx.globalAlpha = 1;
      }
    }

    for (i = 0; i < battle.projectiles.length; i++) {
      var p = battle.projectiles[i];
      this.cell(p.x | 0, p.y | 0, p.ch || "·", p.fg || C.WHITE, null);
    }
    for (i = 0; i < battle.floaters.length; i++) {
      var f = battle.floaters[i];
      this.ctx.globalAlpha = Math.max(0, f.life / 0.85);
      this.cell(f.x | 0, (f.y - (0.85 - f.life) * 1.2) | 0, f.text, f.color, null);
      this.ctx.globalAlpha = 1;
    }

    var cx = battle.cursor.x, cy = battle.cursor.y;
    var hx = hover && hover.x >= 0 ? hover.x : cx;
    var hy = hover && hover.y >= 0 ? hover.y : cy;

    // formation / paint ghost at hover
    if (sq && (battle.phase === "deploy" || battle.phase === "fight") && opts.tool !== "paint") {
      var placeX = hx, placeY = hy;
      var can = this._canPlace(island, placeX, placeY);
      var slots = GS.formationSlots(placeX, placeY, sq.facing, Math.min(sq.soldiers || 1, 8), sq.role);
      this.ctx.globalAlpha = 0.5;
      for (i = 0; i < slots.length; i++) {
        var sx = Math.round(slots[i].x), sy = Math.round(slots[i].y);
        if (sx >= 0 && sy >= 0 && sx < island.w && sy < island.h) {
          var ok = island.tiles[sy][sx].walk && island.tiles[sy][sx].type !== GS.T.HOUSE;
          this.cell(sx, sy,
            sq.role === "archer" ? "}" : sq.role === "pike" ? "↑" : "☻",
            ok && can ? C.LCYAN : C.LRED,
            ok && can ? "#003333" : "#330000");
        }
      }
      this.ctx.globalAlpha = 1;
    } else if (opts.tool === "paint" && opts.brush != null) {
      var def = GS.tileDef(opts.brush);
      this.ctx.globalAlpha = 0.65;
      this.cell(hx, hy, def.ch, def.fg, "#222200");
      this.ctx.globalAlpha = 1;
    }

    this._cursor(cx, cy, battle.look ? C.YELLOW : C.WHITE);
    if (hover && hover.x >= 0 && (hover.x !== cx || hover.y !== cy)) {
      this._cursor(hover.x, hover.y, C.LCYAN);
    }
  };

  Renderer.prototype._canPlace = function (island, x, y) {
    if (x < 0 || y < 0 || x >= island.w || y >= island.h) return false;
    var tile = island.tiles[y][x];
    return tile && tile.walk && tile.type !== GS.T.HOUSE;
  };

  Renderer.prototype._cursor = function (x, y, color) {
    var ctx = this.ctx;
    var px = x * this.tw + this.ox;
    var py = y * this.th + this.oy;
    ctx.strokeStyle = this.tint(color);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 0.5, py + 0.5, this.tw - 1, this.th - 1);
    // corner ticks
    var s = Math.min(4, this.tw / 3);
    ctx.beginPath();
    ctx.moveTo(px, py + s); ctx.lineTo(px, py); ctx.lineTo(px + s, py);
    ctx.moveTo(px + this.tw - s, py); ctx.lineTo(px + this.tw, py); ctx.lineTo(px + this.tw, py + s);
    ctx.moveTo(px, py + this.th - s); ctx.lineTo(px, py + this.th); ctx.lineTo(px + s, py + this.th);
    ctx.moveTo(px + this.tw - s, py + this.th); ctx.lineTo(px + this.tw, py + this.th); ctx.lineTo(px + this.tw, py + this.th - s);
    ctx.stroke();
  };

  Renderer.prototype.drawCampaign = function (camp, army, cursorId, hoverTile) {
    this.resize(camp.w, camp.h);
    this.clear("#000055");
    var x, y;
    for (y = 0; y < camp.h; y++) {
      for (x = 0; x < camp.w; x++) {
        var n = GS.fbm(x * 0.09, y * 0.09, camp.seed, 4);
        var ch = n > 0.62 ? "≈" : n > 0.5 ? "~" : "≈";
        var fg = n > 0.7 ? C.LBLUE : C.BLUE;
        this.cell(x, y, ch, fg, "#000055");
      }
    }
    for (var i = 0; i < camp.islands.length; i++) {
      var a = camp.islands[i];
      if (a.status === "hidden") continue;
      for (var e = 0; e < a.edges.length; e++) {
        var b = camp.islands[a.edges[e]];
        if (b.id < a.id) continue;
        if (b.status === "hidden") continue;
        this._line(a.mx, a.my, b.mx, b.my, C.CYAN);
      }
    }
    for (i = 0; i < camp.islands.length; i++) {
      var is = camp.islands[i];
      if (is.status === "hidden") continue;
      var glyph = "▲";
      var fg2 = C.LGREEN;
      if (is.biome === "rocky") { glyph = "▲"; fg2 = C.LGRAY; }
      if (is.biome === "marsh") { glyph = "n"; fg2 = C.GREEN; }
      if (is.biome === "snow") { glyph = "*"; fg2 = C.WHITE; }
      if (is.biome === "ash") { glyph = "^"; fg2 = C.LRED; }
      if (is.status === "cleared") { glyph = "⌂"; fg2 = C.YELLOW; }
      if (is.status === "lost") { glyph = "░"; fg2 = C.RED; }
      var bg = "#002244";
      if (is.id === cursorId) bg = "#334400";
      if (hoverTile && hoverTile.x === is.mx && hoverTile.y === is.my) bg = "#003355";
      this.cell(is.mx, is.my, glyph, fg2, bg);
      if (is.id === cursorId) this._cursor(is.mx, is.my, C.YELLOW);
      if (is.id === camp.current) this.cell(is.mx, Math.max(0, is.my - 1), "@", C.LCYAN, null);
      // difficulty ticks
      if (is.status === "scouted") {
        this.ctx.globalAlpha = 0.7;
        this.cell(is.mx, Math.min(camp.h - 1, is.my + 1), String(Math.min(9, is.difficulty)), C.BROWN, null);
        this.ctx.globalAlpha = 1;
      }
    }
  };

  Renderer.prototype._line = function (x0, y0, x1, y1, color) {
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    var err = dx - dy, x = x0, y = y0;
    while (x !== x1 || y !== y1) {
      var e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
      if (x === x1 && y === y1) break;
      this.cell(x, y, "·", color, null);
    }
  };

  Renderer.prototype.screenToTile = function (clientX, clientY) {
    var r = this.canvas.getBoundingClientRect();
    var x = clientX - r.left;
    var y = clientY - r.top;
    return { x: Math.floor(x / this.tw), y: Math.floor(y / this.th) };
  };

  Renderer.prototype.tileAtPointer = function (clientX, clientY, w, h) {
    var t = this.screenToTile(clientX, clientY);
    if (t.x < 0 || t.y < 0 || t.x >= w || t.y >= h) return null;
    return t;
  };

  GS.Renderer = Renderer;
})(typeof window !== "undefined" ? window : globalThis);
