/* Good South — central game balance & content knobs */
(function (g) {
  var GS = g.GS || (g.GS = {});

  GS.CONFIG = {
    version: "3.0.3",
    saveVersion: 4,
    saveKey: "goodsouth-save-v2",
    legacySaveKey: "goodsouth-save",
    settingsKey: "goodsouth-settings",

    campaign: {
      islandCount: 16,
      lengths: { short: 8, south: 16, far: 24 },
      threats: {
        hold: { id: "hold", mul: 0.82, coin: 1, name: "守势" },
        war: { id: "war", mul: 1, coin: 1, name: "正战" },
        blood: { id: "blood", mul: 1.22, coin: 1.25, name: "血潮" },
      },
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
      minW: 118,
      maxW: 152,
      minH: 88,
      maxH: 114,
      seaMargin: 8,
      minLandRatio: 0.11,
      minLandAbs: 520,
      houseBase: 4,
      housePerDifficulty: 0.9,
      houseSpacing: 12,
      sizes: {
        small: { minW: 88, maxW: 104, minH: 66, maxH: 78 },
        medium: { minW: 112, maxW: 132, minH: 84, maxH: 100 },
        large: { minW: 136, maxW: 168, minH: 102, maxH: 126 },
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
      deployHint: "点空地就位。开战后天兵默认追击；弓手默认驻守高地。O 切换号令。",
      deployHintEn: "Place companies on open ground. They hunt after the horn; bows hold their hill. O cycles orders.",
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
      orders: {
        holdMelee: 5.2,
        holdRanged: 1.6,
        guardHouse: 10,
      },
    },

    sandbox: {
      defaultDifficulty: 3,
      defaultBiome: "verdant",
      defaultSize: "large",
      brushes: null,
    },

    ui: {
      palettes: ["df", "green", "amber", "ink"],
      paletteNames: { df: "经典 DF", green: "绿磷", amber: "琥珀", ink: "素纸" },
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
