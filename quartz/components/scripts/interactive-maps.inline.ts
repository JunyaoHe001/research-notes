// @ts-nocheck

;(function () {
  const DATA_URL = "/research-notes/static/interactive-maps.json"

  function normaliseExternalUrl(value) {
    try {
      const url = new URL(String(value), window.location.origin)
      return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null
    } catch {
      return null
    }
  }

  function normaliseImageUrl(value) {
    if (typeof value !== "string" || value.trim() === "") return null
    try {
      const url = new URL(value, window.location.origin)
      return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null
    } catch {
      return null
    }
  }

  function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName)
    element.className = className
    element.textContent = text
    return element
  }

  function createCard(entry) {
    const href = normaliseExternalUrl(entry.externalLink)
    const screenshot = normaliseImageUrl(entry.screenshot)
    if (!href || !screenshot || !entry.title) return null

    const card = document.createElement("a")
    card.className = "interactive-map-card"
    card.href = href
    card.target = "_blank"
    card.rel = "noopener noreferrer"
    card.setAttribute("aria-label", `Open interactive map: ${entry.title}`)

    const media = document.createElement("span")
    media.className = "interactive-map-media"

    const image = document.createElement("img")
    image.src = screenshot
    image.alt = entry.imageAlt || `Preview of ${entry.title}`
    image.loading = "lazy"
    image.decoding = "async"
    image.addEventListener("error", () => {
      media.classList.add("is-missing")
      image.remove()
      media.append(createTextElement("span", "interactive-map-image-fallback", "Preview unavailable"))
    })
    media.append(image)

    const body = document.createElement("span")
    body.className = "interactive-map-body"
    body.append(createTextElement("span", "interactive-map-title", entry.title))

    if (entry.subtitle) {
      body.append(createTextElement("span", "interactive-map-subtitle", entry.subtitle))
    }
    if (entry.description) {
      body.append(createTextElement("span", "interactive-map-description", entry.description))
    }

    const action = createTextElement("span", "interactive-map-action", "Open interactive map")
    action.setAttribute("aria-hidden", "true")
    body.append(action)

    card.append(media, body)
    return card
  }

  async function setupInteractiveMaps() {
    const roots = [...document.querySelectorAll("[data-interactive-maps-root]")]
    if (roots.length === 0) return

    for (const root of roots) {
      if (root.dataset.interactiveMapsState === "loading" || root.dataset.interactiveMapsState === "ready") {
        continue
      }
      root.dataset.interactiveMapsState = "loading"

      try {
        const response = await fetch(DATA_URL, { cache: "no-cache" })
        if (!response.ok) throw new Error(`Interactive maps request failed with ${response.status}`)
        const payload = await response.json()
        const entries = Array.isArray(payload)
          ? payload
              .filter((entry) => entry && entry.showOnResearch !== false)
              .sort(
                (left, right) =>
                  Number(left.displayOrder ?? 999) - Number(right.displayOrder ?? 999) ||
                  String(left.title ?? "").localeCompare(String(right.title ?? "")),
              )
          : []

        const cards = entries.map(createCard).filter(Boolean)
        root.replaceChildren()

        if (cards.length === 0) {
          root.append(createTextElement("p", "interactive-maps-message", "No interactive maps are currently listed."))
        } else {
          root.append(...cards)
        }
        root.dataset.interactiveMapsState = "ready"
      } catch (error) {
        console.error(error)
        root.replaceChildren(
          createTextElement(
            "p",
            "interactive-maps-message is-error",
            "Interactive maps could not be loaded at this time.",
          ),
        )
        root.dataset.interactiveMapsState = "error"
      }
    }
  }

  document.addEventListener("nav", setupInteractiveMaps)
  document.addEventListener("render", setupInteractiveMaps)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupInteractiveMaps, { once: true })
  } else {
    setupInteractiveMaps()
  }
})()
