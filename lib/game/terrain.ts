/* Auto-extracted from page.tsx (Phase 2 refactor) */
export const terrainTypes = {
  // ── tiles 0–9 ────────────────────────────────────────────────────────────
  grassPlain: {
    name: "Emerald Plains",
    gradient: "from-lime-300 via-green-400 to-emerald-400",
    image: "tile_00.png",
    reward: 0.001,
    rarity: "common",
    description: "Peaceful meadows stretch endlessly",
    glow: "shadow-green-500/50",
    sound: "grass",
  },

  sparseForest: {
    name: "Whispering Woods",
    gradient: "from-emerald-400 via-green-500 to-emerald-600",
    image: "tile_01.png",
    reward: 0.0012,
    rarity: "common",
    description: "Scattered trees stand guard",
    glow: "shadow-green-500/50",
    sound: "forest",
  },

  denseForest: {
    name: "Emerald Thicket",
    gradient: "from-green-600 via-emerald-600 to-green-700",
    image: "tile_02.png",
    reward: 0.0015,
    rarity: "uncommon",
    description: "Thick foliage brims with life",
    glow: "shadow-green-600/50",
    sound: "forest",
  },

  rockyOutcrop: {
    name: "Stone Ridge",
    gradient: "from-gray-400 via-gray-500 to-gray-600",
    image: "tile_03.png",
    reward: 0.002,
    rarity: "uncommon",
    description: "Jagged rocks rise from the earth",
    glow: "shadow-gray-500/50",
    sound: "mountain",
  },

  pineHills: {
    name: "Pine Grove",
    gradient: "from-green-500 via-teal-600 to-green-700",
    image: "tile_04.png",
    reward: 0.002,
    rarity: "uncommon",
    description: "Tall pines cloak the hillside",
    glow: "shadow-teal-500/50",
    sound: "forest",
  },

  snowPeak: {
    name: "Frostpeak",
    gradient: "from-slate-300 via-gray-400 to-white",
    image: "tile_05.png",
    reward: 0.003,
    rarity: "rare",
    description: "Snow-capped summit touching clouds",
    glow: "shadow-white/50",
    sound: "mountain",
  },

  shallowOcean: {
    name: "Coral Shallows",
    gradient: "from-cyan-300 via-blue-400 to-blue-500",
    image: "tile_06.png",
    reward: 0.001,
    rarity: "common",
    description: "Clear shallows teeming with life",
    glow: "shadow-cyan-500/50",
    sound: "ocean",
  },

  deepOcean: {
    name: "Abyssal Blue",
    gradient: "from-blue-700 via-indigo-800 to-blue-900",
    image: "tile_07.png",
    reward: 0.0008,
    rarity: "uncommon",
    description: "Dark depths hide ancient secrets",
    glow: "shadow-indigo-800/50",
    sound: "ocean",
  },

  sunlitVillage: {
    name: "Sunlit Village",
    gradient: "from-yellow-300 via-amber-400 to-orange-500",
    image: "tile_08.png",
    reward: 0.0015,
    rarity: "common",
    description: "Homes cluster around a central square",
    glow: "shadow-amber-500/50",
    sound: "grass",
  },

  ruinedKeep: {
    name: "Ruined Keep",
    gradient: "from-gray-600 via-gray-700 to-gray-800",
    image: "tile_09.png",
    reward: 0.0025,
    rarity: "rare",
    description: "Ancient walls stand defiant",
    glow: "shadow-gray-700/50",
    sound: "mountain",
  },
  // ── tiles 10–19 ────────────────────────────────────────────────────────────
  abandonedFortress: {
    name: "Forgotten Fortress",
    gradient: "from-gray-600 via-gray-700 to-gray-800",
    image: "tile_10.png",
    reward: 0.0025,
    rarity: "rare",
    description: "Ancient stones hold forgotten tales",
    glow: "shadow-gray-700/50",
    sound: "mountain",
  },

  goldenWheatfields: {
    name: "Golden Wheatfields",
    gradient: "from-yellow-300 via-amber-400 to-orange-400",
    image: "tile_11.png",
    reward: 0.0013,
    rarity: "common",
    description: "Endless stalks sway in the breeze",
    glow: "shadow-amber-500/50",
    sound: "grass",
  },

  forestClearing: {
    name: "Forest Clearing",
    gradient: "from-teal-400 via-green-500 to-emerald-500",
    image: "tile_12.png",
    reward: 0.0015,
    rarity: "common",
    description: "Sunlight filters through treetops",
    glow: "shadow-green-500/50",
    sound: "forest",
  },

  mistyMarsh: {
    name: "Misty Marsh",
    gradient: "from-green-200 via-lime-300 to-green-400",
    image: "tile_13.png",
    reward: 0.0018,
    rarity: "uncommon",
    description: "Murky waters brim with life",
    glow: "shadow-lime-500/50",
    sound: "ocean",
  },

  sunnyMeadow: {
    name: "Sunny Meadow",
    gradient: "from-green-200 via-lime-300 to-emerald-300",
    image: "tile_14.png",
    reward: 0.001,
    rarity: "common",
    description: "Soft grass basks under the sun",
    glow: "shadow-lime-500/50",
    sound: "grass",
  },

  wildHeath: {
    name: "Wild Heath",
    gradient: "from-green-600 via-lime-500 to-green-700",
    image: "tile_15.png",
    reward: 0.0012,
    rarity: "common",
    description: "Thickets of tall grass and shrubs",
    glow: "shadow-green-600/50",
    sound: "grass",
  },

  snowfield: {
    name: "Snowfield",
    gradient: "from-slate-100 via-slate-200 to-white",
    image: "tile_16.png",
    reward: 0.0008,
    rarity: "common",
    description: "A blanket of untouched snow",
    glow: "shadow-white/50",
    sound: "mountain",
  },

  frostedGrove: {
    name: "Frosted Grove",
    gradient: "from-teal-100 via-slate-200 to-white",
    image: "tile_17.png",
    reward: 0.0015,
    rarity: "uncommon",
    description: "Snow-kissed pines stand tall",
    glow: "shadow-cyan-500/50",
    sound: "forest",
  },

  winterwood: {
    name: "Winterwood",
    gradient: "from-green-500 via-slate-400 to-white",
    image: "tile_18.png",
    reward: 0.002,
    rarity: "rare",
    description: "Dense evergreens draped in snow",
    glow: "shadow-green-500/50",
    sound: "forest",
  },

  frozenCrag: {
    name: "Frozen Crag",
    gradient: "from-slate-400 via-gray-500 to-slate-600",
    image: "tile_19.png",
    reward: 0.0022,
    rarity: "uncommon",
    description: "Icy rocks jut from the earth",
    glow: "shadow-gray-500/50",
    sound: "mountain",
  },
  // ── tiles 20–29 ────────────────────────────────────────────────────────────
  crystalGlade: {
    name: "Crystal Glade",
    gradient: "from-cyan-100 via-white to-slate-200",
    image: "tile_20.png",
    reward: 0.002,
    rarity: "rare",
    description: "Sunlight glimmers on icy branches",
    glow: "shadow-cyan-200/50",
    sound: "magicalChime",
  },

  iceFloe: {
    name: "Ice Floe",
    gradient: "from-cyan-200 via-blue-300 to-white",
    image: "tile_21.png",
    reward: 0.001,
    rarity: "common",
    description: "Chunks drift across frigid waters",
    glow: "shadow-blue-300/50",
    sound: "ocean",
  },

  winterHamlet: {
    name: "Winter Hamlet",
    gradient: "from-gray-300 via-slate-400 to-white",
    image: "tile_22.png",
    reward: 0.002,
    rarity: "uncommon",
    description: "Cozy homes blanketed in snow",
    glow: "shadow-slate-400/50",
    sound: "grass",
  },

  winterCitadel: {
    name: "Winter Citadel",
    gradient: "from-red-600 via-gray-700 to-white",
    image: "tile_23.png",
    reward: 0.003,
    rarity: "rare",
    description: "Frozen ramparts protect ancient halls",
    glow: "shadow-red-600/50",
    sound: "mountain",
  },

  sandSea: {
    name: "Sand Sea",
    gradient: "from-yellow-300 via-amber-400 to-orange-400",
    image: "tile_24.png",
    reward: 0.001,
    rarity: "common",
    description: "Shifting sands under a blazing sun",
    glow: "shadow-yellow-500/50",
    sound: "desert",
  },

  desertBasin: {
    name: "Desert Basin",
    gradient: "from-amber-300 via-orange-400 to-orange-500",
    image: "tile_25.png",
    reward: 0.0012,
    rarity: "common",
    description: "Cracked pits that hold rare rain",
    glow: "shadow-amber-500/50",
    sound: "desert",
  },

  rollingDunes: {
    name: "Rolling Dunes",
    gradient: "from-yellow-400 via-amber-500 to-yellow-600",
    image: "tile_26.png",
    reward: 0.0011,
    rarity: "common",
    description: "Wind-sculpted waves of golden sand",
    glow: "shadow-yellow-500/50",
    sound: "desert",
  },

  scarletMesa: {
    name: "Scarlet Mesa",
    gradient: "from-orange-600 via-red-500 to-orange-700",
    image: "tile_27.png",
    reward: 0.002,
    rarity: "uncommon",
    description: "Sheer cliffs of red rock",
    glow: "shadow-red-500/50",
    sound: "mountain",
  },

  hiddenSpring: {
    name: "Hidden Spring",
    gradient: "from-green-300 via-teal-400 to-cyan-400",
    image: "tile_28.png",
    reward: 0.0022,
    rarity: "uncommon",
    description: "A secret pond nourished by clear waters",
    glow: "shadow-green-500/50",
    sound: "ocean",
  },

  mirageOasis: {
    name: "Mirage Oasis",
    gradient: "from-yellow-300 via-amber-400 to-orange-500",
    image: "tile_29.png",
    reward: 0.0025,
    rarity: "rare",
    description: "A shimmering pool in scorching sands",
    glow: "shadow-amber-500/80",
    sound: "magicalChime",
  },
  // ────────────────────────────────────────────────────────────────────────────
  // ── tiles 30, 31, 32, 36–40 ────────────────────────────────────────────────

  coastalVillage: {
    name: "Coastal Village",
    gradient: "from-yellow-300 via-amber-400 to-orange-400",
    image: "tile_30.png",
    reward: 0.0015,
    rarity: "common",
    description: "Whitewashed homes by the azure sea",
    glow: "shadow-amber-500/50",
    sound: "ocean",
  },

  frostholdOutpost: {
    name: "Frosthold Outpost",
    gradient: "from-slate-200 via-slate-400 to-white",
    image: "tile_31.png",
    reward: 0.002,
    rarity: "uncommon",
    description: "A snowy bastion guarding the shore",
    glow: "shadow-gray-400/50",
    sound: "mountain",
  },

  primevalForest: {
    name: "Primeval Forest",
    gradient: "from-green-600 via-emerald-600 to-green-700",
    image: "tile_32.png",
    reward: 0.0015,
    rarity: "uncommon",
    description: "Ancient trees cloaked in mystery",
    glow: "shadow-green-600/50",
    sound: "forest",
  },

  harborVillage: {
    name: "Harbor Village",
    gradient: "from-cyan-300 via-blue-400 to-blue-500",
    image: "tile_36.png",
    reward: 0.0018,
    rarity: "uncommon",
    description: "Colorful boats bobbing in sheltered waters",
    glow: "shadow-blue-400/50",
    sound: "ocean",
  },

  twinHarbors: {
    name: "Twin Harbors",
    gradient: "from-cyan-400 via-blue-500 to-indigo-600",
    image: "tile_37.png",
    reward: 0.0018,
    rarity: "uncommon",
    description: "Two ports linked by rugged coastline",
    glow: "shadow-indigo-500/50",
    sound: "ocean",
  },

  lighthouseIsle: {
    name: "Lighthouse Isle",
    gradient: "from-orange-300 via-yellow-400 to-white",
    image: "tile_38.png",
    reward: 0.002,
    rarity: "rare",
    description: "Beacon shining across storm-tossed waves",
    glow: "shadow-yellow-500/50",
    sound: "ocean",
  },

  volcanicShrine: {
    name: "Volcanic Shrine",
    gradient: "from-red-600 via-orange-600 to-red-700",
    image: "tile_39.png",
    reward: 0.003,
    rarity: "rare",
    description: "Ancient stones warmed by flowing magma",
    glow: "shadow-red-600/50",
    sound: "mountain",
  },

  hauntedRuins: {
    name: "Haunted Ruins",
    gradient: "from-green-200 via-gray-400 to-slate-500",
    image: "tile_40.png",
    reward: 0.002,
    rarity: "uncommon",
    description: "Echoes of a civilization long lost",
    glow: "shadow-gray-400/50",
    sound: "mountain",
  },

  // Tiles used for default states
  unexplored: {
    name: "Uncharted Waters",
    gradient: "from-gray-700 via-gray-800 to-gray-900",
    image: "tile_07.png",
    reward: 0,
    rarity: "unknown",
    description: "These waters have yet to be sailed",
    glow: "shadow-gray-700/50",
    sound: "sail",
  },

  treasure: {
    name: "Pirate's Bounty",
    gradient: "from-yellow-200 via-yellow-400 to-amber-500",
    image: "elDorado.png",
    reward: 0.005,
    rarity: "legendary",
    description: "A chest of gleaming doubloons",
    glow: "shadow-yellow-400/80",
    sound: "treasure",
  },
}

