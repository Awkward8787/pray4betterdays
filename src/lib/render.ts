import {
  contactReady,
  displayHeading,
  findProduct,
  formatEndDate,
  formatMoney,
  instagramHandle,
  normalizePath,
  productLabel,
  productPath,
  reachLinks,
  RENDER_NOTE,
  scarcityLines,
  shotAlt,
  sizeCta,
  sizePriceCents,
  sizeSoldOut,
} from "./catalog"
import { iconBan, iconClose, iconMenu, iconNext, iconPrev, iconZoom } from "./icons"
import { framePaths } from "./frames"
import type { Cta, Colorway, ModelView, Product, Shot, Site } from "./types"

export interface Assets {
  css: string[]
  js: string
}

export interface Ctx {
  site: Site
  products: Product[]
  hero: Shot | null
  now: Date
  assets: Assets
}

// sizes attributes need px breakpoints. CSS media queries cannot read a custom property here.
// The height caps are 45vh and 60vh on the hero, and 45vh / 48vh on the product. The trimmed front is about 0.92 wide per tall.
const HERO_SIZES = "(min-width: 960px) min(50vw, 55vh), min(100vw, 42vh)" // ds-allow-hardcode
const GALLERY_SIZES = "(min-width: 960px) min(58vw, 44vh), min(100vw, 42vh)" // ds-allow-hardcode
const CARD_SIZES = "(min-width: 720px) 40vw, 100vw" // ds-allow-hardcode

const NAV = [
  ["/shop/", "Shop"],
  ["/about/", "About"],
  ["/contact/", "Contact"],
  ["/shipping/", "Shipping and returns"],
  ["/privacy/", "Privacy"],
] as const

export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;"
    if (char === "<") return "&lt;"
    if (char === ">") return "&gt;"
    if (char === '"') return "&quot;"
    return "&#39;"
  })
}

