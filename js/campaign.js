/* Good South — campaign progression (archipelago state machine helpers) */
(function (g) {
  var GS = g.GS || (g.GS = {});

  function create(seed, count) {
    count = count || GS.CONFIG.campaign.islandCount;
    var camp = GS.mapgen.campaign(seed, count);
    return camp;
  }

  function getNode(camp, id) {
    return camp.islands[id] || null;
  }

  function visibleIslands(camp) {
    return camp.islands.filter(function (i) { return i.status !== "hidden"; });
  }

  function revealNeighbors(camp, id) {
    var node = getNode(camp, id);
    if (!node) return;
    for (var i = 0; i < node.edges.length; i++) {
      var n = camp.islands[node.edges[i]];
      if (n.status === "hidden") n.status = "scouted";
    }
  }

  function markCleared(camp, id) {
    var node = getNode(camp, id);
    if (!node) return null;
    node.status = "cleared";
    revealNeighbors(camp, id);
    GS.bus.emit(GS.EV.CAMPAIGN_CHANGED, { campaign: camp, node: node, reason: "cleared" });
    return node;
  }

  function markLost(camp, id) {
    var node = getNode(camp, id);
    if (!node) return null;
    node.status = "lost";
    revealNeighbors(camp, id);
    GS.bus.emit(GS.EV.CAMPAIGN_CHANGED, { campaign: camp, node: node, reason: "lost" });
    return node;
  }

  function resetForRetry(camp, id) {
    var node = getNode(camp, id);
    if (!node) return null;
    node.status = "scouted";
    return node;
  }

  function generateIsland(node) {
    return GS.mapgen.island(node.seed, {
      biome: node.biome,
      difficulty: node.difficulty,
      name: node.name,
    });
  }

  function isFinished(camp) {
    return camp.islands.every(function (i) {
      return i.status === "cleared" || i.status === "lost";
    });
  }

  function serialize(camp) {
    return GS.util.deepClone(camp);
  }

  function deserialize(data) {
    if (!data || !data.islands) return null;
    return data;
  }

  GS.Campaign = {
    create: create,
    getNode: getNode,
    visibleIslands: visibleIslands,
    revealNeighbors: revealNeighbors,
    markCleared: markCleared,
    markLost: markLost,
    resetForRetry: resetForRetry,
    generateIsland: generateIsland,
    isFinished: isFinished,
    serialize: serialize,
    deserialize: deserialize,
  };
})(typeof window !== "undefined" ? window : globalThis);
