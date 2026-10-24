import { existsSync, readFileSync } from "node:fs"
import { extname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { missingProductNames } from "../src/lib/catalog"
import { missingReferencedFrames, unreferencedMedia, walk } from "./media-files"

export function missingFrameFailures(dist: string): string[] {
  return missingReferencedFrames(dist).map((rel) => `${rel} is referenced but missing from dist`)
}

function collectFailures(): string[] {
  const root = process.cwd()
  const site = JSON.parse(readFileSync(join(root, "src/data/site.json"), "utf8")) as {
    squareLocationId?: string
  }
  const productsRaw = readFileSync(join(root, "src/data/products.json"), "utf8").trim()
  const failures: string[] = []
  const products = JSON.parse(productsRaw) as { name?: string }[]

  if (!Array.isArray(products) || productsRaw !== "[]") failures.push("src/data/products.json must ship as []")

  for (const failure of missingProductNames(Array.isArray(products) ? products : [])) failures.push(failure)

  const textExt = new Set([".html", ".css", ".js", ".svg", ".xml", ".txt", ".json"])
  const needles = ["FIXTURE_SENTINEL_DO_NOT_SHIP", "sq0atp", "sk_live", "[tax]"]
  const squareToken = /(?<![A-Za-z0-9+/])EAAA[A-Za-z0-9_-]{8,}/
  const locationId = (site.squareLocationId ?? "").trim()
  if (locationId) needles.push(locationId)

  const dist = join(root, "dist")
  for (const file of walk(dist)) {
    const name = file.slice(dist.length)
    const ext = extname(file).toLowerCase()
    if (ext !== "" && !textExt.has(ext) && !name.endsWith(".htaccess")) continue
    if (ext === "" && !name.endsWith(".htaccess")) continue
    const text = readFileSync(file, "utf8")
    for (const needle of needles) {
      if (text.includes(needle)) failures.push(`${file} contains ${needle}`)
    }
    if (squareToken.test(text)) failures.push(`${file} contains EAAA`)
  }

  for (const rel of unreferencedMedia(dist)) {
    failures.push(`${rel} is not used by a page in dist`)
  }

  failures.push(...missingFrameFailures(dist))

  if (productsRaw === "[]" && existsSync(join(dist, "vendor"))) {
    failures.push("dist/vendor is present while the catalog is empty")
  }

  return failures
}

const invoked = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ""
if (import.meta.url === invoked) {
  const failures = collectFailures()
  if (failures.length) {
    console.error(failures.join("\n"))
    process.exit(1)
  }
  console.log("dist check ok")
}
