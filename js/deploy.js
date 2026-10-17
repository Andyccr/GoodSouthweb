/* Good South — suggested company posts for a fresh landing */
(function (g) {
  var GS = g.GS || (g.GS = {});

  function key(x, y) { return x + "," + y; }

  function nearest(list, x, y) {
    var bd = 1e9;
    var dir = 2;
    for (var i = 0; i < list.length; i++) {
      var dx = list[i].x - x;
      var dy = list[i].y - y;
      var d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        dir = list[i].dir != null ? list[i].dir : 2;
      }
    }
    return { d: Math.sqrt(bd), dir: dir };
  }

  function scoreCell(role, c) {
    if (role === "archer") {
      return (c.land < 3 ? 40 : 0) + Math.abs(c.house - 8) * 1.2 + Math.abs(c.land - 12) * 0.35 - c.height * 6;
    }
    if (role === "skirmisher") {
      return Math.abs(c.land - 7) * 1.4 + Math.abs(c.house - 9) + (c.height > 2 ? 2 : 0);
    }
    var beachPenalty = c.land < 1.2 ? 8 : 0;
    var far = c.land > 14 ? (c.land - 14) * 3 : 0;
    return c.land * 1.6 + beachPenalty + far + c.house * 0.25 - (role === "pike" ? 0.4 : 0);
  }

  function roleRank(role) {
    if (role === "pike" || role === "infantry") return 0;
    if (role === "skirmisher") return 1;
    return 2;
  }

  function companySize(role) {
    if (role === "archer" || role === "skirmisher") return 8;
    if (role === "pike") return 9;
    return 10;
  }

  function formationFits(island, x, y, facing, role) {
    if (!GS.formationSlots) return true;
    var slots = GS.formationSlots(x, y, facing, companySize(role), role);
    for (var i = 0; i < slots.length; i++) {
      var sx = Math.round(slots[i].x);
      var sy = Math.round(slots[i].y);
      if (sx < 0 || sy < 0 || sx >= island.w || sy >= island.h) return false;
      var tile = island.tiles[sy][sx];
      if (!tile || !tile.walk || tile.type === GS.T.HOUSE) return false;
    }
    return true;
  }

  function plan(island, squads, blocked) {
    blocked = blocked || {};
    var houses = (island && island.houses) || [];
    var spots = (island && island.landings) || [];
    var cells = [];
    var y, x, tile;
    for (y = 0; y < island.h; y++) {
      for (x = 0; x < island.w; x++) {
        tile = island.tiles[y][x];
        if (!tile || !tile.walk || tile.type === GS.T.HOUSE) continue;
        if (blocked[key(x, y)]) continue;
        var land = nearest(spots, x, y);
        var house = nearest(houses, x, y);
        cells.push({
          x: x, y: y,
          height: tile.height || 0,
          land: land.d,
          dir: land.dir,
          house: house.d,
        });
      }
    }
    var order = (squads || []).slice().sort(function (a, b) {
      return roleRank(a.role) - roleRank(b.role);
    });
    var used = {};
    var posts = [];
    for (var s = 0; s < order.length; s++) {
      var best = null;
      var bs = 1e9;
      var pass;
      for (pass = 0; pass < 2 && !best; pass++) {
        bs = 1e9;
        for (var i = 0; i < cells.length; i++) {
          var c = cells[i];
          if (used[key(c.x, c.y)]) continue;
          if (pass === 0 && !formationFits(island, c.x, c.y, c.dir, order[s].role)) continue;
          var score = scoreCell(order[s].role, c);
          if (score < bs) { bs = score; best = c; }
        }
      }
      if (!best) continue;
      posts.push({ id: order[s].id, x: best.x, y: best.y, facing: best.dir });
      for (var dy = -2; dy <= 2; dy++) {
        for (var dx = -2; dx <= 2; dx++) used[key(best.x + dx, best.y + dy)] = true;
      }
    }
    return posts;
  }

  function formUp(battle) {
    if (!battle || battle.phase !== "deploy") return 0;
    var blocked = {};
    var need = [];
    for (var i = 0; i < battle.squads.length; i++) {
      var sq = battle.squads[i];
      if (sq.soldiers <= 0) continue;
      if (sq.placed) {
        blocked[key(sq.tx, sq.ty)] = true;
        continue;
      }
      need.push({ id: sq.id, role: sq.role });
    }
    var posts = plan(battle.island, need, blocked);
    var n = 0;
    for (var p = 0; p < posts.length; p++) {
      if (battle.placeSquad(posts[p].id, posts[p].x, posts[p].y, posts[p].facing)) n++;
    }
    return n;
  }

  GS.Deploy = { plan: plan, formUp: formUp };
})(typeof window !== "undefined" ? window : globalThis);
