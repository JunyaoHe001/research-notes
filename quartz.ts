import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { componentRegistry } from "./quartz/components/registry"
import TagNetworkResources from "./quartz/components/TagNetworkResources"

componentRegistry.register("tag-network-resources", TagNetworkResources, "local")

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
