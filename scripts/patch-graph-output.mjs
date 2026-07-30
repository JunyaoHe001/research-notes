#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"

const SCRIPTS_ROOT = path.join(process.cwd(), "public", "static", "scripts")
const GRAPH_MARKER = "[Graph] Failed to load libraries:"
const PATCH_MARKER = "window.__researchGraphFilter"
const DATA_PATTERN = /var ([A-Za-z_$][\w$]*)=await fetchData;([A-Za-z_$][\w$]*)=new Map;for\(var ([A-Za-z_$][\w$]*) in \1\)/

async function listJavaScriptFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await listJavaScriptFiles(filePath)))
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(filePath)
  }
  return files
}

async function main() {
  const files = await listJavaScriptFiles(SCRIPTS_ROOT)
  const graphFiles = []

  for (const filePath of files) {
    const source = await fs.readFile(filePath, "utf8")
    if (source.includes(GRAPH_MARKER)) graphFiles.push({ filePath, source })
  }

  if (graphFiles.length !== 1) {
    throw new Error(`Expected one generated graph script, found ${graphFiles.length}.`)
  }

  const { filePath, source } = graphFiles[0]
  if (source.includes(PATCH_MARKER)) {
    console.log(`Research network filter patch already present in ${path.relative(process.cwd(), filePath)}.`)
    return
  }

  const match = source.match(DATA_PATTERN)
  if (!match) {
    throw new Error("Could not locate the graph content data initialization in the generated script.")
  }

  const [, dataVariable, mapVariable, keyVariable] = match
  const replacement =
    `var ${dataVariable}=await fetchData;` +
    `${dataVariable}=window.__researchGraphFilter?window.__researchGraphFilter(${dataVariable}):${dataVariable};` +
    `${mapVariable}=new Map;for(var ${keyVariable} in ${dataVariable})`

  const patched = source.replace(DATA_PATTERN, replacement)
  if (!patched.includes(PATCH_MARKER)) {
    throw new Error("The graph filter patch was not written to the generated script.")
  }

  await fs.writeFile(filePath, patched, "utf8")
  console.log(`Patched research network filtering in ${path.relative(process.cwd(), filePath)}.`)
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
