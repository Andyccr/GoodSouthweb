/* Good South — campaign progression (archipelago state machine helpers) */
(function (g) {
  var GS = g.GS || (g.GS = {});

  function create(seed, count) {
    count = count || GS.CONFIG.campaign.islandCount;
    var camp = GS.mapgen.campaign(seed, count);
    var rng = GS.rng(typeof seed === "number" ? seed : GS.hashStr(String(seed || "south")));
    if (GS.Meta && GS.Meta.decorateCampaign) GS.Meta.decorateCampaign(camp, rng);
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
    var island = GS.mapgen.island(node.seed, {
      biome: node.biome,
      difficulty: node.difficulty,
      name: node.name,
    });
    island.omen = node.omen || "calm";
    island.relic = node.relic || null;
    return island;
  }

  function isFinished(camp) {
    return camp.islands.every(function (i) {
      return i.status === "cleared" || i.status === "lost";
    });
  }

  function serialize(camp) {
    return GS.util.deepClone(camp);
  }

  function nextScouted(camp) {
    if (!camp) return null;
    for (var i = 0; i < camp.islands.length; i++) {
      if (camp.islands[i].status === "scouted") return camp.islands[i];
    }
    return null;
  }

  function pickAt(camp, x, y, radius) {
    if (!camp || !camp.islands) return null;
    radius = radius == null ? ((GS.CONFIG.campaign && GS.CONFIG.campaign.pickRadius) || 4) : radius;
    var best = null, bd = radius + 0.01;
    for (var i = 0; i < camp.islands.length; i++) {
      var is = camp.islands[i];
      if (is.status === "hidden") continue;
      var dx = is.mx - x, dy = is.my - y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bd) {
        bd = d;
        best = is;
      }
    }
    if (!best) return null;
    return { island: best, dist: bd };
  }

  /** Map tap: first press selects/arms; a second close tap on the same scouted island lands. */
  function tapIntent(s) {
    if (!s || !s.island) return { action: "none" };
    var open = s.openRadius == null ? 2.6 : s.openRadius;
    var dist = s.dist == null ? 0 : s.dist;
    if (s.forceLand && s.island.status === "scouted") return { action: "land" };
    if (s.island.status === "scouted" && s.selectedId === s.island.id && s.armedId === s.island.id && dist <= open) {
      return { action: "land" };
    }
    return { action: "select", hint: s.island.status === "scouted" };
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
    nextScouted: nextScouted,
    pickAt: pickAt,
    tapIntent: tapIntent,
    serialize: serialize,
    deserialize: deserialize,
  };
})(typeof window !== "undefined" ? window : globalThis);
