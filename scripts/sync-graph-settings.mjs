#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import YAML from "yaml"

const ROOT = process.cwd()
const CONTENT_ROOT = path.join(ROOT, "content")
const SETTINGS_PATH = path.join(CONTENT_ROOT, "site-settings", "graph.md")
const GENERATED_MODULE_PATH = path.join(ROOT, "quartz", "graph-settings.generated.ts")
const QUARTZ_CONFIG_PATH = path.join(ROOT, "quartz.config.yaml")
const HIDDEN_GRAPH_TAG = "graph-hidden"
const RELATED_START = "<!-- GRAPH-RELATED-PAGES:START -->"
const RELATED_END = "<!-- GRAPH-RELATED-PAGES:END -->"

function parseFrontmatter(source, filePath) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) throw new Error(`Missing YAML frontmatter in ${filePath}`)

  return {
    data: YAML.parse(match[1]) ?? {},
    body: source.slice(match[0].length),
  }
}

function normalizePlacement(value) {
  const text = String(value ?? "").trim().toLowerCase()
  if (text.includes("home")) return "home"
  if (text.includes("research")) return "research"
  return "network"
}

function normalizeScope(value) {
  const text = String(value ?? "").trim().toLowerCase()
  return text.includes("current") ? "current-page" : "entire-site"
}

function normalizeDepth(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 2
  return Math.max(1, Math.min(3, Math.round(number)))
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === "boolean") return value
  if (value === undefined || value === null || value === "") return fallback
  const text = String(value).trim().toLowerCase()
  return !["false", "0", "no", "off"].includes(text)
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (value === undefined || value === null || value === "") return []
  return [String(value).trim()].filter(Boolean)
}

function normalizeRelatedSlug(value) {
  return String(value)
    .trim()
    .replace(/^https?:\/\/junyaohe001\.github\.io\/research-notes\//i, "")
    .replace(/^\/research-notes\//i, "")
    .replace(/^\.\//, "")
    .replace(/^\//, "")
    .replace(/\.md$/i, "")
    .replace(/\/index$/i, "")
    .replace(/\/$/, "")
}

function stripManagedRelatedBlock(body) {
  const start = body.indexOf(RELATED_START)
  const end = body.indexOf(RELATED_END)
  if (start === -1 || end === -1 || end < start) return body.trimEnd()

  const before = body.slice(0, start).trimEnd()
  const after = body.slice(end + RELATED_END.length).trim()
  return [before, after].filter(Boolean).join("\n\n")
}

function renderRelatedBlock(relatedPages) {
  if (relatedPages.length === 0) return ""
  const links = relatedPages.map((slug) => `- [[${slug}]]`).join("\n")
  return `${RELATED_START}\n<span class="graph-related-anchor" aria-hidden="true"></span>\n\n${links}\n${RELATED_END}`
}

async function listMarkdownFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name === "site-settings") continue
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await listMarkdownFiles(absolutePath)))
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(absolutePath)
  }

  return files
}

async function writeGeneratedSettings(settings) {
  const source = `export type GraphPlacement = "home" | "research" | "network"\nexport type GraphScope = "current-page" | "entire-site"\n\nexport const graphSettings = {\n  enabled: ${settings.enabled},\n  placement: "${settings.placement}" as GraphPlacement,\n  scope: "${settings.scope}" as GraphScope,\n  depth: ${settings.depth},\n} as const\n`
  await fs.writeFile(GENERATED_MODULE_PATH, source, "utf8")
}

async function synchronizeQuartzConfig() {
  let source = await fs.readFile(QUARTZ_CONFIG_PATH, "utf8")

  if (!source.includes("    - site-settings")) {
    source = source.replace("    - .obsidian\n", "    - .obsidian\n    - site-settings\n")
  }

  if (!source.includes('  - source: "@quartz-community/graph"')) {
    const graphEntry = `  - source: "@quartz-community/graph"\n    enabled: true\n    layout:\n      position: afterBody\n      priority: 40\n      condition: graph-placement\n\n`
    const searchEntry = '  - source: "@quartz-community/search"\n'
    if (!source.includes(searchEntry)) {
      throw new Error("Could not find the Search plugin insertion point in quartz.config.yaml")
    }
    source = source.replace(searchEntry, `${graphEntry}${searchEntry}`)
  }

  await fs.writeFile(QUARTZ_CONFIG_PATH, source, "utf8")
}

async function prepareGraphRelationships() {
  const files = await listMarkdownFiles(CONTENT_ROOT)
  let changed = 0

  for (const filePath of files) {
    const original = await fs.readFile(filePath, "utf8")
    const { data, body } = parseFrontmatter(original, filePath)
    let metadataChanged = false

    const tags = normalizeStringArray(data.tags)
    const includeInGraph = normalizeBoolean(data["show-in-graph"], true)
    const filteredTags = tags.filter((tag) => tag !== HIDDEN_GRAPH_TAG)
    if (!includeInGraph) filteredTags.push(HIDDEN_GRAPH_TAG)

    if (JSON.stringify(tags) !== JSON.stringify(filteredTags)) {
      if (filteredTags.length > 0) data.tags = filteredTags
      else delete data.tags
      metadataChanged = true
    }

    const relatedPages = [...new Set(normalizeStringArray(data["related-pages"]).map(normalizeRelatedSlug))]
      .filter(Boolean)
    const cleanBody = stripManagedRelatedBlock(body)
    const relatedBlock = renderRelatedBlock(relatedPages)
    const nextBody = [cleanBody, relatedBlock].filter(Boolean).join("\n\n")

    const bodyChanged = body.trim() !== nextBody.trim()
    if (!metadataChanged && !bodyChanged) continue

    const frontmatter = YAML.stringify(data, { lineWidth: 0 }).trimEnd()
    const nextSource = `---\n${frontmatter}\n---\n\n${nextBody.trim()}\n`
    await fs.writeFile(filePath, nextSource, "utf8")
    changed += 1
  }

  return changed
}

async function main() {
  const settingsSource = await fs.readFile(SETTINGS_PATH, "utf8")
  const { data } = parseFrontmatter(settingsSource, SETTINGS_PATH)
  const settings = {
    enabled: normalizeBoolean(data["graph-enabled"], true),
    placement: normalizePlacement(data["graph-placement"]),
    scope: normalizeScope(data["graph-scope"]),
    depth: normalizeDepth(data["graph-depth"]),
  }

  await writeGeneratedSettings(settings)
  await synchronizeQuartzConfig()
  const relationshipFiles = await prepareGraphRelationships()

  console.log(
    `Graph settings synchronized: enabled=${settings.enabled}, placement=${settings.placement}, scope=${settings.scope}, depth=${settings.depth}.`,
  )
  console.log(`Prepared graph relationships in ${relationshipFiles} content file(s).`)
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
