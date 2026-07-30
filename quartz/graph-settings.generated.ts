export type GraphPlacement = "home" | "research" | "network"
export type GraphScope = "current-page" | "entire-site"

export const graphSettings = {
  enabled: true,
  placement: "network" as GraphPlacement,
  scope: "current-page" as GraphScope,
  depth: 3,
} as const
