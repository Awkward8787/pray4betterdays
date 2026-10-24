import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { presaleClosed, priceView, safeCheckoutUrl, scarcityLines, sizeCta } from "../src/lib/catalog"
import { renderRoute, type Ctx } from "../src/lib/render"
import type { Colorway, Product, Shot, Site } from "../src/lib/types"
import hero from "../src/data/media.json"
import productsFile from "../src/data/products.json"
import siteFile from "../src/data/site.json"

const SENTINEL = "FIXTURE_SENTINEL_DO_NOT_SHIP"
const shot = hero as Shot
const now = new Date("2026-10-24T12:00:00.000Z")

function site(overrides: Partial<Site> = {}): Site {
  return { ...(siteFile as Site), email: "", instagram: "", about: "", ...overrides }
}

function color(overrides: Partial<Colorway> = {}): Colorway {
  return {
    id: "black",
    name: "Black",
    price: null,
    presalePrice: null,
    regularPrice: null,
    currency: "USD",
    runSize: null,
    remaining: null,
    images: { front: shot, back: null, side: null, details: [] },
    spin: [],
    sizes: [
      { id: "s", label: "S", sku: "S-1", checkoutUrl: "" },
      { id: "m", label: "M", sku: "M-1", checkoutUrl: "" },
    ],
    ...overrides,
  }
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    name: SENTINEL,
    slug: "fixture-hoodie",
    status: "available",
    description: "",
    shipEstimate: "",
    presaleEndsAt: null,
    colors: [color()],
    ...overrides,
  }
}

function page(path: string, products: Product[], extra?: Partial<Site>): string {
  const ctx: Ctx = {
    site: site(extra),
    products,
    hero: shot,
    now,
    assets: { css: ["/assets/site.css"], js: "/assets/entry.js" },
  }
  return renderRoute(path, ctx).html
}

describe("catalog", () => {
  it("ships an empty product list", () => {
    expect(productsFile).toEqual([])
  })

  it("keeps the legal name and founder in site config", () => {
    const config = siteFile as Site
    expect(config.brand).toBe("Pray4BetterDays")
    expect(config.legalName).toBe("Pray 4 Better Days LLC")
    expect(config.founder).toBe("Aniyla Evans")
    expect(config.squareLocationId.length).toBeGreaterThan(0)
  })

  it("rejects unsafe checkout urls", () => {
    expect(safeCheckoutUrl("")).toBe("")
    expect(safeCheckoutUrl("javascript:alert(1)")).toBe("")
    expect(safeCheckoutUrl("https://square.link/u/example")).toBe("https://square.link/u/example")
  })

  it("hides a missing price and strikes a real compare price", () => {
    const bare = product()
    expect(priceView(bare, bare.colors[0]).current).toBeNull()
    const presale = product({ status: "presale" })
    const priced = color({ presalePrice: 6000, regularPrice: 8000 })
    expect(priceView(presale, priced)).toEqual({ current: "$60.00", compare: "$80.00" })
  })

  it("prints run counts only when they are set", () => {
    expect(scarcityLines(color())).toEqual([])
    expect(scarcityLines(color({ runSize: 24, remaining: 3 }))).toEqual(["Run of 24", "3 left"])
    expect(scarcityLines(color({ runSize: 24, remaining: 0 }))).toEqual(["Run of 24"])
  })

  it("closes a pre-order after the end instant", () => {
    const open = product({ status: "presale", presaleEndsAt: "2099-06-15T16:00:00.000Z" })
    const closed = product({ status: "presale", presaleEndsAt: "2020-01-01T00:00:00.000Z" })
    expect(presaleClosed(open, now)).toBe(false)
    expect(presaleClosed(closed, now)).toBe(true)
    expect(sizeCta(closed, closed.colors[0], "https://square.link/u/example", now).label).toBe("Pre-order closed")
  })
})

