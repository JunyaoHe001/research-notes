import { FullSlug } from "../util/path"
import { QuartzComponent } from "./types"

const SITE_ROOT = "/research-notes"

const SiteNav: QuartzComponent = ({ fileData }) => {
  const current = (fileData.slug ?? "index") as FullSlug
  const links = [
    { label: "Home", href: `${SITE_ROOT}/`, slug: "index" },
    { label: "Research", href: `${SITE_ROOT}/research`, slug: "research" },
    { label: "Projects", href: `${SITE_ROOT}/projects/`, slug: "projects" },
    { label: "Publications", href: `${SITE_ROOT}/publications/`, slug: "publications" },
    {
      label: "Working papers",
      href: `${SITE_ROOT}/working-papers/`,
      slug: "working-papers",
    },
    { label: "Activities", href: `${SITE_ROOT}/activities/`, slug: "activities" },
    { label: "Teaching", href: `${SITE_ROOT}/teaching/`, slug: "teaching" },
  ]

  const isActive = (slug: string) =>
    slug === "index" ? current === "index" : current === slug || current.startsWith(`${slug}/`)

  return (
    <nav class="academic-top-nav" aria-label="Primary navigation">
      <a class="academic-top-name internal" href={`${SITE_ROOT}/`}>
        Junyao's Research Notes
      </a>
      <div class="academic-top-links">
        {links.map((link) => (
          <a
            class={`internal academic-top-link${isActive(link.slug) ? " active" : ""}`}
            href={link.href}
            aria-current={isActive(link.slug) ? "page" : undefined}
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

SiteNav.css = `
.academic-top-nav {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  min-width: 0;
  gap: 1.5rem;
}

.academic-top-name,
.academic-top-link {
  background: transparent !important;
  border-radius: 0 !important;
  padding: 0 !important;
  text-decoration: none;
}

.academic-top-name {
  flex: 0 0 auto;
  color: var(--dark) !important;
  font-family: var(--headerFont);
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
}

.academic-top-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  column-gap: 1rem;
  row-gap: 0.4rem;
}

.academic-top-link {
  border-bottom: 1px solid transparent !important;
  color: var(--darkgray) !important;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
}

.academic-top-link:hover,
.academic-top-link.active {
  border-bottom-color: var(--secondary) !important;
  color: var(--secondary) !important;
}

.academic-top-link.active {
  font-weight: 650;
}

body[data-slug="publications"] .page-listing,
body[data-slug="working-papers"] .page-listing,
body[data-slug="activities"] .page-listing,
body[data-slug="teaching"] .page-listing,
body[data-slug="projects"] .page-listing,
body[data-slug="methods"] .page-listing {
  display: none;
}

@media (max-width: 800px) {
  .academic-top-nav {
    width: 100%;
    flex-basis: 100%;
    align-items: flex-start;
    flex-direction: column;
    gap: 0.65rem;
  }

  .academic-top-links {
    column-gap: 1rem;
  }
}
`

export default SiteNav
