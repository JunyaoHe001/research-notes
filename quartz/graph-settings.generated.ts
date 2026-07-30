export type GraphPlacement = "home" | "research" | "network"
export type GraphScope = "current-page" | "entire-site"

export const graphSettings = {
  enabled: true,
  placement: "network" as GraphPlacement,
  scope: "entire-site" as GraphScope,
  depth: 2,
} as const
