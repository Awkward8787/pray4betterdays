import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { mediaRefs } from "./media-files"
import { renderRoute, type Assets } from "../src/lib/render"
import type { ModelView, Product, Shot, Site } from "../src/lib/types"
import black from "../src/data/black.json"

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
const hero = black.front as Shot

const fixture: Product = {
  name: "[product name]",
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
      images: {
        front: hero,
        back: black.back as Shot,
        side: black.side as Shot,
        details: [black.support as Shot],
      },
      spin: [],
      model: black.model as ModelView,
      sizes: site.sizes.map((size) => ({
        id: size.id,
        label: size.label,
        sku: "",
        checkoutUrl: "",
        priceCents: size.priceCents,
        paymentLink: size.paymentLink,
        remaining: null,
      })),
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
writePage("/", join(preview, "index.html"))

function copyMedia(html: string): void {
  for (const ref of mediaRefs(html)) {
    const from = join(root, "public", ref.slice(1))
    const to = join(preview, ref.slice(1))
    if (!existsSync(from)) continue
    mkdirSync(dirname(to), { recursive: true })
    copyFileSync(from, to)
  }
}

copyMedia(readFileSync(join(preview, "index.html"), "utf8"))
copyMedia(readFileSync(join(preview, "shop/index.html"), "utf8"))
copyMedia(readFileSync(join(preview, "shop", fixture.slug, "index.html"), "utf8"))
console.log("preview fixture written (not part of dist)")
