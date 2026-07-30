import { Search } from "@quartz-community/search/components"
import { Darkmode } from "@quartz-community/darkmode/components"
import { ReaderMode } from "@quartz-community/reader-mode/components"
import { concatenateResources } from "../util/resources"
import SiteNav from "./SiteNav"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import researchNetworkControls from "./scripts/research-network-controls.inline"

const SearchComponent = Search({})
const DarkmodeComponent = Darkmode()
const ReaderModeComponent = ReaderMode()

const Header: QuartzComponent = (props: QuartzComponentProps) => {
  return (
    <header class="academic-global-header">
      <SiteNav {...props} />
      <div class="academic-header-tools" aria-label="Site tools">
        <SearchComponent {...props} />
        <DarkmodeComponent {...props} />
        <ReaderModeComponent {...props} />
      </div>
    </header>
  )
}

Header.css = concatenateResources(
  SiteNav.css,
  SearchComponent.css,
  DarkmodeComponent.css,
  ReaderModeComponent.css,
  `
.academic-global-header {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  box-sizing: border-box;
  margin: 0;
  padding: 1.4rem 0 0.85rem;
  border-bottom: 1px solid var(--lightgray);
  gap: 1.5rem;
}

.academic-header-tools {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  margin-left: auto;
  gap: 0.55rem;
}

.academic-header-tools > .search {
  width: 10rem;
  min-width: 8rem;
}

.academic-header-tools > button {
  flex: 0 0 auto;
}

.network-filter-panel {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.7rem 1rem;
  margin: 1.3rem 0 0.8rem;
  padding: 0.85rem 0;
  border-top: 1px solid var(--lightgray);
  border-bottom: 1px solid var(--lightgray);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.network-filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.network-filter-chip {
  border: 1px solid var(--lightgray);
  border-radius: 999px;
  background: transparent;
  color: var(--darkgray);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  line-height: 1.25;
  padding: 0.36rem 0.7rem;
}

.network-filter-chip:hover,
.network-filter-chip.is-active {
  border-color: var(--secondary);
  color: var(--secondary);
  background: var(--highlight);
}

.network-isolate-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  white-space: nowrap;
}

.network-filter-status {
  flex: 1 1 100%;
  margin: 0;
  color: var(--gray);
  font-size: 0.76rem;
  line-height: 1.35;
}

body[data-slug="network"] .graph > .graph-outer {
  width: 100%;
  height: clamp(430px, 43vw, 620px) !important;
  min-height: 430px;
  max-height: 620px;
  aspect-ratio: 16 / 7;
}

@media (max-width: 800px) {
  .academic-global-header {
    align-items: flex-start;
    flex-wrap: wrap;
    padding-top: 1rem;
    gap: 0.8rem;
  }

  .academic-header-tools {
    width: 100%;
    margin-left: 0;
  }

  .academic-header-tools > .search {
    width: auto;
    flex: 1 1 auto;
  }

  .network-filter-panel {
    align-items: flex-start;
    flex-direction: column;
  }

  body[data-slug="network"] .graph > .graph-outer {
    height: 420px !important;
    min-height: 420px;
    max-height: none;
    aspect-ratio: auto;
  }
}
`,
)

Header.beforeDOMLoaded = concatenateResources(
  DarkmodeComponent.beforeDOMLoaded,
  ReaderModeComponent.beforeDOMLoaded,
)

Header.afterDOMLoaded = concatenateResources(
  SearchComponent.afterDOMLoaded,
  researchNetworkControls,
)

export default (() => Header) satisfies QuartzComponentConstructor
