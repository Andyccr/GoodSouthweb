/* Good South — dwarf-hold & northman name lists */
(function (g) {
  var GS = g.GS || (g.GS = {});

  var DWARF_FIRST = [
    "乌瑞斯特", "托里克", "科勒", "利塔斯特", "多玛斯", "提库特", "扎西特", "梅布祖斯",
    "斯塔库德", "菲科德", "拉库斯特", "杜梅德", "阿提斯", "西洛布", "奥努尔", "瑞斯",
    "基维什", "尼什", "洛格姆", "埃德姆", "戈登", "阿斯梅尔", "图恩", "萨齐尔",
    "索布", "洛尔", "杜西姆", "梅尔比尔", "里戈斯", "瓦博克", "贝伦", "杜林",
    "诺里", "格罗因", "巴林", "奥因", "比芙尔", "邦布尔", "多利", "奥利",
  ];
  var DWARF_LAST = [
    "盾噬", "斧落", "石炉", "深掘", "橡盾", "鸦须", "铁拳", "金厅",
    "麦酒", "岩歌", "炉心", "铜须", "墓卫", "盐须", "锚铸", "蜂须",
    "崖行", "浪劈", "南灯", "粮仓", "雾锤", "贝壳", "潮炉", "礁垒",
  ];
  var ISLAND_A = [
    "荆棘", "鸥鸣", "雾湾", "羊齿", "麦河", "燧石", "寡妇", "南灯",
    "盐风", "蜂巢", "鸦礁", "羊岬", "牡蛎", "芦花", "灯塔", "锚地",
    "琥珀", "青苔", "狼溪", "龟背", "麦秆", "青铜", "白帆", "沉钟",
    "旱麦", "潮声", "砾石", "蜂蜡", "蕨影", "酒窖",
  ];
  var ISLAND_B = [
    "岛", "屿", "礁", "滩", "岬", "湾", "矶", "洲", "角", "堡", "寨", "丘",
  ];
  var HOUSE_A = [
    "麦仓", "盐屋", "渔棚", "蜂房", "织坊", "铜铺", "酒窖", "羊圈",
    "灯塔小屋", "船长旧宅", "磨坊", "熏鱼房", "草药棚", "铁砧屋",
  ];
  var NORTH_FIRST = [
    "拉格纳", "伊瓦尔", "比约恩", "哈夫丹", "西格德", "乌尔夫", "哈拉尔", "埃里克",
    "古德伦", "斯文", "克努特", "奥拉夫", "托尔芬", "英格瓦", "维德孔", "贡纳尔",
  ];
  var NORTH_LAST = [
    "铁腕", "血斧", "乌鸦", "海蛇", "碎盾", "狼吻", "霜牙", "长船",
    "焚屋", "无骨", "红帆", "潮吞", "骨项链", "北风",
  ];

  function fullDwarf(rng) {
    return rng.pick(DWARF_FIRST) + "·" + rng.pick(DWARF_LAST);
  }
  function islandName(rng) {
    return rng.pick(ISLAND_A) + rng.pick(ISLAND_B);
  }
  function houseName(rng) {
    return rng.pick(HOUSE_A);
  }
  function northman(rng) {
    return rng.pick(NORTH_FIRST) + "·" + rng.pick(NORTH_LAST);
  }

  GS.names = {
    dwarf: fullDwarf,
    island: islandName,
    house: houseName,
    north: northman,
    commanderTitle: function (rng, role) {
      var titles = {
        infantry: ["盾卫", "列兵长", "寨卫"],
        archer: ["弓长", "哨弓", "崖射"],
        pike: ["枪阵", "岸刺", "矛卫"],
      };
      return rng.pick(titles[role] || ["队长"]);
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
