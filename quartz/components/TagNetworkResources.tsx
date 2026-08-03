import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/tag-network.inline"

const TagNetworkResources: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null

  Component.css = `
.tag-network-shell {
  margin-top: 1.4rem;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.tag-network-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.7rem 1rem;
  padding: 0.9rem 0;
  border-top: 1px solid var(--lightgray);
  border-bottom: 1px solid var(--lightgray);
}

.tag-network-filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tag-network-filter-chip {
  border: 1px solid var(--lightgray);
  border-radius: 999px;
  background: transparent;
  color: var(--darkgray);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  line-height: 1.25;
  padding: 0.36rem 0.72rem;
}

.tag-network-filter-chip:hover,
.tag-network-filter-chip.is-active {
  border-color: var(--secondary);
  color: var(--secondary);
  background: var(--highlight);
}

.tag-network-isolate-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding-left: 1rem;
  border-left: 1px solid var(--lightgray);
  color: var(--darkgray);
  font-size: 0.8rem;
  line-height: 1.35;
  white-space: nowrap;
}

.tag-network-isolate-toggle input[type="checkbox"] {
  position: static !important;
  width: 1rem !important;
  height: 1rem !important;
  min-width: 1rem;
  margin: 0 !important;
  padding: 0 !important;
  accent-color: var(--secondary);
}

.tag-network-status {
  flex: 1 1 100%;
  margin: 0;
  color: var(--gray);
  font-size: 0.76rem;
  line-height: 1.4;
}

.tag-network-frame {
  position: relative;
  width: 100%;
  height: clamp(450px, 45vw, 680px);
  min-height: 450px;
  max-height: 680px;
  margin-top: 1.4rem;
  overflow: hidden;
  border: 1px solid var(--lightgray);
  border-radius: 0.35rem;
  background: color-mix(in srgb, var(--light) 96%, var(--lightgray));
}

.tag-network-svg {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;
}

.tag-network-svg.is-panning {
  cursor: grabbing;
}

.tag-network-edge {
  stroke: var(--gray);
  stroke-opacity: 0.28;
  vector-effect: non-scaling-stroke;
}

.tag-network-node {
  cursor: pointer;
}

.tag-network-node circle {
  fill: var(--secondary);
  fill-opacity: 0.82;
  stroke: var(--light);
  stroke-width: 1.4;
  vector-effect: non-scaling-stroke;
}

.tag-network-node text {
  fill: var(--darkgray);
  font-size: 11px;
  font-weight: 550;
  paint-order: stroke;
  stroke: var(--light);
  stroke-width: 3px;
  stroke-linejoin: round;
  pointer-events: none;
  user-select: none;
}

.tag-network-node.is-focus circle {
  fill-opacity: 1;
  stroke: var(--secondary);
  stroke-width: 2;
}

.tag-network-node.is-dim,
.tag-network-edge.is-dim {
  opacity: 0.12;
}

.tag-network-tooltip {
  position: absolute;
  z-index: 4;
  max-width: 18rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--lightgray);
  border-radius: 0.3rem;
  background: var(--light);
  color: var(--darkgray);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  font-size: 0.76rem;
  line-height: 1.4;
  pointer-events: none;
  opacity: 0;
  transform: translate(0.6rem, 0.6rem);
  transition: opacity 100ms ease;
}

.tag-network-tooltip.is-visible {
  opacity: 1;
}

.tag-network-tooltip strong {
  display: block;
  margin-bottom: 0.15rem;
  color: var(--dark);
  font-size: 0.82rem;
}

.tag-network-message {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 2rem;
  color: var(--gray);
  text-align: center;
  font-size: 0.85rem;
}

@media (max-width: 800px) {
  .tag-network-controls {
    align-items: flex-start;
    flex-direction: column;
  }

  .tag-network-isolate-toggle {
    padding-left: 0;
    border-left: 0;
  }

  .tag-network-frame {
    height: 430px;
    min-height: 430px;
    max-height: none;
  }

  .tag-network-node text {
    font-size: 10px;
  }
}
`

  Component.afterDOMLoaded = script
  return Component
}

export default TagNetworkResources
