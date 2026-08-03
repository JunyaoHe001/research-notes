// @ts-nocheck

;(function () {
  const DATA_URL = "/research-notes/static/tag-network-data.json"
  const STORAGE_KEY = "tag-network-source-filter-state"
  const MAX_TAGS = 140
  const VIEWBOX_WIDTH = 1280
  const VIEWBOX_HEIGHT = 700
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

  function readState(validSources) {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null")
      if (stored && Array.isArray(stored.sources)) {
        return {
          sources: stored.sources.filter((source) => validSources.includes(source)),
          hideIsolates: stored.hideIsolates !== false,
        }
      }
    } catch {
      // Fall through to defaults.
    }
    return { sources: [], hideIsolates: true }
  }

  function saveState(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Session storage is optional.
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;")
  }

  function deterministicUnit(value) {
    let hash = 2166136261
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    return ((hash >>> 0) % 100000) / 100000
  }

  function buildNetwork(documents, selectedSources, hideIsolates, tagLabels) {
    const selected = new Set(selectedSources)
    const useAll = selected.size === 0
    const filteredDocuments = documents.filter((document) => useAll || selected.has(document.source))
    const nodesById = new Map()
    const edgeWeights = new Map()

    for (const document of filteredDocuments) {
      const tags = [...new Set(document.tags ?? [])]
      for (const tag of tags) {
        const node = nodesById.get(tag) ?? {
          id: tag,
          label: tagLabels[tag] ?? tag.replaceAll("-", " "),
          count: 0,
          sourceCounts: {},
        }
        node.count += 1
        node.sourceCounts[document.source] = (node.sourceCounts[document.source] ?? 0) + 1
        nodesById.set(tag, node)
      }

      for (let left = 0; left < tags.length; left += 1) {
        for (let right = left + 1; right < tags.length; right += 1) {
          const pair = [tags[left], tags[right]].sort()
          const key = `${pair[0]}\u0000${pair[1]}`
          edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + 1)
        }
      }
    }

    let nodes = [...nodesById.values()]
    let truncated = false
    if (nodes.length > MAX_TAGS) {
      nodes.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "en"))
      nodes = nodes.slice(0, MAX_TAGS)
      truncated = true
    }

    const visibleIds = new Set(nodes.map((node) => node.id))
    let links = [...edgeWeights.entries()]
      .map(([key, weight]) => {
        const [source, target] = key.split("\u0000")
        return { source, target, weight }
      })
      .filter((link) => visibleIds.has(link.source) && visibleIds.has(link.target))

    if (hideIsolates) {
      const degree = new Map(nodes.map((node) => [node.id, 0]))
      for (const link of links) {
        degree.set(link.source, (degree.get(link.source) ?? 0) + link.weight)
        degree.set(link.target, (degree.get(link.target) ?? 0) + link.weight)
      }
      nodes = nodes.filter((node) => (degree.get(node.id) ?? 0) > 0)
      const connected = new Set(nodes.map((node) => node.id))
      links = links.filter((link) => connected.has(link.source) && connected.has(link.target))
    }

    return {
      documents: filteredDocuments,
      nodes,
      links,
      truncated,
    }
  }

  function createSvgElement(name, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name)
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value))
    return element
  }

  function setupTagNetwork() {
    if (document.body?.dataset.slug !== "network") return
    const root = document.querySelector("[data-tag-network-root]")
    if (!root || root.dataset.ready === "true") return
    root.dataset.ready = "true"

    const abortController = new AbortController()
    let cancelSimulation = () => {}

    root.innerHTML = '<div class="tag-network-message" role="status">Loading tag network…</div>'

    fetch(DATA_URL, { signal: abortController.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((data) => {
        const sourceOrder = data.sourceOrder ?? []
        const sourceLabels = data.sourceLabels ?? {}
        const tagLabels = data.tagLabels ?? {}
        const documents = data.documents ?? []
        let state = readState(sourceOrder)

        root.innerHTML = `
          <div class="tag-network-controls">
            <div class="tag-network-filter-group" role="group" aria-label="Filter tags by source">
              <button type="button" class="tag-network-filter-chip" data-tag-source="all" aria-pressed="false">All sources</button>
              ${sourceOrder
                .map(
                  (source) =>
                    `<button type="button" class="tag-network-filter-chip" data-tag-source="${escapeHtml(source)}" aria-pressed="false">${escapeHtml(sourceLabels[source] ?? source)}</button>`,
                )
                .join("")}
            </div>
            <label class="tag-network-isolate-toggle">
              <input type="checkbox" data-tag-hide-isolates>
              <span>Hide unconnected tags</span>
            </label>
            <p class="tag-network-status" data-tag-network-status aria-live="polite"></p>
          </div>
          <div class="tag-network-frame">
            <svg class="tag-network-svg" viewBox="0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}" role="img" aria-label="Tag co occurrence network"></svg>
            <div class="tag-network-tooltip" data-tag-network-tooltip></div>
          </div>
        `

        const allButton = root.querySelector('[data-tag-source="all"]')
        const sourceButtons = [...root.querySelectorAll("[data-tag-source]")].filter(
          (button) => button.dataset.tagSource !== "all",
        )
        const isolateInput = root.querySelector("[data-tag-hide-isolates]")
        const status = root.querySelector("[data-tag-network-status]")
        const svg = root.querySelector(".tag-network-svg")
        const tooltip = root.querySelector("[data-tag-network-tooltip]")

        function updateControls() {
          const showAll = state.sources.length === 0
          allButton.classList.toggle("is-active", showAll)
          allButton.setAttribute("aria-pressed", String(showAll))
          for (const button of sourceButtons) {
            const active = state.sources.includes(button.dataset.tagSource)
            button.classList.toggle("is-active", active)
            button.setAttribute("aria-pressed", String(active))
          }
          isolateInput.checked = state.hideIsolates
        }

        function render() {
          cancelSimulation()
          updateControls()
          const network = buildNetwork(documents, state.sources, state.hideIsolates, tagLabels)
          const sourceDescription =
            state.sources.length === 0
              ? "All sources"
              : state.sources.map((source) => sourceLabels[source] ?? source).join(", ")
          status.textContent = `${sourceDescription}. ${network.nodes.length} tags, ${network.links.length} co occurrence links, ${network.documents.length} source items${network.truncated ? `. Showing the ${MAX_TAGS} most frequent tags` : ""}.`
          cancelSimulation = renderSvg(svg, tooltip, network, sourceLabels)
        }

        const handleAll = () => {
          state = { ...state, sources: [] }
          saveState(state)
          render()
        }
        allButton.addEventListener("click", handleAll)

        const sourceHandlers = []
        for (const button of sourceButtons) {
          const handler = () => {
            const source = button.dataset.tagSource
            const sources = new Set(state.sources)
            sources.has(source) ? sources.delete(source) : sources.add(source)
            state = { ...state, sources: [...sources] }
            saveState(state)
            render()
          }
          button.addEventListener("click", handler)
          sourceHandlers.push([button, handler])
        }

        const handleIsolates = () => {
          state = { ...state, hideIsolates: isolateInput.checked }
          saveState(state)
          render()
        }
        isolateInput.addEventListener("change", handleIsolates)

        render()

        window.addCleanup?.(() => {
          cancelSimulation()
          abortController.abort()
          allButton.removeEventListener("click", handleAll)
          isolateInput.removeEventListener("change", handleIsolates)
          for (const [button, handler] of sourceHandlers) button.removeEventListener("click", handler)
          root.dataset.ready = "false"
        })
      })
      .catch((error) => {
        if (error.name === "AbortError") return
        root.innerHTML = '<div class="tag-network-message">The tag network could not be loaded.</div>'
        console.error("[Tag Network] Failed to load data:", error)
      })
  }

  function buildWeightedAdjacency(nodes, links) {
    const adjacency = new Map(nodes.map((node) => [node.id, new Map()]))
    for (const link of links) {
      adjacency.get(link.source)?.set(link.target, link.weight)
      adjacency.get(link.target)?.set(link.source, link.weight)
    }
    return adjacency
  }

  function detectCommunities(nodes, adjacency) {
    const community = new Map(nodes.map((node) => [node.id, node.id]))
    const communitySizes = new Map(nodes.map((node) => [node.id, 1]))
    const ordered = [...nodes].sort((a, b) => {
      const degreeA = [...(adjacency.get(a.id)?.values() ?? [])].reduce((sum, value) => sum + value, 0)
      const degreeB = [...(adjacency.get(b.id)?.values() ?? [])].reduce((sum, value) => sum + value, 0)
      return degreeB - degreeA || a.id.localeCompare(b.id)
    })

    for (let iteration = 0; iteration < 14; iteration += 1) {
      let changes = 0
      const offset = iteration % Math.max(1, ordered.length)
      for (let step = 0; step < ordered.length; step += 1) {
        const node = ordered[(step + offset) % ordered.length]
        const current = community.get(node.id)
        const scores = new Map()

        for (const [neighborId, weight] of adjacency.get(node.id) ?? []) {
          const neighborCommunity = community.get(neighborId)
          scores.set(neighborCommunity, (scores.get(neighborCommunity) ?? 0) + weight)
        }
        if (scores.size === 0) continue

        let bestCommunity = current
        let bestScore = (scores.get(current) ?? 0) / Math.sqrt(communitySizes.get(current) ?? 1)
        for (const [candidate, rawScore] of scores) {
          const size = Math.max(1, communitySizes.get(candidate) ?? 1)
          const score = rawScore / Math.sqrt(size)
          if (
            score > bestScore + 1e-8 ||
            (Math.abs(score - bestScore) < 1e-8 && String(candidate) < String(bestCommunity))
          ) {
            bestCommunity = candidate
            bestScore = score
          }
        }

        if (bestCommunity !== current && bestScore > 0) {
          community.set(node.id, bestCommunity)
          communitySizes.set(current, Math.max(0, (communitySizes.get(current) ?? 1) - 1))
          communitySizes.set(bestCommunity, (communitySizes.get(bestCommunity) ?? 0) + 1)
          changes += 1
        }
      }
      if (changes === 0) break
    }

    return community
  }

  function buildCommunityCenters(nodes, communityByNode) {
    const groups = new Map()
    for (const node of nodes) {
      const community = communityByNode.get(node.id)
      const group = groups.get(community) ?? []
      group.push(node)
      groups.set(community, group)
    }

    const ordered = [...groups.entries()].sort((left, right) => {
      const leftWeight = left[1].reduce((sum, node) => sum + node.weightedDegree + node.count * 2, 0)
      const rightWeight = right[1].reduce((sum, node) => sum + node.weightedDegree + node.count * 2, 0)
      return rightWeight - leftWeight || String(left[0]).localeCompare(String(right[0]))
    })

    const centers = new Map()
    const total = Math.max(1, ordered.length - 1)
    for (let index = 0; index < ordered.length; index += 1) {
      const [community] = ordered[index]
      if (index === 0) {
        centers.set(community, { x: VIEWBOX_WIDTH / 2, y: VIEWBOX_HEIGHT / 2 })
        continue
      }
      const progress = Math.sqrt(index / total)
      const angle = index * GOLDEN_ANGLE
      centers.set(community, {
        x: VIEWBOX_WIDTH / 2 + Math.cos(angle) * VIEWBOX_WIDTH * 0.34 * progress,
        y: VIEWBOX_HEIGHT / 2 + Math.sin(angle) * VIEWBOX_HEIGHT * 0.34 * progress,
      })
    }
    return centers
  }

  function curvedPath(link) {
    const dx = link.target.x - link.source.x
    const dy = link.target.y - link.source.y
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    const ux = dx / distance
    const uy = dy / distance
    const startX = link.source.x + ux * link.source.radius
    const startY = link.source.y + uy * link.source.radius
    const endX = link.target.x - ux * link.target.radius
    const endY = link.target.y - uy * link.target.radius
    const midpointX = (startX + endX) / 2
    const midpointY = (startY + endY) / 2
    const sign = deterministicUnit(`${link.source.id}:${link.target.id}:curve`) > 0.5 ? 1 : -1
    const bend = sign * Math.min(52, 10 + distance * 0.1) / Math.sqrt(Math.max(1, link.weight))
    const controlX = midpointX - uy * bend
    const controlY = midpointY + ux * bend
    return `M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)}`
  }

  function renderSvg(svg, tooltip, network, sourceLabels) {
    svg.replaceChildren()
    tooltip.classList.remove("is-visible")

    if (network.nodes.length === 0) {
      const message = createSvgElement("text", {
        x: VIEWBOX_WIDTH / 2,
        y: VIEWBOX_HEIGHT / 2,
        "text-anchor": "middle",
        fill: "var(--gray)",
        "font-size": 16,
      })
      message.textContent = "No tags are available for the selected sources."
      svg.append(message)
      return () => {}
    }

    const viewport = createSvgElement("g")
    const edgeLayer = createSvgElement("g")
    const nodeLayer = createSvgElement("g")
    viewport.append(edgeLayer, nodeLayer)
    svg.append(viewport)

    const rawLinks = network.links.map((link) => ({ ...link }))
    const weightedDegree = new Map(network.nodes.map((node) => [node.id, 0]))
    for (const link of rawLinks) {
      weightedDegree.set(link.source, (weightedDegree.get(link.source) ?? 0) + link.weight)
      weightedDegree.set(link.target, (weightedDegree.get(link.target) ?? 0) + link.weight)
    }

    const counts = network.nodes.map((node) => node.count)
    const minCount = Math.min(...counts)
    const maxCount = Math.max(...counts)
    const maxDegree = Math.max(1, ...weightedDegree.values())

    const nodes = network.nodes.map((node) => {
      const countRange = Math.sqrt(maxCount) - Math.sqrt(minCount)
      const countScore = countRange > 0
        ? (Math.sqrt(node.count) - Math.sqrt(minCount)) / countRange
        : 0.5
      const degreeScore = Math.sqrt((weightedDegree.get(node.id) ?? 0) / maxDegree)
      const importance = Math.max(0, Math.min(1, countScore * 0.72 + degreeScore * 0.28))
      const radius = 7 + Math.pow(importance, 0.82) * 18
      const fontSize = 9.6 + Math.pow(importance, 0.72) * 3.4
      const labelWidth = Math.max(24, node.label.length * fontSize * 0.53)

      return {
        ...node,
        weightedDegree: weightedDegree.get(node.id) ?? 0,
        importance,
        radius,
        fontSize,
        labelWidth,
        collisionRadius: radius + 9 + Math.min(30, labelWidth * 0.14),
        x: VIEWBOX_WIDTH / 2,
        y: VIEWBOX_HEIGHT / 2,
        vx: 0,
        vy: 0,
        fixed: false,
      }
    })

    const adjacency = buildWeightedAdjacency(nodes, rawLinks)
    const communityByNode = detectCommunities(nodes, adjacency)
    const communityCenters = buildCommunityCenters(nodes, communityByNode)

    const nodesByCommunity = new Map()
    for (const node of nodes) {
      node.community = communityByNode.get(node.id)
      node.communityCenter = communityCenters.get(node.community) ?? {
        x: VIEWBOX_WIDTH / 2,
        y: VIEWBOX_HEIGHT / 2,
      }
      const group = nodesByCommunity.get(node.community) ?? []
      group.push(node)
      nodesByCommunity.set(node.community, group)
    }

    for (const group of nodesByCommunity.values()) {
      group.sort((a, b) => b.weightedDegree - a.weightedDegree || b.count - a.count || a.id.localeCompare(b.id))
      for (let index = 0; index < group.length; index += 1) {
        const node = group[index]
        const angle = deterministicUnit(`${node.id}:angle`) * Math.PI * 2
        const radialDistance = index === 0 ? 0 : 28 + Math.sqrt(index) * 23 + deterministicUnit(`${node.id}:radius`) * 15
        node.x = node.communityCenter.x + Math.cos(angle) * radialDistance
        node.y = node.communityCenter.y + Math.sin(angle) * radialDistance
      }
    }

    const nodesById = new Map(nodes.map((node) => [node.id, node]))
    const links = rawLinks
      .map((link) => ({
        ...link,
        source: nodesById.get(link.source),
        target: nodesById.get(link.target),
      }))
      .filter((link) => link.source && link.target)

    const adjacencyIds = new Map(nodes.map((node) => [node.id, new Set()]))
    for (const link of links) {
      adjacencyIds.get(link.source.id).add(link.target.id)
      adjacencyIds.get(link.target.id).add(link.source.id)
    }

    const linkElements = links.map((link) => {
      const path = createSvgElement("path", {
        class: "tag-network-edge",
        fill: "none",
        "stroke-width": 0.65 + Math.log1p(link.weight) * 0.82,
      })
      edgeLayer.append(path)
      return { link, path }
    })

    const nodeElements = nodes.map((node) => {
      const group = createSvgElement("g", { class: "tag-network-node", tabindex: 0 })
      const circle = createSvgElement("circle", { r: node.radius.toFixed(2) })
      const text = createSvgElement("text", { y: 4 })
      text.textContent = node.label
      text.style.fontSize = `${node.fontSize.toFixed(2)}px`
      group.append(circle, text)
      nodeLayer.append(group)
      return { node, group, text }
    })

    let transform = { x: 0, y: 0, scale: 1 }
    let animationFrame = 0
    let liveAlpha = 0.2
    let activeNode = null
    let draggingNode = null
    let panning = false
    let previousPointer = null

    function applyTransform() {
      viewport.setAttribute(
        "transform",
        `translate(${transform.x} ${transform.y}) scale(${transform.scale})`,
      )
    }

    function updatePositions() {
      for (const { link, path } of linkElements) path.setAttribute("d", curvedPath(link))
      for (const { node, group, text } of nodeElements) {
        group.setAttribute("transform", `translate(${node.x.toFixed(2)} ${node.y.toFixed(2)})`)
        const outwardRight = node.x >= node.communityCenter.x
        text.setAttribute("x", outwardRight ? node.radius + 5 : -(node.radius + 5))
        text.setAttribute("text-anchor", outwardRight ? "start" : "end")
      }
    }

    function focusNode(node, event) {
      activeNode = node
      const neighbors = adjacencyIds.get(node.id) ?? new Set()
      for (const { node: candidate, group } of nodeElements) {
        const visible = candidate.id === node.id || neighbors.has(candidate.id)
        group.classList.toggle("is-focus", candidate.id === node.id)
        group.classList.toggle("is-dim", !visible)
      }
      for (const { link, path } of linkElements) {
        const visible = link.source.id === node.id || link.target.id === node.id
        path.classList.toggle("is-dim", !visible)
      }

      const breakdown = Object.entries(node.sourceCounts)
        .sort((left, right) => right[1] - left[1])
        .map(([source, count]) => `${escapeHtml(sourceLabels[source] ?? source)}: ${count}`)
        .join("<br>")
      tooltip.innerHTML = `<strong>${escapeHtml(node.label)}</strong>${node.count} source item${node.count === 1 ? "" : "s"}${breakdown ? `<br>${breakdown}` : ""}`
      tooltip.style.left = `${event.offsetX}px`
      tooltip.style.top = `${event.offsetY}px`
      tooltip.classList.add("is-visible")
    }

    function clearFocus() {
      activeNode = null
      tooltip.classList.remove("is-visible")
      for (const { group } of nodeElements) group.classList.remove("is-focus", "is-dim")
      for (const { path } of linkElements) path.classList.remove("is-dim")
    }

    function svgPoint(event) {
      const rect = svg.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * VIEWBOX_WIDTH
      const y = ((event.clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT
      return {
        x: (x - transform.x) / transform.scale,
        y: (y - transform.y) / transform.scale,
        rawX: x,
        rawY: y,
      }
    }

    const nodeHandlers = []
    for (const { node, group } of nodeElements) {
      const enter = (event) => focusNode(node, event)
      const move = (event) => {
        if (activeNode === node) {
          tooltip.style.left = `${event.offsetX}px`
          tooltip.style.top = `${event.offsetY}px`
        }
      }
      const leave = () => {
        if (!draggingNode) clearFocus()
      }
      const down = (event) => {
        event.stopPropagation()
        draggingNode = node
        node.fixed = true
        group.setPointerCapture?.(event.pointerId)
        focusNode(node, event)
      }
      const keydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          activeNode === node ? clearFocus() : focusNode(node, event)
        }
      }
      group.addEventListener("pointerenter", enter)
      group.addEventListener("pointermove", move)
      group.addEventListener("pointerleave", leave)
      group.addEventListener("pointerdown", down)
      group.addEventListener("keydown", keydown)
      nodeHandlers.push([group, enter, move, leave, down, keydown])
    }

    const handlePointerMove = (event) => {
      const point = svgPoint(event)
      if (draggingNode) {
        draggingNode.x = point.x
        draggingNode.y = point.y
        draggingNode.vx = 0
        draggingNode.vy = 0
        liveAlpha = Math.max(liveAlpha, 0.12)
        updatePositions()
        return
      }
      if (panning && previousPointer) {
        transform.x += point.rawX - previousPointer.rawX
        transform.y += point.rawY - previousPointer.rawY
        previousPointer = point
        applyTransform()
      }
    }

    const handlePointerUp = () => {
      if (draggingNode) draggingNode.fixed = false
      draggingNode = null
      panning = false
      previousPointer = null
      svg.classList.remove("is-panning")
    }

    const handlePointerDown = (event) => {
      if (event.target.closest?.(".tag-network-node")) return
      panning = true
      previousPointer = svgPoint(event)
      svg.classList.add("is-panning")
      clearFocus()
    }

    const handleWheel = (event) => {
      event.preventDefault()
      const point = svgPoint(event)
      const nextScale = Math.max(0.4, Math.min(3.4, transform.scale * Math.exp(-event.deltaY * 0.001)))
      const ratio = nextScale / transform.scale
      transform.x = point.rawX - (point.rawX - transform.x) * ratio
      transform.y = point.rawY - (point.rawY - transform.y) * ratio
      transform.scale = nextScale
      applyTransform()
    }

    svg.addEventListener("pointerdown", handlePointerDown)
    svg.addEventListener("pointermove", handlePointerMove)
    svg.addEventListener("pointerup", handlePointerUp)
    svg.addEventListener("pointercancel", handlePointerUp)
    svg.addEventListener("pointerleave", handlePointerUp)
    svg.addEventListener("wheel", handleWheel, { passive: false })

    function tick(alpha) {
      const chargeStrength = 4300 * alpha
      const centerStrength = 0.0018 * alpha
      const communityStrength = 0.0105 * alpha

      for (let left = 0; left < nodes.length; left += 1) {
        for (let right = left + 1; right < nodes.length; right += 1) {
          const a = nodes[left]
          const b = nodes[right]
          let dx = b.x - a.x
          let dy = b.y - a.y
          let distanceSquared = dx * dx + dy * dy
          if (distanceSquared < 1) {
            dx = 0.5 - deterministicUnit(`${a.id}:${b.id}`)
            dy = 0.5 - deterministicUnit(`${b.id}:${a.id}`)
            distanceSquared = dx * dx + dy * dy
          }
          const distance = Math.sqrt(distanceSquared)
          const minimumDistance = a.collisionRadius + b.collisionRadius + 8

          const charge = chargeStrength * (0.72 + (a.importance + b.importance) * 0.38)
          const repulsion = charge / Math.max(180, distanceSquared)
          let fx = (dx / distance) * repulsion
          let fy = (dy / distance) * repulsion

          if (distance < minimumDistance) {
            const overlap = minimumDistance - distance
            const collision = overlap * 0.22 * alpha
            fx += (dx / distance) * collision
            fy += (dy / distance) * collision
          }

          if (!a.fixed) {
            a.vx -= fx
            a.vy -= fy
          }
          if (!b.fixed) {
            b.vx += fx
            b.vy += fy
          }
        }
      }

      for (const link of links) {
        const dx = link.target.x - link.source.x
        const dy = link.target.y - link.source.y
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy))
        const targetDistance =
          105 +
          (link.source.radius + link.target.radius) * 1.65 +
          24 / Math.sqrt(Math.max(1, link.weight))
        const springStrength = (0.010 + Math.min(0.014, link.weight * 0.0035)) * alpha
        const force = (distance - targetDistance) * springStrength
        const fx = (dx / distance) * force
        const fy = (dy / distance) * force
        if (!link.source.fixed) {
          link.source.vx += fx
          link.source.vy += fy
        }
        if (!link.target.fixed) {
          link.target.vx -= fx
          link.target.vy -= fy
        }
      }

      for (const node of nodes) {
        if (node.fixed) continue
        node.vx += (node.communityCenter.x - node.x) * communityStrength
        node.vy += (node.communityCenter.y - node.y) * communityStrength
        node.vx += (VIEWBOX_WIDTH / 2 - node.x) * centerStrength
        node.vy += (VIEWBOX_HEIGHT / 2 - node.y) * centerStrength
        node.vx *= 0.78
        node.vy *= 0.78
        node.x += node.vx
        node.y += node.vy
        node.x = Math.max(42, Math.min(VIEWBOX_WIDTH - 42, node.x))
        node.y = Math.max(38, Math.min(VIEWBOX_HEIGHT - 38, node.y))
      }
    }

    function fitLayout() {
      const minX = Math.min(...nodes.map((node) => node.x - node.collisionRadius))
      const maxX = Math.max(...nodes.map((node) => node.x + node.collisionRadius + Math.min(70, node.labelWidth * 0.38)))
      const minY = Math.min(...nodes.map((node) => node.y - node.collisionRadius))
      const maxY = Math.max(...nodes.map((node) => node.y + node.collisionRadius))
      const width = Math.max(1, maxX - minX)
      const height = Math.max(1, maxY - minY)
      const scale = Math.max(
        0.72,
        Math.min(1.14, Math.min((VIEWBOX_WIDTH - 90) / width, (VIEWBOX_HEIGHT - 80) / height)),
      )
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      for (const node of nodes) {
        node.x = VIEWBOX_WIDTH / 2 + (node.x - centerX) * scale
        node.y = VIEWBOX_HEIGHT / 2 + (node.y - centerY) * scale
        node.communityCenter = {
          x: VIEWBOX_WIDTH / 2 + (node.communityCenter.x - centerX) * scale,
          y: VIEWBOX_HEIGHT / 2 + (node.communityCenter.y - centerY) * scale,
        }
      }
    }

    for (let iteration = 0; iteration < 300; iteration += 1) {
      const alpha = Math.max(0.045, Math.pow(1 - iteration / 300, 1.45))
      tick(alpha)
    }
    fitLayout()

    function simulate() {
      tick(liveAlpha)
      liveAlpha *= 0.965
      updatePositions()
      if (liveAlpha > 0.008) animationFrame = requestAnimationFrame(simulate)
    }

    applyTransform()
    updatePositions()
    animationFrame = requestAnimationFrame(simulate)

    return () => {
      cancelAnimationFrame(animationFrame)
      clearFocus()
      svg.removeEventListener("pointerdown", handlePointerDown)
      svg.removeEventListener("pointermove", handlePointerMove)
      svg.removeEventListener("pointerup", handlePointerUp)
      svg.removeEventListener("pointercancel", handlePointerUp)
      svg.removeEventListener("pointerleave", handlePointerUp)
      svg.removeEventListener("wheel", handleWheel)
      for (const [group, enter, move, leave, down, keydown] of nodeHandlers) {
        group.removeEventListener("pointerenter", enter)
        group.removeEventListener("pointermove", move)
        group.removeEventListener("pointerleave", leave)
        group.removeEventListener("pointerdown", down)
        group.removeEventListener("keydown", keydown)
      }
    }
  }

  document.addEventListener("nav", setupTagNetwork)
  document.addEventListener("render", setupTagNetwork)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupTagNetwork, { once: true })
  } else {
    setupTagNetwork()
  }
})()
