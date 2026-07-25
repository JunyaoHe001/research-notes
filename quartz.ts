import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import SiteNav from "./quartz/components/SiteNav"

const config = await loadQuartzConfig()
export default config

const baseLayout = await loadQuartzLayout()

const withAcademicNavigation = <T extends { left?: unknown[]; header?: unknown[] }>(pageLayout: T): T =>
  ({
    ...pageLayout,
    header: [],
    left: [SiteNav, ...(pageLayout.left ?? [])],
  }) as T

export const layout = {
  defaults: withAcademicNavigation(baseLayout.defaults),
  byPageType: Object.fromEntries(
    Object.entries(baseLayout.byPageType).map(([pageType, pageLayout]) => [
      pageType,
      pageType === "404" ? pageLayout : withAcademicNavigation(pageLayout),
    ]),
  ),
}
