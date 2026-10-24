import {
  displayHeading,
  findProduct,
  formatEndDate,
  instagramHandle,
  normalizePath,
  priceView,
  productPath,
  reachLinks,
  scarcityLines,
  sizeCta,
} from "./catalog"
import { iconBan, iconClose, iconMenu, iconNext, iconPrev, iconZoom } from "./icons"
import type { Cta, Colorway, Product, Shot, Site } from "./types"

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
const HERO_SIZES = "(min-width: 960px) 50vw, 100vw" // ds-allow-hardcode
const GALLERY_SIZES = "(min-width: 960px) 58vw, 100vw" // ds-allow-hardcode
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

function zoomButton(shot: Shot, eager: boolean, sizes: string): string {
  return `<figure class="stage" data-watch>
    <button type="button" class="zoom-open" aria-label="Zoom: ${esc(shot.alt)}" data-zoom="${esc(shot.zoom)}" data-zoom-alt="${esc(shot.alt)}" data-zoom-w="${shot.width}" data-zoom-h="${shot.height}">
      ${picture(shot, { eager, sizes, alt: shot.alt })}
      <span class="zoom-label">${iconZoom} Zoom</span>
    </button>
    <p class="img-note" data-note hidden><span data-note-text></span> <button type="button" class="button secondary" data-retry hidden>Retry</button></p>
  </figure>`
}

function ctaMarkup(cta: Cta, sizeId: string, fallback = false): string {
  const size = fallback ? "" : ` data-size="${esc(sizeId)}"`
  const extra = fallback ? " buy-fallback" : " buy-link"
  if (cta.kind === "link") {
    return `<a class="button${extra}"${size} href="${esc(cta.href)}">${esc(cta.label)}</a>`
  }
  const icon = cta.label === "Sold out" || cta.label === "Pre-order closed" ? iconBan : ""
  return `<button type="button" class="button${extra}"${size} disabled>${icon} ${esc(cta.label)}</button>`
}

function moneyMarkup(product: Product, color: Colorway): string {
  const price = priceView(product, color)
  if (!price.current) return ""
  const compare = price.compare ? `<s>${esc(price.compare)}</s>` : ""
  return `<p class="price"><span>${esc(price.current)}</span>${compare}</p>`
}

function scarcityMarkup(color: Colorway): string {
  const lines = scarcityLines(color)
  if (!lines.length) return ""
  return `<p class="runs">${lines.map((line) => `<span>${esc(line)}</span>`).join("")}</p>`
}

function viewsFor(color: Colorway): { id: string; label: string; shot: Shot }[] {
  const views: { id: string; label: string; shot: Shot }[] = []
  if (color.images.front) views.push({ id: "front", label: "Front", shot: color.images.front })
  if (color.images.back) views.push({ id: "back", label: "Back", shot: color.images.back })
  if (color.images.side) views.push({ id: "side", label: "Side", shot: color.images.side })
  return views
}

function panel(product: Product, color: Colorway, now: Date): string {
  const views = viewsFor(color)
  const only = views.length <= 1
  const tabs = only
    ? ""
    : `<fieldset class="views"><legend>View</legend>${views
        .map(
          (view, index) => `<label class="view-tab">${view.label}<input class="view-input" type="radio" name="view-${esc(color.id)}" value="${esc(view.id)}"${index === 0 ? " checked" : ""}></label>`,
        )
        .join("")}</fieldset>`
  const shots = views
    .map(
      (view) =>
        `<div class="view${only ? " is-only" : ""}" data-view="${esc(view.id)}">${zoomButton(view.shot, true, GALLERY_SIZES)}</div>`,
    )
    .join("")
  const details = color.images.details.length
    ? `<h2>Details</h2><ul class="details">${color.images.details
        .map(
          (shot) => `<li><button type="button" class="detail-open" aria-label="Zoom: ${esc(shot.alt)}" data-zoom="${esc(shot.zoom)}" data-zoom-alt="${esc(shot.alt)}" data-zoom-w="${shot.width}" data-zoom-h="${shot.height}">${picture(shot, { eager: false, sizes: "40vw", alt: shot.alt })}</button></li>`,
        )
        .join("")}</ul>`
    : ""
  const spin = color.spin.length
    ? `<div class="spin" data-spin tabindex="0" aria-label="Frame sequence">
        <img data-spin-view src="${esc(color.spin[0].zoom)}" alt="${esc(color.spin[0].alt)}" width="${color.spin[0].width}" height="${color.spin[0].height}">
        <div class="spin-controls">
          <button type="button" class="button secondary" data-spin-prev>${iconPrev} Previous frame</button>
          <button type="button" class="button secondary" data-spin-next>${iconNext} Next frame</button>
        </div>
        <ol hidden>${color.spin
          .map(
            (frame) =>
              `<li data-frame data-src="${esc(frame.zoom)}" data-alt="${esc(frame.alt)}"></li>`,
          )
          .join("")}</ol>
      </div>`
    : ""
  return `<div class="panel" data-color="${esc(color.id)}">${tabs}${shots}${spin}${details}</div>`
}

