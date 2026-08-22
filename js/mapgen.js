/* Good South — procedural islands + campaign archipelago */
(function (g) {
  var GS = g.GS || (g.GS = {});
  var T = GS.T;

  function idx(x, y, w) {
    return y * w + x;
  }

  function inb(x, y, w, h) {
    return x >= 0 && y >= 0 && x < w && y < h;
  }

  function neighbors4(x, y) {
    return [
      [x, y - 1],
      [x + 1, y],
      [x, y + 1],
      [x - 1, y],
    ];
  }

  function makeTile(type, height) {
    var def = GS.tileDef(type);
    return {
      type: type,
      height: height != null ? height : def.height || 0,
      ch: def.ch,
      fg: def.fg,
      bg: def.bg,
      walk: !!def.walk,
      ship: !!def.ship,
      cost: def.cost || 1,
      cover: !!def.cover,
      los: !!def.los,
      houseId: -1,
      deco: 0,
    };
  }

  function classifyHeight(v, biome) {
    if (v < 0.30) return T.DEEP;
    if (v < 0.38) return T.SHALLOW;
    if (v < 0.45) return biome.beach;
    if (v < 0.62) return biome.grass;
    if (v < 0.74) return T.HILL;
    if (v < 0.84) return T.ROCK;
    return T.CLIFF;
  }

  function landish(t) {
    return t === T.BEACH || t === T.GRASS || t === T.HILL || t === T.RAMP || t === T.TREE ||
      t === T.SHRUB || t === T.PATH || t === T.FLOOR || t === T.MUD || t === T.SNOW ||
      t === T.ASH || t === T.HOUSE || t === T.ICE || t === T.CROPS || t === T.RUIN;
  }

  function walkType(t) {
    var d = GS.tileDef(t);
    return !!d.walk;
  }

  function generateIsland(seed, opts) {
    opts = opts || {};
    var rng = GS.rng(typeof seed === "number" ? seed : GS.hashStr(String(seed)));
    var biomeId = opts.biome || rng.pick(["verdant", "verdant", "rocky", "marsh", "snow", "ash"]);
    var biome = GS.BIOMES[biomeId] || GS.BIOMES.verdant;
    var difficulty = opts.difficulty || 1;
    var w = opts.w || rng.int(32, 44);
    var h = opts.h || rng.int(24, 34);
    var tries = 0;
    var island = null;
    while (tries++ < 48) {
      island = tryGenerate(rng, w, h, biome, biomeId, difficulty, opts);
      if (island) {
        island.seed = rng.seed;
        island.try = tries;
        return island;
      }
      // nudge dimensions slightly on failure
      if (tries % 8 === 0) {
        w = Math.max(28, Math.min(48, w + rng.int(-2, 3)));
        h = Math.max(22, Math.min(38, h + rng.int(-2, 3)));
      }
    }
    return forceIsland(rng, 36, 28, biome, biomeId, difficulty);
  }

  function tryGenerate(rng, w, h, biome, biomeId, difficulty, opts) {
    var nBlobs = rng.chance(0.38) ? 2 : 1;
    var blobs = [];
    for (var b = 0; b < nBlobs; b++) {
      blobs.push({
        x: w * (0.35 + rng.float(0.3)) + (b ? rng.float(-4, 4) : 0),
        y: h * (0.35 + rng.float(0.3)) + (b ? rng.float(-3, 3) : 0),
        rx: w * rng.float(0.22, 0.36),
        ry: h * rng.float(0.22, 0.36),
      });
    }
    var ns = rng.int(1, 8000);
    var tiles = [];
    var i, x, y, v, t;

    function maskAt(x, y) {
      var best = 0;
      for (var i = 0; i < blobs.length; i++) {
        var bl = blobs[i];
        var dx = (x - bl.x) / bl.rx;
        var dy = (y - bl.y) / bl.ry;
        var m = Math.max(0, 1 - (dx * dx + dy * dy));
        if (m > best) best = m;
      }
      return best;
    }

    for (y = 0; y < h; y++) {
      tiles[y] = [];
      for (x = 0; x < w; x++) {
        var m = maskAt(x, y);
        var n = GS.fbm(x * 0.13, y * 0.13, ns, 5);
        v = m * 0.72 + n * 0.42 - 0.12;
        if (x < 2 || y < 2 || x > w - 3 || y > h - 3) v -= 0.25;
        t = classifyHeight(v, biome);
        if (biomeId === "marsh" && t === T.GRASS && rng.chance(0.45)) t = T.MUD;
        if (biomeId === "snow" && t === T.GRASS) t = T.SNOW;
        if (biomeId === "ash" && t === T.GRASS) t = T.ASH;
        if (biomeId === "ash" && t === T.ROCK && rng.chance(0.12)) t = T.LAVA;
        var height = GS.tileDef(t).height || 0;
        if (t === T.HILL) height = 3;
        if (t === T.CLIFF) height = 4;
        if (t === T.BEACH || t === T.ICE) height = 1;
        tiles[y][x] = makeTile(t, height);
        tiles[y][x].raw = v;
      }
    }

    // fill tiny inland water holes
    fillSmallWater(tiles, w, h, rng);

    // keep largest landmass, drop specks
    var landPass = function (x, y) {
      return landish(tiles[y][x].type);
    };
    var components = connectedComponents(w, h, landPass);
    if (!components.length) return null;
    components.sort(function (a, b) { return b.length - a.length; });
    var main = components[0];
    if (main.length < 48) return null;
    var keep = {};
    for (i = 0; i < main.length; i++) keep[main[i].x + "," + main[i].y] = 1;
    // keep a couple of rocky islets
    for (i = 1; i < Math.min(components.length, 4); i++) {
      if (components[i].length >= 3 && components[i].length <= 8 && rng.chance(0.5)) {
        for (var j = 0; j < components[i].length; j++) keep[components[i][j].x + "," + components[i][j].y] = 1;
      }
    }
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        if (landish(tiles[y][x].type) && !keep[x + "," + y]) {
          tiles[y][x] = makeTile(T.SHALLOW, 0);
        }
      }
    }

    // beaches: land adjacent to water becomes beach (except cliffs)
    ringBeaches(tiles, w, h, biome);

    // ramps between grass and hill
    placeRamps(tiles, w, h);

    // decorative scatter
    decorate(tiles, w, h, rng, biomeId, biome);

    // paths later after houses

    // houses
    var houses = placeHouses(tiles, w, h, rng, opts.houses || rng.int(3, 3 + Math.min(4, 1 + difficulty)));
    if (houses.length < 2) return null;

    carvePaths(tiles, w, h, houses, rng);

    var landings = findLandings(tiles, w, h);
    if (landings.spots.length < 3 || landings.dirs.length < 1) return null;

    // reachability: each house from at least one landing
    var pass = function (x, y) {
      return tiles[y][x].walk;
    };
    var cost = function (x, y) {
      return tiles[y][x].cost;
    };
    for (i = 0; i < houses.length; i++) {
      var ok = false;
      for (var s = 0; s < landings.spots.length && !ok; s++) {
        var p = GS.path.astar(pass, cost, w, h, landings.spots[s].x, landings.spots[s].y, houses[i].x, houses[i].y, { diag: true, limit: w * h * 8 });
        if (p && p.length) ok = true;
      }
      if (!ok) return null;
    }

    // optional remnant wall on rocky / high difficulty
    if (biomeId === "rocky" || difficulty >= 4) {
      sprinkleWalls(tiles, w, h, rng, houses);
    }

    var name = opts.name || GS.names.island(rng);
    var landCount = 0;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (tiles[y][x].walk) landCount++;

    return {
      w: w,
      h: h,
      tiles: tiles,
      houses: houses,
      landings: landings.spots,
      landingDirs: landings.dirs,
      biome: biomeId,
      biomeName: biome.name,
      flavor: biome.flavor,
      name: name,
      difficulty: difficulty,
      landCount: landCount,
    };
  }

  function fillSmallWater(tiles, w, h, rng) {
    var water = function (x, y) {
      var t = tiles[y][x].type;
      return t === T.DEEP || t === T.SHALLOW || t === T.REEF || t === T.LAVA;
    };
    var comps = connectedComponents(w, h, water);
    for (var i = 0; i < comps.length; i++) {
      if (comps[i].length <= 10) {
        // inland pond: keep some as flavor if not tiny
        var pond = comps[i].length >= 4 && rng.chance(0.4);
        for (var j = 0; j < comps[i].length; j++) {
          var c = comps[i][j];
          if (pond) {
            tiles[c.y][c.x] = makeTile(T.SHALLOW, 0);
          } else {
            tiles[c.y][c.x] = makeTile(T.GRASS, 2);
          }
        }
      }
    }
  }

  function connectedComponents(w, h, pass) {
    var seen = {};
    var out = [];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var k = x + "," + y;
        if (seen[k] || !pass(x, y)) continue;
        var cells = GS.path.flood(pass, w, h, x, y);
        for (var i = 0; i < cells.length; i++) seen[cells[i].x + "," + cells[i].y] = 1;
        out.push(cells);
      }
    }
    return out;
  }

  function ringBeaches(tiles, w, h, biome) {
    var x, y, n, t;
    var next = [];
    for (y = 0; y < h; y++) {
      next[y] = [];
      for (x = 0; x < w; x++) next[y][x] = tiles[y][x];
    }
    for (y = 1; y < h - 1; y++) {
      for (x = 1; x < w - 1; x++) {
        t = tiles[y][x].type;
        if (!landish(t) || t === T.CLIFF || t === T.ROCK || t === T.LAVA) continue;
        var waterAdj = false;
        var ns = neighbors4(x, y);
        for (n = 0; n < 4; n++) {
          var nx = ns[n][0], ny = ns[n][1];
          var tt = tiles[ny][nx].type;
          if (tt === T.DEEP || tt === T.SHALLOW || tt === T.REEF) waterAdj = true;
        }
        if (waterAdj && t !== T.BEACH && t !== T.ICE && t !== T.HOUSE) {
          var beachT = biome.beach || T.BEACH;
          next[y][x] = makeTile(beachT, 1);
        }
      }
    }
    for (y = 0; y < h; y++) tiles[y] = next[y];
  }

  function placeRamps(tiles, w, h) {
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        if (tiles[y][x].type !== T.HILL) continue;
        var ns = neighbors4(x, y);
        for (var n = 0; n < 4; n++) {
          var nx = ns[n][0], ny = ns[n][1];
          var t = tiles[ny][nx].type;
          if (t === T.GRASS || t === T.SNOW || t === T.ASH || t === T.CROPS || t === T.MUD) {
            tiles[ny][nx] = makeTile(T.RAMP, 2);
            break;
          }
        }
      }
    }
  }

  function decorate(tiles, w, h, rng, biomeId, biome) {
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var t = tiles[y][x].type;
        if (t === T.GRASS || t === T.SNOW || t === T.ASH) {
          if (rng.chance(biomeId === "verdant" ? 0.08 : 0.04)) {
            tiles[y][x] = makeTile(T.TREE, tiles[y][x].height);
          } else if (rng.chance(0.06)) {
            tiles[y][x] = makeTile(T.SHRUB, tiles[y][x].height);
          } else if (biomeId === "verdant" && rng.chance(0.05)) {
            tiles[y][x] = makeTile(T.CROPS, 2);
          }
        }
        if (tiles[y][x].type === T.SHALLOW && rng.chance(0.08)) {
          tiles[y][x] = makeTile(T.REEF, 0);
        }
      }
    }
  }

  function placeHouses(tiles, w, h, rng, count) {
    var cands = [];
    for (var y = 2; y < h - 2; y++) {
      for (var x = 2; x < w - 2; x++) {
        var t = tiles[y][x].type;
        if (t !== T.GRASS && t !== T.HILL && t !== T.SNOW && t !== T.ASH && t !== T.CROPS && t !== T.PATH) continue;
        // inland: not adjacent to water
        var water = false;
        var ns = neighbors4(x, y);
        for (var n = 0; n < 4; n++) {
          var tt = tiles[ns[n][1]][ns[n][0]].type;
          if (tt === T.DEEP || tt === T.SHALLOW || tt === T.BEACH || tt === T.ICE || tt === T.REEF) water = true;
        }
        if (water) continue;
        cands.push({ x: x, y: y, score: tiles[y][x].type === T.HILL ? 2 : 1 });
      }
    }
    rng.shuffle(cands);
    var houses = [];
    for (var i = 0; i < cands.length && houses.length < count; i++) {
      var c = cands[i];
      var far = true;
      for (var j = 0; j < houses.length; j++) {
        var dx = houses[j].x - c.x;
        var dy = houses[j].y - c.y;
        if (dx * dx + dy * dy < 9) far = false;
      }
      if (!far) continue;
      var id = houses.length;
      var hp = 90 + rng.int(0, 40);
      tiles[c.y][c.x] = makeTile(T.HOUSE, tiles[c.y][c.x].height);
      tiles[c.y][c.x].houseId = id;
      houses.push({
        id: id,
        x: c.x,
        y: c.y,
        name: GS.names.house(rng),
        hp: hp,
        maxHp: hp,
        coins: 1,
        alive: true,
        villagers: 2 + rng.int(0, 4),
      });
    }
    return houses;
  }

  function carvePaths(tiles, w, h, houses, rng) {
    if (houses.length < 2) return;
    var pass = function (x, y) {
      var t = tiles[y][x].type;
      return walkType(t) && t !== T.HOUSE;
    };
    var cost = function (x, y) {
      return tiles[y][x].cost;
    };
    for (var i = 1; i < houses.length; i++) {
      var p = GS.path.astar(function (x, y) {
        return tiles[y][x].walk;
      }, cost, w, h, houses[0].x, houses[0].y, houses[i].x, houses[i].y, { diag: false });
      if (!p) continue;
      for (var k = 1; k < p.length - 1; k++) {
        var t = tiles[p[k].y][p[k].x];
        if (t.type === T.GRASS || t.type === T.SNOW || t.type === T.ASH || t.type === T.SHRUB || t.type === T.CROPS) {
          tiles[p[k].y][p[k].x] = makeTile(T.PATH, t.height);
        }
      }
    }
  }

  function findLandings(tiles, w, h) {
    var spots = [];
    var dirSet = {};
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        if (tiles[y][x].type !== T.BEACH && tiles[y][x].type !== T.ICE) continue;
        var dirs = [
          { d: 0, x: x, y: y - 1 },
          { d: 1, x: x + 1, y: y },
          { d: 2, x: x, y: y + 1 },
          { d: 3, x: x - 1, y: y },
        ];
        for (var i = 0; i < 4; i++) {
          var nx = dirs[i].x, ny = dirs[i].y;
          if (!inb(nx, ny, w, h)) continue;
          if (!tiles[ny][nx].ship) continue;
          // open water toward that edge
          var open = 0;
          var px = nx, py = ny;
          var dx = GS.DIRS[dirs[i].d].dx;
          var dy = GS.DIRS[dirs[i].d].dy;
          for (var s = 0; s < 8; s++) {
            px += dx;
            py += dy;
            if (!inb(px, py, w, h)) {
              open = 8;
              break;
            }
            if (tiles[py][px].ship) open++;
            else break;
          }
          if (open >= 3) {
            spots.push({ x: x, y: y, dir: dirs[i].d });
            dirSet[dirs[i].d] = 1;
          }
        }
      }
    }
    var dirs = [];
    for (var d = 0; d < 4; d++) if (dirSet[d]) dirs.push(d);
    return { spots: spots, dirs: dirs };
  }

  function sprinkleWalls(tiles, w, h, rng, houses) {
    var hx = 0, hy = 0;
    for (var i = 0; i < houses.length; i++) {
      hx += houses[i].x;
      hy += houses[i].y;
    }
    hx = (hx / houses.length) | 0;
    hy = (hy / houses.length) | 0;
    var len = rng.int(4, 8);
    var dir = rng.int(0, 4);
    var x = hx + rng.int(-3, 4);
    var y = hy + rng.int(-3, 4);
    for (var k = 0; k < len; k++) {
      if (!inb(x, y, w, h)) break;
      var t = tiles[y][x].type;
      if (t === T.GRASS || t === T.HILL || t === T.PATH || t === T.ASH || t === T.SNOW) {
        if (k === (len / 2) | 0) tiles[y][x] = makeTile(T.FLOOR, 2);
        else tiles[y][x] = makeTile(T.WALL, 3);
      }
      x += GS.DIRS[dir].dx;
      y += GS.DIRS[dir].dy;
    }
  }

  function forceIsland(rng, w, h, biome, biomeId, difficulty) {
    var tiles = [];
    var x, y;
    for (y = 0; y < h; y++) {
      tiles[y] = [];
      for (x = 0; x < w; x++) {
        var cx = (x / w) * 2 - 1;
        var cy = (y / h) * 2 - 1;
        var d = cx * cx * 1.2 + cy * cy;
        var t;
        if (d > 0.72) t = T.DEEP;
        else if (d > 0.55) t = T.SHALLOW;
        else if (d > 0.42) t = biome.beach;
        else if (d > 0.18) t = biome.grass;
        else t = T.HILL;
        tiles[y][x] = makeTile(t, GS.tileDef(t).height || 0);
      }
    }
    ringBeaches(tiles, w, h, biome);
    placeRamps(tiles, w, h);
    var houses = placeHouses(tiles, w, h, rng, 3);
    if (!houses.length) {
      tiles[(h / 2) | 0][(w / 2) | 0] = makeTile(T.HOUSE, 2);
      houses = [{ id: 0, x: (w / 2) | 0, y: (h / 2) | 0, name: "厅堂", hp: 100, maxHp: 100, coins: 1, alive: true, villagers: 4 }];
      tiles[(h / 2) | 0][(w / 2) | 0].houseId = 0;
    }
    var landings = findLandings(tiles, w, h);
    return {
      w: w, h: h, tiles: tiles, houses: houses,
      landings: landings.spots, landingDirs: landings.dirs.length ? landings.dirs : [2],
      biome: biomeId, biomeName: biome.name, flavor: biome.flavor,
      name: GS.names.island(rng), difficulty: difficulty, landCount: w * h, forced: true,
    };
  }

  function generateCampaign(seed, n) {
    n = n || 12;
    var rng = GS.rng(typeof seed === "number" ? seed : GS.hashStr(String(seed || "south")));
    var W = 72, H = 40;
    var islands = [];
    var attempts = 0;
    while (islands.length < n && attempts++ < 400) {
      var x = rng.int(4, W - 4);
      var y = rng.int(3, H - 3);
      var ok = true;
      for (var i = 0; i < islands.length; i++) {
        var dx = islands[i].mx - x;
        var dy = islands[i].my - y;
        if (dx * dx + dy * dy < 36) ok = false;
      }
      if (!ok) continue;
      var westness = 1 - x / W;
      var difficulty = 1 + Math.round((1 - westness) * 6 + rng.float(-0.3, 0.6));
      difficulty = Math.max(1, Math.min(8, difficulty));
      var biome;
      if (difficulty >= 7) biome = rng.chance(0.5) ? "ash" : "snow";
      else if (difficulty >= 5) biome = rng.pick(["rocky", "snow", "marsh"]);
      else if (difficulty >= 3) biome = rng.pick(["rocky", "verdant", "marsh"]);
      else biome = rng.pick(["verdant", "verdant", "marsh"]);
      var isleSeed = rng.int(1, 0x7fffffff);
      islands.push({
        id: islands.length,
        mx: x,
        my: y,
        seed: isleSeed,
        biome: biome,
        difficulty: difficulty,
        name: GS.names.island(rng),
        status: "hidden", // hidden | scouted | cleared | lost
        edges: [],
      });
    }
    islands.sort(function (a, b) { return a.mx - b.mx || a.my - b.my; });
    for (var i = 0; i < islands.length; i++) islands[i].id = i;

    // MST on islands
    var used = [0];
    var left = [];
    for (i = 1; i < islands.length; i++) left.push(i);
    function dist(a, b) {
      var dx = islands[a].mx - islands[b].mx;
      var dy = islands[a].my - islands[b].my;
      return dx * dx + dy * dy;
    }
    while (left.length) {
      var best = 1e9, bi = -1, bj = -1;
      for (i = 0; i < used.length; i++) {
        for (var j = 0; j < left.length; j++) {
          var d = dist(used[i], left[j]);
          if (d < best) {
            best = d;
            bi = used[i];
            bj = left[j];
          }
        }
      }
      islands[bi].edges.push(bj);
      islands[bj].edges.push(bi);
      used.push(bj);
      left.splice(left.indexOf(bj), 1);
    }
    // extra edges
    for (i = 0; i < islands.length; i++) {
      for (var j = i + 1; j < islands.length; j++) {
        if (islands[i].edges.indexOf(j) >= 0) continue;
        if (dist(i, j) < 140 && rng.chance(0.28)) {
          islands[i].edges.push(j);
          islands[j].edges.push(i);
        }
      }
    }
    islands[0].status = "scouted";
    for (i = 0; i < islands[0].edges.length; i++) {
      islands[islands[0].edges[i]].status = "scouted";
    }
    return {
      seed: rng.seed,
      w: W,
      h: H,
      islands: islands,
      current: 0,
    };
  }

  function fingerprint(island) {
    var s = island.w + "x" + island.h + ":" + island.houses.length + ":" + island.landings.length;
    var acc = 0;
    for (var y = 0; y < island.h; y += 3) {
      for (var x = 0; x < island.w; x += 3) {
        acc = (acc * 33 + island.tiles[y][x].type) >>> 0;
      }
    }
    return s + ":" + acc.toString(16);
  }

  GS.mapgen = {
    island: generateIsland,
    campaign: generateCampaign,
    fingerprint: fingerprint,
    makeTile: makeTile,
    landish: landish,
  };
})(typeof window !== "undefined" ? window : globalThis);
