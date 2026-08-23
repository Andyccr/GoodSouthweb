/* Good South — wave director (extracted from battle sim) */
(function (g) {
  var GS = g.GS || (g.GS = {});

  function rosterFor(difficulty) {
    var roster = ["raider"];
    if (difficulty >= 2) roster.push("thrower");
    if (difficulty >= 3) roster.push("shield");
    if (difficulty >= 4) roster.push("brute");
    if (difficulty >= 6) roster.push("berserk");
    return roster;
  }

  function makeWaves(island, rng, difficulty) {
    var dirs = island.landingDirs && island.landingDirs.length ? island.landingDirs.slice() : [2];
    var waves = [];
    var n = 3 + Math.min(5, difficulty);
    var t = 6;
    var roster = rosterFor(difficulty);
    for (var i = 0; i < n; i++) {
      var dir = dirs[i % dirs.length];
      if (rng.chance(0.35)) dir = rng.pick(dirs);
      var count = 5 + i * 2 + difficulty + rng.int(0, 3);
      var units = [];
      for (var k = 0; k < count; k++) {
        var role = "raider";
        if (i > 0) role = rng.pick(roster);
        if (i === n - 1 && k > count - 3 && difficulty >= 3) {
          role = rng.chance(0.5) ? "brute" : role;
        }
        units.push(role);
      }
      if (i === n - 1 && difficulty >= 7) units.push("jarl");
      waves.push({
        id: i,
        t: t,
        dir: dir,
        units: units,
        launched: false,
      });
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

  GS.Waves = {
    make: makeWaves,
    tickLaunch: tickLaunch,
    remaining: remaining,
    launchedCount: launchedCount,
    rosterFor: rosterFor,
  };

  // backward-compatible alias used by tests / old sim
  GS.makeWaves = makeWaves;
})(typeof window !== "undefined" ? window : globalThis);
