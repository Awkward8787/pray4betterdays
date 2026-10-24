import { readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join } from "node:path"

const root = process.cwd()
const site = JSON.parse(readFileSync(join(root, "src/data/site.json"), "utf8")) as {
  squareLocationId?: string
}
const productsRaw = readFileSync(join(root, "src/data/products.json"), "utf8").trim()
const failures: string[] = []

if (productsRaw !== "[]") failures.push("src/data/products.json must ship as []")

const textExt = new Set([".html", ".css", ".js", ".svg", ".xml", ".txt", ".json"])
const needles = ["FIXTURE_SENTINEL_DO_NOT_SHIP", "sq0atp", "EAAA", "sk_live"]
const locationId = (site.squareLocationId ?? "").trim()
if (locationId) needles.push(locationId)

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const file = join(dir, name)
    if (statSync(file).isDirectory()) out.push(...walk(file))
    else out.push(file)
  }
  return out
}

for (const file of walk(join(root, "dist"))) {
  const name = file.slice(join(root, "dist").length)
  const ext = extname(file).toLowerCase()
  if (ext !== "" && !textExt.has(ext) && !name.endsWith(".htaccess")) continue
  if (ext === "" && !name.endsWith(".htaccess")) continue
  const text = readFileSync(file, "utf8")
  for (const needle of needles) {
    if (text.includes(needle)) failures.push(`${file} contains ${needle}`)
  }
}

if (failures.length) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log("dist check ok")
