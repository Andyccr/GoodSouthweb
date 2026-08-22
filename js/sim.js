/* Good South — real-time island defense simulation */
(function (g) {
  var GS = g.GS || (g.GS = {});
  var T = GS.T;
  var C = GS.C;
  var eid = 1;

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function dist(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function tileAt(island, x, y) {
    x = x | 0;
    y = y | 0;
    if (x < 0 || y < 0 || x >= island.w || y >= island.h) return null;
    return island.tiles[y][x];
  }

  function makeWaves(island, rng, difficulty) {
    var dirs = island.landingDirs.length ? island.landingDirs.slice() : [2];
    var waves = [];
    var n = 3 + Math.min(5, difficulty);
    var t = 6;
    var roster = ["raider"];
    if (difficulty >= 2) roster.push("thrower");
    if (difficulty >= 3) roster.push("shield");
    if (difficulty >= 4) roster.push("brute");
    if (difficulty >= 6) roster.push("berserk");
    for (var i = 0; i < n; i++) {
      var dir = dirs[i % dirs.length];
      if (rng.chance(0.35)) dir = rng.pick(dirs);
      var count = 5 + i * 2 + difficulty + rng.int(0, 3);
      var units = [];
      for (var k = 0; k < count; k++) {
        var role = "raider";
        if (i > 0) role = rng.pick(roster);
        if (i === n - 1 && k > count - 3 && difficulty >= 3) role = rng.chance(0.5) ? "brute" : role;
        units.push(role);
      }
      if (i === n - 1 && difficulty >= 7) units.push("jarl");
      waves.push({ t: t, dir: dir, units: units, launched: false });
      t += 14 + Math.max(0, 8 - difficulty) + rng.int(0, 5);
    }
    return waves;
  }

  function formationSlots(tx, ty, facing, n, role) {
    var dir = GS.DIRS[facing];
    var px = -dir.dy, py = dir.dx; // perpendicular
    var slots = [];
    var cols = role === "pike" ? Math.min(n, 8) : role === "archer" ? Math.min(n, 6) : 4;
    var rows = Math.ceil(n / cols);
    var back = role === "archer" ? 1 : 0;
    var i = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols && i < n; c++, i++) {
        var along = r + back;
        var across = c - (cols - 1) / 2;
        slots.push({
          x: tx - dir.dx * along + px * across,
          y: ty - dir.dy * along + py * across,
        });
      }
    }
    return slots;
  }

  function Battle(island, army, opts) {
    opts = opts || {};
    this.island = island;
    this.army = army;
    this.opts = opts;
    this.sandbox = !!opts.sandbox;
    this.w = island.w;
    this.h = island.h;
    this.rng = GS.rng(opts.battleSeed || (island.seed ^ 0x9e3779b9));
    this.entities = [];
    this.squads = [];
    this.projectiles = [];
    this.floaters = [];
    this.corpses = [];
    this.log = [];
    this.t = 0;
    this.phase = "deploy"; // deploy | fight | over
    this.speed = 0;
    this.cursor = { x: (island.w / 2) | 0, y: (island.h / 2) | 0 };
    this.selected = null; // squad id
    this.look = false;
    this.outcome = null;
    this.houses = island.houses.map(function (h) {
      return {
        id: h.id, x: h.x, y: h.y, name: h.name, hp: h.hp, maxHp: h.maxHp,
        coins: h.coins, alive: true, villagers: h.villagers, burning: 0,
      };
    });
    this.waves = this.sandbox ? [] : makeWaves(island, this.rng, island.difficulty || 1);
    this.ships = [];
    this.announce("抵达 " + island.name + "。" + island.flavor + "。", C.LCYAN);
    this.announce("登陆点：" + island.landingDirs.map(function (d) { return GS.DIRS[d].name; }).join("、") + "。布置兵团，按 G 开战。", C.YELLOW);
    this._spawnSquads(army);
    this._cachePass();
  }

  Battle.prototype._cachePass = function () {
    var tiles = this.island.tiles;
    var w = this.w, h = this.h;
    this.passable = function (x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return false;
      return tiles[y][x].walk;
    };
    this.cost = function (x, y) {
      return tiles[y][x].cost || 1;
    };
    this.shipPass = function (x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return false;
      return !!tiles[y][x].ship;
    };
    var self = this;
    this.losBlocked = function (x, y) {
      var t = tileAt(self.island, x, y);
      return t && t.los;
    };
  };

  Battle.prototype._spawnSquads = function (army) {
    var list = (army && army.commanders) || [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.soldiers <= 0) continue;
      this.squads.push({
        id: c.id,
        name: c.name,
        role: c.cls,
        level: c.level || 1,
        trait: c.trait,
        soldiers: c.soldiers,
        maxSoldiers: c.maxSoldiers,
        facing: 2,
        tx: -1,
        ty: -1,
        placed: false,
        entities: [],
        moveCd: 0,
      });
    }
    if (this.squads.length) this.selected = this.squads[0].id;
  };

  Battle.prototype.announce = function (msg, color) {
    this.log.push({ t: this.t, msg: msg, color: color || C.LGRAY });
    if (this.log.length > 80) this.log.shift();
  };

  Battle.prototype.floater = function (x, y, text, color) {
    this.floaters.push({ x: x, y: y, text: text, color: color || C.WHITE, life: 0.85 });
  };

  Battle.prototype.addEntity = function (e) {
    e.id = eid++;
    this.entities.push(e);
    return e;
  };

  Battle.prototype.placeSquad = function (squadId, tx, ty, facing) {
    var sq = this.getSquad(squadId);
    if (!sq) return false;
    tx = tx | 0;
    ty = ty | 0;
    var tile = tileAt(this.island, tx, ty);
    if (!tile || !tile.walk) return false;
    if (tile.type === T.HOUSE) return false;
    if (this.phase === "fight" && sq.moveCd > 0) return false;
    sq.tx = tx;
    sq.ty = ty;
    if (facing != null) sq.facing = facing;
    sq.placed = true;
    if (!sq.entities.length) this._birthSquad(sq);
    else this._retargetFormation(sq);
    if (this.phase === "fight") sq.moveCd = 3.2;
    this.announce(sq.name + " 的" + GS.ROLES[sq.role].name + "列阵于 (" + tx + "," + ty + ")，面朝" + GS.DIRS[sq.facing].name + "。", C.LCYAN);
    return true;
  };

  Battle.prototype.rotateSquad = function (squadId, dir) {
    var sq = this.getSquad(squadId);
    if (!sq || !sq.placed) return;
    if (dir == null) sq.facing = (sq.facing + 1) & 3;
    else sq.facing = dir & 3;
    this._retargetFormation(sq);
  };

  Battle.prototype.getSquad = function (id) {
    for (var i = 0; i < this.squads.length; i++) if (this.squads[i].id === id) return this.squads[i];
    return null;
  };

  Battle.prototype._birthSquad = function (sq) {
    var def = GS.ROLES[sq.role];
    var n = sq.soldiers;
    var slots = formationSlots(sq.tx, sq.ty, sq.facing, n, sq.role);
    sq.entities = [];
    for (var i = 0; i < n; i++) {
      var sl = slots[i];
      var hx = clamp(Math.round(sl.x), 0, this.w - 1);
      var hy = clamp(Math.round(sl.y), 0, this.h - 1);
      if (!this.passable(hx, hy)) {
        hx = sq.tx;
        hy = sq.ty;
      }
      var e = this.addEntity({
        kind: "soldier",
        team: "player",
        role: sq.role,
        squadId: sq.id,
        name: i === 0 ? sq.name : sq.name + "之卒",
        ch: i === 0 ? def.commander : def.ch,
        fg: def.fg,
        x: hx + 0.5,
        y: hy + 0.5,
        hp: def.hp + (sq.level - 1) * 3,
        maxHp: def.hp + (sq.level - 1) * 3,
        dmg: def.dmg + (sq.level - 1) * 0.6,
        range: def.range,
        speed: def.speed,
        cd: def.cd,
        acc: def.acc,
        resist: def.resist || 0,
        wrath: false,
        front: def.front || 1,
        facing: sq.facing,
        cooldown: this.rng.float(0, 0.4),
        slotX: sl.x,
        slotY: sl.y,
        path: null,
        targetId: 0,
        alive: true,
        commander: i === 0,
      });
      if (sq.trait && GS.TRAITS) {
        for (var t = 0; t < GS.TRAITS.length; t++) {
          if (GS.TRAITS[t].id === sq.trait) GS.TRAITS[t].on(e);
        }
      }
      sq.entities.push(e.id);
    }
  };

  Battle.prototype._retargetFormation = function (sq) {
    var n = 0;
    var living = [];
    for (var i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      if (e.kind === "soldier" && e.squadId === sq.id && e.alive) living.push(e);
    }
    var slots = formationSlots(sq.tx, sq.ty, sq.facing, living.length, sq.role);
    for (i = 0; i < living.length; i++) {
      living[i].slotX = slots[i].x;
      living[i].slotY = slots[i].y;
      living[i].facing = sq.facing;
      living[i].path = null;
    }
  };

  Battle.prototype.startFight = function () {
    if (this.phase !== "deploy") return;
    var any = false;
    for (var i = 0; i < this.squads.length; i++) if (this.squads[i].placed) any = true;
    if (!any && !this.sandbox) {
      this.announce("至少布置一个兵团才能开战。", C.LRED);
      return;
    }
    this.phase = "fight";
    this.speed = 1;
    this.announce("角声响起。北境的船帆出现在海平线上。", C.LRED);
    if (GS.audio) GS.audio.horn();
  };

  Battle.prototype.setSpeed = function (s) {
    if (this.phase === "deploy" && s > 0) {
      this.startFight();
      return;
    }
    if (this.phase === "over") return;
    this.speed = s;
  };

  Battle.prototype.spawnShip = function (dir, units) {
    dir = dir == null ? this.rng.pick(this.island.landingDirs.length ? this.island.landingDirs : [2]) : dir;
    var d = GS.DIRS[dir];
    var spots = this.island.landings.filter(function (s) { return s.dir === dir; });
    if (!spots.length) spots = this.island.landings;
    if (!spots.length) return null;
    var beach = this.rng.pick(spots);
    // spawn from map edge along dir inverted
    var sx, sy;
    if (dir === 0) { sx = beach.x; sy = 0; }
    else if (dir === 1) { sx = this.w - 1; sy = beach.y; }
    else if (dir === 2) { sx = beach.x; sy = this.h - 1; }
    else { sx = 0; sy = beach.y; }
    // walk water toward beach
    if (!this.island.tiles[sy][sx].ship) {
      sx = beach.x;
      sy = beach.y;
    }
    var cargo = units || [];
    if (!cargo.length) {
      var n = 4 + this.rng.int(0, 5);
      for (var i = 0; i < n; i++) cargo.push("raider");
    }
    var ship = this.addEntity({
      kind: "ship",
      team: "enemy",
      role: "ship",
      ch: dir === 1 ? ">" : dir === 3 ? "<" : dir === 0 ? "^" : "v",
      fg: C.BROWN,
      x: sx + 0.5,
      y: sy + 0.5,
      hp: 40,
      maxHp: 40,
      speed: 1.55,
      dir: dir,
      beachX: beach.x,
      beachY: beach.y,
      cargo: cargo.slice(),
      landing: false,
      cooldown: 0,
      alive: true,
      name: "北境长船",
    });
    this.ships.push(ship.id);
    this.announce("一艘长船自" + d.name + "方驶来！", C.LRED);
    if (GS.audio) GS.audio.ship();
    return ship;
  };

  Battle.prototype.spawnEnemy = function (role, x, y) {
    var def = GS.ROLES[role] || GS.ROLES.raider;
    var e = this.addEntity({
      kind: "enemy",
      team: "enemy",
      role: role,
      name: GS.names.north(this.rng),
      ch: def.ch,
      fg: def.fg,
      x: x + 0.5,
      y: y + 0.5,
      hp: def.hp,
      maxHp: def.hp,
      dmg: def.dmg,
      range: def.range,
      speed: def.speed,
      cd: def.cd,
      acc: def.acc,
      resist: def.resist || 0,
      cooldown: this.rng.float(0, 0.3),
      path: null,
      targetId: 0,
      houseId: -1,
      facing: 0,
      alive: true,
    });
    return e;
  };

  Battle.prototype.spawnPlayerUnit = function (role, x, y) {
    var fake = {
      id: "sb_" + eid,
      name: GS.names.dwarf(this.rng),
      role: role,
      level: 1,
      soldiers: 8,
      maxSoldiers: 8,
      facing: 2,
      tx: x,
      ty: y,
      placed: true,
      entities: [],
      moveCd: 0,
    };
    this.squads.push(fake);
    this._birthSquad(fake);
    this.selected = fake.id;
    return fake;
  };

  Battle.prototype.nearestHouse = function (x, y) {
    var best = null, bd = 1e9;
    for (var i = 0; i < this.houses.length; i++) {
      var h = this.houses[i];
      if (!h.alive) continue;
      var d = (h.x + 0.5 - x) * (h.x + 0.5 - x) + (h.y + 0.5 - y) * (h.y + 0.5 - y);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  };

  Battle.prototype.living = function (pred) {
    var out = [];
    for (var i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      if (e.alive && pred(e)) out.push(e);
    }
    return out;
  };

  Battle.prototype.byId = function (id) {
    for (var i = 0; i < this.entities.length; i++) if (this.entities[i].id === id) return this.entities[i];
    return null;
  };

  Battle.prototype.tick = function (dt) {
    if (this.phase === "over") {
      this._tickFloaters(dt);
      return;
    }
    if (this.phase === "deploy") {
      this._tickFloaters(dt);
      return;
    }
    if (this.speed <= 0) {
      this._tickFloaters(dt);
      return;
    }
    var step = dt * this.speed;
    var maxStep = 0.05;
    while (step > 0) {
      var s = Math.min(maxStep, step);
      this._sim(s);
      step -= s;
    }
    this._tickFloaters(dt);
  };

  Battle.prototype._sim = function (dt) {
    this.t += dt;
    var i;
    for (i = 0; i < this.squads.length; i++) {
      if (this.squads[i].moveCd > 0) this.squads[i].moveCd -= dt;
    }
    if (!this.sandbox) this._launchWaves();
    this._tickShips(dt);
    this._tickProjectiles(dt);
    this._tickEnemies(dt);
    this._tickSoldiers(dt);
    this._tickHouses(dt);
    this._reap();
    this._checkEnd();
  };

  Battle.prototype._launchWaves = function () {
    for (var i = 0; i < this.waves.length; i++) {
      var w = this.waves[i];
      if (!w.launched && this.t >= w.t) {
        w.launched = true;
        this.spawnShip(w.dir, w.units);
        this.announce("第 " + (i + 1) + "/" + this.waves.length + " 波自" + GS.DIRS[w.dir].name + "方杀到！", C.YELLOW);
      }
    }
  };

  Battle.prototype._tickShips = function (dt) {
    for (var i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      if (e.kind !== "ship" || !e.alive) continue;
      var tx = e.beachX + 0.5, ty = e.beachY + 0.5;
      var d = dist(e, { x: tx, y: ty });
      if (d > 0.6) {
        var vx = (tx - e.x) / d;
        var vy = (ty - e.y) / d;
        var sp = e.speed * dt;
        // stay on water until close
        var nx = e.x + vx * sp, ny = e.y + vy * sp;
        var tile = tileAt(this.island, nx, ny);
        if (tile && (tile.ship || tile.walk)) {
          e.x = nx;
          e.y = ny;
        } else {
          e.x += vx * sp * 0.3;
          e.y += vy * sp * 0.3;
        }
      } else {
        e.landing = true;
        e.cooldown -= dt;
        if (e.cooldown <= 0 && e.cargo.length) {
          e.cooldown = 0.45;
          var role = e.cargo.shift();
          var ex = e.beachX, ey = e.beachY;
          var n4 = GS.path.N4;
          for (var k = 0; k < 4; k++) {
            var px = e.beachX + n4[k][0], py = e.beachY + n4[k][1];
            if (this.passable(px, py)) { ex = px; ey = py; break; }
          }
          this.spawnEnemy(role, ex, ey);
        }
        if (!e.cargo.length) {
          e.alive = false;
          e.ch = "~";
        }
      }
    }
  };

  Battle.prototype._tickProjectiles = function (dt) {
    for (var i = 0; i < this.projectiles.length; i++) {
      var p = this.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) {
        p.dead = true;
        var t = this.byId(p.targetId);
        if (t && t.alive) this._hit(t, p.dmg, p.from);
        continue;
      }
      var t2 = this.byId(p.targetId);
      if (t2 && t2.alive && dist(p, t2) < 0.35) {
        this._hit(t2, p.dmg, p.from);
        p.dead = true;
      }
    }
    this.projectiles = this.projectiles.filter(function (p) { return !p.dead; });
  };

  Battle.prototype._bestEnemyFor = function (e) {
    var best = null, bd = e.range + 0.2;
    for (var i = 0; i < this.entities.length; i++) {
      var o = this.entities[i];
      if (!o.alive || o.team !== "enemy" || (o.kind !== "enemy" && o.kind !== "ship")) continue;
      var d = dist(e, o);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  };

  Battle.prototype._bestSoldierFor = function (e) {
    var best = null, bd = e.range + 0.4;
    for (var i = 0; i < this.entities.length; i++) {
      var o = this.entities[i];
      if (!o.alive || o.team !== "player") continue;
      var d = dist(e, o);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  };

  Battle.prototype._facingBonus = function (e, target) {
    if (!e.front || e.front <= 1) return 1;
    var dir = GS.DIRS[e.facing || 0];
    var dx = target.x - e.x, dy = target.y - e.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= len; dy /= len;
    var dot = dx * dir.dx + dy * dir.dy;
    if (dot > 0.45) return e.front;
    if (dot < -0.2) return 0.55;
    return 0.75;
  };

  Battle.prototype._heightOf = function (e) {
    var t = tileAt(this.island, e.x, e.y);
    return t ? t.height : 0;
  };

  Battle.prototype._shoot = function (from, to) {
    var d = dist(from, to);
    var vx = (to.x - from.x) / d;
    var vy = (to.y - from.y) / d;
    var speed = 9;
    var dmg = from.dmg;
    var h1 = this._heightOf(from), h2 = this._heightOf(to);
    if (h1 > h2) dmg *= 1.28;
    if (from.wrath && from.hp < from.maxHp * 0.4) dmg *= 1.35;
    if (this.rng.next() > from.acc) {
      this.floater(to.x, to.y, "偏", C.DGRAY);
      if (GS.audio) GS.audio.bow();
      from.cooldown = from.cd;
      return;
    }
    this.projectiles.push({
      x: from.x, y: from.y,
      vx: vx * speed, vy: vy * speed,
      life: d / speed + 0.05,
      dmg: dmg,
      from: from,
      targetId: to.id,
      ch: from.role === "thrower" ? "*" : "·",
      fg: from.role === "thrower" ? C.BROWN : C.WHITE,
    });
    from.cooldown = from.cd;
    if (GS.audio) GS.audio.bow();
  };

  Battle.prototype._melee = function (from, to) {
    var dmg = from.dmg * this._facingBonus(from, to);
    if (from.wrath && from.hp < from.maxHp * 0.4) dmg *= 1.35;
    if (this.rng.next() > from.acc) {
      this.floater(to.x, to.y, "空", C.DGRAY);
      from.cooldown = from.cd * 0.7;
      return;
    }
    this._hit(to, dmg, from);
    from.cooldown = from.cd;
    if (GS.audio) GS.audio.hit();
  };

  Battle.prototype._hit = function (target, dmg, from) {
    if (!target.alive) return;
    var r = target.resist || 0;
    dmg = dmg * (1 - r) * (0.85 + this.rng.next() * 0.3);
    dmg = Math.max(1, dmg);
    target.hp -= dmg;
    this.floater(target.x, target.y - 0.2, String(-Math.round(dmg)), target.team === "player" ? C.LRED : C.YELLOW);
    if (target.hp <= 0) this._kill(target, from);
  };

  Battle.prototype._kill = function (e, from) {
    e.alive = false;
    e.hp = 0;
    this.corpses.push({ x: e.x, y: e.y, ch: "%", fg: C.RED, life: 18, name: e.name });
    if (e.kind === "enemy") {
      this.announce(e.name + "（" + (GS.ROLES[e.role] || {}).name + "）倒下了。", C.GREEN);
      if (from && from.squadId) {
        var sq = this.getSquad(from.squadId);
        if (sq) sq.xp = (sq.xp || 0) + 1;
      }
    } else if (e.kind === "soldier") {
      this.announce(e.name + "战死了。", C.RED);
      var sq2 = this.getSquad(e.squadId);
      if (sq2) {
        sq2.soldiers = Math.max(0, sq2.soldiers - 1);
        if (e.commander) this.announce("队长 " + sq2.name + " 阵亡！兵团溃散。", C.LRED);
      }
    }
    if (GS.audio) GS.audio.die();
  };

  Battle.prototype._pathTo = function (e, tx, ty) {
    var sx = e.x | 0, sy = e.y | 0;
    tx = tx | 0; ty = ty | 0;
    if (!this.passable(tx, ty)) {
      var n4 = GS.path.N4;
      var found = false;
      for (var i = 0; i < 4; i++) {
        var nx = tx + n4[i][0], ny = ty + n4[i][1];
        if (this.passable(nx, ny)) { tx = nx; ty = ny; found = true; break; }
      }
      if (!found) return null;
    }
    return GS.path.astar(this.passable, this.cost, this.w, this.h, sx, sy, tx, ty, { diag: true });
  };

  Battle.prototype._steer = function (e, tx, ty, dt) {
    var dx = tx - e.x, dy = ty - e.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.05) return;
    dx /= d; dy /= d;
    var sp = e.speed * dt;
    var nx = e.x + dx * sp;
    var ny = e.y + dy * sp;
    if (this.passable(nx | 0, ny | 0) || this.passable(Math.round(nx), Math.round(ny))) {
      e.x = nx;
      e.y = ny;
      if (Math.abs(dx) > Math.abs(dy)) e.facing = dx > 0 ? 1 : 3;
      else e.facing = dy > 0 ? 2 : 0;
    } else if (this.passable(nx | 0, e.y | 0)) {
      e.x = nx;
    } else if (this.passable(e.x | 0, ny | 0)) {
      e.y = ny;
    }
  };

  Battle.prototype._followPath = function (e, dt) {
    if (!e.path || !e.path.length) return false;
    var n = e.path[0];
    var tx = n.x + 0.5, ty = n.y + 0.5;
    if (dist(e, { x: tx, y: ty }) < 0.28) {
      e.path.shift();
      if (!e.path.length) return false;
      n = e.path[0];
      tx = n.x + 0.5; ty = n.y + 0.5;
    }
    this._steer(e, tx, ty, dt);
    return true;
  };

  Battle.prototype._tickEnemies = function (dt) {
    for (var i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      if (e.kind !== "enemy" || !e.alive) continue;
      e.cooldown -= dt;
      var foe = this._bestSoldierFor(e);
      if (foe && dist(e, foe) <= e.range + 0.15) {
        if (e.cooldown <= 0) {
          if (e.range > 1.8) {
            var x0 = e.x | 0, y0 = e.y | 0, x1 = foe.x | 0, y1 = foe.y | 0;
            if (GS.path.los(this.losBlocked, x0, y0, x1, y1)) this._shoot(e, foe);
            else this._steer(e, foe.x, foe.y, dt);
          } else this._melee(e, foe);
        }
        continue;
      }
      var house = this.nearestHouse(e.x, e.y);
      if (house && dist(e, { x: house.x + 0.5, y: house.y + 0.5 }) < 1.2) {
        if (e.cooldown <= 0) {
          e.cooldown = e.cd;
          house.hp -= e.dmg * 0.85;
          this.floater(house.x + 0.5, house.y, "⌂", C.LRED);
          if (house.hp <= 0 && house.alive) this._burnHouse(house);
        }
        continue;
      }
      // path to house, but fight if soldier nearby-ish
      if (foe && dist(e, foe) < 3.2) {
        this._steer(e, foe.x, foe.y, dt);
        continue;
      }
      if (house) {
        if (!e.path || !e.path.length || this.rng.chance(0.01)) {
          e.path = this._pathTo(e, house.x, house.y);
        }
        if (!this._followPath(e, dt) && house) this._steer(e, house.x + 0.5, house.y + 0.5, dt);
      }
    }
  };

  Battle.prototype._tickSoldiers = function (dt) {
    for (var i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      if (e.kind !== "soldier" || !e.alive) continue;
      e.cooldown -= dt;
      var slot = { x: e.slotX + 0.5, y: e.slotY + 0.5 };
      var foe = this._bestEnemyFor(e);
      var inRange = foe && dist(e, foe) <= e.range + 0.12;
      if (inRange && e.cooldown <= 0) {
        if (e.range > 1.8) {
          var blocked = !GS.path.los(this.losBlocked, e.x | 0, e.y | 0, foe.x | 0, foe.y | 0);
          if (!blocked) this._shoot(e, foe);
        } else this._melee(e, foe);
      }
      // keep formation; step out slightly to meet melee
      if (foe && e.range <= 1.8 && dist(e, foe) < 2.4 && dist(e, foe) > e.range) {
        this._steer(e, foe.x, foe.y, dt);
      } else if (dist(e, slot) > 0.2) {
        if (!e.path || !e.path.length || this.rng.chance(0.02)) {
          e.path = this._pathTo(e, e.slotX | 0, e.slotY | 0);
        }
        if (!this._followPath(e, dt)) this._steer(e, slot.x, slot.y, dt);
      }
    }
  };

  Battle.prototype._burnHouse = function (house) {
    house.alive = false;
    house.hp = 0;
    house.burning = 8;
    var tile = this.island.tiles[house.y][house.x];
    tile.type = T.RUIN;
    tile.ch = "░";
    tile.fg = C.RED;
    tile.bg = C.BROWN;
    tile.houseId = -1;
    this.announce(house.name + "被点燃了！村民四散。", C.LRED);
    if (GS.audio) GS.audio.fire();
  };

  Battle.prototype._tickHouses = function (dt) {
    for (var i = 0; i < this.houses.length; i++) {
      if (this.houses[i].burning > 0) this.houses[i].burning -= dt;
    }
  };

  Battle.prototype._tickFloaters = function (dt) {
    for (var i = 0; i < this.floaters.length; i++) this.floaters[i].life -= dt;
    this.floaters = this.floaters.filter(function (f) { return f.life > 0; });
    for (i = 0; i < this.corpses.length; i++) this.corpses[i].life -= dt;
    this.corpses = this.corpses.filter(function (c) { return c.life > 0; });
  };

  Battle.prototype._reap = function () {
    // keep dead briefly? render uses corpses. strip dead ships/people from hot list
    var aliveSoldiers = {};
    for (var i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      if (e.kind === "soldier" && e.alive) aliveSoldiers[e.squadId] = (aliveSoldiers[e.squadId] || 0) + 1;
    }
    for (i = 0; i < this.squads.length; i++) {
      this.squads[i].soldiers = aliveSoldiers[this.squads[i].id] || 0;
    }
  };

  Battle.prototype._checkEnd = function () {
    if (this.sandbox || this.phase !== "fight") return;
    var housesLeft = 0;
    for (var i = 0; i < this.houses.length; i++) if (this.houses[i].alive) housesLeft++;
    var soldiers = 0, enemies = 0, cargo = 0;
    for (i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      if (!e.alive) continue;
      if (e.kind === "soldier") soldiers++;
      if (e.kind === "enemy") enemies++;
      if (e.kind === "ship") cargo += (e.cargo ? e.cargo.length : 0) + 1;
    }
    var wavesLeft = 0;
    for (i = 0; i < this.waves.length; i++) if (!this.waves[i].launched) wavesLeft++;
    if (housesLeft <= 0) {
      this._end("defeat", "所有屋舍都烧了。这座岛落入北蛮之手。");
      return;
    }
    if (wavesLeft === 0 && enemies === 0 && cargo === 0) {
      this._end("victory", "潮水退去。你们守住了 " + this.island.name + "。");
    }
  };

  Battle.prototype._end = function (kind, msg) {
    this.phase = "over";
    this.speed = 0;
    this.outcome = {
      kind: kind,
      msg: msg,
      housesLeft: this.houses.filter(function (h) { return h.alive; }).length,
      housesTotal: this.houses.length,
      coins: 0,
      survivors: this.syncArmy(),
    };
    if (kind === "victory") {
      this.outcome.coins = this.outcome.housesLeft;
      this.announce(msg + " 缴获钱币 " + this.outcome.coins + "。", C.YELLOW);
      if (GS.audio) GS.audio.win();
    } else {
      this.announce(msg, C.LRED);
      if (GS.audio) GS.audio.lose();
    }
  };

  Battle.prototype.evacuate = function () {
    if (this.phase !== "fight") return;
    this._end("retreat", "你们弃岛乘船撤走。屋舍的钱币没能带走。");
    this.outcome.coins = 0;
  };

  Battle.prototype.syncArmy = function () {
    var army = this.army;
    if (!army) return [];
    var result = [];
    for (var i = 0; i < this.squads.length; i++) {
      var sq = this.squads[i];
      var cmd = null;
      for (var j = 0; j < army.commanders.length; j++) {
        if (army.commanders[j].id === sq.id) cmd = army.commanders[j];
      }
      if (!cmd) continue;
      cmd.soldiers = sq.soldiers;
      if (sq.soldiers <= 0) cmd.dead = true;
      if (sq.xp && sq.soldiers > 0) {
        cmd.xp = (cmd.xp || 0) + sq.xp;
        if (cmd.xp > cmd.level * 12) {
          cmd.level++;
          cmd.maxSoldiers = Math.min(16, cmd.maxSoldiers + 2);
          cmd.soldiers = Math.min(cmd.maxSoldiers, cmd.soldiers + 2);
        }
      }
      result.push(cmd);
    }
    return result;
  };

  Battle.prototype.counts = function () {
    var c = { soldiers: 0, enemies: 0, ships: 0, houses: 0 };
    for (var i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      if (!e.alive) continue;
      if (e.kind === "soldier") c.soldiers++;
      if (e.kind === "enemy") c.enemies++;
      if (e.kind === "ship") c.ships++;
    }
    for (i = 0; i < this.houses.length; i++) if (this.houses[i].alive) c.houses++;
    return c;
  };

  Battle.prototype.lookAt = function (x, y) {
    x = x | 0; y = y | 0;
    var tile = tileAt(this.island, x, y);
    if (!tile) return "虚空。";
    var def = GS.tileDef(tile.type);
    var lines = [def.name + "。", def.look];
    if (tile.height) lines.push("相对高度 " + tile.height + "。");
    for (var i = 0; i < this.houses.length; i++) {
      var h = this.houses[i];
      if (h.x === x && h.y === y) {
        lines.push(h.name + " — 耐久 " + Math.max(0, h.hp | 0) + "/" + h.maxHp + (h.alive ? "" : "（已焚）") + "。");
      }
    }
    for (i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      if (!e.alive) continue;
      if ((e.x | 0) === x && (e.y | 0) === y) {
        var role = (GS.ROLES[e.role] || {}).name || e.kind;
        lines.push(e.name + "，" + role + "。体力 " + Math.ceil(e.hp) + "/" + e.maxHp + "。");
      }
    }
    for (i = 0; i < this.corpses.length; i++) {
      var k = this.corpses[i];
      if ((k.x | 0) === x && (k.y | 0) === y) lines.push("这里有 " + k.name + " 的尸体。");
    }
    return lines.join("\n");
  };

  Battle.prototype.paintTile = function (x, y, type) {
    if (!this.sandbox) return;
    x = x | 0; y = y | 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.island.tiles[y][x] = GS.mapgen.makeTile(type, GS.tileDef(type).height || 0);
    this._cachePass();
  };

  GS.Battle = Battle;
  GS.makeWaves = makeWaves;
  GS.formationSlots = formationSlots;
})(typeof window !== "undefined" ? window : globalThis);
