/* Hex grid math (Phase 2) */
export const getHexPosition = (q: number, r: number, hexSize: number) => {
  const x = hexSize * ((3 / 2) * q);
  const y = hexSize * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
  return { x, y };
};

export const getHexNeighborsAxial = (q: number, r: number) => {
  const directions = [
    [+1, 0],
    [+1, -1],
    [0, -1],
    [-1, 0],
    [-1, +1],
    [0, +1],
  ];
  return directions.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
};
export const axialToIndex = (q: number, r: number, radius: number) => {
  return `${q},${r}`;
};
