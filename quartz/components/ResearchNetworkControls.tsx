import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/research-network-controls.inline"

const ResearchNetworkControls: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null

  Component.css = `
.network-filter-panel {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.7rem 0.85rem;
  margin: 1.3rem 0 0;
  padding: 0.85rem 0 0.55rem;
  border-top: 1px solid var(--lightgray);
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
  flex: 0 0 auto;
  gap: 0.5rem;
  margin-left: 0.3rem;
  padding-left: 0.85rem;
  border-left: 1px solid var(--lightgray);
  font-size: 0.8rem;
  white-space: nowrap;
}

.network-isolate-toggle input[type="checkbox"] {
  position: static !important;
  inset: auto !important;
  display: block;
  flex: 0 0 auto;
  width: 1rem;
  height: 1rem;
  margin: 0 !important;
  transform: none !important;
  accent-color: var(--secondary);
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
  .network-filter-panel {
    align-items: flex-start;
    flex-direction: column;
  }

  .network-isolate-toggle {
    margin-left: 0;
    padding-left: 0;
    border-left: 0;
  }

  body[data-slug="network"] .graph > .graph-outer {
    height: 420px !important;
    min-height: 420px;
    max-height: none;
    aspect-ratio: auto;
  }
}
`

  Component.afterDOMLoaded = script
  return Component
}

export default ResearchNetworkControls
