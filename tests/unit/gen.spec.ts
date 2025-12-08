import { describe, it, expect } from "vitest";
import { generateTerrainMap } from "@/lib/game/gen";

function neighbors(row: number, col: number, map: string[][]) {
  const rows = map.length;
  const res: {row:number,col:number}[] = [];
  const dirsEven = [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]];
  const dirsOdd = [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]];
  const dirs = (row % 2 === 0) ? dirsEven : dirsOdd;
  for (const [dr, dc] of dirs) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < rows) {
      const maxC = (r % 2 === 0) ? map[0].length : map[0].length - 1;
      if (c >= 0 && c < maxC) res.push({row:r,col:c});
    }
  }
  return res;
}

function isLand(t: string) {
  return !["deepOcean","shallowOcean","harborVillage","twinHarbors","lakeWater"].includes(t);
}

describe("generateTerrainMap", () => {
  it("produces one-tile islands with no adjacent land (multiple runs)", () => {
    for (let i=0;i<10;i++) {
      const { terrain } = generateTerrainMap(9,9);
      for (let r=0;r<terrain.length;r++) {
        const colsInRow = r % 2 === 0 ? terrain[0].length : terrain[0].length - 1;
        for (let c=0;c<colsInRow;c++) {
          const t = terrain[r][c];
          if (isLand(t)) {
            const neigh = neighbors(r,c,terrain);
            const landAdj = neigh.some(n => isLand(terrain[n.row][n.col]));
            expect(landAdj).toBe(false);
          }
        }
      }
    }
  });
});
