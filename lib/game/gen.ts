/* Auto-extracted generation utilities (Phase 2) */
import { terrainCategoryLookup, getClimateZone, chooseLandTerrainForZone } from "./terrain";
import { rngFromSeed } from "./rng";

// Internal RNG accessor; default to Math.random
function makeR(rng?: () => number) {
  return typeof rng === "function" ? rng : Math.random;
}

const getMapNeighbors = (row: number, col: number, map: string[][]) => {
  const neighbors: { row: number; col: number }[] = [];
  const isEven = row % 2 === 0;
  const offsets = isEven
    ? [
        [-1, -1],
        [-1, 0],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
      ]
    : [
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, 0],
        [1, 1],
      ];
  offsets.forEach(([dr, dc]) => {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < map.length && nc >= 0 && nc < map[nr].length) {
      neighbors.push({ row: nr, col: nc });
    }
  });
  return neighbors;
};

export const generateTerrainMap = (rows: number, cols: number, rng?: () => number) => {
  const R = makeR(rng);
  const map: string[][] = [];
  const zones: string[][] = [];
  const resources: (string | null)[][] = [];

  // Fill the map with deep ocean tiles first
  for (let row = 0; row < rows; row++) {
    const rowTerrains: string[] = [];
    const rowZones: string[] = [];
    const rowResources: (string | null)[] = [];
    const colsInRow = row % 2 === 0 ? cols : cols - 1;
    for (let col = 0; col < colsInRow; col++) {
      rowTerrains.push("deepOcean");
      rowZones.push("ocean");
      rowResources.push(null);
    }
    map.push(rowTerrains);
    zones.push(rowZones);
    resources.push(rowResources);
  }

  const totalCells = map.reduce((sum, r) => sum + r.length, 0);
  const targetLand = Math.floor(totalCells * 0.2); // 20% land

  const allCells: { row: number; col: number }[] = [];
  for (let row = 0; row < rows; row++) {
    const colsInRow = row % 2 === 0 ? cols : cols - 1;
    for (let col = 0; col < colsInRow; col++) {
      allCells.push({ row, col });
    }
  }
  for (let i = allCells.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
  }

  let placed = 0;
  for (const { row, col } of allCells) {
    if (placed >= targetLand) break;
    const neighbors = getMapNeighbors(row, col, map);
    const hasLand = neighbors.some(
      (n) => terrainCategoryLookup[map[n.row][n.col]] !== "ocean"
    );
    if (hasLand) continue;

    const zone = getClimateZone(row, rows);
    zones[row][col] = zone;
    map[row][col] = chooseLandTerrainForZone(zone);
    placed++;
  }

  const maxHarbors = Math.max(1, Math.floor(totalCells / 100));
  let harborCount = 0;
  let twinCount = 0;
  for (let row = 0; row < rows; row++) {
    const colsInRow = row % 2 === 0 ? cols : cols - 1;
    for (let col = 0; col < colsInRow; col++) {
      if (terrainCategoryLookup[map[row][col]] !== "ocean") continue;

      if (
        harborCount < maxHarbors &&
        col > 0 &&
        terrainCategoryLookup[map[row][col - 1]] !== "ocean" &&
        R() < 0.02
      ) {
        map[row][col] = "harborVillage";
        harborCount++;
        continue;
      }

      if (
        twinCount < maxHarbors &&
        col < colsInRow - 1 &&
        terrainCategoryLookup[map[row][col + 1]] !== "ocean" &&
        R() < 0.02
      ) {
        map[row][col] = "twinHarbors";
        twinCount++;
      }
    }
  }

  // Coral shallows generation around islands
  for (let row = 0; row < rows; row++) {
    const colsInRow = row % 2 === 0 ? cols : cols - 1;
    for (let col = 0; col < colsInRow; col++) {
      if (map[row][col] !== "deepOcean") continue;
      const neighbors = getMapNeighbors(row, col, map);
      const hasLand = neighbors.some(
        (n) => terrainCategoryLookup[map[n.row][n.col]] !== "ocean"
      );
      const hasDeep = neighbors.some((n) => map[n.row][n.col] === "deepOcean");
      const shallowNeighbors = neighbors.filter(
        (n) => map[n.row][n.col] === "shallowOcean"
      ).length;
      if (hasLand && hasDeep && shallowNeighbors === 0) {
        map[row][col] = "shallowOcean";
      }
    }
  }

  // Resource placement
  const resourceTypes = [
    "whales.png",
    "goldOre.png",
    "pearls.png",
    "gems.png",
    "sugar.png",
    "spices.png",
    "silver.png",
  ];
  const resourcesToPlace = Math.floor(R() * 5);
  for (let r = 0; r < resourcesToPlace; r++) {
    const res = resourceTypes[Math.floor(R() * resourceTypes.length)];
    const candidates: { row: number; col: number }[] = [];
    for (let row = 0; row < rows; row++) {
      const colsInRow = row % 2 === 0 ? cols : cols - 1;
      for (let col = 0; col < colsInRow; col++) {
        if (resources[row][col] || map[row][col] === "treasure") continue;
        const zone = zones[row][col];
        const terrain = map[row][col];
        const cat = terrainCategoryLookup[terrain];
        const isLand = cat !== "ocean" && cat !== "lake";

        const valid =
          (res === "whales.png" && cat === "ocean") ||
          (res === "goldOre.png" &&
            isLand &&
            (zone === "desert" || zone === "snow")) ||
          (res === "pearls.png" && terrain === "shallowOcean") ||
          (res === "gems.png" && isLand && zone === "tropical") ||
          (res === "sugar.png" && isLand && zone === "tropical") ||
          (res === "spices.png" && isLand && zone === "tropical") ||
          (res === "silver.png" &&
            isLand &&
            (zone === "snow" || cat === "mountain"));

        if (valid) candidates.push({ row, col });
      }
    }

    if (candidates.length) {
      const choice = candidates[Math.floor(R() * candidates.length)];
      resources[choice.row][choice.col] = res;
    }
  }
  // ── GUARANTEE AT LEAST ONE OF EACH RESOURCE ────────────────────────────────
  {
    const guaranteeTypes = [
      "whales.png",
      "goldOre.png",
      "pearls.png",
      "gems.png",
      "sugar.png",
      "spices.png",
      "silver.png",
    ];

    for (const res of guaranteeTypes) {
      // skip if already placed
      if (resources.flat().includes(res)) continue;

      // find all valid spots
      const validCandidates: { row: number; col: number }[] = [];
      for (let row = 0; row < rows; row++) {
        const colsInRow = row % 2 === 0 ? cols : cols - 1;
        for (let col = 0; col < colsInRow; col++) {
          if (resources[row][col] != null || map[row][col] === "treasure")
            continue;
          const zone = zones[row][col];
          const terrain = map[row][col];
          const cat = terrainCategoryLookup[terrain];
          const isLand = cat !== "ocean" && cat !== "lake";

          const valid =
            (res === "whales.png" && cat === "ocean") ||
            (res === "goldOre.png" &&
              isLand &&
              (zone === "desert" || zone === "snow")) ||
            (res === "pearls.png" && terrain === "shallowOcean") ||
            (res === "gems.png" && isLand && zone === "tropical") ||
            (res === "sugar.png" && isLand && zone === "tropical") ||
            (res === "spices.png" && isLand && zone === "tropical") ||
            (res === "silver.png" &&
              isLand &&
              (zone === "snow" || cat === "mountain"));

          if (valid) validCandidates.push({ row, col });
        }
      }

      // plant one if possible
      if (validCandidates.length) {
        const pick =
          validCandidates[Math.floor(R() * validCandidates.length)];
        resources[pick.row][pick.col] = res;
      }
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  // ─── Guarantee at least one treasure tile ───────────────────────────────────
  {
    const landCells: { row: number; col: number }[] = [];
    for (let row = 0; row < map.length; row++) {
      for (let col = 0; col < map[row].length; col++) {
        if (terrainCategoryLookup[map[row][col]] !== "ocean") {
          landCells.push({ row, col });
        }
      }
    }
    if (landCells.length) {
      const pick = landCells[Math.floor(R() * landCells.length)];
      map[pick.row][pick.col] = "treasure";
      resources[pick.row][pick.col] = null;
    }
  }
  // ────────────────────────────────────────────────────────────────────────────
  return { terrain: map, resources, zones };
};
