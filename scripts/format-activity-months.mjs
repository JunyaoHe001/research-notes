#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"

const ROOT = process.cwd()
const INDEX_PATH = path.join(ROOT, "content", "activities", "index.md")
const START = "<!-- AUTO-GENERATED:ACTIVITIES:START -->"
const END = "<!-- AUTO-GENERATED:ACTIVITIES:END -->"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatManagedBlock(source) {
  const startIndex = source.indexOf(START)
  const endIndex = source.indexOf(END)

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("Activities managed block markers are missing or invalid")
  }

  const blockStart = startIndex + START.length
  const before = source.slice(0, blockStart)
  const block = source.slice(blockStart, endIndex)
  const after = source.slice(endIndex)

  const formatted = block
    .replace(/^\| Date \|/gm, "| Month |")
    .replace(/^\| (\d{4})-(\d{2})-(\d{2})(?:T[^|]*)? \|/gm, (_match, year, month) => {
      const monthIndex = Number(month) - 1
      const label = MONTHS[monthIndex]
      if (!label) return _match
      return `| ${label} ${year} |`
    })

  return `${before}${formatted}${after}`
}

async function main() {
  const source = await fs.readFile(INDEX_PATH, "utf8")
  const updated = formatManagedBlock(source)

  if (updated === source) {
    console.log("Activity dates already use month and year.")
    return
  }

  await fs.writeFile(INDEX_PATH, updated, "utf8")
  console.log("Formatted activity overview dates as month and year.")
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