// Map generic terrain categories to specific tile keys
export const terrainCategories = {
  grass: ["grassPlain", "sunnyMeadow", "wildHeath", "goldenWheatfields"],
  forest: ["sparseForest", "denseForest", "pineHills", "primevalForest", "forestClearing"],
  desert: ["sandSea", "desertBasin", "rollingDunes", "scarletMesa", "mirageOasis"],
  ocean: ["shallowOcean", "deepOcean"],
  lake: ["hiddenSpring", "iceFloe"],
  mountain: ["rockyOutcrop", "snowPeak", "winterwood", "frozenCrag", "volcanicShrine", "winterCitadel"],
  treasure: ["treasure"],
} as const

export const terrainCategoryLookup: Record<string, keyof typeof terrainCategories> = {}

Object.entries(terrainCategories).forEach(([category, tiles]) => {
  ;(tiles as readonly string[]).forEach((tile) => {
    terrainCategoryLookup[tile] = category as keyof typeof terrainCategories
  })
})
terrainCategoryLookup["harborVillage"] = "ocean"
terrainCategoryLookup["twinHarbors"] = "ocean"

export const getClimateZone = (row: number, rows: number) => {
  const mid = (rows - 1) / 2
  const dist = Math.abs(row - mid) / mid // 0 at equator, 1 at poles
  if (dist > 0.8) return "snow"
  if (dist > 0.55) return "temperate"
  if (dist > 0.25) return "desert"
  return "tropical"
}

export const chooseLandTerrainForZone = (zone: string) => {
  const zoneCategories: Record<string, (keyof typeof terrainCategories)[]> = {
    snow: ["mountain", "lake", "forest"],
    temperate: ["grass", "forest", "mountain"],
    desert: ["desert", "grass"],
    tropical: ["forest", "grass", "mountain"],
  }
  const categories = zoneCategories[zone] || ["grass"]
  const category = categories[Math.floor(Math.random() * categories.length)]
  const options = terrainCategories[category]
  return options[Math.floor(Math.random() * options.length)]
}
