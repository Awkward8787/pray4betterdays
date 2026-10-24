import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { SIZE_RUN } from "../src/lib/catalog"
import { renderRoute, type Assets } from "../src/lib/render"
import type { Product, Shot, Site } from "../src/lib/types"

const root = process.cwd()
const dist = join(root, "dist")
const preview = join(root, "preview-dist")
const manifest = JSON.parse(readFileSync(join(dist, ".vite/manifest.json"), "utf8")) as {
  "src/entry.ts": { file: string; css?: string[] }
}
const entry = manifest["src/entry.ts"]
const assets: Assets = {
  css: (entry.css ?? []).map((file) => `/${file}`),
  js: `/${entry.file}`,
}
const site = JSON.parse(readFileSync(join(root, "src/data/site.json"), "utf8")) as Site
const hero = JSON.parse(readFileSync(join(root, "src/data/media.json"), "utf8")) as Shot

const fixture: Product = {
  name: "Black zip hoodie",
  slug: "first-hoodie",
  status: "presale",
  description: "",
  shipEstimate: "",
  presaleEndsAt: null,
  colors: [
    {
      id: "black",
      name: "Black",
      price: null,
      presalePrice: site.presalePriceCents,
      currency: site.currency,
      runSize: null,
      remaining: null,
      images: { front: hero, back: null, side: null, details: [] },
      spin: [],
      sizes: SIZE_RUN.map((size) => ({ id: size.id, label: size.label, sku: "", checkoutUrl: "" })),
    },
  ],
}

cpSync(dist, preview, { recursive: true })
const ctx = { site, products: [fixture], hero, now: new Date("2026-10-24T12:00:00.000Z"), assets }

function writePage(route: string, file: string): void {
  const page = renderRoute(route, ctx)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, page.html)
}

writePage("/shop/", join(preview, "shop/index.html"))
writePage(`/shop/${fixture.slug}/`, join(preview, "shop", fixture.slug, "index.html"))
console.log("preview fixture written (not part of dist)")
