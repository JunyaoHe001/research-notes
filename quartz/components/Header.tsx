import { Search } from "@quartz-community/search/components"
import { Darkmode } from "@quartz-community/darkmode/components"
import { ReaderMode } from "@quartz-community/reader-mode/components"
import { concatenateResources } from "../util/resources"
import SiteNav from "./SiteNav"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

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
}
`,
)

Header.beforeDOMLoaded = concatenateResources(
  DarkmodeComponent.beforeDOMLoaded,
  ReaderModeComponent.beforeDOMLoaded,
)

Header.afterDOMLoaded = concatenateResources(SearchComponent.afterDOMLoaded)

export default (() => Header) satisfies QuartzComponentConstructor
