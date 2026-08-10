import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { componentRegistry } from "./quartz/components/registry"
import TagNetworkResources from "./quartz/components/TagNetworkResources"
import InteractiveMapsResources from "./quartz/components/InteractiveMapsResources"

componentRegistry.register("tag-network-resources", TagNetworkResources, "local")
componentRegistry.register("interactive-maps-resources", InteractiveMapsResources, "local")

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
