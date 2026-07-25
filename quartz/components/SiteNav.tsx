import { QuartzComponent } from "./types"

const SiteNav: QuartzComponent = ({ fileData }) => {
  const current = fileData.slug ?? "index"
  const links = [
    { label: "Home", href: "/research-notes/", slug: "index" },
    { label: "Research", href: "/research-notes/research", slug: "research" },
    { label: "Publications", href: "/research-notes/publications", slug: "publications" },
    {
      label: "Working Papers",
      href: "/research-notes/working-papers/",
      slug: "working-papers",
    },
  ]

  const isActive = (slug: string) =>
    slug === "index" ? current === "index" : current === slug || current.startsWith(`${slug}/`)

  return (
    <nav class="academic-site-nav" aria-label="Primary navigation">
      <a class="academic-site-name internal" href="/research-notes/">
        Junyao He
      </a>
      <div class="academic-site-links">
        {links.map((link) => (
          <a
            class={`internal academic-site-link${isActive(link.slug) ? " active" : ""}`}
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
.academic-site-nav {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 0 0.9rem;
  border-bottom: 1px solid var(--lightgray);
}

.academic-site-name {
  margin-right: auto;
  color: var(--dark);
  font-size: 1.15rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.academic-site-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.2rem;
}

.academic-site-link {
  color: var(--darkgray);
  font-size: 0.95rem;
  text-decoration: none;
}

.academic-site-link:hover,
.academic-site-link.active {
  color: var(--secondary);
}

.academic-site-link.active {
  font-weight: 600;
}

@media (max-width: 800px) {
  .academic-site-nav {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.65rem;
  }

  .academic-site-links {
    gap: 0.85rem;
  }
}
`

export default SiteNav
