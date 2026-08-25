/* Node tests: core systems + architecture domains + map/combat smoke */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var store = {};
var context = {
  console: console,
  Math: Math,
  setTimeout: setTimeout,
  Uint8Array: Uint8Array,
  localStorage: {
    getItem: function (k) { return store[k] || null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
  },
  performance: { now: function () { return Date.now(); } },
};
context.globalThis = context;
context.window = context;
vm.createContext(context);

var files = [
  "events.js", "config.js", "util.js", "rng.js",
  "tiles.js", "names.js", "pathfind.js", "mapgen.js",
  "army.js", "campaign.js", "save.js", "waves.js", "sim.js",
];
files.forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(root, "js", f), "utf8"), context, { filename: f });
});

var GS = context.GS;
var failed = 0;
var passed = 0;

function ok(cond, msg) {
  if (cond) {
    passed++;
    console.log("  ok  " + msg);
  } else {
    failed++;
    console.log("  FAIL  " + msg);
  }
}

console.log("Events");
var hit = 0;
GS.bus.on("test:ping", function (p) { hit += p.n; });
GS.bus.emit("test:ping", { n: 2 });
GS.bus.emit("test:ping", { n: 3 });
ok(hit === 5, "event bus accumulates");

console.log("Config / Util");
ok(GS.CONFIG.saveVersion >= 3, "save schema v3+");
ok(GS.util.clamp(5, 0, 3) === 3, "clamp");
ok(GS.util.escapeHtml("<a>") === "&lt;a&gt;", "escapeHtml");

console.log("RNG");
var a = GS.rng(42);
var b = GS.rng(42);
ok(a.next() === b.next(), "same seed yields same stream");
ok(GS.hashStr("south") === GS.hashStr("south"), "string hash stable");
ok(GS.hashStr("south") !== GS.hashStr("north"), "different strings hash differently");

console.log("Noise");
var n1 = GS.fbm(3.2, 4.1, 99, 4);
var n2 = GS.fbm(3.2, 4.1, 99, 4);
ok(n1 === n2 && n1 >= 0 && n1 <= 1, "fbm deterministic and in range");

console.log("Pathfinding");
function open(x, y) {
  return x >= 0 && y >= 0 && x < 8 && y < 8;
}
function cost() { return 1; }
var p = GS.path.astar(open, cost, 8, 8, 0, 0, 7, 0, { diag: false });
ok(p && p.length === 8, "astar horizontal length 8, got " + (p && p.length));
ok(GS.path.los(function () { return false; }, 0, 0, 5, 3), "open LOS");
ok(!GS.path.los(function (x, y) { return x === 2 && y === 1; }, 0, 0, 4, 2), "blocked LOS");
var ff = GS.path.flowField(open, cost, 8, 8, [{ x: 7, y: 7 }]);
ok(ff && ff.dist[0] < 1e8, "flow field from corner");
var step = GS.path.flowStep(ff, 0, 0);
ok(step && (step.x > 0 || step.y > 0), "flow step moves toward goal");
function cornerPass(x, y) {
  if (x < 0 || y < 0 || x > 2 || y > 2) return false;
  if ((x === 1 && y === 0) || (x === 0 && y === 1)) return false;
  return true;
}
ok(!GS.path.astar(cornerPass, cost, 3, 3, 0, 0, 1, 1, { diag: true, snap: false }), "astar does not cut blocked corners");
function openInner(x, y) { return x >= 1 && y >= 1 && x < 8 && y < 8; }
var snapped = GS.path.astar(openInner, cost, 8, 8, 0, 0, 7, 7, { diag: true });
ok(snapped && snapped.length >= 2, "astar snaps blocked start/goal");
ok(GS.path.snap(openInner, 8, 8, 0, 0, 4) && GS.path.snap(openInner, 8, 8, 0, 0, 4).x === 1, "snap finds nearest walkable");

console.log("Army / Campaign / Save");
var rng = GS.rng(99);
var army = GS.Army.create(rng);
ok(army.commanders.length === 4 && army.coins === 10, "starter army");
ok(army.commanders.filter(function (c) { return c.cls === "pike"; }).length === 1, "starter includes pike");
army.coins = 0;
var hireFail = GS.Army.hire(army, rng, "archer");
ok(hireFail.ok === false && hireFail.reason === "coins", "cannot hire without coins");
army.coins = 20;
var hireOk = GS.Army.hire(army, rng, "pike");
ok(hireOk.ok && army.commanders.length === 5, "hire pike");
ok(GS.Army.living(army).length === 5, "living commanders");

