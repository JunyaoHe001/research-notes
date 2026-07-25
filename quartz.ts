import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import SiteNav from "./quartz/components/SiteNav"

const config = await loadQuartzConfig()
export default config

const pageTypes = ["content", "folder", "tag", "canvas", "bases"]
const byPageType = Object.fromEntries(pageTypes.map((pageType) => [pageType, { header: [SiteNav] }]))

export const layout = await loadQuartzLayout({
  defaults: {
    header: [SiteNav],
  },
  byPageType,
})
