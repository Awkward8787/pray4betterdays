import { describe, expect, it } from "vitest"
import { renderRoute, type Ctx } from "../src/lib/render"
import type { Product, Shot, Site } from "../src/lib/types"
import hero from "../src/data/media.json"
import productsFile from "../src/data/products.json"
import siteFile from "../src/data/site.json"

const ctx: Ctx = {
  site: siteFile as Site,
  products: productsFile as Product[],
  hero: hero as Shot,
  now: new Date("2026-11-18T12:00:00.000Z"),
  assets: { css: ["/assets/site.css"], js: "/assets/entry.js" },
}

function ld(html: string): Record<string, unknown>[] {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  if (!match) return []
  return (JSON.parse(match[1]) as { "@graph": Record<string, unknown>[] })["@graph"]
}

function description(html: string): string {
  return html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ""
}

describe("search markup", () => {
  it("gives every public page its own description", () => {
    const routes = ["/", "/shop/", "/about/", "/shipping/", "/privacy/", "/shop/zip-hoodie/"]
    const seen = routes.map((route) => description(renderRoute(route, ctx).html))
    expect(new Set(seen).size).toBe(routes.length)
    for (const text of seen) {
      expect(text.length).toBeGreaterThan(30)
      expect(text.length).toBeLessThanOrEqual(170)
    }
  })

  it("publishes Product schema with one pre-order offer per size at the real price", () => {
    const nodes = ld(renderRoute("/shop/zip-hoodie/", ctx).html)
    const item = nodes.find((node) => node["@type"] === "Product") as Record<string, unknown>
    expect(item.name).toBe("Pray 4 Better Days Zip Hoodie")
    const offers = item.offers as Record<string, unknown>[]
    expect(offers.map((offer) => offer.price)).toEqual(["85.00", "85.00", "85.00", "85.00", "90.00", "95.00"])
    for (const offer of offers) {
      expect(offer.availability).toBe("https://schema.org/PreOrder")
      expect(offer.priceCurrency).toBe("USD")
    }
    expect(JSON.stringify(item)).not.toMatch(/aggregateRating|review/i)
    expect(nodes.some((node) => node["@type"] === "BreadcrumbList")).toBe(true)
  })

  it("names the seller on the home page", () => {
    const nodes = ld(renderRoute("/", ctx).html)
    const org = nodes.find((node) => node["@type"] === "Organization") as Record<string, unknown>
    expect(org.legalName).toBe("Pray 4 Better Days LLC")
  })
})