var camp = GS.Campaign.create(2026, 14);
ok(camp.islands.length >= 10, "campaign islands");
ok(camp.w >= 80 && camp.h >= 44, "larger campaign chart " + camp.w + "x" + camp.h);
ok(camp.islands[0].status === "scouted", "start scouted");
GS.Campaign.markCleared(camp, 0);
ok(camp.islands[0].status === "cleared", "mark cleared");
ok(camp.islands[0].edges.some(function (id) { return camp.islands[id].status === "scouted"; }), "neighbors revealed");

ok(GS.Save.writeSlot("1", army, camp, { label: "test" }), "save slot 1");
ok(GS.Save.writeSlot("auto", army, camp, { label: "auto" }), "save auto");
ok(GS.Save.hasAny(), "save hasAny");
var loaded = GS.Save.readSlot("1");
ok(loaded && loaded.army.coins === army.coins && loaded.campaign.islands[0].status === "cleared", "slot 1 roundtrip");
var listed = GS.Save.listSlots();
ok(listed.length === 4 && listed.some(function (s) { return s.slot === "1" && !s.empty; }), "listSlots");
var latest = GS.Save.latest();
ok(latest && latest.summary && latest.summary.cleared >= 1, "latest summary");

GS.Save.saveSettings({ palette: "amber", muted: true });
var st = GS.Save.loadSettings();
ok(st.palette === "amber" && st.muted === true, "settings persist");

// legacy migrate
store["goodsouth-save"] = JSON.stringify({ army: army, campaign: camp });
delete store[GS.CONFIG.saveKey];
delete store[GS.CONFIG.saveKey + ":slot:auto"];
var legacy = GS.Save.readSlot("auto");
ok(legacy && legacy.army.commanders.length === army.commanders.length, "legacy save migrate");

console.log("Waves");
var isle0 = GS.mapgen.island(7, { difficulty: 4 });
var waves = GS.Waves.make(isle0, GS.rng(3), 4);
ok(waves.length >= 3 && waves[0].units.length >= 4, "waves generated via Waves module");
ok(typeof GS.makeWaves === "function", "makeWaves alias");

console.log("Mapgen islands");
var fps = {};
for (var seed = 1; seed <= 20; seed++) {
  var isle = GS.mapgen.island(seed, { difficulty: 1 + (seed % 6) });
  ok(!!isle, "island seed " + seed + " generated");
  if (!isle) continue;
  ok(isle.houses.length >= 2, seed + " houses " + isle.houses.length);
  ok(isle.landings.length >= 1, seed + " landings " + isle.landings.length);
  ok(!!isle.shape, seed + " has island shape " + isle.shape);
  ok(isle.landingDirs.length >= 1, seed + " landing dirs " + isle.landingDirs.length);
  ok(isle.w >= 60 && isle.h >= 44, seed + " expanded size " + isle.w + "x" + isle.h);
  var seaEdge = isle.tiles[0][isle.w >> 1].ship && isle.tiles[isle.h - 1][isle.w >> 1].ship;
  ok(seaEdge, seed + " map edge is sea");
  var pass = function (x, y) { return isle.tiles[y][x].walk; };
  var cfn = function (x, y) { return isle.tiles[y][x].cost; };
  var reachable = 0;
  for (var hi = 0; hi < isle.houses.length; hi++) {
    for (var li = 0; li < Math.min(isle.landings.length, 16); li++) {
      var path = GS.path.astar(pass, cfn, isle.w, isle.h, isle.landings[li].x, isle.landings[li].y, isle.houses[hi].x, isle.houses[hi].y, { diag: true });
      if (path) { reachable++; break; }
    }
  }
  ok(reachable === isle.houses.length, seed + " all houses reachable from a landing (" + reachable + "/" + isle.houses.length + ")");
  var fp = GS.mapgen.fingerprint(isle);
  var again = GS.mapgen.island(seed, { difficulty: 1 + (seed % 6) });
  ok(fp === GS.mapgen.fingerprint(again), seed + " deterministic fingerprint");
  fps[fp] = (fps[fp] || 0) + 1;
}
var unique = Object.keys(fps).length;
ok(unique >= 16, "diverse maps: " + unique + " unique fingerprints / 20");

var big = GS.mapgen.island(4242, { difficulty: 5, size: "large" });
ok(big && big.w >= 90 && big.h >= 70, "large preset " + (big && big.w) + "x" + (big && big.h));
ok(GS.T.BEACON != null && GS.ROLES.militia, "beacon tile + militia role");

