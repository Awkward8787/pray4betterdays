import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, expect, it } from "vitest"
import { fittedZoomWidth, zoomDisplayWidth } from "../src/client"
import {
  missingProductNames,
  preorderTermsReady,
  presaleClosed,
  priceView,
  safeCheckoutUrl,
  scarcityLines,
  shotAlt,
  sizeCheckout,
  sizeCta,
  sizePriceCents,
} from "../src/lib/catalog"
import { framePaths } from "../src/lib/frames"
import { renderRoute, type Ctx } from "../src/lib/render"
import { missingFrameFailures } from "../scripts/check-dist"
import { mediaRefs, missingReferencedFrames, pruneUnreferencedMedia } from "../scripts/media-files"
import type { Colorway, Product, Shot, Site } from "../src/lib/types"
import black from "../src/data/black.json"
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

function sizeRadios(html: string): string {
  const at = html.indexOf('<fieldset class="sizes">')
  const field = html.slice(at, html.indexOf("</fieldset>", at))
  return [...field.matchAll(/<input class="size-input"[^>]*>/g)].map((match) => match[0]).join("\n")
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

const SQUARE_LINKS = [
  ["s", "S", "https://square.link/u/6FQbfpdm", 8500],
  ["m", "M", "https://square.link/u/nZCG1Vfl", 8500],
  ["l", "L", "https://square.link/u/zVj0lUAO", 8500],
  ["xl", "XL", "https://square.link/u/6uPOqRKH", 8500],
  ["2xl", "2XL", "https://square.link/u/wOwaMyNe", 9000],
  ["3xl", "3XL", "https://square.link/u/vWVPVOM4", 9500],
] as const

const PREORDER_TERMS = "Pre-order. Ships within 30 days of your order. Cancel any time before it ships for a full refund."
const CHARGE_LINE = "Your card is charged when you place the pre-order."

describe("catalog", () => {
  it("matches each size squareUrl and price to the payment link table", () => {
    const products = productsFile as Product[]
    expect(products).toHaveLength(1)
    const item = products[0]
    expect(item.name).toBe("Pray 4 Better Days Zip Hoodie")
    expect(item.slug).toBe("zip-hoodie")
    expect(item.status).toBe("presale")
    expect(item.description).toBe("")
    expect(item.shipEstimate).toBe("Ships within 30 days of your order.")
    expect(item.presaleEndsAt).toBeNull()
    const colorway = item.colors[0]
    expect(colorway.name).toBe("Black")
    expect(colorway.price).toBeNull()
    expect(colorway.presalePrice).toBeNull()
    expect(colorway.runSize).toBeNull()
    expect(colorway.remaining).toBeNull()
    expect(colorway.images.front?.zoom).toContain("front-cutout.png")
    expect(colorway.spin).toEqual([])
    expect(colorway.sizes.map((size) => [size.id, size.label, size.squareUrl, size.priceCents])).toEqual(SQUARE_LINKS.map((row) => [...row]))
    for (const size of colorway.sizes) {
      expect(size.checkoutUrl).toBe("")
      expect(size.paymentLink).toBeNull()
      expect(size.remaining).toBeNull()
      expect(size.sku).toBe("")
    }
    expect(sizeCheckout({ id: "m", label: "M", sku: "", checkoutUrl: "https://square.link/u/wrong", paymentLink: "https://square.link/u/also", squareUrl: "" })).toBe("")
    expect(sizeCheckout({ id: "m", label: "M", sku: "", checkoutUrl: "https://square.link/u/example" })).toBe("https://square.link/u/example")

    const html = page(`/shop/${item.slug}/`, products)
    expect(html).toContain(PREORDER_TERMS)
    expect(html).toContain(CHARGE_LINE)
    expect(html).toContain("Free shipping, US only")
    expect(html).not.toContain("[tax]")
    expect(html).not.toContain("plus tax")
    expect(html).not.toContain("[product name]")
    expect(html).not.toContain("charged now")
    expect(html).not.toContain("Run of")
    expect(html).not.toContain('data-state="soldout"')
    expect(sizeRadios(html)).not.toContain("disabled")
    expect(html).not.toContain('src="/media/first-design/black/turntable/frame-00.webp"')
    expect(html).toContain("Render, final may vary")
    for (const [id, , url, cents] of SQUARE_LINKS) {
      const dollars = (cents / 100).toFixed(2)
      expect(html.split(url).length - 1).toBe(1)
      expect(html).toContain(`href="${url}"`)
      expect(html).toContain(`<p class="price" data-size="${id}"><span>$${dollars}</span></p>`)
    }

    const home = page("/", products)
    expect(home).toContain('src="/media/first-design/black/turntable/frame-00.webp"')
    expect(home).toContain('href="/shop/zip-hoodie/"')
    expect(home).not.toContain("First drop coming soon.")
    expect(home).toContain("Render, final may vary")

    const shop = page("/shop/", products)
    expect(shop).toContain("Pray 4 Better Days Zip Hoodie")
    expect(shop).not.toContain("First drop coming soon.")

    const shipping = page("/shipping/", products)
    expect(shipping).toContain("Free shipping, US only")
    expect(shipping).toContain("Ships within 30 days of your order.")
    expect(shipping).toContain("Cancel any time before it ships for a full refund.")
    expect(shipping).toContain(CHARGE_LINE)
    expect(shipping).not.toContain("charged now")
    expect(shipping).not.toContain("[tax]")
  })

  it("keeps the legal name and founder in site config", () => {
    const config = siteFile as Site
    expect(config.brand).toBe("Pray4BetterDays")
    expect(config.legalName).toBe("Pray 4 Better Days LLC")
    expect(config.founder).toBe("Aniyla Evans")
    expect(config.squareLocationId.length).toBeGreaterThan(0)
    expect(config.presalePriceCents).toBe(8500)
    expect(config.currency).toBe("USD")
    expect(config.shippingCost).toBe("Free shipping, US only")
    expect(config.shipWindow).toBe("Ships within 30 days of your order.")
    expect(config.refundPolicy).toBe("Cancel any time before it ships for a full refund.")
    expect(config.cancelPolicy).toBe("Cancel any time before it ships for a full refund.")
    expect(config.shippingBody).toBe(CHARGE_LINE)
    expect(config.paymentLinkNote).toContain("no shipping line item")
    expect(config.taxIncluded).toBe(true)
    expect(config.sizes.map((size) => [size.id, size.label, size.priceCents, size.paymentLink])).toEqual([
      ["s", "S", 8500, null],
      ["m", "M", 8500, null],
      ["l", "L", 8500, null],
      ["xl", "XL", 8500, null],
      ["2xl", "2XL", 9000, null],
      ["3xl", "3XL", 9500, null],
    ])
  })

  it("shows the first hoodie at $85 with free shipping and no former price", () => {
    const config = siteFile as Site
    const fixtureSrc = readFileSync(join("scripts/preview-fixture.ts"), "utf8")
    expect(fixtureSrc).not.toContain("[product name]")
    expect(fixtureSrc).not.toContain("presalePrice:")
    expect(fixtureSrc).toContain("cpSync(dist, preview")
    expect(fixtureSrc).not.toContain("regularPrice")
    const item = product({
      name: "Black zip hoodie",
      status: "presale",
      colors: [color({ presalePrice: 8500, price: null, sizes: [{ id: "m", label: "M", sku: "", checkoutUrl: "" }] })],
    })
    const html = page(`/shop/${item.slug}/`, [item], { taxIncluded: null })
    expect(html).toContain("$85.00")
    expect(html).toContain("Free shipping")
    expect(html).toContain(">Total<")
    expect(html).toContain("[tax]")
    expect(html.match(/<span>\$85\.00<\/span>/g)?.length).toBe(2)
    expect(html).not.toContain("<s>")
    expect(html).not.toContain("[shipping]")
    expect(html).not.toContain("charged now")
    expect(html).not.toContain("fees")
    expect(html).not.toContain(config.paymentLinkNote)
    expect(html).not.toContain('class="button buy-link" href')
    const shipping = page("/shipping/", [])
    expect(shipping).toContain("<h2>Shipping cost</h2>")
    expect(shipping).toContain("Free shipping")
    expect(shipping).not.toContain("[shipping]")
    expect(shipping).not.toContain("fees")
    expect(shipping).not.toContain(config.paymentLinkNote)
  })

  it("rejects unsafe checkout urls", () => {
    expect(safeCheckoutUrl("")).toBe("")
    expect(safeCheckoutUrl("javascript:alert(1)")).toBe("")
    expect(safeCheckoutUrl("http://square.link/u/example")).toBe("")
    expect(safeCheckoutUrl("https://evil.example/pay")).toBe("")
    expect(safeCheckoutUrl("https://square.link.evil.com/u/example")).toBe("")
    expect(safeCheckoutUrl("https://square.link/u/example")).toBe("https://square.link/u/example")
    expect(safeCheckoutUrl("https://checkout.square.site/merchant/example")).toBe("https://checkout.square.site/merchant/example")
    expect(safeCheckoutUrl("https://connect.squareup.com/example")).toBe("https://connect.squareup.com/example")
  })

  it("hides a missing price and has no former price", () => {
    const bare = product()
    expect(priceView(bare, bare.colors[0]).current).toBeNull()
    const presale = product({ status: "presale" })
    const priced = color({ presalePrice: 6000 })
    expect(priceView(presale, priced)).toEqual({ current: "$60.00" })
    expect(JSON.stringify(priced)).not.toContain("regularPrice")
  })

  it("prints run counts only when they are set", () => {
    expect(scarcityLines(color())).toEqual([])
    expect(scarcityLines(color({ runSize: 24, remaining: 3 }))).toEqual(["Run of 24"])
    expect(scarcityLines(color({ runSize: 24, remaining: 0 }))).toEqual(["Run of 24"])
  })

  it("closes a pre-order after the end instant", () => {
    const open = product({ status: "presale", presaleEndsAt: "2099-06-15T16:00:00.000Z" })
    const closed = product({ status: "presale", presaleEndsAt: "2020-01-01T00:00:00.000Z" })
    expect(presaleClosed(open, now)).toBe(false)
    expect(presaleClosed(closed, now)).toBe(true)
    const closedSize = { ...closed.colors[0].sizes[0], checkoutUrl: "https://square.link/u/example" }
    expect(sizeCta(closed, closed.colors[0], closedSize, now, site()).label).toBe("Pre-order closed")
  })

  it("fails a published product with no name", () => {
    expect(missingProductNames([])).toEqual([])
    expect(missingProductNames([{ name: "Black zip hoodie" }])).toEqual([])
    expect(missingProductNames([{ name: "  " }])).toEqual(["product 0 is missing a name"])
  })
})

const terms = {
  refundPolicy: "Refunds are available before the order ships.",
  cancelPolicy: "You can cancel before the order ships.",
  returnsBody: "Final sale after delivery.",
  delayPolicy: "If a ship date slips, we write and offer a cancel.",
  email: "studio@pray4betterdays.com",
}

describe("pages", () => {
  it("renders a fixture product with a working buy link", () => {
    const item = product({
      status: "presale",
      presaleEndsAt: "2099-06-15T16:00:00.000Z",
      shipEstimate: "Ships when the run is cut.",
      colors: [
        color({
          presalePrice: 6000,
          runSize: 24,
          remaining: 3,
          sizes: [
            { id: "m", label: "M", sku: "M-1", checkoutUrl: "https://square.link/u/example" },
            { id: "l", label: "L", sku: "L-1", checkoutUrl: "" },
          ],
        }),
      ],
    })
    const html = page(`/shop/${item.slug}/`, [item], terms)
    const priceAt = html.indexOf('class="price"')
    const noteAt = html.indexOf("Pre-order. Ships when the run is cut. You can cancel before the order ships.")
    const buyAt = html.indexOf("https://square.link/u/example")
    expect(html).toContain(SENTINEL)
    expect(html).toContain("Pre-order")
    expect(html).toContain("$60.00")
    expect(html).not.toContain("$80.00")
    expect(html).not.toContain("$120")
    expect(html).not.toContain("<s>")
    expect(html).toContain("Run of 24")
    expect(html).not.toContain("3 left")
    expect(priceAt).toBeGreaterThan(-1)
    expect(noteAt).toBeGreaterThan(priceAt)
    expect(buyAt).toBeGreaterThan(noteAt)
    expect(html).toContain(CHARGE_LINE)
    expect(html).not.toContain("charged now")
    expect(html).toContain("Ships when the run is cut.")
    expect(html).toContain("June 15, 2099")
    expect(html).not.toContain("Drop 01")
    expect(html).not.toContain("<select")
    expect(html).not.toContain("setInterval")
    expect(html).not.toContain(site().squareLocationId)
  })

  it("keeps pre-order off until price and buyer terms exist", () => {
    const ready = product({
      status: "presale",
      shipEstimate: "Ships when the run is cut.",
      colors: [color({ presalePrice: 6000, sizes: [{ id: "m", label: "M", sku: "", checkoutUrl: "https://square.link/u/example" }] })],
    })
    const blank = { refundPolicy: "", cancelPolicy: "" }
    expect(preorderTermsReady(ready, site(blank))).toBe(false)
    expect(preorderTermsReady(ready, site(terms))).toBe(true)
    const blocked = page(`/shop/${ready.slug}/`, [ready], blank)
    expect(blocked).not.toContain("https://square.link/u/example")
    expect(blocked).not.toContain("charged now")
    expect(blocked).toContain("Coming soon")
    for (const drop of ["shipEstimate", "price"] as const) {
      const item =
        drop === "price"
          ? product({
              status: "presale",
              shipEstimate: "Ships when the run is cut.",
              colors: [color({ presalePrice: null, sizes: [{ id: "m", label: "M", sku: "", checkoutUrl: "https://square.link/u/example" }] })],
            })
          : product({
              status: "presale",
              shipEstimate: "",
              colors: [color({ presalePrice: 6000, sizes: [{ id: "m", label: "M", sku: "", checkoutUrl: "https://square.link/u/example" }] })],
            })
      const html = page(`/shop/${item.slug}/`, [item], terms)
      expect(html).not.toContain("https://square.link/u/example")
      expect(html).not.toContain("charged now")
    }
    for (const key of ["refundPolicy", "cancelPolicy"] as const) {
      const html = page(`/shop/${ready.slug}/`, [ready], { ...terms, [key]: "" })
      expect(html).not.toContain("https://square.link/u/example")
      expect(html).not.toContain("charged now")
    }
    for (const key of ["returnsBody", "delayPolicy", "email"] as const) {
      const html = page(`/shop/${ready.slug}/`, [ready], { ...terms, [key]: "" })
      expect(html).toContain("https://square.link/u/example")
    }
    const open = page(`/shop/${ready.slug}/`, [ready], terms)
    expect(open).toContain("https://square.link/u/example")
    expect(open).toContain(CHARGE_LINE)
    expect(open).not.toContain("charged now")
    expect(open).toContain("$60.00")
  })

  it("disables buy when the checkout url is missing", () => {
    const item = product({ status: "available" })
    const html = page(`/shop/${item.slug}/`, [item])
    expect(html).toContain("Coming soon")
    expect(sizeRadios(html)).not.toContain("disabled")
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
      colors: [
        color({
          price: 5000,
          sizes: [{ id: "m", label: "M", sku: "", checkoutUrl: "https://square.link/u/example", remaining: 0 }],
        }),
      ],
    })
    const html = page(`/shop/${item.slug}/`, [item])
    expect(html).toContain('data-state="soldout"')
    expect(html).toContain("Sold out")
    expect(html).not.toContain("https://square.link/u/example")
    expect(html).not.toContain("0 left")
    const open = product({
      colors: [color({ remaining: 0, price: 5000, sizes: [{ id: "m", label: "M", sku: "", checkoutUrl: "" }] })],
    })
    const openHtml = page(`/shop/${open.slug}/`, [open])
    expect(openHtml).not.toContain('data-state="soldout"')
    expect(sizeRadios(openHtml)).not.toContain("disabled")
  })

  it("shows the empty drop and hides unset contact links", () => {
    const html = page("/", [])
    expect(html).toContain("First drop coming soon.")
    expect(html.match(/First drop coming soon\./g)?.length).toBe(1)
    expect(html).toContain('class="hero-note"')
    expect(html).not.toContain("Shop hoodies")
    expect(html).toContain('href="/shop/">Shop</a>')
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
    expect(gallery).not.toContain('class="untitled"')
    expect(gallery).not.toContain("<h1")
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
    expect(renderRoute("/contact/", { site: site(), products: [], hero: shot, now, assets: { css: [], js: "/assets/entry.js" } }).status).toBe(404)
    expect(hidden).not.toContain('href="/contact/"')
    expect(hidden).not.toContain("instagram.com")
    expect(hidden).not.toContain("mailto:")
    expect(shown).toContain("https://instagram.com/pray4betterdays")
    expect(shown).toContain("mailto:studio@pray4betterdays.com")
    expect(shown).toContain('href="/contact/"')
  })

  it("credits the founder and hides an empty story", () => {
    const html = page("/about/", [])
    expect(html).toContain("Aniyla Evans, founder and designer.")
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
    expect(shipping).not.toContain("charged now")
    expect(shipping).not.toContain("sells hoodies on this site as pre-orders")
    expect(privacy).toContain("Pray4BetterDays")
    expect(shipping).not.toContain("<h2>Returns</h2>")
    expect(shipping).not.toContain("Card statements")
    expect(privacy).not.toContain("Card statements")
    expect((siteFile as Site).statementDescriptor).toBe("")
    const named = page("/shipping/", [], { statementDescriptor: "PRAY4BETTERDAYS" })
    const namedPrivacy = page("/privacy/", [], { statementDescriptor: "PRAY4BETTERDAYS" })
    const namedHome = page("/", [], { statementDescriptor: "PRAY4BETTERDAYS" })
    expect(named).toContain("Card statements show PRAY4BETTERDAYS.")
    expect(namedPrivacy).toContain("Card statements show PRAY4BETTERDAYS.")
    expect(namedHome).not.toContain("Card statements")
    const filled = page("/shipping/", [], {
      shipWindow: "Two weeks after the run closes.",
      ...terms,
      delayPolicy: "If a ship date slips, we write and offer a cancel.",
    })
    expect(filled).toContain("Two weeks after the run closes.")
    expect(filled).toContain("Refunds are available before the order ships.")
    expect(filled).toContain("You can cancel before the order ships.")
    expect(filled).toContain("Final sale after delivery.")
    expect(filled).toContain("If a ship date slips, we write and offer a cancel.")
    expect(filled).not.toContain("charged now")
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

  it("labels a generated frame and leaves a real photo alone", () => {
    expect(shotAlt(shot)).toBe(shot.alt)
    expect(shotAlt(shot).startsWith("Render:")).toBe(false)
    const back = { ...shot, alt: "Back of the black zip hoodie.", render: true as const }
    expect(shotAlt(back)).toBe("Render: Back of the black zip hoodie.")
    expect(shotAlt({ ...back, alt: "Render: already labeled." })).toBe("Render: already labeled.")
    const item = product({
      colors: [color({ images: { front: shot, back, side: null, details: [] }, spin: [back] })],
    })
    const html = page(`/shop/${item.slug}/`, [item])
    expect(html).toContain("Render: Back of the black zip hoodie.")
    expect(html).toContain("Render, final may vary")
    expect(html).toContain(`alt="${shot.alt}"`)
    expect(html).not.toContain("ghost")
  })

  it("draws a visible focus ring and fits zoom to the stage", () => {
    const css = readFileSync(join("src/styles/site.css"), "utf8")
    expect(css).toContain(
      `.size:has(input:focus-visible),
.swatch:has(input:focus-visible),
.view-tab:has(input:focus-visible) {
  outline: var(--focus-width) solid var(--text);
  outline-offset: var(--focus-offset);
}`,
    )
    expect(css).toContain('.size:has(input:disabled)[data-state="soldout"] > span:first-of-type')
    expect(css).not.toMatch(/\.size:has\(input:disabled\) > span:first-of-type/)
    expect(css).not.toMatch(/\.spin\s*\{[^}]*display:\s*none/)
    expect(css).toContain("touch-action: pan-x pan-y")
    expect(fittedZoomWidth(390, 941)).toBe(390)
    expect(fittedZoomWidth(2000, 941)).toBe(941)
    expect(zoomDisplayWidth(390, 941, 1)).toBe(390)
    expect(zoomDisplayWidth(390, 941, 4)).toBe(941)
    const stage = page("/", [])
    expect(stage).toContain('id="zoom-stage" tabindex="0"')
  })

  it("prices every size from config and falls back when a size has no price", () => {
    const config = siteFile as Site
    const sizes = config.sizes.map((size) => ({
      id: size.id,
      label: size.label,
      sku: "",
      checkoutUrl: "",
      priceCents: size.priceCents,
      paymentLink: size.paymentLink,
      remaining: null,
    }))
    const item = product({
      name: "[product name]",
      status: "presale",
      colors: [color({ presalePrice: 8500, sizes })],
    })
    const html = page(`/shop/${item.slug}/`, [item], { taxIncluded: null })
    const fieldAt = html.indexOf('<fieldset class="sizes">')
    const field = html.slice(fieldAt, html.indexOf("</fieldset>", fieldAt))
    expect(field).toContain('value="s" checked')
    expect(sizeRadios(html)).not.toContain("disabled")
    expect(field).not.toContain('data-state="soldout"')
    for (const id of ["s", "m", "l", "xl"]) {
      expect(html).toContain(`<p class="price" data-size="${id}"><span>$85.00</span></p>`)
      expect(html).toContain(`<p class="total" data-size="${id}"><span>Total</span> <span>$85.00</span></p>`)
    }
    expect(html).toContain('<p class="price" data-size="2xl"><span>$90.00</span></p>')
    expect(html).toContain('<p class="total" data-size="2xl"><span>Total</span> <span>$90.00</span></p>')
    expect(html).toContain('<p class="price" data-size="3xl"><span>$95.00</span></p>')
    expect(html).toContain('<p class="total" data-size="3xl"><span>Total</span> <span>$95.00</span></p>')
    expect(html).toContain("Free shipping")
    expect(html).toContain("[tax]")
    expect(html).toContain('aria-live="polite"')
    const unpriced = { id: "m", label: "M", sku: "", checkoutUrl: "", priceCents: null, paymentLink: null, remaining: null }
    expect(sizePriceCents(item, item.colors[0], unpriced, site())).toBe(8500)
    const struck = product({
      status: "presale",
      colors: [
        color({
          presalePrice: 8500,
          sizes: sizes.map((size) => (size.id === "l" ? { ...size, remaining: 0 } : size)),
        }),
      ],
    })
    const struckHtml = page(`/shop/${struck.slug}/`, [struck])
    const struckAt = struckHtml.indexOf('<fieldset class="sizes">')
    const struckField = struckHtml.slice(struckAt, struckHtml.indexOf("</fieldset>", struckAt))
    expect(struckField.match(/data-state="soldout"/g)?.length).toBe(1)
    expect(struckField).toContain('value="l" disabled')
    expect(struckField).toContain('value="s" checked')
  })

  it("keeps buy now behind the same terms as pre-order", () => {
    const item = product({
      status: "available",
      shipEstimate: "Ships when the run is cut.",
      colors: [
        color({
          price: 8500,
          sizes: [
            { id: "s", label: "S", sku: "", checkoutUrl: "https://square.link/u/example", priceCents: 8500, paymentLink: null },
            { id: "m", label: "M", sku: "", checkoutUrl: "", priceCents: 8500, paymentLink: null },
          ],
        }),
      ],
    })
    const blocked = page(`/shop/${item.slug}/`, [item], { refundPolicy: "", cancelPolicy: "" })
    expect(blocked).not.toContain("https://square.link/u/example")
    expect(blocked).toContain("Coming soon")
    const open = page(`/shop/${item.slug}/`, [item], terms)
    expect(open).toContain("https://square.link/u/example")
    expect(open).toContain("Buy now")
    expect(sizeRadios(open)).not.toContain("disabled")
  })

  it("keeps generated views out of zoom and leaves the 3D file unloaded", () => {
    expect(black.front.zoom).toContain("front-cutout.png")
    expect("render" in black.front).toBe(false)
    expect(black.back.render).toBe(true)
    expect(black.side.render).toBe(true)
    expect(black.support.render).toBe(true)
    for (const alt of [black.back.alt, black.side.alt, black.support.alt, black.model.alt, black.model.spin.alt]) {
      expect(alt.startsWith("Render:")).toBe(true)
      expect(alt.toLowerCase()).not.toContain("photo")
      expect(alt.toLowerCase()).not.toContain("ghost")
    }
    expect(black.model.alt.toLowerCase()).not.toContain("drag")
    expect(black.model.alt.toLowerCase()).not.toContain("arrow")
    expect(black.model.spin.count).toBe(24)
    expect(JSON.stringify(black)).not.toContain("w1360")
    expect(JSON.stringify(black)).not.toContain("w160")
    expect(black.front.webp.some((file) => file.width === 480)).toBe(true)
    const client = readFileSync(join("src/client.ts"), "utf8")
    expect(client).not.toContain('reveal", "immediate"')
    expect(client).not.toContain('reveal="immediate"')
    expect(client).toContain('const FRONT_ORBIT = "90deg 75deg auto"')
    expect(client).toContain("/vendor/meshopt_decoder.js")
    const css = readFileSync(join("src/styles/site.css"), "utf8")
    expect(css).not.toContain('[value="2xl"]')
    expect(css).not.toContain('[value="s"]')
    expect(css).toContain("var(--hero-media)")
    expect(readFileSync(join("src/styles/tokens.css"), "utf8")).not.toContain("--gallery")
    expect(readFileSync(join("src/lib/render.ts"), "utf8")).toContain("min(100vw, 42vh)")
    expect(readFileSync(join("public/.htaccess"), "utf8")).toContain("mod_deflate")
    expect(readFileSync(join("scripts/check-dist.ts"), "utf8")).not.toContain("vendor${sep}")
    const item = product({
      colors: [
        color({
          images: { front: black.front, back: black.back, side: black.side, details: [black.support] },
          model: black.model,
        }),
      ],
    })
    const html = page(`/shop/${item.slug}/`, [item])
    expect(html).toContain("3D view")
    expect(html).toContain("Three-quarter")
    expect(html).toContain('value="three-quarter"')
    expect(html).toContain("Loading 3D view.")
    expect(html).toContain('data-model-status')
    expect(html.match(/role="status"/g)).toEqual(['role="status"'])
    const statusAt = html.indexOf('<p class="model-status"')
    const statusHtml = html.slice(statusAt, html.indexOf("</p>", statusAt))
    expect(statusHtml).toContain("Loading 3D view.")
    expect(statusHtml).not.toContain("hidden")
    expect(statusHtml).not.toContain("button")
    expect(html.indexOf("data-model-retry")).toBeGreaterThan(html.indexOf("</p>", statusAt))
    expect(client).toContain("3D view did not load.")
    expect(html).toContain("Arrow keys rotate.")
    expect(html).toContain('class="size-label"')
    expect(html).toContain("data-model-retry")
    expect(html).toContain("min(calc(100vw - 2.5rem - 80px), calc(45vh * 1360 / 2048))")
    expect(html).toContain("min(calc((100vw - 5rem - 1.25rem) * 1.25 / 2 - 80px), calc(48vh * 1360 / 2048))")
    expect(html).not.toContain('sizes="256px"')
    const frontAt = html.indexOf('data-view="front"')
    const frontHtml = html.slice(frontAt, html.indexOf('data-view="back"'))
    expect(frontHtml).toContain("min(100vw, 42vh)")
    expect(frontHtml).not.toContain("80px")
    expect(html).toContain("Render, final may vary")
    expect(html).not.toContain("model-viewer.min.js")
    expect(html).not.toContain("<model-viewer")
    expect(html).not.toContain('src="/media/first-design/black/turntable/frame-00.webp"')
    expect(html).not.toContain('class="support"')
    expect(html).not.toContain("ghost")
    const angleAt = html.indexOf('data-view="three-quarter"')
    const angleHtml = html.slice(angleAt, html.indexOf("</div>", angleAt))
    expect(angleHtml).not.toContain("data-zoom")
    const backAt = html.indexOf('data-view="back"')
    const backHtml = html.slice(backAt, html.indexOf("</div>", backAt))
    expect(backHtml).not.toContain("data-zoom")
    expect(html).toContain("data-zoom=")
    const check = readFileSync(join("scripts/check-dist.ts"), "utf8")
    expect(check).toContain("missingProductNames(")
    expect(check).toContain("[product name]")
    expect(check).not.toContain("must ship as []")
    const shopItem = product({
      name: "[product name]",
      status: "presale",
      colors: [
        color({
          presalePrice: 8500,
          sizes: (siteFile as Site).sizes.map((size) => ({
            id: size.id,
            label: size.label,
            sku: "",
            checkoutUrl: "",
            priceCents: size.priceCents,
            paymentLink: null,
            remaining: null,
          })),
        }),
      ],
    })
    const shop = page("/shop/", [shopItem])
    const cardAt = shop.indexOf('class="card')
    const card = shop.slice(cardAt, shop.indexOf("</a>", cardAt))
    expect(card).toContain('<div class="card-copy">')
    expect(card).toContain("<span>From</span>")
    expect(card).toContain("$85.00")
    expect(card).not.toContain("Total")
    expect(card).not.toContain("<span><p")
    expect(card).not.toContain("<span class=\"card-copy\">")
  })

  it("keeps frame-00 through frame-23 in dist for a listed product", () => {
    const item = product({
      colors: [
        color({
          images: { front: black.front, back: black.back, side: black.side, details: [black.support] },
          model: black.model,
        }),
      ],
    })
    const html = page(`/shop/${item.slug}/`, [item])
    const frames = framePaths(black.model.spin.prefix, black.model.spin.count)
    expect(frames).toHaveLength(24)
    expect(frames[0]).toBe("/media/first-design/black/turntable/frame-00.webp")
    expect(frames[23]).toBe("/media/first-design/black/turntable/frame-23.webp")
    expect(html).not.toContain('src="/media/first-design/black/turntable/frame-00.webp"')
    for (const frame of frames) expect(mediaRefs(html)).toContain(frame)
    const root = mkdtempSync(join(tmpdir(), "p4bd-dist-"))
    try {
      mkdirSync(join(root, "shop/fixture-hoodie"), { recursive: true })
      writeFileSync(join(root, "shop/fixture-hoodie/index.html"), html)
      for (const frame of frames) {
        const file = join(root, frame.slice(1))
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, "")
      }
      const unused = join(root, "media/unused.webp")
      mkdirSync(dirname(unused), { recursive: true })
      writeFileSync(unused, "")
      const dropped = pruneUnreferencedMedia(root)
      expect(dropped).toContain("/media/unused.webp")
      for (const frame of frames) {
        expect(existsSync(join(root, frame.slice(1)))).toBe(true)
        expect(dropped).not.toContain(frame)
      }
      expect(missingReferencedFrames(root)).toEqual([])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it("reports only a missing referenced frame from the dist check", () => {
    const root = mkdtempSync(join(tmpdir(), "p4bd-missing-frame-"))
    const prefix = "/media/first-design/black/turntable/frame-"
    const frames = framePaths(prefix, 2)
    try {
      mkdirSync(join(root, "shop/fixture"), { recursive: true })
      writeFileSync(
        join(root, "shop/fixture/index.html"),
        `<div data-frame-prefix="${prefix}" data-frame-count="2"></div>`,
      )
      const present = join(root, frames[1].slice(1))
      mkdirSync(dirname(present), { recursive: true })
      writeFileSync(present, "")
      expect(missingFrameFailures(root)).toEqual([`${frames[0]} is referenced but missing from dist`])
      writeFileSync(join(root, frames[0].slice(1)), "")
      expect(missingFrameFailures(root)).toEqual([])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
