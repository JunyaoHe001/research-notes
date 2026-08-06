#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import YAML from "yaml"

const ROOT = process.cwd()
const CONTENT_ROOT = path.join(ROOT, "content")

const MARKERS = {
  homeHighlights: {
    start: "<!-- AUTO-GENERATED:HOME-HIGHLIGHTS:START -->",
    end: "<!-- AUTO-GENERATED:HOME-HIGHLIGHTS:END -->",
  },
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
  if (!match) throw new Error(`Missing YAML frontmatter in ${filePath}`)

  try {
    return { data: YAML.parse(match[1]) ?? {}, body: source.slice(match[0].length) }
  } catch (error) {
    throw new Error(`Invalid YAML frontmatter in ${filePath}: ${error.message}`)
  }
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

    if (data.draft === true || data.unlisted === true || data["show-in-overview"] === false) {
      continue
    }

    const slug = entry.name.slice(0, -3)
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

function displayPeriod(data) {
  const period = String(data.period ?? "").trim()
  return period || displayDate(data)
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

function homeActivityLink(slug) {
  return `./activities/${slug}`
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

function compareHomeHighlights(a, b) {
  const aOrder = Number(a.data["home-highlight-order"])
  const bOrder = Number(b.data["home-highlight-order"])
  const aHasOrder = Number.isFinite(aOrder)
  const bHasOrder = Number.isFinite(bOrder)

  if (aHasOrder || bHasOrder) {
    if (!aHasOrder) return 1
    if (!bHasOrder) return -1
    if (aOrder !== bOrder) return aOrder - bOrder
  }

  return dateSortValue(b.data) - dateSortValue(a.data)
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

function activitySection(data) {
  const explicit = String(data["activity-section"] ?? "").toLowerCase()
  if (explicit.includes("editorial") || explicit.includes("academic service")) return "service"
  if (explicit.includes("conference") || explicit.includes("presentation")) return "conference"
  if (explicit.includes("blog")) return "blog"
  if (explicit.includes("talk")) return "talk"

  const type = String(data["activity-type"] ?? "").toLowerCase()
  if (type.includes("guest edit") || type.includes("review") || type.includes("academic service")) {
    return "service"
  }
  if (type.includes("blog")) return "blog"
  if (type.includes("talk") || type.includes("lecture") || type.includes("exhibition")) return "talk"
  return "conference"
}

function isSupervision(data) {
  return String(data["teaching-type"] ?? "").toLowerCase().includes("supervision")
}

function joinContext(...values) {
  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(", ")
}

function renderHomeHighlights(items) {
  const featured = items.filter((item) => item.data["feature-on-home"] === true)
  featured.sort(compareHomeHighlights)

  if (featured.length === 0) return "- No featured activity is currently listed."

  return featured
    .map((item) => {
      const custom = String(item.data["home-highlight-text"] ?? "").trim()
      if (custom) return `- ${custom}`
      const role = String(item.data.role ?? "Academic activity").trim()
      return `- ${role}: [${item.title}](${homeActivityLink(item.slug)})`
    })
    .join("\n")
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
  const lines = [`## ${title}`, "", "| Year | Title | Status |", "| --- | --- | --- |"]
  for (const item of items) {
    lines.push(
      `| ${escapeTableCell(item.data.year)} | [${escapeTableCell(item.title)}](${contentLink("working-papers", item.slug)}) | ${escapeTableCell(item.data.status)} |`,
    )
  }
  if (items.length === 0) lines.push("| None | No entries currently listed. | None |")
  return lines.join("\n")
}

function renderServiceSection(items) {
  const lines = [
    "## Editorial and Academic Service",
    "",
    "| Period | Role | Service |",
    "| --- | --- | --- |",
  ]

  for (const item of items) {
    const context = String(item.data.event ?? "").trim()
    const service = context
      ? `[${escapeTableCell(item.title)}](${contentLink("activities", item.slug)}), ${escapeTableCell(context)}`
      : `[${escapeTableCell(item.title)}](${contentLink("activities", item.slug)})`
    lines.push(
      `| ${escapeTableCell(displayPeriod(item.data))} | ${escapeTableCell(item.data.role)} | ${service} |`,
    )
  }

  if (items.length === 0) lines.push("| None | No entries currently listed. | None |")
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
  if (items.length === 0) lines.push("| None | No entries currently listed. | None |")
  return lines.join("\n")
}

function renderActivityTable(title, items) {
  const lines = [
    `## ${title}`,
    "",
    "| Date | Title | Role | Event or Venue |",
    "| --- | --- | --- | --- |",
  ]
  for (const item of items) {
    const context = joinContext(item.data.event, item.data.location)
    lines.push(
      `| ${escapeTableCell(displayDate(item.data))} | [${escapeTableCell(item.title)}](${contentLink("activities", item.slug)}) | ${escapeTableCell(item.data.role)} | ${escapeTableCell(context)} |`,
    )
  }
  if (items.length === 0) lines.push("| None | No entries currently listed. | None | None |")
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
  if (items.length === 0) lines.push("| None | No entries currently listed. | None | None |")
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
  if (items.length === 0) lines.push("| None | No entries currently listed. | None | None |")
  return lines.join("\n")
}

function renderProjects(items) {
  const lines = ["## Selected Academic Projects"]

  for (const item of items) {
    lines.push("", `### [${item.title}](${contentLink("projects", item.slug)})`)
    const metadata = [
      ["Period", item.data.period],
      ["Role", item.data.role],
      ["Institution", item.data.institution],
      ["Funding", item.data.funding],
    ].filter(([, value]) => String(value ?? "").trim())

    for (const [label, value] of metadata) lines.push(`**${label}:** ${String(value).trim()}  `)

    const description = String(item.data.description ?? "").trim()
    if (description) lines.push("", description)
  }

  if (items.length === 0) lines.push("", "No projects are currently listed.")
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
    if (entry.isDirectory()) files.push(...(await listMarkdownFiles(absolutePath)))
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(absolutePath)
  }
  return files
}

async function validateNoEmDash() {
  const files = await listMarkdownFiles(CONTENT_ROOT)
  const violations = []
  for (const filePath of files) {
    const source = await fs.readFile(filePath, "utf8")
    if (source.includes("—")) violations.push(path.relative(ROOT, filePath))
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

  if (
    await updateManagedIndex("index.md", MARKERS.homeHighlights, async () => {
      const items = await loadCollection("activities")
      return renderHomeHighlights(items)
    })
  ) changedFiles.push("content/index.md")

  if (
    await updateManagedIndex("publications/index.md", MARKERS.publications, async (existingOrder) => {
      const items = await loadCollection("publications")
      items.sort(compareItems(existingOrder))
      return renderPublicationTable(items)
    })
  ) changedFiles.push("content/publications/index.md")

  if (
    await updateManagedIndex("working-papers/index.md", MARKERS.workingPapers, async (existingOrder) => {
      const items = await loadCollection("working-papers")
      const lead = items.filter((item) => isLeadAuthored(item.data))
      const co = items.filter((item) => !isLeadAuthored(item.data))
      lead.sort(compareItems(existingOrder))
      co.sort(compareItems(existingOrder))
      return [
        renderWorkingPaperSection("Lead-authored Working Papers", lead),
        renderWorkingPaperSection("Co-authored Working Papers", co),
      ].join("\n\n")
    })
  ) changedFiles.push("content/working-papers/index.md")

  if (
    await updateManagedIndex("activities/index.md", MARKERS.activities, async (existingOrder) => {
      const items = await loadCollection("activities")
      const service = items.filter((item) => activitySection(item.data) === "service")
      const conferences = items.filter((item) => activitySection(item.data) === "conference")
      const blogs = items.filter((item) => activitySection(item.data) === "blog")
      const talks = items.filter((item) => activitySection(item.data) === "talk")
      service.sort(compareDatedItems(existingOrder))
      conferences.sort(compareDatedItems(existingOrder))
      blogs.sort(compareDatedItems(existingOrder))
      talks.sort(compareDatedItems(existingOrder))
      return [
        renderServiceSection(service),
        renderActivityTable("Conferences and Presentations", conferences),
        renderBlogSection(blogs),
        renderActivityTable("Talks", talks),
      ].join("\n\n")
    })
  ) changedFiles.push("content/activities/index.md")

  if (
    await updateManagedIndex("teaching/index.md", MARKERS.teaching, async (existingOrder) => {
      const items = await loadCollection("teaching")
      const courses = items.filter((item) => !isSupervision(item.data))
      const supervision = items.filter((item) => isSupervision(item.data))
      courses.sort(compareItems(existingOrder))
      supervision.sort(compareItems(existingOrder))
      return [renderCoursesSection(courses), renderSupervisionSection(supervision)].join("\n\n")
    })
  ) changedFiles.push("content/teaching/index.md")

  if (
    await updateManagedIndex("projects/index.md", MARKERS.projects, async (existingOrder) => {
      const items = await loadCollection("projects")
      items.sort(compareItems(existingOrder))
      return renderProjects(items)
    })
  ) changedFiles.push("content/projects/index.md")

  if (
    await updateManagedIndex("methods/index.md", MARKERS.methods, async (existingOrder) => {
      const items = await loadCollection("methods")
      items.sort(compareItems(existingOrder))
      return `## Available method notes\n\n${renderLinkedList(items, "methods")}`
    })
  ) changedFiles.push("content/methods/index.md")

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