function group(product: Product, color: Colorway, now: Date): string {
  const states = color.sizes.map((size) => sizeCta(product, color, size.checkoutUrl, now))
  const enabledIndex = states.findIndex((state) => state.kind === "link")
  const sharedDisabled = states.every((state) => state.kind === "disabled" && state.label === states[0]?.label)
  const sizes = color.sizes
    .map((size, index) => {
      const cta = states[index]
      const disabled = cta.kind === "disabled" ? " disabled" : ""
      const checked = index === enabledIndex ? " checked" : ""
      const note = cta.kind === "disabled" && !sharedDisabled ? `<span>${esc(cta.label)}</span>` : ""
      const sku = size.sku.trim() ? `<span class="sku">${esc(size.sku)}</span>` : ""
      return `<label class="size"><input class="size-input" type="radio" name="size-${esc(color.id)}" value="${esc(size.id)}"${checked}${disabled}><span>${esc(size.label)}</span>${note}${sku}</label>`
    })
    .join("")
  const buys = color.sizes
    .map((size) => ctaMarkup(sizeCta(product, color, size.checkoutUrl, now), size.id))
    .join("")
  const fallbackCta = sizeCta(product, color, color.sizes[0]?.checkoutUrl ?? "", now)
  const fallback = ctaMarkup(fallbackCta.kind === "link" ? { kind: "disabled", label: "Coming soon" } : fallbackCta, "", true)
  return `<div class="group" data-color="${esc(color.id)}">
    ${moneyMarkup(product, color)}
    ${scarcityMarkup(color)}
    <fieldset class="sizes"><legend>Size</legend>${sizes}</fieldset>
    <div class="buys">${buys}${fallback}</div>
  </div>`
}

function presaleCopy(product: Product, site: Site): string {
  if (product.status !== "presale") return ""
  const end = product.presaleEndsAt ? formatEndDate(product.presaleEndsAt, site.timeZone) : null
  const ship = product.shipEstimate.trim()
    ? `<p class="ship">Ship window: ${esc(product.shipEstimate.trim())}</p>`
    : ""
  const until = end ? `<p class="end">Pre-order ends <time datetime="${esc(product.presaleEndsAt ?? "")}">${esc(end)}</time>.</p>` : ""
  return `<div class="notes">
    <p class="note">This is a pre-order. The card is charged now through Square.</p>
    ${ship}
    ${until}
  </div>`
}

function productArticle(product: Product, site: Site, now: Date): string {
  const title = product.name.trim() || "Hoodie"
  const headingClass = displayHeading(title) ? "display title" : "title"
  const end = product.status === "presale" && product.presaleEndsAt ? ` data-presale-end="${esc(product.presaleEndsAt)}"` : ""
  const colors = product.colors
    .map((color, index) => {
      const checked = index === 0 ? " checked" : ""
      return `<label class="swatch"><input class="color-input" type="radio" name="color" value="${esc(color.id)}"${checked}><span class="chip" data-swatch="${esc(color.id)}"></span><span>${esc(color.name)}</span></label>`
    })
    .join("")
  const description = product.description.trim() ? `<div class="prose">${paragraphs(product.description)}</div>` : ""
  return `<article class="product product-layout"${end}>
    <div class="gallery">${product.colors.map((color) => panel(product, color, now)).join("")}</div>
    <div class="buy">
      <h1 class="${headingClass}">${esc(title)}</h1>
      ${description}
      <fieldset class="choices"><legend>Color</legend>${colors}</fieldset>
      ${product.colors.map((color) => group(product, color, now)).join("")}
      ${presaleCopy(product, site)}
    </div>
  </article>`
}

