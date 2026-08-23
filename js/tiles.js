/* Good South — CP437 / Dwarf Fortress palette + tile catalog */
(function (g) {
  var GS = g.GS || (g.GS = {});

  GS.C = {
    BLACK: "#000000",
    BLUE: "#0000AA",
    GREEN: "#00AA00",
    CYAN: "#00AAAA",
    RED: "#AA0000",
    MAGENTA: "#AA00AA",
    BROWN: "#AA5500",
    LGRAY: "#AAAAAA",
    DGRAY: "#555555",
    LBLUE: "#5555FF",
    LGREEN: "#55FF55",
    LCYAN: "#55FFFF",
    LRED: "#FF5555",
    LMAGENTA: "#FF55FF",
    YELLOW: "#FFFF55",
    WHITE: "#FFFFFF",
  };

  var C = GS.C;

  GS.T = {
    DEEP: 0,
    SHALLOW: 1,
    BEACH: 2,
    GRASS: 3,
    HILL: 4,
    ROCK: 5,
    CLIFF: 6,
    RAMP: 7,
    TREE: 8,
    SHRUB: 9,
    PATH: 10,
    WALL: 11,
    FLOOR: 12,
    MUD: 13,
    SNOW: 14,
    ASH: 15,
    LAVA: 16,
    HOUSE: 17,
    RUIN: 18,
    REEF: 19,
    ICE: 20,
    CROPS: 21,
    BEACON: 22,
  };

  GS.TILE = {};
  GS.TILE[GS.T.DEEP] = {
    id: GS.T.DEEP, ch: "≈", fg: C.BLUE, bg: "#000055", walk: false, ship: true, cost: 9,
    name: "深海", look: "深不可测的冷水。北境长船可以从此驶过。",
  };
  GS.TILE[GS.T.SHALLOW] = {
    id: GS.T.SHALLOW, ch: "~", fg: C.LBLUE, bg: C.BLUE, walk: false, ship: true, cost: 9,
    name: "浅海", look: "清浅的海水拍打岛岸。长船在此减速靠滩。",
  };
  GS.TILE[GS.T.BEACH] = {
    id: GS.T.BEACH, ch: ".", fg: C.YELLOW, bg: C.BROWN, walk: true, ship: false, cost: 1.15, height: 1,
    name: "沙滩", look: "细沙与碎贝。敌人会从这里登陆。",
  };
  GS.TILE[GS.T.GRASS] = {
    id: GS.T.GRASS, ch: ",", fg: C.LGREEN, bg: "#003300", walk: true, cost: 1, height: 2,
    name: "草地", look: "南境的盐风草。脚下很坚实。",
  };
  GS.TILE[GS.T.HILL] = {
    id: GS.T.HILL, ch: "n", fg: C.GREEN, bg: "#254015", walk: true, cost: 1.28, height: 3,
    name: "丘陵", look: "高地。弓手在此射程更远，俯射更狠。",
  };
  GS.TILE[GS.T.ROCK] = {
    id: GS.T.ROCK, ch: "#", fg: C.LGRAY, bg: C.DGRAY, walk: false, cost: 9, height: 3,
    name: "岩石", look: "裸露的灰岩。无法通行。",
  };
  GS.TILE[GS.T.CLIFF] = {
    id: GS.T.CLIFF, ch: "▲", fg: C.WHITE, bg: C.DGRAY, walk: false, cost: 9, height: 4,
    name: "悬崖", look: "陡峭的断崖。阻挡行军与视线。",
  };
  GS.TILE[GS.T.RAMP] = {
    id: GS.T.RAMP, ch: "+", fg: C.BROWN, bg: "#254015", walk: true, cost: 1.35, height: 2, ramp: true,
    name: "斜坡", look: "通往高地的缓坡。",
  };
  GS.TILE[GS.T.TREE] = {
    id: GS.T.TREE, ch: "♣", fg: C.GREEN, bg: "#002200", walk: true, cost: 1.55, height: 2, cover: true, los: true,
    name: "树木", look: "一棵南境乔木。遮蔽视线，略阻步伐。",
  };
  GS.TILE[GS.T.SHRUB] = {
    id: GS.T.SHRUB, ch: "♠", fg: C.LGREEN, bg: "#003300", walk: true, cost: 1.2, height: 2,
    name: "灌木", look: "低矮的灌丛。",
  };
  GS.TILE[GS.T.PATH] = {
    id: GS.T.PATH, ch: ":", fg: C.BROWN, bg: "#3a2a10", walk: true, cost: 0.82, height: 2,
    name: "小径", look: "村民踏出的土路。",
  };
  GS.TILE[GS.T.WALL] = {
    id: GS.T.WALL, ch: "█", fg: C.LGRAY, bg: C.DGRAY, walk: false, cost: 9, height: 3, los: true,
    name: "石墙", look: "旧日石墙。仍可挡箭挡人。",
  };
  GS.TILE[GS.T.FLOOR] = {
    id: GS.T.FLOOR, ch: "+", fg: C.LGRAY, bg: "#222222", walk: true, cost: 0.9, height: 2,
    name: "石地", look: "铺砌过的地面。",
  };
  GS.TILE[GS.T.MUD] = {
    id: GS.T.MUD, ch: "~", fg: C.BROWN, bg: "#3a3a00", walk: true, cost: 1.85, height: 1,
    name: "泥沼", look: "没过脚踝的黑泥。行军极慢。",
  };
  GS.TILE[GS.T.SNOW] = {
    id: GS.T.SNOW, ch: ",", fg: C.WHITE, bg: "#8899aa", walk: true, cost: 1.5, height: 2,
    name: "雪地", look: "薄雪覆盖的地面。脚步会发出咯吱声。",
  };
  GS.TILE[GS.T.ASH] = {
    id: GS.T.ASH, ch: ".", fg: C.DGRAY, bg: "#1a1a1a", walk: true, cost: 1.1, height: 2,
    name: "灰烬", look: "火山灰铺满地面。",
  };
  GS.TILE[GS.T.LAVA] = {
    id: GS.T.LAVA, ch: "≈", fg: C.YELLOW, bg: C.RED, walk: false, cost: 9, height: 0,
    name: "熔岩", look: "灼热的岩流。谁掉进去谁就完了。",
  };
  GS.TILE[GS.T.HOUSE] = {
    id: GS.T.HOUSE, ch: "⌂", fg: C.YELLOW, bg: C.BROWN, walk: true, cost: 1.25, height: 2, house: true,
    name: "屋舍", look: "一座南境民居。必须守住。",
  };
  GS.TILE[GS.T.RUIN] = {
    id: GS.T.RUIN, ch: "░", fg: C.BROWN, bg: C.DGRAY, walk: true, cost: 1.3, height: 2,
    name: "废墟", look: "烧剩的屋基。曾经有人在这里生活。",
  };
  GS.TILE[GS.T.REEF] = {
    id: GS.T.REEF, ch: "≈", fg: C.CYAN, bg: C.BLUE, walk: false, ship: true, cost: 9,
    name: "礁石", look: "暗礁。船只通过会变慢。",
  };
  GS.TILE[GS.T.ICE] = {
    id: GS.T.ICE, ch: "=", fg: C.LCYAN, bg: C.LBLUE, walk: true, cost: 1.05, height: 1,
    name: "冰岸", look: "冻结的滩地。步履不稳。",
  };
  GS.TILE[GS.T.CROPS] = {
    id: GS.T.CROPS, ch: "τ", fg: C.YELLOW, bg: "#2a4a00", walk: true, cost: 1.1, height: 2,
    name: "农田", look: "即将收获的麦田。",
  };
  GS.TILE[GS.T.BEACON] = {
    id: GS.T.BEACON, ch: "¥", fg: C.YELLOW, bg: "#254015", walk: true, cost: 1.05, height: 3, beacon: true,
    name: "烽火台", look: "高处的烽火台。附近的弓手射程与杀伤提升。",
  };

  GS.BIOMES = {
    verdant: { name: "沃野", grass: GS.T.GRASS, extra: GS.T.CROPS, water: GS.T.DEEP, beach: GS.T.BEACH, flavor: "青翠的南境田岛" },
    rocky: { name: "岩礁", grass: GS.T.GRASS, extra: GS.T.ROCK, water: GS.T.DEEP, beach: GS.T.BEACH, flavor: "多崖的灰岩岛" },
    marsh: { name: "泽地", grass: GS.T.MUD, extra: GS.T.SHRUB, water: GS.T.SHALLOW, beach: GS.T.BEACH, flavor: "泥沼与芦苇" },
    snow: { name: "霜岛", grass: GS.T.SNOW, extra: GS.T.ICE, water: GS.T.DEEP, beach: GS.T.ICE, flavor: "终年积雪的北沿小岛" },
    ash: { name: "火山", grass: GS.T.ASH, extra: GS.T.LAVA, water: GS.T.DEEP, beach: GS.T.BEACH, flavor: "焦黑的火山岩岛" },
  };

  GS.ROLES = {
    infantry: {
      id: "infantry", name: "盾兵", ch: "☻", fg: C.LCYAN, commander: "@",
      hp: 30, dmg: 7, range: 1.15, speed: 2.35, cd: 0.52, acc: 0.82,
      desc: "近战步兵。结阵抗打，适合卡路口与海滩。",
    },
    archer: {
      id: "archer", name: "弓手", ch: "}", fg: C.LGREEN, commander: "ÿ",
      hp: 16, dmg: 6.5, range: 6.2, speed: 2.15, cd: 0.88, acc: 0.78,
      desc: "远程。高地与开阔地极强，被贴身则危。",
    },
    pike: {
      id: "pike", name: "枪兵", ch: "↑", fg: C.YELLOW, commander: "↑",
      hp: 24, dmg: 8.5, range: 1.55, speed: 1.85, cd: 0.68, acc: 0.8,
      front: 2.35,
      desc: "正面穿刺。对冲锋的北蛮极痛，侧后则弱。",
    },
    raider: {
      id: "raider", name: "掠袭者", ch: "v", fg: C.LRED, enemy: true,
      hp: 18, dmg: 6, range: 1.1, speed: 2.55, cd: 0.5, acc: 0.75, coins: 0,
    },
    brute: {
      id: "brute", name: "蛮力士", ch: "V", fg: C.RED, enemy: true,
      hp: 42, dmg: 11, range: 1.15, speed: 1.65, cd: 0.78, acc: 0.72,
    },
    thrower: {
      id: "thrower", name: "投斧手", ch: "x", fg: C.LMAGENTA, enemy: true,
      hp: 15, dmg: 5.5, range: 4.2, speed: 2.25, cd: 1.05, acc: 0.7,
    },
    shield: {
      id: "shield", name: "盾墙蛮", ch: "▼", fg: C.BROWN, enemy: true,
      hp: 34, dmg: 5, range: 1.1, speed: 1.95, cd: 0.62, acc: 0.74, resist: 0.32,
    },
    berserk: {
      id: "berserk", name: "狂战士", ch: "‼", fg: C.LRED, enemy: true,
      hp: 20, dmg: 12, range: 1.1, speed: 3.05, cd: 0.38, acc: 0.7,
    },
    jarl: {
      id: "jarl", name: "北境领主", ch: "Ω", fg: C.YELLOW, enemy: true,
      hp: 88, dmg: 15, range: 1.25, speed: 2.05, cd: 0.6, acc: 0.8,
    },
    militia: {
      id: "militia", name: "乡勇", ch: "☺", fg: C.BROWN, commander: "☺",
      hp: 12, dmg: 4.5, range: 1.05, speed: 2.1, cd: 0.55, acc: 0.68,
      desc: "仓促武装的村民。能拖住北蛮片刻。",
    },
  };

  GS.TRAITS = [
    { id: "tough", name: "坚韧", desc: "生命 +22%", on: function (s) { s.maxHp = (s.maxHp * 1.22) | 0; s.hp = s.maxHp; } },
    { id: "swift", name: "迅捷", desc: "移速 +18%", on: function (s) { s.speed *= 1.18; } },
    { id: "eagle", name: "鹰眼", desc: "射程 +1.4（弓手）", on: function (s) { if (s.role === "archer") s.range += 1.4; } },
    { id: "wall", name: "盾墙", desc: "受伤 -18%（盾兵）", on: function (s) { if (s.role === "infantry") s.resist = (s.resist || 0) + 0.18; } },
    { id: "wrath", name: "血怒", desc: "残血时伤害提升", on: function (s) { s.wrath = true; } },
    { id: "veteran", name: "老兵", desc: "命中与伤害 +10%", on: function (s) { s.acc += 0.08; s.dmg *= 1.1; } },
  ];

  GS.DIRS = [
    { id: 0, name: "北", dx: 0, dy: -1, ch: "^" },
    { id: 1, name: "东", dx: 1, dy: 0, ch: ">" },
    { id: 2, name: "南", dx: 0, dy: 1, ch: "v" },
    { id: 3, name: "西", dx: -1, dy: 0, ch: "<" },
  ];

  GS.tileDef = function (id) {
    return GS.TILE[id] || GS.TILE[GS.T.GRASS];
  };
})(typeof window !== "undefined" ? window : globalThis);
