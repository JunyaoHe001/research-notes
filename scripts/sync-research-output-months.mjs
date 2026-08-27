#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import YAML from "yaml"

const ROOT = process.cwd()
const CONTENT_ROOT = path.join(ROOT, "content")
const YEAR_MONTH_PATTERN = /^[0-9]{4}-(0[1-9]|1[0-2])$/

const MARKERS = {
  publications: {
    start: "<!-- AUTO-GENERATED:PUBLICATIONS:START -->",
    end: "<!-- AUTO-GENERATED:PUBLICATIONS:END -->",
  },
  workingPapers: {
    start: "<!-- AUTO-GENERATED:WORKING-PAPERS:START -->",
    end: "<!-- AUTO-GENERATED:WORKING-PAPERS:END -->",
  },
}

function parseFrontmatter(source, filePath) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) throw new Error(`Missing YAML frontmatter in ${filePath}`)

  try {
    return YAML.parse(match[1]) ?? {}
  } catch (error) {
    throw new Error(`Invalid YAML frontmatter in ${filePath}: ${error.message}`)
  }
}

async function loadCollection(relativeDirectory) {
  const directory = path.join(CONTENT_ROOT, relativeDirectory)
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const items = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "index.md") continue

    const absolutePath = path.join(directory, entry.name)
    const source = await fs.readFile(absolutePath, "utf8")
    const data = parseFrontmatter(source, absolutePath)

    if (data.draft === true || data.unlisted === true || data["show-in-overview"] === false) continue

    const yearMonth = String(data["year-month"] ?? "").trim()
    if (!YEAR_MONTH_PATTERN.test(yearMonth)) {
      throw new Error(
        `Invalid or missing year-month in ${absolutePath}. Use YYYY-MM, for example 2026-08.`,
      )
    }

    const slug = entry.name.slice(0, -3)
    items.push({
      data,
      slug,
      title: String(data.title ?? slug),
      yearMonth,
    })
  }

  return items
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (value === undefined || value === null || value === "") return []
  return [String(value)]
}

function escapeTableCell(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim()
}

function contentLink(collection, slug) {
  return `../${collection}/${slug}`
}

function extractExistingOrder(indexSource) {
  const order = new Map()
  const linkPattern = /\]\(([^)]+)\)/g
  let match
  let position = 0

  while ((match = linkPattern.exec(indexSource)) !== null) {
    const href = match[1].split("#")[0].replace(/\/$/, "")
    const slug = path.posix.basename(href)
    if (slug && slug !== "." && slug !== ".." && !order.has(slug)) {
      order.set(slug, position++)
    }
  }

  return order
}

function compareOverrides(a, b, existingOrder) {
  const aOrder = Number(a.data["display-order"])
  const bOrder = Number(b.data["display-order"])
  const aHasOrder = Number.isFinite(aOrder)
  const bHasOrder = Number.isFinite(bOrder)

  if (aHasOrder || bHasOrder) {
    if (!aHasOrder) return 1
    if (!bHasOrder) return -1
    if (aOrder !== bOrder) return aOrder - bOrder
  }

  const aExisting = existingOrder.get(a.slug)
  const bExisting = existingOrder.get(b.slug)
  const aHasExisting = aExisting !== undefined
  const bHasExisting = bExisting !== undefined

  if (aHasExisting || bHasExisting) {
    if (!aHasExisting) return 1
    if (!bHasExisting) return -1
    if (aExisting !== bExisting) return aExisting - bExisting
  }

  return a.title.localeCompare(b.title, "en", { sensitivity: "base" })
}

function compareByYearMonth(existingOrder) {
  return (a, b) => {
    const monthDifference = b.yearMonth.localeCompare(a.yearMonth)
    if (monthDifference !== 0) return monthDifference
    return compareOverrides(a, b, existingOrder)
  }
}

function publicationVenue(data) {
  return data.journal ?? data.publisher ?? data.series ?? data.book ?? data["publication-type"] ?? ""
}

function isLeadAuthored(data) {
  const explicit = String(data.authorship ?? data["author-role"] ?? "").toLowerCase()
  if (explicit.includes("co-authored") || explicit === "coauthored" || explicit === "co") return false
  if (explicit.includes("lead-authored") || explicit === "lead" || explicit === "first-author") return true

  const firstAuthor = normalizeArray(data.authors)[0]
    ?.toLowerCase()
    .replace(/\s+/g, "")
    .replace(/,+$/, "")

  return firstAuthor === "he,j." || firstAuthor === "he,j"
}

function renderPublicationTable(items) {
  const lines = ["| Year–Month | Title | Journal / Publisher |", "| --- | --- | --- |"]
  for (const item of items) {
    lines.push(
      `| ${escapeTableCell(item.yearMonth)} | [${escapeTableCell(item.title)}](${contentLink("publications", item.slug)}) | ${escapeTableCell(publicationVenue(item.data))} |`,
    )
  }
  return lines.join("\n")
}

function renderWorkingPaperSection(title, items) {
  const lines = [`## ${title}`, "", "| Year–Month | Title | Status |", "| --- | --- | --- |"]
  for (const item of items) {
    lines.push(
      `| ${escapeTableCell(item.yearMonth)} | [${escapeTableCell(item.title)}](${contentLink("working-papers", item.slug)}) | ${escapeTableCell(item.data.status)} |`,
    )
  }
  if (items.length === 0) lines.push("| None | No entries currently listed. | None |")
  return lines.join("\n")
}

function replaceManagedBlock(source, markers, generatedContent, filePath) {
  const startIndex = source.indexOf(markers.start)
  const endIndex = source.indexOf(markers.end)

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Managed block markers are missing or invalid in ${filePath}`)
  }

  const before = source.slice(0, startIndex + markers.start.length)
  const after = source.slice(endIndex)
  return `${before}\n${generatedContent.trim()}\n${after}`
}

async function updateManagedIndex(relativePath, markers, render) {
  const filePath = path.join(CONTENT_ROOT, relativePath)
  const source = await fs.readFile(filePath, "utf8")
  const existingOrder = extractExistingOrder(source)
  const generatedContent = await render(existingOrder)
  const updated = replaceManagedBlock(source, markers, generatedContent, filePath)

  if (updated !== source) {
    await fs.writeFile(filePath, updated, "utf8")
    return true
  }

  return false
}

async function main() {
  const changedFiles = []

  if (
    await updateManagedIndex("publications/index.md", MARKERS.publications, async (existingOrder) => {
      const items = await loadCollection("publications")
      items.sort(compareByYearMonth(existingOrder))
      return renderPublicationTable(items)
    })
  ) changedFiles.push("content/publications/index.md")

  if (
    await updateManagedIndex("working-papers/index.md", MARKERS.workingPapers, async (existingOrder) => {
      const items = await loadCollection("working-papers")
      const lead = items.filter((item) => isLeadAuthored(item.data))
      const co = items.filter((item) => !isLeadAuthored(item.data))
      lead.sort(compareByYearMonth(existingOrder))
      co.sort(compareByYearMonth(existingOrder))
      return [
        renderWorkingPaperSection("Lead-authored Working Papers", lead),
        renderWorkingPaperSection("Co-authored Working Papers", co),
      ].join("\n\n")
    })
  ) changedFiles.push("content/working-papers/index.md")

  if (changedFiles.length > 0) {
    console.log(`Updated ${changedFiles.length} year-month index file(s):`)
    for (const file of changedFiles) console.log(`- ${file}`)
  } else {
    console.log("Publication and working-paper month indexes are already up to date.")
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
