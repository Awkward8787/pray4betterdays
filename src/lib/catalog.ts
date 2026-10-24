import type { Colorway, Cta, PriceView, Product, Shot, Site, SizeOption, Status } from "./types"

// Prices are integer US cents. Null means unset, and the page shows no price.
// There is no former-price field. A compare-at price would be a claim this drop never earned.
// checkoutUrl is an https Square hosted payment link. Anything else cannot sell.

const SQUARE_HOSTS = ["square.link", "checkout.square.site", "squareup.com"]

export const RENDER_NOTE = "Render, final may vary"

export const SIZE_RUN: { id: string; label: string }[] = [
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
  { id: "xl", label: "XL" },
  { id: "2xl", label: "2XL" },
  { id: "3xl", label: "3XL" },
]

export function safeCheckoutUrl(url: string): string {
  const trimmed = url.trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return ""
  }
  if (parsed.protocol !== "https:") return ""
  const host = parsed.hostname.toLowerCase()
  const allowed = SQUARE_HOSTS.some((name) => host === name || host.endsWith(`.${name}`))
  return allowed ? trimmed : ""
}

export function shotAlt(shot: Shot): string {
  const alt = shot.alt.trim()
  if (!shot.render) return alt
  if (alt.startsWith("Render:")) return alt
  return alt ? `Render: ${alt}` : "Render:"
}

export function contactReady(site: Site): boolean {
  return Boolean(site.email.trim() || instagramHandle(site.instagram))
}

export function preorderTermsReady(product: Product, site: Site): boolean {
  return Boolean(
    product.shipEstimate.trim() &&
      site.refundPolicy.trim() &&
      site.cancelPolicy.trim() &&
      site.returnsBody.trim() &&
      site.delayPolicy.trim() &&
      contactReady(site),
  )
}

export function missingProductNames(products: { name?: string }[]): string[] {
  return products.flatMap((product, index) => {
    const name = product.name?.trim() ?? ""
    return name ? [] : [`product ${index} is missing a name`]
  })
}

export function instagramHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").replace(/\s+/g, "")
}

export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100)
}

export function formatEndDate(iso: string, timeZone: string): string | null {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return null
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timeZone || "UTC",
  }).format(new Date(time))
}

export function presaleClosed(product: Product, now: Date): boolean {
  if (product.status !== "presale" || !product.presaleEndsAt) return false
  const time = Date.parse(product.presaleEndsAt)
  if (Number.isNaN(time)) return false
  return now.getTime() > time
}

export function colorBlocked(color: Colorway): boolean {
  return color.remaining === 0
}

export function sizeCheckout(size: SizeOption): string {
  const link = size.paymentLink?.trim() ?? ""
  if (link) return link
  return size.checkoutUrl ?? ""
}

export function sizeSoldOut(product: Product, size: SizeOption): boolean {
  return product.status === "soldout" || size.remaining === 0
}

export function sizePriceCents(product: Product, color: Colorway, size: SizeOption, _site: Site): number | null {
  if (typeof size.priceCents === "number") return size.priceCents
  if (product.status === "presale") return color.presalePrice
  return color.price
}

export function sizeCta(product: Product, color: Colorway, size: SizeOption, now: Date, site: Site): Cta {
  const href = safeCheckoutUrl(sizeCheckout(size))
  if (sizeSoldOut(product, size)) {
    return { kind: "disabled", label: "Sold out" }
  }
  if (presaleClosed(product, now)) {
    return { kind: "disabled", label: "Pre-order closed" }
  }
  if (!href || product.status === "comingsoon" || sizePriceCents(product, color, size, site) == null || !preorderTermsReady(product, site)) {
    return { kind: "disabled", label: "Coming soon" }
  }
  if (product.status === "presale") return { kind: "link", label: "Pre-order", href }
  return { kind: "link", label: "Buy now", href }
}

export function priceView(product: Product, color: Colorway): PriceView {
  if (product.status === "presale") {
    if (color.presalePrice == null) return { current: null }
    return { current: formatMoney(color.presalePrice, color.currency) }
  }
  if (color.price == null) return { current: null }
  return { current: formatMoney(color.price, color.currency) }
}

export function scarcityLines(color: Colorway): string[] {
  if (typeof color.runSize === "number" && color.runSize > 0) return [`Run of ${color.runSize}`]
  return []
}

export function productLabel(product: Product): { text: string; named: boolean } {
  const name = product.name.trim()
  if (name) return { text: name, named: true }
  for (const color of product.colors) {
    const alt = color.images.front?.alt.trim()
    if (alt) return { text: alt, named: false }
  }
  return { text: "", named: false }
}

export function productPath(slug: string): string {
  return `/shop/${slug}/`
}

export function findProduct(products: Product[], slug: string): Product | undefined {
  return products.find((product) => product.slug === slug)
}

export function normalizePath(path: string): string {
  const bare = path.split("?")[0].split("#")[0]
  if (bare === "/index.html") return "/"
  if (bare.length > 1 && bare.endsWith("/")) return bare.slice(0, -1)
  return bare || "/"
}

export function displayHeading(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.length > 0 && words.length <= 4
}

export function statusLabel(status: Status): string {
  if (status === "presale") return "Pre-order"
  if (status === "soldout") return "Sold out"
  if (status === "comingsoon") return "Coming soon"
  return ""
}

export function reachLinks(site: Site): { href: string; label: string }[] {
  const links: { href: string; label: string }[] = []
  const email = site.email.trim()
  if (email) links.push({ href: `mailto:${email}`, label: email })
  const handle = instagramHandle(site.instagram)
  if (handle) links.push({ href: `https://instagram.com/${handle}`, label: "Instagram" })
  return links
}