console.log("Campaign graph");
function connected(camp) {
  var seen = {};
  var q = [0];
  seen[0] = 1;
  while (q.length) {
    var id = q.pop();
    camp.islands[id].edges.forEach(function (e) {
      if (!seen[e]) { seen[e] = 1; q.push(e); }
    });
  }
  return Object.keys(seen).length === camp.islands.length;
}
ok(connected(GS.Campaign.create(2026, 14)), "campaign graph connected");

console.log("Formation / Battle smoke");
var slots = GS.formationSlots(10, 10, 0, 8, "infantry");
ok(slots.length === 8, "8 formation slots");
var island = GS.mapgen.island(1001, { difficulty: 2, biome: "verdant", size: "small" });
var army2 = GS.Army.create(GS.rng(1));
army2.commanders = [{
  id: "c1", name: "测试·盾噬", cls: "infantry", level: 1, xp: 0,
  soldiers: 10, maxSoldiers: 12, trait: "tough", dead: false,
}];
var over = null;
GS.bus.on(GS.EV.BATTLE_OVER, function (p) { over = p.outcome; });
var battle = new GS.Battle(island, army2, { battleSeed: 9, sandbox: true });
var placed = false;
for (var y = 0; y < island.h && !placed; y++) {
  for (var x = 0; x < island.w && !placed; x++) {
    if (island.tiles[y][x].walk && island.tiles[y][x].type !== GS.T.HOUSE) {
      placed = battle.placeSquad("c1", x, y, 2);
    }
  }
}
ok(placed, "placed infantry squad");
ok(battle.squads[0].facing === 2, "placed facing stored on squad");
battle.rotateSquad("c1");
ok(battle.squads[0].facing === 3, "rotate facing updates squad");
battle.rotateSquad("c1", 2);
ok(battle.placeSquad("c1", battle.squads[0].tx, battle.squads[0].ty) === true, "re-place same tile is no-op");
ok(GS.Army.create(GS.rng(8)).commanders.length === 4, "default army still 4 after custom battle army");
var bFour = new GS.Battle(island, GS.Army.create(GS.rng(8)), { sandbox: true });
ok(bFour.squads.length === 4, "battle defaults to 4 squads");
ok(battle.entities.filter(function (e) { return e.kind === "soldier" && e.alive; }).length === 10, "10 soldiers born");
ok(battle._livingSoldiers.length === 10, "living cache refresh after deploy place");
var anySol = battle.entities.filter(function (e) { return e.kind === "soldier" && e.alive; })[0];
ok(anySol && battle.squadAt(anySol.x, anySol.y) === "c1", "squadAt finds living soldier");
battle.startFight();
ok(battle.flow, "flow field built on fight start");
ok(battle.blowWarhorn() === true && battle.warhornReady === false, "warhorn once");
ok(battle.blowWarhorn() === false, "warhorn spent");

var dir0 = island.landingDirs[0];
var ship = battle.spawnShip(dir0, ["raider", "raider"]);
ok(!!ship, "spawned longship");
var st = island.tiles[ship.y | 0][ship.x | 0];
ok(st && st.ship, "ship spawns on water, tile ship=" + (st && st.ship) + " type=" + (st && st.type));
ok((ship.x | 0) !== ship.beachX || (ship.y | 0) !== ship.beachY, "ship not already on beach");
for (var sail = 0; sail < 1200 && ship.alive && !ship.landing; sail++) battle.tick(0.05);
ok(ship.landing || !ship.alive, "ship reached the beach (landing=" + ship.landing + " alive=" + ship.alive + " t=" + battle.t.toFixed(1) + ")");
for (var unload = 0; unload < 80 && ship.alive; unload++) battle.tick(0.05);
var landed = battle.entities.filter(function (e) { return e.kind === "enemy"; }).length;
ok(landed >= 1, "raiders left the ship, landed=" + landed);

battle.spawnEnemy("raider", island.houses[0].x, island.houses[0].y);
for (var t = 0; t < 400; t++) battle.tick(0.05);
var still = battle.entities.filter(function (e) { return e.alive && (e.kind === "soldier" || e.kind === "enemy"); }).length;
ok(still >= 1, "simulation ran without wiping everyone instantly, living=" + still);
ok(battle.t > 5, "time advanced " + battle.t.toFixed(2));

// militia spawn on house attack
var island2 = GS.mapgen.island(77, { difficulty: 2, size: "small", houses: 3 });
var armyM = GS.Army.create(GS.rng(2));
var b2 = new GS.Battle(island2, armyM, { sandbox: true, battleSeed: 3 });
b2.startFight();
var h0 = b2.houses[0];
b2.spawnMilitia(h0);
ok(h0.militiaSpawned && b2.entities.some(function (e) { return e.militia && e.alive; }), "militia spawn");

