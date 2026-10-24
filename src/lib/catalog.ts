import type { Colorway, Cta, PriceView, Product, Site, Status } from "./types"

// Prices are integer US cents. Null means unset, and the page shows no price.
// checkoutUrl is a Square hosted payment link. An empty string cannot sell.

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
  if (!/^https?:\/\//i.test(trimmed)) return ""
  return trimmed
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

export function sizeCta(product: Product, color: Colorway, checkoutUrl: string, now: Date): Cta {
  const href = safeCheckoutUrl(checkoutUrl)
  if (product.status === "soldout" || colorBlocked(color)) {
    return { kind: "disabled", label: "Sold out" }
  }
  if (presaleClosed(product, now)) {
    return { kind: "disabled", label: "Pre-order closed" }
  }
  if (!href || product.status === "comingsoon") {
    return { kind: "disabled", label: "Coming soon" }
  }
  if (product.status === "presale") return { kind: "link", label: "Pre-order", href }
  return { kind: "link", label: "Buy now", href }
}

export function priceView(product: Product, color: Colorway): PriceView {
  if (product.status === "presale") {
    if (color.presalePrice == null) return { current: null, compare: null }
    return {
      current: formatMoney(color.presalePrice, color.currency),
      compare: color.regularPrice == null ? null : formatMoney(color.regularPrice, color.currency),
    }
  }
  if (color.price == null) return { current: null, compare: null }
  return { current: formatMoney(color.price, color.currency), compare: null }
}

export function scarcityLines(color: Colorway): string[] {
  const lines: string[] = []
  if (typeof color.runSize === "number" && color.runSize > 0) lines.push(`Run of ${color.runSize}`)
  if (typeof color.remaining === "number" && color.remaining > 0) lines.push(`${color.remaining} left`)
  return lines
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
