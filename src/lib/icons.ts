function icon(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
}

export const iconMenu = icon(
  `<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>`,
)

export const iconClose = icon(
  `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
)

export const iconBan = icon(
  `<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>`,
)

export const iconZoom = icon(
  `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/>`,
)

export const iconPrev = icon(`<path d="m15 18-6-6 6-6"/>`)

export const iconNext = icon(`<path d="m9 18 6-6-6-6"/>`)
