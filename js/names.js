/* Good South — dwarf-hold & northman name lists (zh + en pairs) */
(function (g) {
  var GS = g.GS || (g.GS = {});

  var DWARF_FIRST = [
    "乌瑞斯特", "托里克", "科勒", "利塔斯特", "多玛斯", "提库特", "扎西特", "梅布祖斯",
    "斯塔库德", "菲科德", "拉库斯特", "杜梅德", "阿提斯", "西洛布", "奥努尔", "瑞斯",
    "基维什", "尼什", "洛格姆", "埃德姆", "戈登", "阿斯梅尔", "图恩", "萨齐尔",
    "索布", "洛尔", "杜西姆", "梅尔比尔", "里戈斯", "瓦博克", "贝伦", "杜林",
    "诺里", "格罗因", "巴林", "奥因", "比芙尔", "邦布尔", "多利", "奥利",
  ];
  var DWARF_FIRST_EN = [
    "Urist", "Tolik", "Kole", "Litast", "Domas", "Tikud", "Zasit", "Mebzuth",
    "Stakud", "Fikod", "Rakust", "Dumed", "Atis", "Sibrek", "Onul", "Rith",
    "Kivish", "Nish", "Logem", "Edem", "Goden", "Asmel", "Tun", "Sarvesh",
    "Sodel", "Lor", "Ducim", "Melbil", "Rigoth", "Vabok", "Beren", "Durin",
    "Nori", "Gloin", "Balin", "Oin", "Bifur", "Bofur", "Dori", "Ori",
  ];
  var DWARF_LAST = [
    "盾噬", "斧落", "石炉", "深掘", "橡盾", "鸦须", "铁拳", "金厅",
    "麦酒", "岩歌", "炉心", "铜须", "墓卫", "盐须", "锚铸", "蜂须",
    "崖行", "浪劈", "南灯", "粮仓", "雾锤", "贝壳", "潮炉", "礁垒",
  ];
  var DWARF_LAST_EN = [
    "Shieldbite", "Axefall", "Stonehearth", "Deepdelve", "Oakshield", "Crowbeard", "Ironfist", "Goldhall",
    "Ale", "Rocksong", "Forgeheart", "Copperbeard", "Tombward", "Saltbeard", "Anchorcast", "Beebeard",
    "Cragwalk", "Wavesplit", "Southlamp", "Granary", "Foghammer", "Shell", "Tideforge", "Reefhold",
  ];
  var ISLAND_A = [
    "荆棘", "鸥鸣", "雾湾", "羊齿", "麦河", "燧石", "寡妇", "南灯",
    "盐风", "蜂巢", "鸦礁", "羊岬", "牡蛎", "芦花", "灯塔", "锚地",
    "琥珀", "青苔", "狼溪", "龟背", "麦秆", "青铜", "白帆", "沉钟",
    "旱麦", "潮声", "砾石", "蜂蜡", "蕨影", "酒窖",
  ];
  var ISLAND_A_EN = [
    "Thorn", "Gull", "Fog", "Fern", "Wheat", "Flint", "Widow", "Southlamp",
    "Saltwind", "Hive", "Crow", "Ram", "Oyster", "Reed", "Beacon", "Anchor",
    "Amber", "Moss", "Wolf", "Turtle", "Straw", "Bronze", "Whitesail", "Bell",
    "Drywheat", "Tide", "Shingle", "Wax", "Fernshade", "Cellar",
  ];
  var ISLAND_B = [
    "岛", "屿", "礁", "滩", "岬", "湾", "矶", "洲", "角", "堡", "寨", "丘",
  ];
  var ISLAND_B_EN = [
    "Isle", "Holm", "Skerry", "Strand", "Ness", "Bay", "Crag", "Cay", "Point", "Keep", "Hold", "Knoll",
  ];
  var HOUSE_A = [
    "麦仓", "盐屋", "渔棚", "蜂房", "织坊", "铜铺", "酒窖", "羊圈",
    "灯塔小屋", "船长旧宅", "磨坊", "熏鱼房", "草药棚", "铁砧屋",
  ];
  var HOUSE_A_EN = [
    "Wheat-barn", "Salt-house", "Fish-shed", "Bee-loft", "Weavers", "Copper-shop", "Cellar", "Sheepfold",
    "Lamp cottage", "Old captain's", "Mill", "Smokehouse", "Herb-shed", "Anvil house",
  ];
  var NORTH_FIRST = [
    "拉格纳", "伊瓦尔", "比约恩", "哈夫丹", "西格德", "乌尔夫", "哈拉尔", "埃里克",
    "古德伦", "斯文", "克努特", "奥拉夫", "托尔芬", "英格瓦", "维德孔", "贡纳尔",
  ];
  var NORTH_FIRST_EN = [
    "Ragnar", "Ivar", "Bjorn", "Halfdan", "Sigurd", "Ulf", "Harald", "Erik",
    "Gudrun", "Sven", "Knut", "Olaf", "Thorfinn", "Ingvar", "Vidkun", "Gunnar",
  ];
  var NORTH_LAST = [
    "铁腕", "血斧", "乌鸦", "海蛇", "碎盾", "狼吻", "霜牙", "长船",
    "焚屋", "无骨", "红帆", "潮吞", "骨项链", "北风",
  ];
  var NORTH_LAST_EN = [
    "Ironhand", "Bloodaxe", "Crow", "Seaserpent", "Shieldbreaker", "Wolfkiss", "Frostfang", "Longship",
    "Hallburner", "Boneless", "Redsail", "Tideswallow", "Bonechain", "Northwind",
  ];
  var TITLES = {
    infantry: ["盾卫", "列兵长", "寨卫"],
    archer: ["弓长", "哨弓", "崖射"],
    pike: ["枪阵", "岸刺", "矛卫"],
    skirmisher: ["投矛", "滩刺", "散猎"],
  };
  var TITLES_EN = {
    infantry: ["Shield-warden", "File-chief", "Hold-guard"],
    archer: ["Bow-chief", "Watch-bow", "Crag-shot"],
    pike: ["Pike-wall", "Shore-spike", "Spear-ward"],
    skirmisher: ["Javelin", "Strand-thorn", "Scout-hunter"],
  };

  function pairFrom(rng, zh, en) {
    var i = rng.int(0, zh.length);
    return { name: zh[i], nameEn: en[i % en.length] };
  }

  function dwarfPair(rng) {
    var a = pairFrom(rng, DWARF_FIRST, DWARF_FIRST_EN);
    var b = pairFrom(rng, DWARF_LAST, DWARF_LAST_EN);
    return { name: a.name + "·" + b.name, nameEn: a.nameEn + " " + b.nameEn };
  }
  function islandPair(rng) {
    var a = pairFrom(rng, ISLAND_A, ISLAND_A_EN);
    var b = pairFrom(rng, ISLAND_B, ISLAND_B_EN);
    return { name: a.name + b.name, nameEn: a.nameEn + " " + b.nameEn };
  }
  function housePair(rng) {
    return pairFrom(rng, HOUSE_A, HOUSE_A_EN);
  }
  function northPair(rng) {
    var a = pairFrom(rng, NORTH_FIRST, NORTH_FIRST_EN);
    var b = pairFrom(rng, NORTH_LAST, NORTH_LAST_EN);
    return { name: a.name + "·" + b.name, nameEn: a.nameEn + " " + b.nameEn };
  }

  GS.names = {
    dwarf: function (rng) { return dwarfPair(rng).name; },
    island: function (rng) { return islandPair(rng).name; },
    house: function (rng) { return housePair(rng).name; },
    north: function (rng) { return northPair(rng).name; },
    dwarfPair: dwarfPair,
    islandPair: islandPair,
    housePair: housePair,
    northPair: northPair,
    commanderTitle: function (rng, role) {
      var zh = TITLES[role] || ["队长"];
      var en = TITLES_EN[role] || ["Captain"];
      var i = rng.int(0, zh.length);
      return zh[i];
    },
    commanderTitlePair: function (rng, role) {
      var zh = TITLES[role] || ["队长"];
      var en = TITLES_EN[role] || ["Captain"];
      var i = rng.int(0, zh.length);
      return { name: zh[i], nameEn: en[i % en.length] };
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
