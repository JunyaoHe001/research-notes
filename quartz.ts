import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { registerCondition } from "./quartz/plugins/loader/conditions"
import { componentRegistry } from "./quartz/components/registry"
import { graphSettings } from "./quartz/graph-settings.generated"

const localDepth = graphSettings.scope === "entire-site" ? -1 : graphSettings.depth
const localIsGlobal = graphSettings.scope === "entire-site"

componentRegistry.setOptionOverrides("@quartz-community/graph", {
  localGraph: {
    drag: true,
    zoom: true,
    depth: localDepth,
    scale: localIsGlobal ? 0.95 : 1.1,
    repelForce: 0.7,
    centerForce: 0.35,
    linkDistance: 40,
    fontSize: 0.6,
    opacityScale: 1,
    removeTags: ["graph-hidden"],
    showTags: false,
    focusOnHover: localIsGlobal,
    enableRadial: false,
  },
  globalGraph: {
    drag: true,
    zoom: true,
    depth: -1,
    scale: 0.9,
    repelForce: 0.7,
    centerForce: 0.35,
    linkDistance: 40,
    fontSize: 0.6,
    opacityScale: 1,
    removeTags: ["graph-hidden"],
    showTags: false,
    focusOnHover: true,
    enableRadial: false,
  },
})

registerCondition("graph-placement", ({ fileData }) => {
  if (!graphSettings.enabled) return false

  const slug = String(fileData.slug ?? "index").replace(/\/index$/, "")
  if (graphSettings.placement === "home") return slug === "index"
  if (graphSettings.placement === "research") return slug === "research"
  return slug === "network"
})

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
