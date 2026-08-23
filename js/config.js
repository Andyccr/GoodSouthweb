/* Good South — central game balance & content knobs */
(function (g) {
  var GS = g.GS || (g.GS = {});

  GS.CONFIG = {
    version: "1.3.0",
    saveVersion: 3,
    saveKey: "goodsouth-save-v2",
    legacySaveKey: "goodsouth-save",
    settingsKey: "goodsouth-settings",

    campaign: {
      islandCount: 14,
      startCoins: 10,
      recruitHealOnVictory: 2,
      coinPerHouse: 1,
      chartW: 88,
      chartH: 48,
    },

    map: {
      // battle islands (tile counts); scales up with difficulty
      minW: 46,
      maxW: 68,
      minH: 34,
      maxH: 52,
      minLandRatio: 0.075,
      minLandAbs: 90,
      houseBase: 3,
      housePerDifficulty: 0.85,
      houseSpacing: 16,
      sizes: {
        small: { minW: 36, maxW: 44, minH: 28, maxH: 34 },
        medium: { minW: 48, maxW: 58, minH: 36, maxH: 44 },
        large: { minW: 58, maxW: 72, minH: 42, maxH: 54 },
      },
    },

    hire: {
      infantry: { cost: 6, soldiers: 10, maxBonus: 2, name: "盾兵" },
      archer: { cost: 8, soldiers: 8, maxBonus: 2, name: "弓手" },
      pike: { cost: 7, soldiers: 9, maxBonus: 2, name: "枪兵" },
    },

    battle: {
      moveCooldown: 3.2,
      deployHint: "布置兵团，面朝黄闪登陆点。号角 U 可振奋一次。",
      maxSpeed: 3,
      hudIntervalMs: 120,
      warhornDuration: 6.5,
      warhornSlow: 0.42,
      militiaPerHouse: 2,
      beaconRangeBonus: 1.6,
      beaconDmgBonus: 1.18,
      beaconRadius: 4,
      pathRefresh: 0.55,
    },

    sandbox: {
      defaultDifficulty: 3,
      defaultBiome: "verdant",
      defaultSize: "medium",
      brushes: null,
    },

    ui: {
      palettes: ["df", "green", "amber"],
      paletteNames: { df: "经典 DF", green: "绿磷", amber: "琥珀" },
    },
  };

  GS.configBrushes = function () {
    if (!GS.T) return [];
    return [
      GS.T.GRASS, GS.T.BEACH, GS.T.HILL, GS.T.TREE, GS.T.WALL,
      GS.T.HOUSE, GS.T.SHALLOW, GS.T.ROCK, GS.T.CLIFF, GS.T.PATH, GS.T.MUD,
      GS.T.BEACON,
    ];
  };
})(typeof window !== "undefined" ? window : globalThis);
