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
ok(GS.CONFIG.saveVersion >= 2, "save schema v2");
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

console.log("Army / Campaign / Save");
var rng = GS.rng(99);
var army = GS.Army.create(rng);
ok(army.commanders.length === 3 && army.coins === 10, "starter army");
army.coins = 0;
var hireFail = GS.Army.hire(army, rng, "archer");
ok(hireFail.ok === false && hireFail.reason === "coins", "cannot hire without coins");
army.coins = 20;
var hireOk = GS.Army.hire(army, rng, "pike");
ok(hireOk.ok && army.commanders.length === 4, "hire pike");
ok(GS.Army.living(army).length === 4, "living commanders");

var camp = GS.Campaign.create(2026, 12);
ok(camp.islands.length >= 8, "campaign islands");
ok(camp.islands[0].status === "scouted", "start scouted");
GS.Campaign.markCleared(camp, 0);
ok(camp.islands[0].status === "cleared", "mark cleared");
ok(camp.islands[0].edges.some(function (id) { return camp.islands[id].status === "scouted"; }), "neighbors revealed");

ok(GS.Save.write(army, camp), "save write");
ok(GS.Save.has(), "save has");
var loaded = GS.Save.read();
ok(loaded && loaded.army.coins === army.coins && loaded.campaign.islands[0].status === "cleared", "save roundtrip");

// legacy migrate
store["goodsouth-save"] = JSON.stringify({ army: army, campaign: camp });
delete store[GS.CONFIG.saveKey];
var legacy = GS.Save.read();
ok(legacy && legacy.army.commanders.length === army.commanders.length, "legacy save migrate");

console.log("Waves");
var isle0 = GS.mapgen.island(7, { difficulty: 4 });
var waves = GS.Waves.make(isle0, GS.rng(3), 4);
ok(waves.length >= 3 && waves[0].units.length >= 4, "waves generated via Waves module");
ok(typeof GS.makeWaves === "function", "makeWaves alias");

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
ok(connected(GS.Campaign.create(2026, 12)), "campaign graph connected");

console.log("Formation / Battle smoke");
var slots = GS.formationSlots(10, 10, 0, 8, "infantry");
ok(slots.length === 8, "8 formation slots");
var island = GS.mapgen.island(1001, { difficulty: 2, biome: "verdant" });
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
ok(battle.entities.filter(function (e) { return e.kind === "soldier" && e.alive; }).length === 10, "10 soldiers born");
battle.startFight();
battle.spawnEnemy("raider", island.houses[0].x, island.houses[0].y);
for (var t = 0; t < 400; t++) battle.tick(0.05);
var still = battle.entities.filter(function (e) { return e.alive && (e.kind === "soldier" || e.kind === "enemy"); }).length;
ok(still >= 1, "simulation ran without wiping everyone instantly, living=" + still);
ok(battle.t > 5, "time advanced " + battle.t.toFixed(2));

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