describe("pages", () => {
  it("renders a fixture product with a working buy link", () => {
    const item = product({
      status: "presale",
      presaleEndsAt: "2099-06-15T16:00:00.000Z",
      shipEstimate: "Ships when the run is cut.",
      colors: [
        color({
          presalePrice: 6000,
          regularPrice: 8000,
          runSize: 24,
          remaining: 3,
          sizes: [
            { id: "m", label: "M", sku: "M-1", checkoutUrl: "https://square.link/u/example" },
            { id: "l", label: "L", sku: "L-1", checkoutUrl: "" },
          ],
        }),
      ],
    })
    const html = page(`/shop/${item.slug}/`, [item])
    expect(html).toContain(SENTINEL)
    expect(html).toContain("https://square.link/u/example")
    expect(html).toContain("Pre-order")
    expect(html).toContain("$60.00")
    expect(html).toContain("$80.00")
    expect(html).toContain("<s>")
    expect(html).toContain("Run of 24")
    expect(html).toContain("3 left")
    expect(html).toContain("This is a pre-order. The card is charged now through Square.")
    expect(html).toContain("Ships when the run is cut.")
    expect(html).toContain("June 15, 2099")
    expect(html).not.toContain("Drop 01")
    expect(html).not.toContain("<select")
    expect(html).not.toContain("setInterval")
    expect(html).not.toContain(site().squareLocationId)
  })

  it("disables buy when the checkout url is missing", () => {
    const item = product({ status: "available" })
    const html = page(`/shop/${item.slug}/`, [item])
    const sizeAt = html.indexOf('<fieldset class="sizes">')
    const sizes = html.slice(sizeAt, html.indexOf("</fieldset>", sizeAt))
    expect(html).toContain("Coming soon")
    expect(sizes).not.toContain("Coming soon")
    expect(html).not.toContain('class="button buy-link" href')
    expect(html).toContain("disabled")
  })

  it("disables buy for a javascript url", () => {
    const item = product({
      colors: [color({ price: 5000, sizes: [{ id: "m", label: "M", sku: "", checkoutUrl: "javascript:alert(1)" }] })],
    })
    const html = page(`/shop/${item.slug}/`, [item])
    expect(html).not.toContain("javascript:")
    expect(html).toContain("Coming soon")
  })

  it("marks a finished run sold out", () => {
    const item = product({
      colors: [color({ remaining: 0, price: 5000, sizes: [{ id: "m", label: "M", sku: "", checkoutUrl: "https://square.link/u/example" }] })],
    })
    const html = page(`/shop/${item.slug}/`, [item])
    expect(html).toContain("Sold out")
    expect(html).not.toContain("https://square.link/u/example")
    expect(html).not.toContain("0 left")
    const mixed = product({
      colors: [
        color({
          price: 5000,
          sizes: [
            { id: "m", label: "M", sku: "", checkoutUrl: "https://square.link/u/example" },
            { id: "l", label: "L", sku: "", checkoutUrl: "" },
          ],
        }),
      ],
    })
    const mixedHtml = page(`/shop/${mixed.slug}/`, [mixed])
    const mixedAt = mixedHtml.indexOf('<fieldset class="sizes">')
    const mixedSizes = mixedHtml.slice(mixedAt, mixedHtml.indexOf("</fieldset>", mixedAt))
    expect(mixedSizes).toContain("Coming soon")
    expect(mixedHtml).toContain("https://square.link/u/example")
  })

  it("shows the empty drop and hides unset contact links", () => {
    const html = page("/", [])
    expect(html).toContain("First drop coming soon.")
    expect(html.match(/First drop coming soon\./g)?.length).toBe(1)
    expect(html).toContain('class="hero-note"')
    expect(html).toContain("Shop hoodies")
    expect(html).toContain('aria-label="Pray4BetterDays"')
    expect(html).toContain('class="logo" href="/">Pray4BetterDays</a>')
    expect(html).not.toContain("Hoodies.")
    expect(html).not.toContain("instagram.com")
    expect(html).not.toContain("mailto:")
    expect(html).not.toContain(SENTINEL)
  })

  it("leaves retry and spin out of the page until there is a reason", () => {
    const home = page("/", [])
    const unnamed = product({ name: "", slug: "plain" })
    const gallery = page(`/shop/${unnamed.slug}/`, [unnamed])
    for (const html of [home, gallery]) {
      expect(html).not.toContain("Retry")
      expect(html).not.toContain("data-spin")
      expect(html).not.toContain("Previous frame")
      expect(html).not.toContain(">Hoodie<")
    }
    expect(gallery).toContain('class="untitled"')
    expect(gallery).toContain(shot.alt)
    const spinning = product({
      colors: [color({ spin: [shot, { ...shot, alt: "Side of the same hoodie." }] })],
    })
    const withSpin = page(`/shop/${spinning.slug}/`, [spinning])
    expect(withSpin).toContain("data-spin")
    expect(withSpin).toContain("Previous frame")
    expect(withSpin).not.toContain("Retry")
  })

  it("shows instagram only when the handle is set", () => {
    const hidden = page("/contact/", [])
    const shown = page("/contact/", [], { instagram: "@pray4betterdays", email: "studio@pray4betterdays.com" })
    expect(hidden).not.toContain("instagram.com")
    expect(hidden).not.toContain("mailto:")
    expect(shown).toContain("https://instagram.com/pray4betterdays")
    expect(shown).toContain("mailto:studio@pray4betterdays.com")
  })

  it("credits the founder and hides an empty story", () => {
    const html = page("/about/", [])
    expect(html).toContain("Designed by Aniyla Evans, founder and designer.")
    expect(html).not.toContain("she ")
    expect(html).not.toContain("her ")
    const filled = page("/about/", [], { about: "Printed in small runs." })
    expect(filled).toContain("Printed in small runs.")
  })

  it("names the legal entity in the footer, privacy, and shipping", () => {
    for (const path of ["/", "/privacy/", "/shipping/"]) {
      const html = page(path, [])
      expect(html).toContain("© 2026 Pray 4 Better Days LLC. Designed by Aniyla Evans.")
      expect(html).not.toContain(site().squareLocationId)
    }
    const privacy = page("/privacy/", [])
    const shipping = page("/shipping/", [])
    expect(privacy).toContain("Pray 4 Better Days LLC operates this site.")
    expect(shipping).toContain("Pray 4 Better Days LLC sells hoodies on this site as pre-orders.")
    expect(privacy).toContain("Pray4BetterDays")
    expect(shipping).not.toContain("<h2>Returns</h2>")
  })

  it("keeps the Square location id in site config only", () => {
    const id = (siteFile as Site).squareLocationId
    const roots = ["src", "scripts"]
    const hits: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const file = join(dir, name)
        if (statSync(file).isDirectory()) walk(file)
        else if (readFileSync(file, "utf8").includes(id)) hits.push(file)
      }
    }
    for (const dir of roots) walk(dir)
    expect(hits).toEqual([join("src/data/site.json")])
  })

  it("does not run a countdown", () => {
    const client = readFileSync(join("src/client.ts"), "utf8")
    expect(client).not.toContain("setInterval")
    expect(client).not.toContain("Drop 01")
  })
})
