/* Good South — central game balance & content knobs */
(function (g) {
  var GS = g.GS || (g.GS = {});

  GS.CONFIG = {
    version: "2.2.1",
    saveVersion: 4,
    saveKey: "goodsouth-save-v2",
    legacySaveKey: "goodsouth-save",
    settingsKey: "goodsouth-settings",

    campaign: {
      islandCount: 16,
      startCoins: 12,
      recruitHealOnVictory: "full",
      coinPerHouse: 1,
      chartW: 88,
      chartH: 48,
      starter: ["infantry", "infantry", "archer", "pike"],
      zoomMin: 14,
      zoomMax: 40,
      zoomDefault: 22,
      zoomMobile: 28,
      pickRadius: 4,
      openRadius: 2.6,
      camSpeed: 22,
      camShift: 40,
      edgePan: 22,
    },

    map: {
      // battle islands (tile counts); a thick sea ring is forced around land
      minW: 80,
      maxW: 108,
      minH: 60,
      maxH: 84,
      seaMargin: 7,
      minLandRatio: 0.10,
      minLandAbs: 220,
      houseBase: 4,
      housePerDifficulty: 0.9,
      houseSpacing: 22,
      sizes: {
        small: { minW: 64, maxW: 76, minH: 48, maxH: 58 },
        medium: { minW: 80, maxW: 96, minH: 60, maxH: 74 },
        large: { minW: 100, maxW: 124, minH: 74, maxH: 92 },
      },
    },

    hire: {
      infantry: { cost: 6, soldiers: 10, maxBonus: 2, name: "盾兵" },
      archer: { cost: 8, soldiers: 8, maxBonus: 2, name: "弓手" },
      pike: { cost: 7, soldiers: 9, maxBonus: 2, name: "枪兵" },
      skirmisher: { cost: 7, soldiers: 8, maxBonus: 2, name: "投矛手" },
    },

    battle: {
      moveCooldown: 3.2,
      deployHint: "点一下空地放下兵团即可。开战后天兵会自己找北蛮打。",
      maxSpeed: 3,
      hudIntervalMs: 120,
      zoomMin: 10,
      zoomMax: 28,
      zoomDefault: 16,
      zoomMobile: 18,
      camSpeed: 22,
      camShift: 40,
      panThreshold: 10,
      panThresholdTouch: 16,
      edgePan: 22,
      warhornDuration: 6.5,
      warhornSlow: 0.42,
      militiaPerHouse: 2,
      beaconRangeBonus: 1.6,
      beaconDmgBonus: 1.18,
      beaconRadius: 4,
      pathRefresh: 0.55,
      hunt: {
        distMelee: 0.18,
        distArcher: 0.08,
        pile: 4,
        house: 24,
        alarm: 10,
        wounded: 5,
        ship: 6,
        jarl: 16,
        brute: 4,
        finish: 3,
        cohesion: 8,
        sticky: 4,
        siege: 10,
        local: 2.15,
      },
    },

    sandbox: {
      defaultDifficulty: 3,
      defaultBiome: "verdant",
      defaultSize: "large",
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
