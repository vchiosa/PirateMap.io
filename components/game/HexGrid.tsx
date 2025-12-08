import React from "react";
import { terrainTypes } from "@/lib/game/terrain";

type Hex = {
  id: string;
  q: number;
  r: number;
  x: number;
  y: number;
  terrain: string;
  hiddenTerrain: string;
  hiddenResource: string | null;
  resource: string | null;
  explored: boolean;
  isAdjacent: boolean;
  discoveredAt: Date | null;
};

type Props = {
  radius: number;
  hexArray: Hex[];
  onTileClick: (q: number, r: number) => void;
  isSailing: boolean;
  onHover?: () => void;
  currentPosition?: { q: number; r: number } | null;
};

export default function HexGrid({ radius, hexArray, onTileClick, isSailing, onHover, currentPosition }: Props) {
  return (
    <>
<svg
                    width="800"
                    height="600"
                    viewBox="0 0 800 600"
                    className="w-full h-auto max-w-4xl mx-auto"
                  >
                    <defs>
                      <clipPath id="hexClip">
                        <polygon points="30,0 90,0 120,52 90,104 30,104 0,52" />
                      </clipPath>
                    </defs>

                    <g transform="scale(0.7) translate(180, 140)">
                      {hexArray.map((hex) => {
                        const terrain =
                          terrainTypes[
                            hex.terrain as keyof typeof terrainTypes
                          ] || terrainTypes.unexplored;
                        const isCurrentPosition = (currentPosition && currentPosition.q === hex.q && currentPosition.r === hex.r);
                          currentPosition.q === hex.q &&
                          currentPosition.r === hex.r;

                        // Center the grid in the SVG
                        const centerX = 400;
                        const centerY = 300;
                        const x = centerX + hex.x;
                        const y = centerY + hex.y;

                        return (
                          <g
                            key={hex.id}
                            transform={`translate(${x - 60}, ${y - 52})`}
                          >
                            {/* Hex background */}
                            <polygon
                              points="30,0 90,0 120,52 90,104 30,104 0,52"
                              fill="transparent"
                              stroke={
                                isCurrentPosition
                                  ? "#f59e0b"
                                  : hex.isAdjacent && !hex.explored
                                  ? "#f59e0b"
                                  : hex.explored
                                  ? "none"
                                  : "none"
                              }
                              strokeWidth={
                                isCurrentPosition
                                  ? "3"
                                  : hex.isAdjacent
                                  ? "2"
                                  : "1"
                              }
                              className={`cursor-pointer transition-all duration-300 ${
                                hex.isAdjacent && !hex.explored
                                  ? "hover:stroke-amber-400 hover:stroke-2"
                                  : ""
                              }`}
                              onClick={() => onTileClick(hex.q, hex.r)}
                              onMouseEnter={onHover}
                            />

                            {/* Hex image */}
                            <g transform="scale(1.5) translate(-30, -22)">
                              <image
                                href={`/assets/tiles/${terrain.image}`}
                                x="5"
                                y="-20"
                                width="120"
                                height="104"
                                clipPath="url(#hexClip)"
                                className="pointer-events-none"
                                style={{
                                  filter: !hex.explored
                                    ? "grayscale(100%) brightness(0.7)"
                                    : "none",
                                  opacity: !hex.explored ? 0.8 : 1,
                                }}
                              />
                            </g>

                            {/* Resource overlay */}
                            {hex.explored && hex.resource && (
                              <image
                                href={`/assets/tiles/${hex.resource}`}
                                x="90"
                                y="75"
                                width="24"
                                height="24"
                                className="pointer-events-none"
                              />
                            )}

                            {/* Current position indicator */}
                            {isCurrentPosition && (
                              <g transform="translate(60, 52)">
                                <circle
                                  r="8"
                                  fill="#f59e0b"
                                  className="animate-pulse"
                                />
                                <text
                                  textAnchor="middle"
                                  dy="4"
                                  fontSize="12"
                                  fill="white"
                                >
                                  ⚓
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </g>

                    {/* Gradient definitions */}
                    <defs>
                      {Object.entries(terrainTypes).map(([key, terrain]) => (
                        <linearGradient
                          key={key}
                          id={`gradient-${key}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stopColor={
                              terrain.gradient.includes("emerald")
                                ? "#10b981"
                                : terrain.gradient.includes("blue")
                                ? "#3b82f6"
                                : terrain.gradient.includes("yellow")
                                ? "#eab308"
                                : terrain.gradient.includes("red")
                                ? "#ef4444"
                                : "#6b7280"
                            }
                          />
                          <stop
                            offset="100%"
                            stopColor={
                              terrain.gradient.includes("emerald")
                                ? "#059669"
                                : terrain.gradient.includes("blue")
                                ? "#1d4ed8"
                                : terrain.gradient.includes("yellow")
                                ? "#ca8a04"
                                : terrain.gradient.includes("red")
                                ? "#dc2626"
                                : "#4b5563"
                            }
                          />
                        </linearGradient>
                      ))}
                    </defs>
                  </svg>
    </>
  );
}
