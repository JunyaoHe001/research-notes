import { FullSlug, resolveRelative } from "../util/path"
import { QuartzComponent } from "./types"

const SiteNav: QuartzComponent = ({ fileData }) => {
  const current = (fileData.slug ?? "index") as FullSlug
  const links: { label: string; slug: FullSlug }[] = [
    { label: "Home", slug: "index" as FullSlug },
    { label: "Research", slug: "research" as FullSlug },
    { label: "Publications", slug: "publications" as FullSlug },
    { label: "Working papers", slug: "working-papers" as FullSlug },
  ]

  const isActive = (slug: FullSlug) =>
    slug === ("index" as FullSlug)
      ? current === ("index" as FullSlug)
      : current === slug || current.startsWith(`${slug}/`)

  return (
    <nav class="academic-top-nav" aria-label="Primary navigation">
      <a class="academic-top-name internal" href={resolveRelative(current, "index" as FullSlug)}>
        Junyao He
      </a>
      <div class="academic-top-links">
        {links.map((link) => (
          <a
            class={`internal academic-top-link${isActive(link.slug) ? " active" : ""}`}
            href={resolveRelative(current, link.slug)}
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
  gap: 2rem;
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
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.academic-top-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  column-gap: 1.35rem;
  row-gap: 0.4rem;
}

.academic-top-link {
  border-bottom: 1px solid transparent !important;
  color: var(--darkgray) !important;
  font-size: 0.96rem;
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
