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
    <div class="academic-site-identity">
      <h2 class="academic-site-name">
        <a class="internal" href={resolveRelative(current, "index" as FullSlug)}>
          Junyao He
        </a>
      </h2>
      <nav class="academic-section-nav" aria-label="Primary navigation">
        {links.map((link) => (
          <a
            class={`internal academic-section-link${isActive(link.slug) ? " active" : ""}`}
            href={resolveRelative(current, link.slug)}
            aria-current={isActive(link.slug) ? "page" : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

SiteNav.css = `
.academic-site-identity {
  width: 100%;
  margin: 0 0 1rem;
}

.academic-site-name {
  margin: 0 0 0.55rem;
  font-size: 1.35rem;
  line-height: 1.2;
}

.academic-site-name > a {
  color: var(--dark);
  font-weight: 700;
  text-decoration: none;
}

.academic-section-nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  column-gap: 1rem;
  row-gap: 0.35rem;
}

.academic-section-link {
  padding: 0.05rem 0;
  border-bottom: 1px solid transparent;
  color: var(--darkgray);
  font-size: 0.95rem;
  line-height: 1.4;
  text-decoration: none;
  white-space: nowrap;
}

.academic-section-link:hover,
.academic-section-link.active {
  border-bottom-color: var(--secondary);
  color: var(--secondary);
}

.academic-section-link.active {
  font-weight: 600;
}
`

export default SiteNav
