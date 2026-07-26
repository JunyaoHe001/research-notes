#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import YAML from "yaml"

const ROOT = process.cwd()
const CONTENT_ROOT = path.join(ROOT, "content")

const MARKERS = {
  publications: {
    start: "<!-- AUTO-GENERATED:PUBLICATIONS:START -->",
    end: "<!-- AUTO-GENERATED:PUBLICATIONS:END -->",
  },
  workingPapers: {
    start: "<!-- AUTO-GENERATED:WORKING-PAPERS:START -->",
    end: "<!-- AUTO-GENERATED:WORKING-PAPERS:END -->",
  },
  activities: {
    start: "<!-- AUTO-GENERATED:ACTIVITIES:START -->",
    end: "<!-- AUTO-GENERATED:ACTIVITIES:END -->",
  },
  teaching: {
    start: "<!-- AUTO-GENERATED:TEACHING:START -->",
    end: "<!-- AUTO-GENERATED:TEACHING:END -->",
  },
  projects: {
    start: "<!-- AUTO-GENERATED:PROJECTS:START -->",
    end: "<!-- AUTO-GENERATED:PROJECTS:END -->",
  },
  methods: {
    start: "<!-- AUTO-GENERATED:METHODS:START -->",
    end: "<!-- AUTO-GENERATED:METHODS:END -->",
  },
}

function parseFrontmatter(source, filePath) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) {
    throw new Error(`Missing YAML frontmatter in ${filePath}`)
  }

  let data
  try {
    data = YAML.parse(match[1]) ?? {}
  } catch (error) {
    throw new Error(`Invalid YAML frontmatter in ${filePath}: ${error.message}`)
  }

  return { data, body: source.slice(match[0].length) }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function loadCollection(relativeDirectory) {
  const directory = path.join(CONTENT_ROOT, relativeDirectory)
  if (!(await fileExists(directory))) return []

  const entries = await fs.readdir(directory, { withFileTypes: true })
  const items = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "index.md") continue

    const absolutePath = path.join(directory, entry.name)
    const source = await fs.readFile(absolutePath, "utf8")
    const { data } = parseFrontmatter(source, absolutePath)
    const slug = entry.name.slice(0, -3)

    if (data.draft === true || data.unlisted === true || data["show-in-overview"] === false) {
      continue
    }

    items.push({
      data,
      fileName: entry.name,
      slug,
      title: String(data.title ?? slug),
    })
  }

  return items
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (value === undefined || value === null || value === "") return []
  return [String(value)]
}

