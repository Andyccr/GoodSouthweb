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

  function astar(passable, cost, w, h, x0, y0, x1, y1, opts) {
    opts = opts || {};
    var diag = !!opts.diag;
    var neigh = diag ? N8 : N4;
    if (x0 === x1 && y0 === y1) return [{ x: x0, y: y0 }];
    if (!passable(x1, y1) || !passable(x0, y0)) return null;

    var open = [{ x: x0, y: y0, g: 0, f: Math.abs(x1 - x0) + Math.abs(y1 - y0), p: -1 }];
    var best = {};
    best[key(x0, y0)] = 0;
    var closed = {};
    var steps = 0;
    var limit = opts.limit || w * h * 6;

    while (open.length && steps++ < limit) {
      var bi = 0;
      for (var i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      var cur = open.splice(bi, 1)[0];
      var ck = key(cur.x, cur.y);
      if (closed[ck]) continue;
      closed[ck] = cur;
      if (cur.x === x1 && cur.y === y1) {
        var path = [];
        var n = cur;
        while (n) {
          path.push({ x: n.x, y: n.y });
          n = n.p >= 0 ? arguments.callee._nodes && null : n._parent;
          if (!n) break;
        }
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
        var nx = cur.x + neigh[k][0];
        var ny = cur.y + neigh[k][1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (!passable(nx, ny)) continue;
        var isDiag = neigh[k][0] !== 0 && neigh[k][1] !== 0;
        var step = (cost(nx, ny) || 1) * (isDiag ? 1.41 : 1);
        var g = cur.g + step;
        var nk = key(nx, ny);
        if (best[nk] != null && g >= best[nk]) continue;
        best[nk] = g;
        var node2 = {
          x: nx,
          y: ny,
          g: g,
          f: g + Math.abs(x1 - nx) + Math.abs(y1 - ny),
          _parent: cur,
        };
        open.push(node2);
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

  GS.path = { astar: astar, flood: flood, los: los, N4: N4, N8: N8 };
})(typeof window !== "undefined" ? window : globalThis);
