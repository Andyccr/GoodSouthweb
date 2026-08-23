/* Good South — central game balance & content knobs */
(function (g) {
  var GS = g.GS || (g.GS = {});

  GS.CONFIG = {
    version: "1.2.0",
    saveVersion: 3,
    saveKey: "goodsouth-save-v2",
    legacySaveKey: "goodsouth-save",
    settingsKey: "goodsouth-settings",

    campaign: {
      islandCount: 12,
      startCoins: 10,
      recruitHealOnVictory: 2,
      coinPerHouse: 1,
    },

    hire: {
      infantry: { cost: 6, soldiers: 10, maxBonus: 2, name: "盾兵" },
      archer: { cost: 8, soldiers: 8, maxBonus: 2, name: "弓手" },
      pike: { cost: 7, soldiers: 9, maxBonus: 2, name: "枪兵" },
    },

    battle: {
      moveCooldown: 3.2,
      deployHint: "布置兵团，面朝黄闪登陆点。",
      maxSpeed: 3,
      hudIntervalMs: 120,
    },

    sandbox: {
      defaultDifficulty: 3,
      defaultBiome: "verdant",
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
    ];
  };
})(typeof window !== "undefined" ? window : globalThis);
