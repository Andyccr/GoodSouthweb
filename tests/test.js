/* Node tests for Good South core: RNG, mapgen, path, combat */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var context = { console: console, Math: Math, setTimeout: setTimeout, Uint8Array: Uint8Array };
context.globalThis = context;
context.window = context;
vm.createContext(context);

["rng.js", "tiles.js", "names.js", "pathfind.js", "mapgen.js", "sim.js"].forEach(function (f) {
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

console.log("Mapgen islands");
var fps = {};
for (var seed = 1; seed <= 24; seed++) {
  var isle = GS.mapgen.island(seed, { difficulty: 1 + (seed % 6) });
  ok(!!isle, "island seed " + seed + " generated");
  if (!isle) continue;
  ok(isle.houses.length >= 2, seed + " houses " + isle.houses.length);
  ok(isle.landings.length >= 1, seed + " landings " + isle.landings.length);
  ok(isle.w >= 20 && isle.h >= 16, seed + " size " + isle.w + "x" + isle.h);
  var pass = function (x, y) { return isle.tiles[y][x].walk; };
  var cfn = function (x, y) { return isle.tiles[y][x].cost; };
  var reachable = 0;
  for (var hi = 0; hi < isle.houses.length; hi++) {
    for (var li = 0; li < Math.min(isle.landings.length, 12); li++) {
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
ok(unique >= 20, "diverse maps: " + unique + " unique fingerprints / 24");

console.log("Campaign");
var camp = GS.mapgen.campaign(2026, 12);
ok(camp.islands.length >= 8, "campaign island count " + camp.islands.length);
ok(camp.islands[0].status === "scouted", "start scouted");
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
ok(connected(camp), "campaign graph connected");

console.log("Formation / waves");
var slots = GS.formationSlots(10, 10, 0, 8, "infantry");
ok(slots.length === 8, "8 formation slots");
var waves = GS.makeWaves({ landingDirs: [0, 2], difficulty: 4 }, GS.rng(7), 4);
ok(waves.length >= 3 && waves[0].units.length >= 4, "waves generated");

console.log("Battle smoke");
var island = GS.mapgen.island(1001, { difficulty: 2, biome: "verdant" });
var army = {
  coins: 10,
  commanders: [{
    id: "c1", name: "测试·盾噬", cls: "infantry", level: 1, xp: 0,
    soldiers: 10, maxSoldiers: 12, trait: "tough", dead: false,
  }],
};
var battle = new GS.Battle(island, army, { battleSeed: 9, sandbox: true });
var land = island.landings[0] || { x: island.houses[0].x, y: island.houses[0].y };
var placed = false;
for (var y = 0; y < island.h && !placed; y++) {
  for (var x = 0; x < island.w && !placed; x++) {
    if (island.tiles[y][x].walk && island.tiles[y][x].type !== GS.T.HOUSE) {
      placed = battle.placeSquad("c1", x, y, 2);
    }
  }
}
ok(placed, "placed infantry squad");
ok(battle.entities.filter(function (e) { return e.kind === "soldier" && e.alive; }).length === 10, "10 soldiers born");
battle.startFight();
battle.spawnEnemy("raider", island.houses[0].x, island.houses[0].y);
for (var t = 0; t < 400; t++) battle.tick(0.05);
var still = battle.entities.filter(function (e) { return e.alive && (e.kind === "soldier" || e.kind === "enemy"); }).length;
ok(still >= 1, "simulation ran without wiping everyone instantly, living=" + still);
ok(battle.t > 5, "time advanced " + battle.t.toFixed(2));

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