function card(product: Product, site: Site, now: Date, lead: boolean): string {
  const color = product.colors[0]
  const front = color?.images.front
  const back = color?.images.back
  const frame = front
    ? `<span class="frame">${picture(front, { eager: lead, sizes: CARD_SIZES, alt: front.alt }).replace("<picture>", '<picture class="front">')}${
        back ? picture(back, { eager: false, sizes: CARD_SIZES, alt: "" }).replace("<picture>", '<picture class="back">') : ""
      }</span>`
    : ""
  const name = product.name.trim() ? `<span class="card-name">${esc(product.name.trim())}</span>` : ""
  const blocked = color ? scarcityLines(color) : []
  const state = cardState(product, now)
  const price = color ? moneyMarkup(product, color) : ""
  const run = blocked.length ? `<span class="runs">${blocked.map((line) => `<span>${esc(line)}</span>`).join("")}</span>` : ""
  return `<a class="card${lead ? " card-lead" : ""}" href="${productPath(product.slug)}">${frame}<span class="card-copy">${name}${price}${state}${run}</span></a>`
}

function cardState(product: Product, now: Date): string {
  const color = product.colors[0]
  if (!color) return ""
  const states = color.sizes.map((size) => sizeCta(product, color, size.checkoutUrl, now))
  if (states.some((state) => state.kind === "disabled" && state.label === "Sold out") && states.every((state) => state.kind === "disabled")) {
    return `<span class="card-status">${iconBan} Sold out</span>`
  }
  if (product.status === "comingsoon" || states.every((state) => state.kind === "disabled" && state.label === "Coming soon")) {
    return `<span class="card-status">Coming soon</span>`
  }
  if (product.status === "presale") return `<span class="card-status">Pre-order</span>`
  if (states.every((state) => state.kind === "disabled")) {
    return `<span class="card-status">${esc(states[0]?.kind === "disabled" ? states[0].label : "Coming soon")}</span>`
  }
  return ""
}

