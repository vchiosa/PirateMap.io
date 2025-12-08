import { terrainTypes, terrainCategories } from "./terrain";

export type TerrainKey = keyof typeof terrainTypes;
export type TerrainCategory = keyof typeof terrainCategories;
