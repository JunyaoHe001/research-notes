#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { spawn } from "node:child_process"
import YAML from "yaml"

const ROOT = process.cwd()
const CONFIG_PATH = path.join(ROOT, "quartz.config.yaml")
const BASE_HOST = "junyaohe001.github.io/research-notes"

const variants = [
  { code: "en", locale: "en-US", output: "public", suffix: "" },
  { code: "nl", locale: "nl-NL", output: "public/nl", suffix: "/nl" },
  { code: "zh", locale: "zh-CN", output: "public/zh", suffix: "/zh" },
  { code: "de", locale: "de-DE", output: "public/de", suffix: "/de" },
  { code: "fr", locale: "fr-FR", output: "public/fr", suffix: "/fr" },
  { code: "es", locale: "es-ES", output: "public/es", suffix: "/es" },
]

function runQuartzBuild(output) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["quartz/bootstrap-cli.mjs", "build", "--output", output],
      {
        cwd: ROOT,
        env: process.env,
        stdio: "inherit",
      },
    )

    child.on("error", reject)
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(
        new Error(
          signal
            ? `Quartz build terminated by signal ${signal}`
            : `Quartz build exited with code ${code}`,
        ),
      )
    })
  })
}

async function main() {
  const originalSource = await fs.readFile(CONFIG_PATH, "utf8")
  const originalConfig = YAML.parse(originalSource)

  if (!originalConfig?.configuration) {
    throw new Error("quartz.config.yaml does not contain a configuration section")
  }

  try {
    for (const variant of variants) {
      const localizedConfig = structuredClone(originalConfig)
      localizedConfig.configuration.locale = variant.locale
      localizedConfig.configuration.baseUrl = `${BASE_HOST}${variant.suffix}`
      localizedConfig.configuration.theme.typography = {
        header: "Source Serif 4",
        body: "Inter",
        code: "IBM Plex Mono",
      }

      await fs.writeFile(CONFIG_PATH, YAML.stringify(localizedConfig), "utf8")
      console.log(`\nBuilding ${variant.code.toUpperCase()} interface in ${variant.output}`)
      await runQuartzBuild(variant.output)
    }
  } finally {
    await fs.writeFile(CONFIG_PATH, originalSource, "utf8")
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
