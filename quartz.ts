import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"

const config = await loadQuartzConfig({
  pageTitle: "Junyao's Research Notes",
  pageTitleSuffix: " | Junyao He",
  enableSPA: true,
  enablePopovers: true,
  analytics: null,
  locale: "en-US",
  baseUrl: "junyaohe001.github.io/research-notes",
})

export default config
export const layout = await loadQuartzLayout()
