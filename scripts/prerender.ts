import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { renderRoute, type Assets } from "../src/lib/render"
import type { Product, Shot, Site } from "../src/lib/types"

const root = process.cwd()
const dist = join(root, "dist")
const manifest = JSON.parse(readFileSync(join(dist, ".vite/manifest.json"), "utf8")) as {
  "src/entry.ts": { file: string; css?: string[] }
}
const entry = manifest["src/entry.ts"]
const assets: Assets = {
  css: (entry.css ?? []).map((file) => `/${file}`),
  js: `/${entry.file}`,
}
const site = JSON.parse(readFileSync(join(root, "src/data/site.json"), "utf8")) as Site
const products = JSON.parse(readFileSync(join(root, "src/data/products.json"), "utf8")) as Product[]
const hero = JSON.parse(readFileSync(join(root, "src/data/media.json"), "utf8")) as Shot
const ctx = { site, products, hero, now: new Date(), assets }

function writePage(route: string, file: string): void {
  const page = renderRoute(route, ctx)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, page.html)
}

writePage("/", join(dist, "index.html"))
writePage("/shop/", join(dist, "shop/index.html"))
writePage("/about/", join(dist, "about/index.html"))
writePage("/contact/", join(dist, "contact/index.html"))
writePage("/shipping/", join(dist, "shipping/index.html"))
writePage("/privacy/", join(dist, "privacy/index.html"))
writePage("/missing", join(dist, "404.html"))

for (const product of products) {
  writePage(`/shop/${product.slug}/`, join(dist, "shop", product.slug, "index.html"))
}

const urls = ["/", "/shop/", "/about/", "/contact/", "/shipping/", "/privacy/", ...products.map((product) => `/shop/${product.slug}/`)]
const body = urls.map((url) => `  <url><loc>https://${site.domain}${url}</loc></url>`).join("\n")
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
)

console.log(`wrote ${urls.length + 1} html files`)
