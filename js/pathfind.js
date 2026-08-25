/* Good South — A* on the island grid */
(function (g) {
  var GS = g.GS || (g.GS = {});

  var N4 = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  var N8 = N4.concat([
    [1, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
  ]);

  function key(x, y) {
    return x + "," + y;
  }

  function MinHeap() {
    this.a = [];
  }
  MinHeap.prototype.push = function (node) {
    this.a.push(node);
    this._up(this.a.length - 1);
  };
  MinHeap.prototype.pop = function () {
    var a = this.a;
    if (!a.length) return null;
    var top = a[0];
    var last = a.pop();
    if (a.length) {
      a[0] = last;
      this._down(0);
    }
    return top;
  };
  MinHeap.prototype._up = function (i) {
    var a = this.a;
    while (i > 0) {
      var p = (i - 1) >> 1;
      if (a[i].f >= a[p].f) break;
      var t = a[i];
      a[i] = a[p];
      a[p] = t;
      i = p;
    }
  };
  MinHeap.prototype._down = function (i) {
    var a = this.a;
    var n = a.length;
    while (true) {
      var s = i;
      var l = i * 2 + 1;
      var r = i * 2 + 2;
      if (l < n && a[l].f < a[s].f) s = l;
      if (r < n && a[r].f < a[s].f) s = r;
      if (s === i) break;
      var t = a[i];
      a[i] = a[s];
      a[s] = t;
      i = s;
    }
  };

  function snapToPassable(passable, w, h, x, y, radius) {
    x = Math.round(x);
    y = Math.round(y);
    radius = radius == null ? 4 : radius;
    if (x >= 0 && y >= 0 && x < w && y < h && passable(x, y)) return { x: x, y: y };
    var best = null;
    var bestD = Infinity;
    var r, dx, dy, nx, ny, d;
    for (r = 1; r <= radius; r++) {
      for (dx = -r; dx <= r; dx++) {
        for (dy = -r; dy <= r; dy++) {
          nx = x + dx;
          ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (!passable(nx, ny)) continue;
          d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = { x: nx, y: ny };
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  function canStep(passable, x, y, dx, dy, w, h) {
    var nx = x + dx;
    var ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return false;
    if (!passable(nx, ny)) return false;
    if (dx !== 0 && dy !== 0) {
      if (!passable(x + dx, y) || !passable(x, y + dy)) return false;
    }
    return true;
  }

  function heuristic(dx, dy, diag) {
    dx = Math.abs(dx);
    dy = Math.abs(dy);
    if (!diag) return dx + dy;
    return Math.max(dx, dy) + 0.41 * Math.min(dx, dy);
  }

  function astar(passable, cost, w, h, x0, y0, x1, y1, opts) {
    opts = opts || {};
    var diag = !!opts.diag;
    var neigh = diag ? N8 : N4;
    var snap = opts.snap !== false;
    x0 = x0 | 0;
    y0 = y0 | 0;
    x1 = x1 | 0;
    y1 = y1 | 0;
    if (snap) {
      var s0 = snapToPassable(passable, w, h, x0, y0, opts.snapRadius || 4);
      var s1 = snapToPassable(passable, w, h, x1, y1, opts.snapRadius || 4);
      if (!s0 || !s1) return null;
      x0 = s0.x;
      y0 = s0.y;
      x1 = s1.x;
      y1 = s1.y;
    } else if (!passable(x0, y0) || !passable(x1, y1)) {
      return null;
    }
    if (x0 === x1 && y0 === y1) return [{ x: x0, y: y0 }];

    var open = new MinHeap();
    var gScore = {};
    var visited = {};
    var startK = key(x0, y0);
    gScore[startK] = 0;
    open.push({
      x: x0,
      y: y0,
      g: 0,
      f: heuristic(x1 - x0, y1 - y0, diag),
      _parent: null,
    });
    var steps = 0;
    var limit = opts.limit || w * h * 8;

    while (open.a.length && steps++ < limit) {
      var cur = open.pop();
      var ck = key(cur.x, cur.y);
      if (visited[ck]) continue;
      visited[ck] = true;
      if (cur.x === x1 && cur.y === y1) {
        var out = [];
        var node = cur;
        while (node) {
          out.push({ x: node.x, y: node.y });
          node = node._parent;
        }
        out.reverse();
        return out;
      }
      for (var k = 0; k < neigh.length; k++) {
        var dx = neigh[k][0];
        var dy = neigh[k][1];
        if (!canStep(passable, cur.x, cur.y, dx, dy, w, h)) continue;
        var nx = cur.x + dx;
        var ny = cur.y + dy;
        var nk = key(nx, ny);
        if (visited[nk]) continue;
        var isDiag = dx !== 0 && dy !== 0;
        var step = (cost(nx, ny) || 1) * (isDiag ? 1.41 : 1);
        var g = cur.g + step;
        if (gScore[nk] != null && g >= gScore[nk]) continue;
        gScore[nk] = g;
        open.push({
          x: nx,
          y: ny,
          g: g,
          f: g + heuristic(x1 - nx, y1 - ny, diag),
          _parent: cur,
        });
      }
    }
    return null;
  }

  function flood(passable, w, h, sx, sy) {
    var seen = {};
    var q = [[sx, sy]];
    seen[key(sx, sy)] = 1;
    var cells = [];
    while (q.length) {
      var c = q.pop();
      cells.push({ x: c[0], y: c[1] });
      for (var i = 0; i < 4; i++) {
        var nx = c[0] + N4[i][0];
        var ny = c[1] + N4[i][1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        var k = key(nx, ny);
        if (seen[k]) continue;
        if (!passable(nx, ny)) continue;
        seen[k] = 1;
        q.push([nx, ny]);
      }
    }
    return cells;
  }

  function los(blocked, x0, y0, x1, y1) {
    var dx = Math.abs(x1 - x0);
    var dy = Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1;
    var sy = y0 < y1 ? 1 : -1;
    var err = dx - dy;
    var x = x0;
    var y = y0;
    while (x !== x1 || y !== y1) {
      var e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
      if (x === x1 && y === y1) return true;
      if (blocked(x, y)) return false;
    }
    return true;
  }

  /**
   * Multi-source Dijkstra flow field: for each walkable cell, next step toward nearest goal.
   * Returns { w, h, nextX: Int16Array, nextY: Int16Array, dist: Float32Array } or null.
   */
  function flowField(passable, costFn, w, h, goals) {
    if (!goals || !goals.length) return null;
    var n = w * h;
    var dist = new Float32Array(n);
    var nextX = new Int16Array(n);
    var nextY = new Int16Array(n);
    var i;
    for (i = 0; i < n; i++) {
      dist[i] = 1e9;
      nextX[i] = -1;
      nextY[i] = -1;
    }
    var heap = new MinHeap();
    for (i = 0; i < goals.length; i++) {
      var gx = goals[i].x | 0, gy = goals[i].y | 0;
      if (gx < 0 || gy < 0 || gx >= w || gy >= h) continue;
      if (!passable(gx, gy)) continue;
      var gi = gy * w + gx;
      if (dist[gi] === 0) continue;
      dist[gi] = 0;
      nextX[gi] = gx;
      nextY[gi] = gy;
      heap.push({ x: gx, y: gy, f: 0, i: gi });
    }
    if (!heap.a.length) return null;

    while (heap.a.length) {
      var curN = heap.pop();
      var cur = curN.i;
      if (curN.f > dist[cur] + 1e-6) continue;
      var cx = cur % w, cy = (cur / w) | 0;
      var cd = dist[cur];
      for (var k = 0; k < N8.length; k++) {
        var dx = N8[k][0];
        var dy = N8[k][1];
        if (!canStep(passable, cx, cy, dx, dy, w, h)) continue;
        var nx = cx + dx;
        var ny = cy + dy;
        var isDiag = dx !== 0 && dy !== 0;
        var step = (costFn(nx, ny) || 1) * (isDiag ? 1.41 : 1);
        var ni = ny * w + nx;
        var nd = cd + step;
        if (nd + 1e-6 < dist[ni]) {
          dist[ni] = nd;
          nextX[ni] = cx;
          nextY[ni] = cy;
          heap.push({ x: nx, y: ny, f: nd, i: ni });
        }
      }
    }
    return { w: w, h: h, nextX: nextX, nextY: nextY, dist: dist };
  }

  function flowStep(field, x, y) {
    if (!field) return null;
    x = x | 0;
    y = y | 0;
    if (x < 0 || y < 0 || x >= field.w || y >= field.h) return null;
    var i = y * field.w + x;
    var nx = field.nextX[i], ny = field.nextY[i];
    if (nx < 0) return null;
    return { x: nx, y: ny, dist: field.dist[i] };
  }

  GS.path = {
    astar: astar,
    flood: flood,
    los: los,
    flowField: flowField,
    flowStep: flowStep,
    snap: snapToPassable,
    canStep: canStep,
    N4: N4,
    N8: N8,
  };
})(typeof window !== "undefined" ? window : globalThis);