function catalog(products: Product[], site: Site, now: Date): string {
  if (!products.length) {
    const links = reachLinks(site)
    const reach = links.length
      ? `<p class="reach">${links.map((link) => `<a class="text-link" href="${esc(link.href)}">${esc(link.label)}</a>`).join("")}</p>`
      : ""
    return `<section class="empty"><h2>First drop coming soon.</h2>${reach}</section>`
  }
  return `<div class="catalog">${products.map((product, index) => card(product, site, now, index === 0)).join("")}</div>`
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

function header(site: Site, path: string, home: boolean): string {
  const primary = NAV.filter(([href]) => href === "/shop/" || href === "/contact/")
    .map(([href, label]) => `<a href="${href}"${path === href.replace(/\/$/, "") || path === href ? ` aria-current="page"` : ""}>${label}</a>`)
    .join("")
  const logo = home
    ? ""
    : `<a class="logo" href="/">${esc(site.brand)}</a>`
  return `<header class="site-header">${logo}<nav class="primary-nav" aria-label="Primary">${primary}</nav><button type="button" class="menu-button" data-menu aria-expanded="false" aria-controls="nav-dialog">${iconMenu} Menu</button></header>`
}

function footer(site: Site, path: string): string {
  const links = NAV.map(([href, label]) => {
    const current = path === href || path === href.replace(/\/$/, "")
    return `<a href="${href}"${current ? ` aria-current="page"` : ""}>${label}</a>`
  }).join("")
  return `<footer class="site-footer"><p class="legal">© ${site.year} ${esc(site.legalName)}. Designed by ${esc(site.founder)}.</p><nav class="footer-nav" aria-label="Footer">${links}</nav></footer>`
}

function dialogs(): string {
  const links = NAV.map(([href, label]) => `<a href="${href}">${label}</a>`).join("")
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
    <div class="zoom-stage" id="zoom-stage"><img id="zoom-img" alt="" width="941" height="1022"></div>
  </dialog>`
}

function documentPage(ctx: Ctx, opts: { title: string; description: string; path: string; main: string; status?: number }): { status: number; html: string } {
  const css = ctx.assets.css.map((href) => `<link rel="stylesheet" href="${esc(href)}">`).join("")
  const canonical = `https://${ctx.site.domain}${opts.path === "/" ? "/" : opts.path.endsWith("/") ? opts.path : `${opts.path}/`}`
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(opts.title)}</title>
  <meta name="description" content="${esc(opts.description)}">
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  ${css}
</head>
<body>
  <a class="skip" href="#content">Skip to content</a>
  ${header(ctx.site, opts.path, opts.path === "/")}
  <main id="content">${opts.main}</main>
  ${footer(ctx.site, opts.path)}
  ${dialogs()}
  <script type="module" src="${esc(ctx.assets.js)}"></script>
</body>
</html>`
  return { status: opts.status ?? 200, html }
}

function home(ctx: Ctx): string {
  const hero = ctx.hero
    ? zoomButton(ctx.hero, true, HERO_SIZES)
    : ""
  const drop = ctx.products.length
    ? `<h2>Current drop</h2>${catalog(ctx.products, ctx.site, ctx.now)}`
    : catalog(ctx.products, ctx.site, ctx.now)
  return `<section class="hero">
    <div class="hero-copy">
      <h1 class="display wordmark" aria-label="${esc(ctx.site.brand)}">Pray4<br>BetterDays</h1>
      <p>Hoodies.</p>
      <p><a class="button" href="/shop/">Shop hoodies</a></p>
    </div>
    ${hero}
  </section>
  <section class="drop">${drop}</section>`
}

function about(ctx: Ctx): string {
  const story = ctx.site.about.trim() ? `<div class="prose">${paragraphs(ctx.site.about)}</div>` : ""
  return `<article class="page">
    <h1 class="display title">About</h1>
    <p>Designed by ${esc(ctx.site.founder)}, founder and designer.</p>
    ${story}
  </article>`
}

function contact(ctx: Ctx): string {
  const email = ctx.site.email.trim()
  const handle = instagramHandle(ctx.site.instagram)
  const mail = email ? `<p><a class="text-link" href="mailto:${esc(email)}">${esc(email)}</a></p>` : ""
  const ig = handle ? `<p><a class="text-link" href="https://instagram.com/${esc(handle)}">Instagram</a></p>` : ""
  return `<article class="page"><h1 class="display title">Contact</h1>${mail}${ig}</article>`
}

function shipping(ctx: Ctx): string {
  const body = ctx.site.shippingBody.trim() ? `<div class="prose">${paragraphs(ctx.site.shippingBody)}</div>` : ""
  const returns = ctx.site.returnsBody.trim()
    ? `<h2>Returns</h2><div class="prose">${paragraphs(ctx.site.returnsBody)}</div>`
    : ""
  return `<article class="page">
    <h1 class="display title">Shipping and returns</h1>
    <div class="prose">
      <p>${esc(ctx.site.legalName)} sells hoodies on this site as pre-orders. The card is charged now through Square. A ship window appears on the product page when one is set. An end date, when one is set, is printed on the product. After that date the Pre-order button turns off.</p>
      <p>Sold out sizes stay off. A run count is shown only when that count is set.</p>
    </div>
    ${body}
    ${returns}
  </article>`
}

function privacy(ctx: Ctx): string {
  const email = ctx.site.email.trim()
    ? `<p>Mail sent to ${esc(ctx.site.email.trim())} is received by ${esc(ctx.site.legalName)}.</p>`
    : ""
  return `<article class="page prose">
    <h1 class="display title">Privacy</h1>
    <p>${esc(ctx.site.legalName)} operates this site. The pages are static files. The site does not create accounts and does not run advertising pixels.</p>
    <p>Checkout leaves this site for Square. Square processes the card payment and any shipping address collected on that page.</p>
    ${email}
  </article>`
}

function notFound(ctx: Ctx): { status: number; html: string } {
  return documentPage(ctx, {
    title: `Page not found · ${ctx.site.brand}`,
    description: `${ctx.site.brand} sells hoodies.`,
    path: "/404",
    status: 404,
    main: `<article class="page"><h1 class="display title">Page not found</h1><p><a class="button" href="/shop/">Shop hoodies</a></p></article>`,
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
    const label = product.name.trim() || "Hoodie"
    return documentPage(ctx, {
      title: `${label} · ${brand}`,
      description,
      path: productPath(product.slug),
      main: `${productArticle(product, ctx.site, ctx.now)}${sizeGuide(ctx.site)}`,
    })
  }
  return notFound(ctx)
}