function normalizeYear(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function dateSortValue(data) {
  const rawDate = String(data.date ?? "").trim()
  if (rawDate) {
    const parsed = Date.parse(rawDate)
    if (Number.isFinite(parsed)) return parsed
  }

  const year = normalizeYear(data.year)
  return year > 0 ? Date.UTC(year, 0, 1) : 0
}

function displayDate(data) {
  const rawDate = String(data.date ?? "").trim()
  if (rawDate) return rawDate
  const year = normalizeYear(data.year)
  return year > 0 ? String(year) : ""
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
  const aDisplayOrder = Number(a.data["display-order"])
  const bDisplayOrder = Number(b.data["display-order"])
  const aHasDisplayOrder = Number.isFinite(aDisplayOrder)
  const bHasDisplayOrder = Number.isFinite(bDisplayOrder)

  if (aHasDisplayOrder || bHasDisplayOrder) {
    if (!aHasDisplayOrder) return 1
    if (!bHasDisplayOrder) return -1
    if (aDisplayOrder !== bDisplayOrder) return aDisplayOrder - bDisplayOrder
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

function compareItems(existingOrder) {
  return (a, b) => {
    const yearDifference = normalizeYear(b.data.year) - normalizeYear(a.data.year)
    if (yearDifference !== 0) return yearDifference
    return compareOverrides(a, b, existingOrder)
  }
}

function compareDatedItems(existingOrder) {
  return (a, b) => {
    const dateDifference = dateSortValue(b.data) - dateSortValue(a.data)
    if (dateDifference !== 0) return dateDifference
    return compareOverrides(a, b, existingOrder)
  }
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

function publicationVenue(data) {
  return (
    data.journal ??
    data.publisher ??
    data.series ??
    data.book ??
    data["publication-type"] ??
    ""
  )
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

function isBlogActivity(data) {
  return String(data["activity-type"] ?? "")
    .toLowerCase()
    .includes("blog")
}

function isSupervision(data) {
  return String(data["teaching-type"] ?? "")
    .toLowerCase()
    .includes("supervision")
}

function joinContext(...values) {
  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(", ")
}

function renderPublicationTable(items) {
  const lines = ["| Year | Title | Journal / Publisher |", "| --- | --- | --- |"]

  for (const item of items) {
    lines.push(
      `| ${escapeTableCell(item.data.year)} | [${escapeTableCell(item.title)}](${contentLink("publications", item.slug)}) | ${escapeTableCell(publicationVenue(item.data))} |`,
    )
  }

  return lines.join("\n")
}

function renderWorkingPaperSection(title, items) {
  const lines = [
    `## ${title}`,
    "",
    "| Year | Title | Status |",
    "| --- | --- | --- |",
  ]

  for (const item of items) {
    lines.push(
      `| ${escapeTableCell(item.data.year)} | [${escapeTableCell(item.title)}](${contentLink("working-papers", item.slug)}) | ${escapeTableCell(item.data.status)} |`,
    )
  }

  if (items.length === 0) {
    lines.push("| None | No entries currently listed. | None |")
  }

  return lines.join("\n")
}

function renderBlogSection(items) {
  const lines = [
    "## Blog Posts",
    "",
    "| Date | Title | Platform or Topic |",
    "| --- | --- | --- |",
  ]

  for (const item of items) {
    const context = item.data.event ?? item.data.description ?? ""
    lines.push(
      `| ${escapeTableCell(displayDate(item.data))} | [${escapeTableCell(item.title)}](${contentLink("activities", item.slug)}) | ${escapeTableCell(context)} |`,
    )
  }

  if (items.length === 0) {
    lines.push("| None | No entries currently listed. | None |")
  }

  return lines.join("\n")
}

function renderAcademicActivitiesSection(items) {
  const lines = [
    "## Conferences and Presentations",
    "",
    "| Date | Title | Role | Event or Venue |",
    "| --- | --- | --- | --- |",
  ]

  for (const item of items) {
    const eventOrVenue = joinContext(item.data.event, item.data.location)
    lines.push(
      `| ${escapeTableCell(displayDate(item.data))} | [${escapeTableCell(item.title)}](${contentLink("activities", item.slug)}) | ${escapeTableCell(item.data.role)} | ${escapeTableCell(eventOrVenue)} |`,
    )
  }

  if (items.length === 0) {
    lines.push("| None | No entries currently listed. | None | None |")
  }

  return lines.join("\n")
}

function renderCoursesSection(items) {
  const lines = [
    "## Courses and Lectures",
    "",
    "| Year | Title | Role | Course and Institution |",
    "| --- | --- | --- | --- |",
  ]

  for (const item of items) {
    const context = joinContext(item.data.course, item.data.institution)
    lines.push(
      `| ${escapeTableCell(item.data.year)} | [${escapeTableCell(item.title)}](${contentLink("teaching", item.slug)}) | ${escapeTableCell(item.data.role)} | ${escapeTableCell(context)} |`,
    )
  }

  if (items.length === 0) {
    lines.push("| None | No entries currently listed. | None | None |")
  }

  return lines.join("\n")
}

function renderSupervisionSection(items) {
  const lines = [
    "## Thesis Supervision",
    "",
    "| Year | Thesis | Student | Level |",
    "| --- | --- | --- | --- |",
  ]

  for (const item of items) {
    lines.push(
      `| ${escapeTableCell(item.data.year)} | [${escapeTableCell(item.title)}](${contentLink("teaching", item.slug)}) | ${escapeTableCell(item.data.student)} | ${escapeTableCell(item.data.level)} |`,
    )
  }

  if (items.length === 0) {
    lines.push("| None | No entries currently listed. | None | None |")
  }

  return lines.join("\n")
}

function renderLinkedList(items, collection) {
  if (items.length === 0) return "- No entries currently listed."

  return items
    .map((item) => {
      const description = String(item.data.description ?? "").trim()
      const link = contentLink(collection, item.slug)
      return description ? `- [${item.title}](${link}): ${description}` : `- [${item.title}](${link})`
    })
    .join("\n")
}

async function listMarkdownFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(absolutePath)))
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(absolutePath)
    }
  }

  return files
}