function navItems(site: Site): [string, string][] {
  return NAV.filter(([href]) => href !== "/contact/" || contactReady(site)).map(([href, label]) => [href, label])
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${esc(block).replaceAll("\n", "<br>")}</p>`)
    .join("")
}

function picture(shot: Shot, opts: { eager: boolean; sizes: string; alt: string }): string {
  const avif = shot.avif.map((file) => `${esc(file.src)} ${file.width}w`).join(", ")
  const webp = shot.webp.map((file) => `${esc(file.src)} ${file.width}w`).join(", ")
  const fallback = shot.webp.at(-1)?.src || shot.zoom
  const loading = opts.eager ? "eager" : "lazy"
  const priority = opts.eager ? ` fetchpriority="high"` : ""
  const avifSource = avif ? `<source type="image/avif" srcset="${avif}" sizes="${opts.sizes}">` : ""
  const webpSource = webp ? `<source type="image/webp" srcset="${webp}" sizes="${opts.sizes}">` : ""
  return `<picture>${avifSource}${webpSource}<img src="${esc(fallback)}" alt="${esc(opts.alt)}" width="${shot.width}" height="${shot.height}" loading="${loading}" decoding="async"${priority}></picture>`
}

// object-fit: contain draws the portrait inside the height cap, narrower than the figure box.
// Caps are 45vh below 960px and 48vh from there. The figure keeps a 40px margin on each side.
function renderSizes(shot: Shot): string {
  const mobile = `min(calc(100vw - 2.5rem - 80px), calc(45vh * ${shot.width} / ${shot.height}))` // ds-allow-hardcode
  const desktop = `min(calc((100vw - 5rem - 1.25rem) * 1.25 / 2 - 80px), calc(48vh * ${shot.width} / ${shot.height}))` // ds-allow-hardcode
  return `(min-width: 960px) ${desktop}, ${mobile}` // ds-allow-hardcode
}

function renderBadge(shot: Shot, extra = ""): string {
  if (!shot.render) return ""
  const cls = extra ? `render-label ${extra}` : "render-label"
  return `<span class="${cls}">${esc(RENDER_NOTE)}</span>`
}

function zoomButton(shot: Shot, eager: boolean, sizes: string): string {
  const alt = shotAlt(shot)
  return `<figure class="stage" data-watch>
    <button type="button" class="zoom-open" aria-label="Zoom: ${esc(alt)}" data-zoom="${esc(shot.zoom)}" data-zoom-alt="${esc(alt)}" data-zoom-w="${shot.width}" data-zoom-h="${shot.height}">
      ${picture(shot, { eager, sizes, alt })}
      ${renderBadge(shot)}
      <span class="zoom-label">${iconZoom} Zoom</span>
    </button>
  </figure>`
}

function still(shot: Shot, eager: boolean, sizes: string): string {
  if (shot.render || !shot.zoom) {
    const alt = shotAlt(shot)
    return `<figure class="stage" data-watch>${picture(shot, { eager, sizes, alt })}${renderBadge(shot)}</figure>`
  }
  return zoomButton(shot, eager, sizes)
}

function ctaMarkup(cta: Cta, sizeId: string, fallback = false): string {
  const size = fallback ? "" : ` data-size="${esc(sizeId)}"`
  const extra = fallback ? " buy-fallback" : " buy-link"
  if (cta.kind === "link") {
    return `<a class="button${extra}"${size} href="${esc(cta.href)}">${esc(cta.label)}</a>`
  }
  const icon = cta.label === "Sold out" || cta.label === "Pre-order closed" ? `${iconBan} ` : ""
  return `<button type="button" class="button${extra}"${size} disabled>${icon}${esc(cta.label)}</button>`
}

function shippingCostMarkup(site: Site): string {
  const text = site.shippingCost.trim()
  if (!text) return ""
  return `<p class="shipping-cost">${esc(text)}</p>`
}

function totalMarkup(amount: string, sizeId: string, site: Site): string {
  if (site.taxIncluded === false) {
    return `<p class="total" data-size="${esc(sizeId)}"><span>${esc(amount)} plus tax</span></p>`
  }
  return `<p class="total" data-size="${esc(sizeId)}"><span>Total</span> <span>${esc(amount)}</span></p>`
}

function taxMarkup(site: Site): string {
  if (site.taxIncluded !== null) return ""
  return `<p class="tax">[tax]</p>`
}

function sizedAmounts(product: Product, color: Colorway, site: Site): { id: string; amount: string }[] {
  return color.sizes.flatMap((size) => {
    const cents = sizePriceCents(product, color, size, site)
    if (cents == null) return []
    return [{ id: size.id, amount: formatMoney(cents, color.currency) }]
  })
}

function scarcityMarkup(color: Colorway): string {
  const lines = scarcityLines(color)
  if (!lines.length) return ""
  return `<p class="runs">${lines.map((line) => `<span>${esc(line)}</span>`).join("")}</p>`
}

function viewsFor(color: Colorway): { id: string; label: string; shot: Shot | null }[] {
  const views: { id: string; label: string; shot: Shot | null }[] = []
  if (color.images.front) views.push({ id: "front", label: "Front", shot: color.images.front })
  if (color.images.back) views.push({ id: "back", label: "Back", shot: color.images.back })
  if (color.images.side) views.push({ id: "side", label: "Side", shot: color.images.side })
  for (const shot of color.images.details) {
    if (!shot.render) continue
    views.push({ id: "three-quarter", label: "Three-quarter", shot })
  }
  if (color.model) views.push({ id: "model", label: "3D view", shot: null })
  return views
}

function modelSlot(model: ModelView): string {
  const spin = model.spin
  const frames = framePaths(spin.prefix, spin.count)
  return `<div class="model-block"><div class="stage model-slot" data-model tabindex="0" role="region" aria-label="${esc(model.alt)}" aria-busy="true" data-src="${esc(model.src)}" data-alt="${esc(model.alt)}" data-frame-prefix="${esc(spin.prefix)}" data-frame-count="${frames.length}" data-frame-w="${spin.width}" data-frame-h="${spin.height}" data-frame-alt="${esc(spin.alt)}"><div class="model-bar"><p class="model-status" data-model-status role="status">Loading 3D view.</p><button type="button" class="button secondary" data-model-retry hidden>Retry</button></div></div><span class="render-label">${esc(RENDER_NOTE)}</span><p class="model-hint">Arrow keys rotate.</p></div>`
}

function spinBlock(frames: Shot[]): string {
  if (!frames.length) return ""
  const first = frames[0]
  const alt = shotAlt(first)
  const hidden = first.render ? "" : " hidden"
  return `<div class="spin" data-spin role="region" aria-roledescription="carousel" aria-label="Product views" tabindex="0">
    <div class="spin-frame" data-watch>
      <img data-spin-view src="${esc(first.zoom)}" alt="${esc(alt)}" width="${first.width}" height="${first.height}">
      <span class="render-label" data-render-label${hidden}>${esc(RENDER_NOTE)}</span>
    </div>
    <div class="spin-controls">
      <button type="button" class="button secondary" data-spin-prev>${iconPrev} Previous frame</button>
      <button type="button" class="button secondary" data-spin-next>${iconNext} Next frame</button>
    </div>
    <ol hidden>${frames
      .map(
        (frame) =>
          `<li data-frame data-src="${esc(frame.zoom)}" data-alt="${esc(shotAlt(frame))}" data-render="${frame.render ? "true" : "false"}"></li>`,
      )
      .join("")}</ol>
  </div>`
}

function panel(color: Colorway): string {
  const views = viewsFor(color)
  const only = views.length <= 1
  const photos = color.images.details.filter((shot) => !shot.render)
  const blocks = views
    .map((view, index) => {
      const tab = only
        ? ""
        : `<label class="view-tab">${view.label}<input class="view-input" type="radio" name="view-${esc(color.id)}" value="${esc(view.id)}"${index === 0 ? " checked" : ""}></label>`
      const sizes = view.shot?.render ? renderSizes(view.shot) : GALLERY_SIZES
      const body = view.id === "model" && color.model ? modelSlot(color.model) : view.shot ? still(view.shot, view.id === "front", sizes) : ""
      return `<div class="view-block">${tab}<div class="view${only ? " is-only" : ""}" data-view="${esc(view.id)}">${body}</div></div>`
    })
    .join("")
  const switcher = views.length > 1 ? `<fieldset class="views"><legend>View</legend>${blocks}</fieldset>` : blocks
  const details = photos.length
    ? `<h2>Details</h2><ul class="details">${photos
        .map((shot) => {
          const alt = shotAlt(shot)
          return `<li><button type="button" class="detail-open" aria-label="Zoom: ${esc(alt)}" data-zoom="${esc(shot.zoom)}" data-zoom-alt="${esc(alt)}" data-zoom-w="${shot.width}" data-zoom-h="${shot.height}">${picture(shot, { eager: false, sizes: "40vw", alt })}${renderBadge(shot)}</button></li>`
        })
        .join("")}</ul>`
    : ""
  return `<div class="panel" data-color="${esc(color.id)}">${switcher}${spinBlock(color.spin)}${details}</div>`
}

function group(product: Product, color: Colorway, site: Site, now: Date): string {
  const states = color.sizes.map((size) => sizeCta(product, color, size, now, site))
  const selected = states.findIndex((state) => state.label !== "Sold out")
  const amounts = sizedAmounts(product, color, site)
  const amountFor = new Map(amounts.map((row) => [row.id, row.amount]))
  const offers = color.sizes
    .map((size, index) => {
      const soldOut = sizeSoldOut(product, size)
      const disabled = soldOut ? " disabled" : ""
      const state = soldOut ? ` data-state="soldout"` : ""
      const checked = index === selected ? " checked" : ""
      const amount = amountFor.get(size.id) ?? ""
      const priceAttr = amount ? ` data-price="${esc(amount)}" data-total="${esc(site.taxIncluded === false ? `${amount} plus tax` : `Total ${amount}`)}"` : ""
      const note = soldOut ? `<span class="size-state">Sold out</span>` : ""
      const sku = size.sku.trim() ? `<span class="sku">${esc(size.sku)}</span>` : ""
      const price = amount ? `<p class="price" data-size="${esc(size.id)}"><span>${esc(amount)}</span></p>` : ""
      const total = amount ? totalMarkup(amount, size.id, site) : ""
      const ship = amount ? shippingCostMarkup(site) : ""
      const tax = amount ? taxMarkup(site) : ""
      const disclosure = states[index].kind === "link" && states[index].label === "Pre-order" ? presaleCopy(product, site) : ""
      return `<div class="offer">${price}${ship}${total}${tax}<label class="size"${state}><input class="size-input" type="radio" name="size-${esc(color.id)}" value="${esc(size.id)}"${checked}${disabled}${priceAttr}><span>${esc(size.label)}</span>${note}${sku}</label>${disclosure}${ctaMarkup(states[index], size.id)}</div>`
    })
    .join("")
  const fallbackCta = states[0] ?? { kind: "disabled" as const, label: "Coming soon" as const }
  const fallback = ctaMarkup(fallbackCta.kind === "link" ? { kind: "disabled", label: "Coming soon" } : fallbackCta, "", true)
  const live = amounts.length ? `<p class="live" data-price-live aria-live="polite"></p>` : ""
  return `<div class="group" data-color="${esc(color.id)}">
    ${live}
    <fieldset class="sizes"><legend>Size</legend><span class="size-label" aria-hidden="true">Size</span>${scarcityMarkup(color)}${offers}</fieldset>
    ${fallback}
  </div>`
}

function presaleCopy(product: Product, site: Site): string {
  const end = product.presaleEndsAt ? formatEndDate(product.presaleEndsAt, site.timeZone) : null
  const terms = [product.shipEstimate.trim(), site.cancelPolicy.trim()].filter(Boolean).join(" ")
  const sentence = terms ? `Pre-order. ${terms}` : "Pre-order."
  const until = end ? `<p class="end">Pre-order ends <time datetime="${esc(product.presaleEndsAt ?? "")}">${esc(end)}</time>.</p>` : ""
  return `<div class="notes">
    <p class="note">${esc(sentence)}</p>
    <p class="note"><a class="text-link" href="/shipping/">Your card is charged when you place the pre-order.</a></p>
    ${until}
  </div>`
}

function productArticle(product: Product, site: Site, now: Date): string {
  const label = productLabel(product)
  const title = label.named
    ? `<h1 class="${displayHeading(label.text) ? "display title" : "title"}">${esc(label.text)}</h1>`
    : ""
  const end = product.status === "presale" && product.presaleEndsAt ? ` data-presale-end="${esc(product.presaleEndsAt)}"` : ""
  const colors = product.colors
    .map((color, index) => {
      const checked = index === 0 ? " checked" : ""
      return `<label class="swatch"><input class="color-input" type="radio" name="color" value="${esc(color.id)}"${checked}><span class="chip" data-swatch="${esc(color.id)}"></span><span>${esc(color.name)}</span></label>`
    })
    .join("")
  const description = product.description.trim() ? `<div class="prose">${paragraphs(product.description)}</div>` : ""
  return `<article class="product product-layout"${end}>
    <div class="gallery">${product.colors.map((color) => panel(color)).join("")}</div>
    <div class="buy">
      ${title}
      ${description}
      <fieldset class="choices"><legend>Color</legend>${colors}</fieldset>
      ${product.colors.map((color) => group(product, color, site, now)).join("")}
    </div>
  </article>`
}

function card(product: Product, site: Site, now: Date, lead: boolean): string {
  const color = product.colors[0]
  const front = color?.images.front
  const back = color?.images.back
  const frame = front
    ? `<span class="frame">${picture(front, { eager: lead, sizes: CARD_SIZES, alt: shotAlt(front) }).replace("<picture>", '<picture class="front">')}${renderBadge(front)}${
        back
          ? `${picture(back, { eager: false, sizes: CARD_SIZES, alt: shotAlt(back) }).replace("<picture>", '<picture class="back">')}${renderBadge(back, "back")}`
          : ""
      }</span>`
    : ""
  const name = product.name.trim() ? `<span class="card-name">${esc(product.name.trim())}</span>` : ""
  const blocked = color ? scarcityLines(color) : []
  const state = cardState(product, site, now)
  const lowest = color
    ? color.sizes.reduce<{ cents: number; amount: string } | null>((best, size) => {
        const cents = sizePriceCents(product, color, size, site)
        if (cents == null) return best
        if (best && best.cents <= cents) return best
        return { cents, amount: formatMoney(cents, color.currency) }
      }, null)
    : null
  const price = lowest ? `<p class="price"><span>From</span> <span>${esc(lowest.amount)}</span></p>` : ""
  const shipping = lowest ? shippingCostMarkup(site) : ""
  const tax = lowest ? taxMarkup(site) : ""
  const run = blocked.length ? `<span class="runs">${blocked.map((line) => `<span>${esc(line)}</span>`).join("")}</span>` : ""
  return `<a class="card${lead ? " card-lead" : ""}" href="${productPath(product.slug)}">${frame}<div class="card-copy">${name}${price}${shipping}${tax}${state}${run}</div></a>`
}

function cardState(product: Product, site: Site, now: Date): string {
  const color = product.colors[0]
  if (!color) return ""
  const states = color.sizes.map((size) => sizeCta(product, color, size, now, site))
  if (states.some((state) => state.kind === "disabled" && state.label === "Sold out") && states.every((state) => state.kind === "disabled")) {
    return `<span class="card-status">${iconBan} Sold out</span>`
  }
  if (product.status === "comingsoon" || states.every((state) => state.kind === "disabled" && state.label === "Coming soon")) {
    return `<span class="card-status">Coming soon</span>`
  }
  if (product.status === "presale" && states.some((state) => state.kind === "link" && state.label === "Pre-order")) {
    return `<span class="card-status">Pre-order</span>`
  }
  if (states.every((state) => state.kind === "disabled")) {
    return `<span class="card-status">${esc(states[0]?.kind === "disabled" ? states[0].label : "Coming soon")}</span>`
  }
  return ""
}

function catalog(products: Product[], site: Site, now: Date, eagerLead = true): string {
  if (!products.length) {
    const links = reachLinks(site)
    const reach = links.length
      ? `<p class="reach">${links.map((link) => `<a class="text-link" href="${esc(link.href)}">${esc(link.label)}</a>`).join("")}</p>`
      : ""
    return `<section class="empty"><h2>First drop coming soon.</h2>${reach}</section>`
  }
  return `<div class="catalog">${products.map((product, index) => card(product, site, now, eagerLead && index === 0)).join("")}</div>`
}

function sizeGuide(site: Site): string {
  if (!site.sizeGuide.length) return ""
  const rows = site.sizeGuide
    .map(
      (row) =>
        `<tr><th scope="row">${esc(row.label)}</th><td>${esc(row.chest)}</td><td>${esc(row.length)}</td><td>${esc(row.sleeve)}</td></tr>`,
    )
    .join("")
  return `<table class="guide"><caption>Size guide</caption><thead><tr><th scope="col">Size</th><th scope="col">Chest</th><th scope="col">Length</th><th scope="col">Sleeve</th></tr></thead><tbody>${rows}</tbody></table>`
}

function currentAttr(path: string, href: string): string {
  const bare = href.replace(/\/$/, "")
  return path === href || path === bare ? ` aria-current="page"` : ""
}

function header(site: Site, path: string): string {
  const primary = navItems(site)
    .filter(([href]) => href === "/shop/" || href === "/contact/")
    .map(([href, label]) => `<a href="${href}"${currentAttr(path, href)}>${label}</a>`)
    .join("")
  const logo = `<a class="logo" href="/">${esc(site.brand)}</a>`
  return `<header class="site-header">${logo}<nav class="primary-nav" aria-label="Primary">${primary}</nav><button type="button" class="menu-button" data-menu aria-expanded="false" aria-controls="nav-dialog">${iconMenu} Menu</button></header>`
}

function footer(site: Site, path: string): string {
  const links = navItems(site)
    .map(([href, label]) => `<a href="${href}"${currentAttr(path, href)}>${label}</a>`)
    .join("")
  return `<footer class="site-footer"><p class="legal">© ${site.year} ${esc(site.legalName)}. Designed by ${esc(site.founder)}.</p><nav class="footer-nav" aria-label="Footer">${links}</nav></footer>`
}

function dialogs(site: Site): string {
  const links = navItems(site)
    .map(([href, label]) => `<a href="${href}">${label}</a>`)
    .join("")
  return `<dialog id="nav-dialog" class="nav-dialog" aria-label="Menu">
    <form method="dialog"><button type="submit" class="button secondary">${iconClose} Close</button></form>
    <nav>${links}</nav>
  </dialog>
  <dialog id="zoom-dialog" class="zoom-dialog" aria-label="Zoomed image">
    <form method="dialog" class="zoom-bar">
      <button type="button" class="button secondary" id="zoom-in">${iconZoom} Zoom in</button>
      <button type="button" class="button secondary" id="zoom-out">Zoom out</button>
      <button type="submit" class="button secondary">${iconClose} Close</button>
    </form>
    <div class="zoom-stage" id="zoom-stage" tabindex="0" aria-label="Zoomed photo. Arrow keys pan."><img id="zoom-img" alt="" width="941" height="1022"></div>
  </dialog>`
}

function absoluteUrl(site: Site, path: string): string {
  if (/^https:\/\//i.test(path)) return path
  const suffix = path.startsWith("/") ? path : `/${path}`
  return `https://${site.domain}${suffix}`
}

