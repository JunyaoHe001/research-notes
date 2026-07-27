import { FullSlug } from "../util/path"
import { QuartzComponent } from "./types"

const SITE_ROOT = "/research-notes"

const interfaceLocales = [
  { code: "en", locale: "en-US", label: "EN", title: "English" },
  { code: "nl", locale: "nl-NL", label: "NL", title: "Nederlands" },
  { code: "zh", locale: "zh-CN", label: "中文", title: "中文" },
  { code: "de", locale: "de-DE", label: "DE", title: "Deutsch" },
  { code: "fr", locale: "fr-FR", label: "FR", title: "Français" },
  { code: "es", locale: "es-ES", label: "ES", title: "Español" },
] as const

const SiteNav: QuartzComponent = ({ fileData, cfg }) => {
  const current = (fileData.slug ?? "index") as FullSlug
  const activeLocale =
    interfaceLocales.find((item) => item.locale === cfg.locale) ?? interfaceLocales[0]
  const localizedRoot =
    activeLocale.code === "en" ? SITE_ROOT : `${SITE_ROOT}/${activeLocale.code}`

  const links = [
    { label: "Home", href: `${localizedRoot}/`, slug: "index" },
    { label: "Research", href: `${localizedRoot}/research`, slug: "research" },
    { label: "Publications", href: `${localizedRoot}/publications/`, slug: "publications" },
    {
      label: "Working papers",
      href: `${localizedRoot}/working-papers/`,
      slug: "working-papers",
    },
    { label: "Activities", href: `${localizedRoot}/activities/`, slug: "activities" },
    { label: "Teaching", href: `${localizedRoot}/teaching/`, slug: "teaching" },
  ]

  const currentPath = current === "index" ? "/" : `/${current}`
  const isActive = (slug: string) =>
    slug === "index" ? current === "index" : current === slug || current.startsWith(`${slug}/`)

  return (
    <nav class="academic-top-nav" aria-label="Primary navigation">
      <a class="academic-top-name internal" href={`${localizedRoot}/`}>
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
      <div class="academic-language-links" aria-label="Interface language">
        {interfaceLocales.map((item) => {
          const root = item.code === "en" ? SITE_ROOT : `${SITE_ROOT}/${item.code}`
          const href = `${root}${currentPath}`
          const active = item.locale === activeLocale.locale

          return (
            <a
              class={`academic-language-link${active ? " active" : ""}`}
              href={href}
              lang={item.code === "zh" ? "zh-CN" : item.code}
              title={item.title}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </a>
          )
        })}
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
  gap: 1.35rem;
}

.academic-top-name,
.academic-top-link,
.academic-language-link {
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

.academic-top-links,
.academic-language-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.academic-top-links {
  column-gap: 1rem;
  row-gap: 0.4rem;
}

.academic-language-links {
  margin-left: auto;
  column-gap: 0.45rem;
  row-gap: 0.25rem;
}

.academic-top-link {
  border-bottom: 1px solid transparent !important;
  color: var(--darkgray) !important;
  font-size: 0.92rem;
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
}

.academic-language-link {
  color: var(--gray) !important;
  font-family: var(--bodyFont);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.4;
  white-space: nowrap;
}

.academic-top-link:hover,
.academic-top-link.active,
.academic-language-link:hover,
.academic-language-link.active {
  color: var(--secondary) !important;
}

.academic-top-link:hover,
.academic-top-link.active {
  border-bottom-color: var(--secondary) !important;
}

.academic-top-link.active,
.academic-language-link.active {
  font-weight: 700;
}

@media (max-width: 1050px) {
  .academic-top-nav {
    flex-wrap: wrap;
  }

  .academic-language-links {
    width: 100%;
    margin-left: 0;
  }
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
