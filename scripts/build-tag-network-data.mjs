#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import YAML from "yaml"

const ROOT = process.cwd()
const CONTENT_ROOT = path.join(ROOT, "content")
const OUTPUT_PATH = path.join(ROOT, "public", "static", "tag-network-data.json")

const SOURCE_ORDER = [
  "research",
  "publications",
  "working-papers",
  "teaching",
  "projects",
  "activities",
  "methods",
]

const SOURCE_LABELS = {
  research: "Research",
  publications: "Publications",
  "working-papers": "Working Papers",
  teaching: "Teaching",
  projects: "Projects",
  activities: "Activities",
  methods: "Methods",
}

const ADMIN_TAGS = new Set([
  "graph-hidden",
  "network",
  "research",
  "publication",
  "publications",
  "working-paper",
  "working-papers",
  "teaching",
  "project",
  "projects",
  "activity",
  "activities",
  "method",
  "methods",
])

function parseFrontmatter(source, filePath) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return {}
  try {
    return YAML.parse(match[1]) ?? {}
  } catch (error) {
    throw new Error(`Invalid YAML frontmatter in ${filePath}: ${error.message}`)
  }
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === "") return []
  return [value]
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === "boolean") return value
  if (value === undefined || value === null || value === "") return fallback
  const text = String(value).trim().toLowerCase()
  return !["false", "0", "no", "off"].includes(text)
}

function normalizeTag(value) {
  return String(value)
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function displayTag(value) {
  return String(value)
    .trim()
    .replace(/^#+/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
}

function sourceFor(relativePath) {
  const normalized = relativePath.split(path.sep).join("/")
  const parts = normalized.split("/")

  if (parts.length === 1) {
    if (["index.md", "research.md", "research-agenda.md"].includes(parts[0])) return "research"
    return null
  }

  const first = parts[0]
  return SOURCE_ORDER.includes(first) ? first : null
}

function slugFor(relativePath) {
  const normalized = relativePath.split(path.sep).join("/").replace(/\.md$/i, "")
  return normalized.replace(/\/index$/i, "") || "index"
}

async function listMarkdownFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (["site-settings", "private", "templates"].includes(entry.name)) continue
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await listMarkdownFiles(absolutePath)))
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(absolutePath)
  }

  return files
}

async function main() {
  const files = await listMarkdownFiles(CONTENT_ROOT)
  const documents = []
  const tagLabels = {}

  for (const absolutePath of files) {
    const relativePath = path.relative(CONTENT_ROOT, absolutePath)
    const source = sourceFor(relativePath)
    if (!source || relativePath.split(path.sep).join("/") === "network.md") continue
    if (path.basename(relativePath) === "index.md" && source !== "research") continue

    const markdown = await fs.readFile(absolutePath, "utf8")
    const data = parseFrontmatter(markdown, absolutePath)
    if (data.draft === true || data.unlisted === true) continue
    const includeInNetwork = normalizeBoolean(
      data["show-in-tag-network"] ?? data["show-in-graph"],
      true,
    )
    if (!includeInNetwork) continue

    const tags = []
    const seen = new Set()
    for (const rawTag of normalizeArray(data.tags)) {
      const canonical = normalizeTag(rawTag)
      if (!canonical || ADMIN_TAGS.has(canonical) || seen.has(canonical)) continue
      seen.add(canonical)
      tags.push(canonical)
      if (!tagLabels[canonical]) tagLabels[canonical] = displayTag(rawTag) || canonical
    }

    if (tags.length === 0) continue

    documents.push({
      id: slugFor(relativePath),
      title: String(data.title ?? slugFor(relativePath)),
      source,
      tags,
    })
  }

  documents.sort(
    (left, right) =>
      left.source.localeCompare(right.source) || left.title.localeCompare(right.title, "en"),
  )

  const data = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceOrder: SOURCE_ORDER,
    sourceLabels: SOURCE_LABELS,
    tagLabels,
    documents,
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(data)}\n`, "utf8")

  const uniqueTags = new Set(documents.flatMap((document) => document.tags))
  const sourceSummary = Object.fromEntries(
    SOURCE_ORDER.map((source) => [
      source,
      documents.filter((document) => document.source === source).length,
    ]),
  )

  console.log(
    `Generated tag network data with ${documents.length} source items and ${uniqueTags.size} unique tags.`,
  )
  console.log(`Source items: ${JSON.stringify(sourceSummary)}`)
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