function documentPage(ctx: Ctx, opts: { title: string; description: string; path: string; main: string; status?: number }): { status: number; html: string } {
  const css = ctx.assets.css.map((href) => `<link rel="stylesheet" href="${esc(href)}">`).join("")
  const canonical = `https://${ctx.site.domain}${opts.path === "/" ? "/" : opts.path.endsWith("/") ? opts.path : `${opts.path}/`}`
  const image = ctx.hero?.zoom ? absoluteUrl(ctx.site, ctx.hero.zoom) : ""
  const imageMeta = image
    ? `<meta property="og:image" content="${esc(image)}">
  <meta name="twitter:image" content="${esc(image)}">`
    : ""
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(opts.title)}</title>
  <meta name="description" content="${esc(opts.description)}">
  <link rel="canonical" href="${esc(canonical)}">
  <meta property="og:title" content="${esc(opts.title)}">
  <meta property="og:description" content="${esc(opts.description)}">
  <meta property="og:url" content="${esc(canonical)}">
  ${imageMeta}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(opts.title)}">
  <meta name="twitter:description" content="${esc(opts.description)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  ${css}
</head>
<body>
  <a class="skip" href="#content">Skip to content</a>
  ${header(ctx.site, opts.path)}
  <main id="content">${opts.main}</main>
  ${footer(ctx.site, opts.path)}
  ${dialogs(ctx.site)}
  <script type="module" src="${esc(ctx.assets.js)}"></script>