async function validateNoEmDash() {
  const files = await listMarkdownFiles(CONTENT_ROOT)
  const violations = []

  for (const filePath of files) {
    const source = await fs.readFile(filePath, "utf8")
    if (source.includes("—")) {
      violations.push(path.relative(ROOT, filePath))
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Sentence level em dashes are not permitted in public content:\n${violations
        .map((filePath) => `- ${filePath}`)
        .join("\n")}`,
    )
  }
}

async function main() {
  const changedFiles = []

  const publicationsChanged = await updateManagedIndex(
    "publications/index.md",
    MARKERS.publications,
    async (existingOrder) => {
      const items = await loadCollection("publications")
      items.sort(compareItems(existingOrder))
      return renderPublicationTable(items)
    },
  )
  if (publicationsChanged) changedFiles.push("content/publications/index.md")

  const workingPapersChanged = await updateManagedIndex(
    "working-papers/index.md",
    MARKERS.workingPapers,
    async (existingOrder) => {
      const items = await loadCollection("working-papers")
      const leadAuthored = items.filter((item) => isLeadAuthored(item.data))
      const coAuthored = items.filter((item) => !isLeadAuthored(item.data))
      leadAuthored.sort(compareItems(existingOrder))
      coAuthored.sort(compareItems(existingOrder))

      return [
        renderWorkingPaperSection("Lead-authored Working Papers", leadAuthored),
        renderWorkingPaperSection("Co-authored Working Papers", coAuthored),
      ].join("\n\n")
    },
  )
  if (workingPapersChanged) changedFiles.push("content/working-papers/index.md")

  const activitiesChanged = await updateManagedIndex(
    "activities/index.md",
    MARKERS.activities,
    async (existingOrder) => {
      const items = await loadCollection("activities")
      const blogPosts = items.filter((item) => isBlogActivity(item.data))
      const academicActivities = items.filter((item) => !isBlogActivity(item.data))
      blogPosts.sort(compareDatedItems(existingOrder))
      academicActivities.sort(compareDatedItems(existingOrder))

      return [
        renderBlogSection(blogPosts),
        renderAcademicActivitiesSection(academicActivities),
      ].join("\n\n")
    },
  )
  if (activitiesChanged) changedFiles.push("content/activities/index.md")

  const teachingChanged = await updateManagedIndex(
    "teaching/index.md",
    MARKERS.teaching,
    async (existingOrder) => {
      const items = await loadCollection("teaching")
      const courses = items.filter((item) => !isSupervision(item.data))
      const supervision = items.filter((item) => isSupervision(item.data))
      courses.sort(compareItems(existingOrder))
      supervision.sort(compareItems(existingOrder))

      return [
        renderCoursesSection(courses),
        renderSupervisionSection(supervision),
      ].join("\n\n")
    },
  )
  if (teachingChanged) changedFiles.push("content/teaching/index.md")

  const projectsChanged = await updateManagedIndex(
    "projects/index.md",
    MARKERS.projects,
    async (existingOrder) => {
      const items = await loadCollection("projects")
      items.sort(compareItems(existingOrder))
      return `## Current notes\n\n${renderLinkedList(items, "projects")}`
    },
  )
  if (projectsChanged) changedFiles.push("content/projects/index.md")

  const methodsChanged = await updateManagedIndex(
    "methods/index.md",
    MARKERS.methods,
    async (existingOrder) => {
      const items = await loadCollection("methods")
      items.sort(compareItems(existingOrder))
      return `## Available method notes\n\n${renderLinkedList(items, "methods")}`
    },
  )
  if (methodsChanged) changedFiles.push("content/methods/index.md")

  await validateNoEmDash()

  if (changedFiles.length > 0) {
    console.log(`Updated ${changedFiles.length} generated index file(s):`)
    for (const file of changedFiles) console.log(`- ${file}`)
  } else {
    console.log("Generated content indexes are already up to date.")
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
