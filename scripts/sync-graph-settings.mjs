#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import YAML from "yaml"

const ROOT = process.cwd()
const SETTINGS_PATH = path.join(ROOT, "content", "site-settings", "graph.md")
const GENERATED_MODULE_PATH = path.join(ROOT, "quartz", "graph-settings.generated.ts")

function parseFrontmatter(source, filePath) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) throw new Error(`Missing YAML frontmatter in ${filePath}`)
  return YAML.parse(match[1]) ?? {}
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === "boolean") return value
  if (value === undefined || value === null || value === "") return fallback
  const text = String(value).trim().toLowerCase()
  return !["false", "0", "no", "off"].includes(text)
}

async function main() {
  const settingsSource = await fs.readFile(SETTINGS_PATH, "utf8")
  const data = parseFrontmatter(settingsSource, SETTINGS_PATH)
  const enabled = normalizeBoolean(data["tag-network-enabled"] ?? data["graph-enabled"], true)

  const source = `export const tagNetworkSettings = {\n  enabled: ${enabled},\n} as const\n`
  await fs.writeFile(GENERATED_MODULE_PATH, source, "utf8")

  console.log(`Tag network settings synchronized: enabled=${enabled}.`)
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