</body>
</html>`
  return { status: opts.status ?? 200, html }
}

function heroTurntable(product: Product): string {
  const spin = product.colors[0]?.model?.spin
  if (!spin || spin.count < 1 || !spin.prefix.trim()) return ""
  const frames = framePaths(spin.prefix, spin.count)
  const first = frames[0]
  if (!first) return ""
  const href = productPath(product.slug)
  const items = frames
    .map((src) => `<li data-frame data-src="${esc(src)}" data-alt="${esc(spin.alt)}" data-render="true"></li>`)
    .join("")
  return `<div class="hero-spin spin" data-spin role="region" aria-roledescription="carousel" aria-label="Product views" tabindex="0">
    <div class="spin-frame" data-watch>
      <a href="${esc(href)}"><img data-spin-view src="${esc(first)}" alt="${esc(spin.alt)}" width="${spin.width}" height="${spin.height}"></a>
    </div>
    <span class="render-label">${esc(RENDER_NOTE)}</span>
    <div class="spin-controls">
      <button type="button" class="button secondary" data-spin-prev>${iconPrev} Previous frame</button>
      <button type="button" class="button secondary" data-spin-next>${iconNext} Next frame</button>
    </div>
    <ol hidden>${items}</ol>
  </div>`
}

function home(ctx: Ctx): string {
  const featured = ctx.products[0]
  const turntable = featured ? heroTurntable(featured) : ""
  const hero = turntable || (ctx.hero ? zoomButton(ctx.hero, true, HERO_SIZES) : "")
  const links = ctx.products.length ? [] : reachLinks(ctx.site)
  const reach = links.length
    ? `<p class="reach">${links.map((link) => `<a class="text-link" href="${esc(link.href)}">${esc(link.label)}</a>`).join("")}</p>`
    : ""
  const note = ctx.products.length ? "" : `<div class="hero-note"><p>First drop coming soon.</p>${reach}</div>`
  const lead = featured
    ? `<p class="hero-product"><a class="text-link" href="${esc(productPath(featured.slug))}">${esc(productLabel(featured).text)}</a></p><p><a class="button" href="${esc(productPath(featured.slug))}">Pre-order</a></p>`
    : ""
  const shop = ctx.products.length ? `<p><a class="button" href="/shop/">Shop hoodies</a></p>` : ""
  const drop = ctx.products.length
    ? `<section class="drop"><h2>Current drop</h2>${catalog(ctx.products, ctx.site, ctx.now, false)}</section>`
    : ""
  return `<section class="hero">
    <div class="hero-copy">
      <h1 class="display wordmark" aria-label="${esc(ctx.site.brand)}">Pray4<br>BetterDays</h1>
      ${lead}
      ${shop}
      ${note}
    </div>
    ${hero}
  </section>
  ${drop}`
}

function about(ctx: Ctx): string {
  const story = ctx.site.about.trim() ? paragraphs(ctx.site.about) : ""
  return `<article class="page">
    <h1 class="display title">About</h1>
    <div class="prose">
      <p>${esc(ctx.site.founder)}, founder and designer.</p>
      ${story}
    </div>
  </article>`
}

function contact(ctx: Ctx): string {
  const email = ctx.site.email.trim()
  const handle = instagramHandle(ctx.site.instagram)
  const mail = email ? `<p><a class="text-link" href="mailto:${esc(email)}">${esc(email)}</a></p>` : ""
  const ig = handle ? `<p><a class="text-link" href="https://instagram.com/${esc(handle)}">Instagram</a></p>` : ""
  return `<article class="page"><h1 class="display title">Contact</h1><div class="prose">${mail}${ig}</div></article>`
}

function policyBlock(title: string, body: string): string {
  const text = body.trim()
  if (!text) return ""
  return `<h2>${esc(title)}</h2><div class="prose">${paragraphs(text)}</div>`
}

function statementMarkup(site: Site): string {
  const name = site.statementDescriptor.trim()
  if (!name) return ""
  return `<p class="statement">Card statements show ${esc(name)}.</p>`
}

function shipping(ctx: Ctx): string {
  const links = reachLinks(ctx.site)
  const contactBlock = links.length
    ? `<h2>Contact</h2><p class="reach">${links.map((link) => `<a class="text-link" href="${esc(link.href)}">${esc(link.label)}</a>`).join("")}</p>`
    : ""
  const extra = ctx.site.shippingBody.trim() ? `<div class="prose">${paragraphs(ctx.site.shippingBody)}</div>` : ""
  return `<article class="page">
    <h1 class="display title">Shipping and returns</h1>
    ${policyBlock("Shipping cost", ctx.site.shippingCost)}
    ${policyBlock("Ship window", ctx.site.shipWindow)}
    ${policyBlock("Refunds", ctx.site.refundPolicy)}
    ${policyBlock("Cancellation", ctx.site.cancelPolicy)}
    ${policyBlock("Delays", ctx.site.delayPolicy)}
    ${policyBlock("Returns", ctx.site.returnsBody)}
    ${extra}
    ${contactBlock}
    ${statementMarkup(ctx.site)}
  </article>`
}

function privacy(ctx: Ctx): string {
  const email = ctx.site.email.trim()
    ? `<p>Mail sent to ${esc(ctx.site.email.trim())} is received by ${esc(ctx.site.legalName)}.</p>`
    : ""
  const handle = instagramHandle(ctx.site.instagram)
  const ig = handle ? `<p>${esc(ctx.site.legalName)} can be reached on Instagram at ${esc(handle)}.</p>` : ""
  const share = ctx.site.squareShareNote.trim() ? paragraphs(ctx.site.squareShareNote) : ""
  const hosting = ctx.site.hostingNote.trim() ? paragraphs(ctx.site.hostingNote) : ""
  return `<article class="page">
    <h1 class="display title">Privacy</h1>
    <div class="prose">
      <p>${esc(ctx.site.legalName)} operates this site. The pages are static files. The site does not create accounts and does not run advertising pixels.</p>
      <p>Checkout leaves this site for Square. Square processes the card payment and any shipping address collected on that page.</p>
      ${share}
      ${hosting}
      ${email}
      ${ig}
      ${statementMarkup(ctx.site)}
    </div>
  </article>`
}

function notFound(ctx: Ctx): { status: number; html: string } {
  const shop = ctx.products.length
    ? `<p><a class="button" href="/shop/">Shop hoodies</a></p>`
    : `<p><a class="text-link" href="/shop/">Shop</a></p>`
  return documentPage(ctx, {
    title: `Page not found · ${ctx.site.brand}`,
    description: `${ctx.site.brand} sells hoodies.`,
    path: "/404",
    status: 404,
    main: `<article class="page"><h1 class="display title">Page not found</h1><div class="prose">${shop}</div></article>`,
  })
}

export function renderRoute(rawPath: string, ctx: Ctx): { status: number; html: string } {
  const path = normalizePath(rawPath)
  const brand = ctx.site.brand
  const description = `${brand} sells hoodies.`
  if (path === "/") {
    return documentPage(ctx, { title: brand, description, path: "/", main: home(ctx) })
  }
  if (path === "/shop") {
    return documentPage(ctx, {
      title: `Shop · ${brand}`,
      description,
      path: "/shop/",
      main: `<article class="page"><h1 class="display title">Shop</h1>${catalog(ctx.products, ctx.site, ctx.now)}</article>`,
    })
  }
  if (path === "/about") {
    return documentPage(ctx, { title: `About · ${brand}`, description, path: "/about/", main: about(ctx) })
  }
  if (path === "/contact") {
    if (!contactReady(ctx.site)) return notFound(ctx)
    return documentPage(ctx, { title: `Contact · ${brand}`, description, path: "/contact/", main: contact(ctx) })
  }
  if (path === "/shipping") {
    return documentPage(ctx, {
      title: `Shipping and returns · ${brand}`,
      description,
      path: "/shipping/",
      main: shipping(ctx),
    })
  }
  if (path === "/privacy") {
    return documentPage(ctx, { title: `Privacy · ${brand}`, description, path: "/privacy/", main: privacy(ctx) })
  }
  const shopMatch = path.match(/^\/shop\/([^/]+)$/)
  if (shopMatch) {
    const product = findProduct(ctx.products, shopMatch[1])
    if (!product) return notFound(ctx)
    const label = productLabel(product)
    const heading = label.text || brand
    return documentPage(ctx, {
      title: label.text ? `${heading} · ${brand}` : brand,
      description,
      path: productPath(product.slug),
      main: `${productArticle(product, ctx.site, ctx.now)}${sizeGuide(ctx.site)}`,
    })
  }
  return notFound(ctx)
}
