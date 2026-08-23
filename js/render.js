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
    this.camX = 0;
    this.camY = 0;
    this.useCam = false;
    this.zoom = (GS.CONFIG.battle && GS.CONFIG.battle.zoomDefault) || 16;
    this.shake = 0;
    this.time = 0;
    this.palette = "df";
    this.fit = true;
    this.showLandings = true;
    this._resizeKey = "";
    this._font = "";
    this._terrainKey = "";
    this._terrainCanvas = null;
    this._terrainCtx = null;
    this._waterCells = [];
    this._houseMap = {};
    this._followLock = 0;
  }

  Renderer.prototype.setPalette = function (p) {
    this.palette = p;
    this._terrainKey = "";
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
    this.useCam = false;
    this.camX = 0;
    this.camY = 0;
    var wrap = this.canvas.parentElement;
    var cw = wrap.clientWidth || 800;
    var ch = wrap.clientHeight || 600;
    var key = "fit:" + cols + "x" + rows + ":" + cw + "x" + ch + ":" + this.palette;
    if (key === this._resizeKey && this.cols === cols && this.rows === rows) return false;
    this._resizeKey = key;

    var tw = Math.max(9, Math.floor(cw / cols));
    var th = Math.max(11, Math.floor(ch / rows));
    var cell = Math.min(tw, Math.floor(th * 0.9));
    var maxCell = cols * rows > 2800 ? 16 : 22;
    cell = Math.max(8, Math.min(maxCell, cell));
    this.tw = cell;
    this.th = Math.min(th, Math.max(10, Math.round(cell * 1.15)));
    var w = cols * this.tw;
    var h = rows * this.th;
    this._setCanvasSize(w, h);
    this.cols = cols;
    this.rows = rows;
    this.viewCols = cols;
    this.viewRows = rows;
    this._font = "600 " + Math.max(9, this.th - 3) + "px 'IBM Plex Mono', 'Source Code Pro', 'DejaVu Sans Mono', 'Consolas', ui-monospace, monospace";
    this._terrainKey = "";
    return true;
  };

  Renderer.prototype.layoutView = function (mapW, mapH) {
    this.useCam = true;
    var wrap = this.canvas.parentElement;
    var cw = Math.max(320, wrap.clientWidth || 800);
    var ch = Math.max(240, wrap.clientHeight || 600);
    var z = this.zoom | 0;
    this.tw = z;
    this.th = Math.max(z, Math.round(z * 1.12));
    var key = "view:" + cw + "x" + ch + ":" + this.tw + "x" + this.th + ":" + this.palette + ":" + mapW + "x" + mapH;
    if (key !== this._resizeKey) {
      this._resizeKey = key;
      this._setCanvasSize(cw, ch);
      this._font = "600 " + Math.max(9, this.th - 3) + "px 'IBM Plex Mono', 'Source Code Pro', 'DejaVu Sans Mono', 'Consolas', ui-monospace, monospace";
      this._terrainKey = "";
    }
    this.cols = mapW;
    this.rows = mapH;
    this.viewCols = Math.max(8, Math.ceil(this.cssW / this.tw) + 1);
    this.viewRows = Math.max(6, Math.ceil(this.cssH / this.th) + 1);
    this.clampCam(mapW, mapH);
  };

  Renderer.prototype._setCanvasSize = function (w, h) {
    var dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    this.canvas.width = Math.max(1, w * dpr);
    this.canvas.height = Math.max(1, h * dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssW = w;
    this.cssH = h;
  };

  Renderer.prototype.clampCam = function (mapW, mapH) {
    var maxX = Math.max(0, mapW - this.cssW / this.tw);
    var maxY = Math.max(0, mapH - this.cssH / this.th);
    if (this.camX < 0) this.camX = 0;
    if (this.camY < 0) this.camY = 0;
    if (this.camX > maxX) this.camX = maxX;
    if (this.camY > maxY) this.camY = maxY;
  };

  Renderer.prototype.centerOn = function (tx, ty, mapW, mapH) {
    this.camX = tx - (this.cssW / this.tw) / 2;
    this.camY = ty - (this.cssH / this.th) / 2;
    this.clampCam(mapW, mapH);
  };

  Renderer.prototype.followTile = function (tx, ty, mapW, mapH) {
    if (this._followLock > 0) return;
    var marginX = Math.min(6, (this.cssW / this.tw) * 0.22);
    var marginY = Math.min(5, (this.cssH / this.th) * 0.22);
    var vx0 = this.camX, vy0 = this.camY;
    var vx1 = this.camX + this.cssW / this.tw;
    var vy1 = this.camY + this.cssH / this.th;
    if (tx < vx0 + marginX) this.camX = tx - marginX;
    if (ty < vy0 + marginY) this.camY = ty - marginY;
    if (tx > vx1 - marginX) this.camX = tx - (this.cssW / this.tw) + marginX;
    if (ty > vy1 - marginY) this.camY = ty - (this.cssH / this.th) + marginY;
    this.clampCam(mapW, mapH);
  };

  Renderer.prototype.pan = function (dxTiles, dyTiles, mapW, mapH) {
    this.camX += dxTiles;
    this.camY += dyTiles;
    this._followLock = 120;
    this.clampCam(mapW, mapH);
  };

  Renderer.prototype.setZoom = function (z, mapW, mapH, focusX, focusY) {
    var cfg = GS.CONFIG.battle || {};
    var min = cfg.zoomMin || 12, max = cfg.zoomMax || 24;
    z = Math.max(min, Math.min(max, z | 0));
    if (z === this.zoom) return;
    var fx = focusX != null ? focusX : this.camX + (this.cssW / this.tw) / 2;
    var fy = focusY != null ? focusY : this.camY + (this.cssH / this.th) / 2;
    this.zoom = z;
    this._resizeKey = "";
    this.layoutView(mapW, mapH);
    this.centerOn(fx, fy, mapW, mapH);
  };

  Renderer.prototype.clear = function (bg) {
    this.ctx.fillStyle = this.tint(bg || "#000000");
    this.ctx.fillRect(0, 0, this.cssW || this.canvas.width, this.cssH || this.canvas.height);
  };

  Renderer.prototype._applyFont = function () {
    var ctx = this.ctx;
    ctx.font = this._font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
  };

  Renderer.prototype.cell = function (x, y, ch, fg, bg) {
    var ctx = this.ctx;
    var px = (x - (this.useCam ? this.camX : 0)) * this.tw + this.ox;
    var py = (y - (this.useCam ? this.camY : 0)) * this.th + this.oy;
    if (this.shake > 0) {
      px += (Math.random() - 0.5) * this.shake;
      py += (Math.random() - 0.5) * this.shake;
    }
    if (px + this.tw < 0 || py + this.th < 0 || px > this.cssW || py > this.cssH) return;
    if (bg) {
      ctx.fillStyle = this.tint(bg);
      ctx.fillRect(px, py, this.tw, this.th);
    }
    if (!ch) return;
    ctx.fillStyle = this.tint(fg || "#AAAAAA");
    ctx.fillText(ch, px + this.tw / 2, py + this.th / 2 + 0.5);
  };

  Renderer.prototype._rebuildTerrain = function (island, terrainGen) {
    var w = island.w, h = island.h;
    var key = w + "x" + h + ":" + (island.seed || 0) + ":" + this.tw + "x" + this.th + ":" + this.palette + ":" + (terrainGen || 0);
    if (key === this._terrainKey && this._terrainCanvas) return;
    this._terrainKey = key;

    if (!this._terrainCanvas) this._terrainCanvas = document.createElement("canvas");
    var tc = this._terrainCanvas;
    tc.width = Math.max(1, w * this.tw);
    tc.height = Math.max(1, h * this.th);
    var tctx = tc.getContext("2d");
    this._terrainCtx = tctx;
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.fillStyle = this.tint("#000000");
    tctx.fillRect(0, 0, tc.width, tc.height);
    tctx.font = this._font;
    tctx.textAlign = "center";
    tctx.textBaseline = "middle";

    this._waterCells = [];
    var tw = this.tw, th = this.th;
    var x, y;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        var tile = island.tiles[y][x];
        var typ = tile.type;
        if (typ === GS.T.DEEP || typ === GS.T.SHALLOW || typ === GS.T.REEF || typ === GS.T.LAVA) {
          this._waterCells.push(x, y, typ);
          tctx.fillStyle = this.tint(tile.bg);
          tctx.fillRect(x * tw, y * th, tw, th);
          continue;
        }
        tctx.fillStyle = this.tint(tile.bg);
        tctx.fillRect(x * tw, y * th, tw, th);
        tctx.fillStyle = this.tint(tile.fg);
        tctx.fillText(tile.ch, x * tw + tw / 2, y * th + th / 2 + 0.5);
      }
    }
  };

  Renderer.prototype.drawBattle = function (battle, hover, opts) {
    opts = opts || {};
    var island = battle.island;
    this.layoutView(island.w, island.h);
    if (this._followLock > 0) this._followLock--;
    this.followTile(battle.cursor.x, battle.cursor.y, island.w, island.h);
    this.time += 0.016;
    this.shake *= 0.85;
    var t = this.time;
    var x, y, i;

    this._rebuildTerrain(island, battle.terrainGen || 0);
    var srcX = this.camX * this.tw;
    var srcY = this.camY * this.th;
    this.ctx.drawImage(this._terrainCanvas, srcX, srcY, this.cssW, this.cssH, 0, 0, this.cssW, this.cssH);
    this._applyFont();

    var x0 = Math.max(0, (this.camX | 0) - 1);
    var y0 = Math.max(0, (this.camY | 0) - 1);
    var x1 = Math.min(island.w, ((this.camX + this.cssW / this.tw) | 0) + 2);
    var y1 = Math.min(island.h, ((this.camY + this.cssH / this.th) | 0) + 2);

    var wc = this._waterCells;
    for (i = 0; i < wc.length; i += 3) {
      x = wc[i]; y = wc[i + 1];
      if (x < x0 || y < y0 || x >= x1 || y >= y1) continue;
      var typ = wc[i + 2];
      var wave = ((x + y + (t * (typ === GS.T.LAVA ? 8 : 3))) | 0) % 4;
      var ch = wave === 0 ? "≈" : wave === 1 ? "~" : wave === 2 ? "∼" : "≈";
      var tile = island.tiles[y][x];
      this.cell(x, y, ch, tile.fg, null);
    }

    if (this.showLandings && battle.phase === "deploy") {
      for (i = 0; i < island.landings.length; i++) {
        var L = island.landings[i];
        if (L.x < x0 || L.y < y0 || L.x >= x1 || L.y >= y1) continue;
        var bg = "#3a2a00";
        var lch = island.tiles[L.y][L.x].ch;
        var lfg = island.tiles[L.y][L.x].fg;
        if (((t * 3) | 0) % 2 === 0) {
          lch = GS.DIRS[L.dir].ch;
          lfg = C.YELLOW;
        }
        this.cell(L.x, L.y, lch, lfg, bg);
      }
    }

    for (i = 0; i < battle.houses.length; i++) {
      var h = battle.houses[i];
      if (h.alive) continue;
      ch = ((t * 6) | 0) % 2 ? "*" : "%";
      this.cell(h.x, h.y, ch, C.YELLOW, C.RED);
    }

    for (i = 0; i < battle.corpses.length; i++) {
      var k = battle.corpses[i];
      this.cell(k.x | 0, k.y | 0, k.ch, k.fg, null);
    }

    var ents = battle._livingSoldiers && battle._livingEnemies
      ? battle._livingSoldiers.concat(battle._livingEnemies)
      : battle.entities.filter(function (e) { return e.alive && (e.kind === "soldier" || e.kind === "enemy"); });
    for (i = 0; i < battle.entities.length; i++) {
      if (battle.entities[i].alive && battle.entities[i].kind === "ship") ents.push(battle.entities[i]);
    }
    ents.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < ents.length; i++) {
      var e = ents[i];
      var ex = e.x | 0, ey = e.y | 0;
      var bg2 = null;
      if (e.kind === "soldier" && e.squadId === battle.selected) bg2 = "#003344";
      if (e.militia) bg2 = bg2 || "#2a2210";
      if (e.hp < e.maxHp * 0.35) bg2 = "#330000";
      if (hover && (hover.x | 0) === ex && (hover.y | 0) === ey) bg2 = "#224466";
      if (e.kind === "ship") {
        var sd = GS.DIRS[e.dir || 2];
        this.cell(ex - sd.dx, ey - sd.dy, "≈", C.BROWN, "#001133");
        this.cell(ex, ey, e.ch, C.YELLOW, "#3a2a10");
        this.cell(ex + sd.dx, ey + sd.dy, e.ch === ">" || e.ch === "<" ? "▬" : "│", C.BROWN, "#2a1a08");
        continue;
      }
      this.cell(ex, ey, e.ch, e.fg, bg2);
    }

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

    if (battle.warhornT > 0) {
      this.ctx.globalAlpha = Math.min(0.18, battle.warhornT * 0.04);
      this.ctx.fillStyle = this.tint("#ffff55");
      this.ctx.fillRect(0, 0, this.cssW, this.cssH);
      this.ctx.globalAlpha = 1;
    }

    var cx = battle.cursor.x, cy = battle.cursor.y;
    var hx = hover && hover.x >= 0 ? hover.x : cx;
    var hy = hover && hover.y >= 0 ? hover.y : cy;

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
    var px = (x - (this.useCam ? this.camX : 0)) * this.tw + this.ox;
    var py = (y - (this.useCam ? this.camY : 0)) * this.th + this.oy;
    ctx.strokeStyle = this.tint(color);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 0.5, py + 0.5, this.tw - 1, this.th - 1);
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
    this._applyFont();
    var x, y;
    // cheaper sea: skip fbm every cell — sample sparsely via hash
    for (y = 0; y < camp.h; y++) {
      for (x = 0; x < camp.w; x++) {
        var n = ((x * 73856093) ^ (y * 19349663) ^ camp.seed) >>> 0;
        var v = (n & 255) / 255;
        var ch = v > 0.62 ? "≈" : v > 0.5 ? "~" : "≈";
        var fg = v > 0.7 ? C.LBLUE : C.BLUE;
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
    var tx = x / this.tw + (this.useCam ? this.camX : 0);
    var ty = y / this.th + (this.useCam ? this.camY : 0);
    return { x: Math.floor(tx), y: Math.floor(ty) };
  };

  Renderer.prototype.tileAtPointer = function (clientX, clientY, w, h) {
    var t = this.screenToTile(clientX, clientY);
    if (t.x < 0 || t.y < 0 || t.x >= w || t.y >= h) return null;
    return t;
  };

  GS.Renderer = Renderer;
})(typeof window !== "undefined" ? window : globalThis);
