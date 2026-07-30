// @ts-nocheck

;(function () {
  const STORAGE_KEY = "research-network-filter-state"
  const CATEGORY_LABELS = {
    research: "Research",
    projects: "Projects",
    publications: "Publications",
    "working-papers": "Working Papers",
    activities: "Activities",
    teaching: "Teaching",
    methods: "Methods",
  }

  function normalizeSlug(value) {
    return String(value ?? "")
      .trim()
      .replace(/^https?:\/\/junyaohe001\.github\.io\/research-notes\//i, "")
      .replace(/^\/research-notes\//i, "")
      .replace(/^\.\//, "")
      .replace(/^\//, "")
      .replace(/\.md$/i, "")
      .replace(/\/index$/i, "")
      .replace(/\/$/, "") || "index"
  }

  function categoryForSlug(value) {
    const slug = normalizeSlug(value)
    if (["index", "research", "research-agenda", "network"].includes(slug)) return "research"
    if (slug === "projects" || slug.startsWith("projects/")) return "projects"
    if (slug === "publications" || slug.startsWith("publications/")) return "publications"
    if (slug === "working-papers" || slug.startsWith("working-papers/")) return "working-papers"
    if (slug === "activities" || slug.startsWith("activities/")) return "activities"
    if (slug === "teaching" || slug.startsWith("teaching/")) return "teaching"
    if (slug === "methods" || slug.startsWith("methods/")) return "methods"
    return null
  }

  function readState() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null")
      if (stored && Array.isArray(stored.categories)) {
        return {
          categories: stored.categories.filter((category) => CATEGORY_LABELS[category]),
          hideIsolates: stored.hideIsolates !== false,
        }
      }
    } catch {
      // Use the defaults below when the stored state is invalid.
    }
    return { categories: [], hideIsolates: true }
  }

  function saveState(state) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  function filteredGraphData(rawData) {
    const source = rawData?.content && typeof rawData.content === "object" ? rawData.content : rawData
    if (!source || typeof source !== "object") return rawData

    const state = window.__researchGraphState ?? readState()
    const selected = new Set(state.categories ?? [])
    const showAll = selected.size === 0
    const originalKeyBySlug = new Map()

    for (const key of Object.keys(source)) originalKeyBySlug.set(normalizeSlug(key), key)

    const visibleSlugs = new Set()
    for (const [slug, originalKey] of originalKeyBySlug) {
      const item = source[originalKey]
      const tags = Array.isArray(item?.tags) ? item.tags : []
      const category = categoryForSlug(slug)
      if (!category || tags.includes("graph-hidden")) continue
      if (showAll || selected.has(category)) visibleSlugs.add(slug)
    }

    const filtered = {}
    for (const slug of visibleSlugs) {
      const originalKey = originalKeyBySlug.get(slug)
      const item = source[originalKey]
      const links = Array.isArray(item?.links)
        ? item.links.filter((link) => visibleSlugs.has(normalizeSlug(link)))
        : []
      filtered[originalKey] = { ...item, links }
    }

    if (state.hideIsolates) {
      const degree = new Map([...visibleSlugs].map((slug) => [slug, 0]))
      for (const [originalKey, item] of Object.entries(filtered)) {
        const sourceSlug = normalizeSlug(originalKey)
        for (const link of item.links ?? []) {
          const targetSlug = normalizeSlug(link)
          if (!degree.has(targetSlug)) continue
          degree.set(sourceSlug, (degree.get(sourceSlug) ?? 0) + 1)
          degree.set(targetSlug, (degree.get(targetSlug) ?? 0) + 1)
        }
      }

      for (const [slug, count] of degree) {
        if (count === 0) {
          const originalKey = originalKeyBySlug.get(slug)
          delete filtered[originalKey]
          visibleSlugs.delete(slug)
        }
      }

      for (const item of Object.values(filtered)) {
        item.links = (item.links ?? []).filter((link) => visibleSlugs.has(normalizeSlug(link)))
      }
    }

    window.__researchGraphVisibleCount = Object.keys(filtered).length
    return rawData?.content && typeof rawData.content === "object"
      ? { ...rawData, content: filtered }
      : filtered
  }

  window.__researchGraphFilter = filteredGraphData
  window.__researchGraphState = readState()

  function requestGraphRender() {
    document.dispatchEvent(new CustomEvent("render"))
  }

  function updateControls(panel, state) {
    const allButton = panel.querySelector('[data-network-filter="all"]')
    const categoryButtons = panel.querySelectorAll("[data-network-category]")
    const showAll = state.categories.length === 0

    allButton?.classList.toggle("is-active", showAll)
    allButton?.setAttribute("aria-pressed", String(showAll))

    for (const button of categoryButtons) {
      const active = state.categories.includes(button.dataset.networkCategory)
      button.classList.toggle("is-active", active)
      button.setAttribute("aria-pressed", String(active))
    }

    const isolateInput = panel.querySelector("[data-network-hide-isolates]")
    if (isolateInput) isolateInput.checked = state.hideIsolates

    const status = panel.querySelector("[data-network-filter-status]")
    if (status) {
      const categories = showAll
        ? "All content types"
        : state.categories.map((category) => CATEGORY_LABELS[category]).join(", ")
      status.textContent = `${categories}. ${state.hideIsolates ? "Isolated pages hidden." : "Isolated pages shown."}`
    }
  }

  function applyState(panel, state) {
    window.__researchGraphState = state
    saveState(state)
    updateControls(panel, state)
    requestGraphRender()
  }

  function setupControls() {
    if (document.body?.dataset.slug !== "network") return
    const panel = document.querySelector("[data-network-filter-controls]")
    if (!panel || panel.dataset.ready === "true") return

    panel.dataset.ready = "true"
    let state = readState()
    window.__researchGraphState = state
    updateControls(panel, state)

    const allButton = panel.querySelector('[data-network-filter="all"]')
    const handleAll = () => {
      state = { ...state, categories: [] }
      applyState(panel, state)
    }
    allButton?.addEventListener("click", handleAll)
    window.addCleanup?.(() => allButton?.removeEventListener("click", handleAll))

    for (const button of panel.querySelectorAll("[data-network-category]")) {
      const handleCategory = () => {
        const category = button.dataset.networkCategory
        const categories = new Set(state.categories)
        categories.has(category) ? categories.delete(category) : categories.add(category)
        state = { ...state, categories: [...categories] }
        applyState(panel, state)
      }
      button.addEventListener("click", handleCategory)
      window.addCleanup?.(() => button.removeEventListener("click", handleCategory))
    }

    const isolateInput = panel.querySelector("[data-network-hide-isolates]")
    const handleIsolates = () => {
      state = { ...state, hideIsolates: isolateInput.checked }
      applyState(panel, state)
    }
    isolateInput?.addEventListener("change", handleIsolates)
    window.addCleanup?.(() => isolateInput?.removeEventListener("change", handleIsolates))

    queueMicrotask(requestGraphRender)
  }

  document.addEventListener("nav", setupControls)
  document.addEventListener("render", setupControls)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupControls, { once: true })
  } else {
    setupControls()
  }
})()
