import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/interactive-maps.inline"

const InteractiveMapsResources: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null

  Component.css = `
.interactive-maps-section {
  margin: 1.65rem 0 2.7rem;
  padding: 1.2rem 0 1.45rem;
  border-top: 1px solid var(--lightgray);
  border-bottom: 1px solid var(--lightgray);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.interactive-maps-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.interactive-maps-heading,
.interactive-maps-deck {
  margin: 0 !important;
}

.interactive-maps-heading {
  color: var(--secondary);
  font-size: 0.75rem;
  font-weight: 750;
  letter-spacing: 0.095em;
  line-height: 1.3;
  text-transform: uppercase;
}

.interactive-maps-deck {
  color: var(--gray);
  font-size: 0.78rem;
  line-height: 1.4;
  text-align: right;
}

.interactive-maps-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.15rem;
}

.interactive-map-card {
  display: flex;
  min-width: 0;
  overflow: hidden;
  flex-direction: column;
  border: 1px solid var(--lightgray);
  border-radius: 0.42rem;
  background: color-mix(in srgb, var(--light) 97%, var(--lightgray));
  color: var(--dark) !important;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.025);
  text-decoration: none !important;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease,
    transform 150ms ease;
}

.interactive-map-card:hover,
.interactive-map-card:focus-visible {
  border-color: color-mix(in srgb, var(--secondary) 50%, var(--lightgray));
  box-shadow: 0 9px 24px rgba(0, 0, 0, 0.09);
  transform: translateY(-2px);
}

.interactive-map-card:focus-visible {
  outline: 2px solid var(--secondary);
  outline-offset: 3px;
}

.interactive-map-media {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-bottom: 1px solid var(--lightgray);
  background: color-mix(in srgb, var(--light) 90%, var(--lightgray));
}

.interactive-map-media img {
  display: block;
  width: 100%;
  height: 100%;
  margin: 0;
  object-fit: cover;
  object-position: center;
  transition: transform 220ms ease;
}

.interactive-map-card:hover .interactive-map-media img {
  transform: scale(1.018);
}

.interactive-map-media.is-missing {
  display: grid;
  place-items: center;
}

.interactive-map-image-fallback {
  color: var(--gray);
  font-size: 0.75rem;
}

.interactive-map-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.88rem 0.95rem 0.92rem;
}

.interactive-map-title,
.interactive-map-subtitle,
.interactive-map-description,
.interactive-map-action {
  display: block;
}

.interactive-map-title {
  color: var(--dark);
  font-family: var(--headerFont);
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.32;
}

.interactive-map-subtitle {
  margin-top: 0.28rem;
  color: var(--secondary);
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  line-height: 1.35;
}

.interactive-map-description {
  margin-top: 0.56rem;
  color: var(--darkgray);
  font-size: 0.78rem;
  line-height: 1.48;
}

.interactive-map-action {
  margin-top: auto;
  padding-top: 0.78rem;
  color: var(--secondary);
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1.3;
}

.interactive-map-action::after {
  content: " ↗";
}

.interactive-maps-message {
  grid-column: 1 / -1;
  margin: 0 !important;
  padding: 1.3rem;
  border: 1px dashed var(--lightgray);
  color: var(--gray);
  font-size: 0.8rem;
  text-align: center;
}

.interactive-maps-message.is-error {
  color: var(--darkgray);
}

@media (max-width: 1050px) {
  .interactive-maps-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 650px) {
  .interactive-maps-section {
    margin-top: 1.35rem;
  }

  .interactive-maps-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.35rem;
  }

  .interactive-maps-deck {
    text-align: left;
  }

  .interactive-maps-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
`

  Component.afterDOMLoaded = script
  return Component
}

export default InteractiveMapsResources
