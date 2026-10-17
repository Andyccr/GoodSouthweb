/* Good South — wave director (extracted from battle sim) */
(function (g) {
  var GS = g.GS || (g.GS = {});

  function rosterFor(difficulty) {
    var roster = ["raider"];
    if (difficulty >= 2) roster.push("thrower");
    if (difficulty >= 3) roster.push("shield", "hound");
    if (difficulty >= 4) roster.push("brute", "sapper");
    if (difficulty >= 5) roster.push("shaman");
    if (difficulty >= 6) roster.push("berserk");
    return roster;
  }

  function makeWaves(island, rng, difficulty, opts) {
    opts = opts || {};
    var mul = opts.mul != null ? opts.mul : 1;
    if (mul < 0.55) mul = 0.55;
    if (mul > 1.8) mul = 1.8;
    var dirs = island.landingDirs && island.landingDirs.length ? island.landingDirs.slice() : [2];
    var waves = [];
    var n = 3 + Math.min(5, difficulty);
    // larger islands: one extra wave
    if (island.w * island.h >= 2400) n += 1;
    var t = 6;
    var roster = rosterFor(difficulty);
    for (var i = 0; i < n; i++) {
      var dir = dirs[i % dirs.length];
      if (rng.chance(0.35)) dir = rng.pick(dirs);
      var count = Math.max(3, Math.round((5 + i * 2 + difficulty + rng.int(0, 3)) * mul));
      if (island.landCount > 400) count += 1 + ((island.landCount - 400) / 220) | 0;
      var units = [];
      for (var k = 0; k < count; k++) {
        var role = "raider";
        if (i > 0) role = rng.pick(roster);
        if (i === n - 1 && k > count - 3 && difficulty >= 3) {
          role = rng.chance(0.5) ? "brute" : role;
        }
        if (difficulty >= 5 && rng.chance(0.08)) role = "shaman";
        if (difficulty >= 3 && rng.chance(0.1)) role = "hound";
        if (difficulty >= 4 && i > 0 && rng.chance(0.14)) role = "sapper";
        units.push(role);
      }
      if (i >= 2 && difficulty >= 5 && units.length) units[units.length - 1] = "sapper";
      if (i === n - 1 && difficulty >= 7) units.push("jarl");

      var wave = {
        id: i,
        t: t,
        dir: dir,
        units: units,
        launched: false,
        extraDir: null,
        extraUnits: null,
      };

      // high threat: split assault from a second landing
      if (difficulty >= 5 && dirs.length > 1 && rng.chance(0.45 + difficulty * 0.04)) {
        var others = dirs.filter(function (d) { return d !== dir; });
        if (others.length) {
          wave.extraDir = rng.pick(others);
          var split = Math.max(2, (units.length / 3) | 0);
          wave.extraUnits = units.splice(units.length - split, split);
        }
      }

      waves.push(wave);
      t += 14 + Math.max(0, 8 - difficulty) + rng.int(0, 5);
    }
    return waves;
  }

  function tickLaunch(waves, time, onLaunch) {
    for (var i = 0; i < waves.length; i++) {
      var w = waves[i];
      if (!w.launched && time >= w.t) {
        w.launched = true;
        if (onLaunch) onLaunch(w, i);
      }
    }
  }

  function remaining(waves) {
    var n = 0;
    for (var i = 0; i < waves.length; i++) if (!waves[i].launched) n++;
    return n;
  }

  function launchedCount(waves) {
    var n = 0;
    for (var i = 0; i < waves.length; i++) if (waves[i].launched) n++;
    return n;
  }

  function nextPending(waves) {
    if (!waves) return null;
    for (var i = 0; i < waves.length; i++) if (!waves[i].launched) return waves[i];
    return null;
  }

  function battleSeed(island) {
    return ((island && island.seed) || 0) ^ 0x9e3779b9;
  }

  var ROLE_ORDER = ["jarl", "sapper", "shaman", "berserk", "brute", "shield", "thrower", "hound", "raider"];

  function tally(list, into) {
    if (!list) return;
    for (var i = 0; i < list.length; i++) into[list[i]] = (into[list[i]] || 0) + 1;
  }

  function blurb(wave) {
    if (!wave) return "";
    var counts = {};
    tally(wave.units, counts);
    tally(wave.extraUnits, counts);
    var parts = [];
    for (var i = 0; i < ROLE_ORDER.length; i++) {
      var n = counts[ROLE_ORDER[i]];
      if (!n) continue;
      var role = GS.ROLES && GS.ROLES[ROLE_ORDER[i]];
      parts.push((role ? role.ch : "?") + n);
    }
    var dir = GS.DIRS && GS.DIRS[wave.dir];
    var head = dir ? (GS.loc ? GS.loc(dir) : dir.name) : "";
    if (wave.extraDir != null && GS.DIRS && GS.DIRS[wave.extraDir]) {
      head += "+" + (GS.loc ? GS.loc(GS.DIRS[wave.extraDir]) : GS.DIRS[wave.extraDir].name);
    }
    if (wave.sneak) head = (GS.t ? GS.t("sneakMark") : "*") + head;
    return (head ? head + " " : "") + parts.join(" ");
  }

  function summarize(waves) {
    var roles = {};
    var total = 0;
    var splits = 0;
    var lines = [];
    waves = waves || [];
    for (var i = 0; i < waves.length; i++) {
      var w = waves[i];
      tally(w.units, roles);
      tally(w.extraUnits, roles);
      total += (w.units ? w.units.length : 0) + (w.extraUnits ? w.extraUnits.length : 0);
      if (w.extraDir != null) splits++;
      lines.push(blurb(w));
    }
    return { waves: waves.length, total: total, roles: roles, splits: splits, lines: lines };
  }

  function forecast(island, mul, omenId) {
    var rng = GS.rng(battleSeed(island));
    var waves = makeWaves(island, rng, (island && island.difficulty) || 1, { mul: mul == null ? 1 : mul });
    if (omenId === "hightide") {
      var dirs = island.landingDirs && island.landingDirs.length ? island.landingDirs : [2];
      waves.push({
        id: waves.length,
        t: 9.5,
        dir: dirs[waves.length % dirs.length],
        units: ["raider", "raider", "hound", "raider"],
        launched: false,
        extraDir: null,
        extraUnits: null,
        sneak: true,
      });
    }
    var sum = summarize(waves);
    sum.advice = advice(sum);
    return sum;
  }

  function advice(sum) {
    var r = (sum && sum.roles) || {};
    if ((r.sapper || 0) >= 3) return "adviceStakes";
    if ((r.jarl || 0) > 0) return "adviceJarl";
    if ((r.thrower || 0) + (r.shaman || 0) >= 6) return "adviceWatch";
    if ((r.brute || 0) + (r.berserk || 0) >= 4) return "adviceShields";
    return "adviceBalanced";
  }

  GS.Waves = {
    make: makeWaves,
    tickLaunch: tickLaunch,
    remaining: remaining,
    launchedCount: launchedCount,
    nextPending: nextPending,
    rosterFor: rosterFor,
    battleSeed: battleSeed,
    blurb: blurb,
    summarize: summarize,
    forecast: forecast,
    advice: advice,
  };

  // backward-compatible alias used by tests / old sim
  GS.makeWaves = makeWaves;
})(typeof window !== "undefined" ? window : globalThis);