console.log("Autonomous hunt");
var islandH = GS.mapgen.island(88, { difficulty: 2, size: "small", biome: "verdant" });
var armyH = GS.Army.create(GS.rng(4));
armyH.commanders = [{
  id: "hunt1", name: "测试·追击", cls: "infantry", level: 1, xp: 0,
  soldiers: 8, maxSoldiers: 10, trait: null, dead: false,
}];
var bh = new GS.Battle(islandH, armyH, { sandbox: true, battleSeed: 11 });
var hx = islandH.houses[0].x, hy = islandH.houses[0].y;
var placedH = false;
var bestPlace = null, bestPlaceD = 1e9;
for (var yy = 0; yy < islandH.h; yy++) {
  for (var xx = 0; xx < islandH.w; xx++) {
    var tcell = islandH.tiles[yy][xx];
    if (!tcell.walk || tcell.type === GS.T.HOUSE) continue;
    var ddx = xx - hx, ddy = yy - hy;
    var dd = ddx * ddx + ddy * ddy;
    if (dd < 4 || dd > 36) continue;
    if (dd < bestPlaceD) {
      bestPlaceD = dd;
      bestPlace = { x: xx, y: yy };
    }
  }
}
if (bestPlace) placedH = bh.placeSquad("hunt1", bestPlace.x, bestPlace.y, 2);
ok(placedH, "hunt squad placed inland near a house");
bh.startFight();
var farEnemy = null;
var farD = -1;
var sqx = bh.squads[0].tx, sqy = bh.squads[0].ty;
for (var li = 0; li < islandH.landings.length; li++) {
  var L = islandH.landings[li];
  if (!islandH.tiles[L.y][L.x].walk) continue;
  var ldx = L.x - sqx, ldy = L.y - sqy;
  var ld = ldx * ldx + ldy * ldy;
  if (ld > farD) {
    farD = ld;
    farEnemy = L;
  }
}
ok(!!farEnemy && farD > 36, "found a distant landing for the raider, d2=" + farD);
farEnemy = bh.spawnEnemy("raider", farEnemy.x, farEnemy.y);
ok(!!farEnemy, "spawned a distant raider");
bh._rebuildHuntFlow();
ok(bh.huntFlow && bh.huntFlow.dist, "hunt flow field toward living threats");
function avgDistTo(battle, target) {
  var s = 0, n = 0;
  for (var i = 0; i < battle.entities.length; i++) {
    var e = battle.entities[i];
    if (e.alive && e.kind === "soldier" && e.squadId) {
      var dx = e.x - target.x, dy = e.y - target.y;
      s += Math.sqrt(dx * dx + dy * dy);
      n++;
    }
  }
  return n ? s / n : 0;
}
var d0 = avgDistTo(bh, farEnemy);
ok(d0 > 5, "raiders start far from the squad (d0=" + d0.toFixed(1) + ")");
for (var ht = 0; ht < 160; ht++) bh.tick(0.05);
var d1 = avgDistTo(bh, farEnemy);
ok(!farEnemy.alive || d1 < d0 - 1.5, "soldiers leave home stance to hunt (d0=" + d0.toFixed(1) + " d1=" + d1.toFixed(1) + " alive=" + farEnemy.alive + ")");

var nearE = { x: hx + 0.5, y: hy + 0.5, alive: true, id: 1, hp: 18, maxHp: 18, role: "raider", kind: "enemy", dmg: 6, speed: 2.5 };
var farE = { x: 1.5, y: 1.5, alive: true, id: 2, hp: 18, maxHp: 18, role: "raider", kind: "enemy", dmg: 6, speed: 2.5 };
var sol = bh.entities.filter(function (e) { return e.kind === "soldier" && e.alive; })[0];
ok(sol && bh.huntScore(sol, nearE, 0) > bh.huntScore(sol, farE, 0), "house-threat outweighs a far idle raider");
ok(bh.huntScore(sol, nearE, 6) < bh.huntScore(sol, nearE, 0), "pile-on penalty spreads assignments");

console.log("Battle serialize");
var snap = GS.Battle.serialize(battle);
ok(snap && snap.island && snap.entities.length >= 1, "serialize battle");
ok(snap.warhornReady === false, "serialize warhorn state");
var army3 = GS.Army.deserialize(GS.Army.serialize(army2));
var restored = GS.Battle.deserialize(snap, army3);
ok(restored && restored.entities.filter(function (e) { return e.alive; }).length >= 1, "deserialize battle living");
ok(restored.island.name === island.name, "deserialize keeps island name");
ok(restored.warhornReady === false, "deserialize warhorn spent");
ok(restored.flow || restored.phase !== "fight", "deserialize rebuilds flow when fighting");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
