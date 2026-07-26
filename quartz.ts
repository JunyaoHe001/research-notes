import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import type { FullPageLayout } from "./quartz/cfg"
import SiteNav from "./quartz/components/SiteNav"

const config = await loadQuartzConfig()
export default config

const baseLayout = await loadQuartzLayout()
const topToolbar = [...(baseLayout.defaults.left ?? [])].slice(-1)

const withAcademicHeader = (
  pageLayout: Partial<FullPageLayout>,
): Partial<FullPageLayout> => ({
  ...pageLayout,
  header: [SiteNav, ...topToolbar],
  left: [],
})

const academicPageTypes = new Set(["content", "folder", "tag", "bases"])

export const layout = {
  defaults: withAcademicHeader(baseLayout.defaults),
  byPageType: Object.fromEntries(
    Object.entries(baseLayout.byPageType).map(([pageType, pageLayout]) => [
      pageType,
      academicPageTypes.has(pageType) ? withAcademicHeader(pageLayout) : pageLayout,
    ]),
  ),
}
