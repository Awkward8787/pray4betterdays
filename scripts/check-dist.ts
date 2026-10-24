import { readFileSync } from "node:fs"
import { extname, join } from "node:path"
import { missingProductNames } from "../src/lib/catalog"
import { unreferencedMedia, walk } from "./media-files"

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

if (failures.length) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log("dist check ok")
