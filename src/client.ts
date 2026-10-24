import { iconBan, iconNext, iconPrev } from "./lib/icons"

export function fittedZoomWidth(stageWidth: number, naturalWidth: number): number {
  const natural = Number.isFinite(naturalWidth) && naturalWidth > 0 ? naturalWidth : 1
  if (!Number.isFinite(stageWidth) || stageWidth <= 0) return Math.round(natural)
  return Math.round(Math.min(stageWidth, natural))
}

export function zoomDisplayWidth(fitWidth: number, naturalWidth: number, scale: number): number {
  const natural = Number.isFinite(naturalWidth) && naturalWidth > 0 ? naturalWidth : 1
  const fit = Number.isFinite(fitWidth) && fitWidth > 0 ? Math.min(fitWidth, natural) : natural
  const factor = Number.isFinite(scale) && scale > 0 ? scale : 1
  return Math.round(Math.min(natural, Math.max(fit, fit * factor)))
}

function closedButton(): HTMLButtonElement {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "button buy-link"
  button.disabled = true
  button.innerHTML = `${iconBan} Pre-order closed`
  return button
}

function closeEndedPresales(now: number): void {
  document.querySelectorAll<HTMLElement>("[data-presale-end]").forEach((node) => {
    const raw = node.getAttribute("data-presale-end")
    if (!raw) return
    const end = Date.parse(raw)
    if (Number.isNaN(end) || now <= end) return
    node.querySelectorAll<HTMLAnchorElement>("a.buy-link").forEach((link) => {
      link.replaceWith(closedButton())
    })
  })
}

function bindMenu(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-menu]")
  const dialog = document.querySelector<HTMLDialogElement>("#nav-dialog")
  if (!button || !dialog) return
  button.addEventListener("click", () => {
    dialog.showModal()
    button.setAttribute("aria-expanded", "true")
  })
  dialog.addEventListener("close", () => {
    button.setAttribute("aria-expanded", "false")
    button.focus()
  })
}

function bindZoom(): void {
  const dialog = document.querySelector<HTMLDialogElement>("#zoom-dialog")
  const image = document.querySelector<HTMLImageElement>("#zoom-img")
  const stage = document.querySelector<HTMLElement>("#zoom-stage")
  if (!dialog || !image || !stage) return
  let opener: HTMLElement | null = null
  let fit = 1
  let scale = 1

  const natural = () => {
    const value = Number(image.dataset.baseW || image.naturalWidth || 0)
    return value > 0 ? value : 1
  }

  const apply = () => {
    const width = zoomDisplayWidth(fit, natural(), scale)
    image.style.width = `${width}px` // ds-allow-hardcode
  }

  const capScale = (next: number) => {
    const limit = fit > 0 ? Math.max(1, natural() / fit) : 1
    return Math.min(limit, Math.max(1, next))
  }

  const fitToStage = () => {
    fit = fittedZoomWidth(stage.clientWidth, natural())
    scale = 1
    apply()
  }

  document.querySelectorAll<HTMLButtonElement>("[data-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      opener = button
      image.src = button.dataset.zoom || ""
      image.alt = button.dataset.zoomAlt || ""
      image.width = Number(button.dataset.zoomW || 0)
      image.height = Number(button.dataset.zoomH || 0)
      image.dataset.baseW = button.dataset.zoomW || ""
      dialog.showModal()
      fitToStage()
    })
  })

  dialog.addEventListener("close", () => {
    opener?.focus()
    image.removeAttribute("src")
    scale = 1
    apply()
  })

  document.querySelector("#zoom-in")?.addEventListener("click", () => {
    scale = capScale(scale * 1.25)
    apply()
  })
  document.querySelector("#zoom-out")?.addEventListener("click", () => {
    scale = capScale(scale / 1.25)
    apply()
  })

  stage.addEventListener("wheel", (event) => {
    event.preventDefault()
    scale = capScale(event.deltaY < 0 ? scale * 1.1 : scale / 1.1)
    apply()
  }, { passive: false })

  dialog.addEventListener("keydown", (event) => {
    const step = 40
    const delta =
      event.key === "ArrowLeft" ? [-step, 0] :
      event.key === "ArrowRight" ? [step, 0] :
      event.key === "ArrowUp" ? [0, -step] :
      event.key === "ArrowDown" ? [0, step] :
      null
    if (!delta) return
    event.preventDefault()
    stage.scrollBy(delta[0], delta[1])
  })

  let start = 0
  let baseScale = 1
  const distance = (touches: TouchList) => {
    const [a, b] = [touches[0], touches[1]]
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }
  stage.addEventListener("touchstart", (event) => {
    if (event.touches.length === 2) {
      start = distance(event.touches)
      baseScale = scale
    }
  }, { passive: true })
  stage.addEventListener("touchmove", (event) => {
    if (event.touches.length !== 2 || !start) return
    event.preventDefault()
    scale = capScale(baseScale * (distance(event.touches) / start))
    apply()
  }, { passive: false })
}

function bindSpin(): void {
  document.querySelectorAll<HTMLElement>("[data-spin]").forEach((region) => bindSpinRegion(region))
}

function bindSpinRegion(region: HTMLElement): void {
  if (region.dataset.bound === "1") return
  const view = region.querySelector<HTMLImageElement>("[data-spin-view]")
  const frames = [...region.querySelectorAll<HTMLElement>("[data-frame]")]
  if (!view || frames.length === 0) return
  region.dataset.bound = "1"
    let index = 0
    const label = region.querySelector<HTMLElement>("[data-render-label]")
    const show = (next: number) => {
      index = (next + frames.length) % frames.length
      const frame = frames[index]
      view.src = frame.dataset.src || ""
      view.alt = frame.dataset.alt || ""
      if (label) label.hidden = frame.dataset.render !== "true"
    }
    show(0)
    region.querySelector("[data-spin-prev]")?.addEventListener("click", () => show(index - 1))
    region.querySelector("[data-spin-next]")?.addEventListener("click", () => show(index + 1))
    region.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault()
        show(index + 1)
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        show(index - 1)
      }
    })
    let origin = 0
    let dragging = false
    region.addEventListener("pointerdown", (event) => {
      dragging = true
      origin = event.clientX
    })
    region.addEventListener("pointerup", () => {
      dragging = false
    })
    region.addEventListener("pointermove", (event) => {
      if (!dragging) return
      const delta = event.clientX - origin
      if (Math.abs(delta) < 18) return
      show(index + (delta > 0 ? 1 : -1))
      origin = event.clientX
    })
}

function bindSizePrices(): void {
  document.querySelectorAll<HTMLInputElement>(".size-input").forEach((input) => {
    input.addEventListener("change", () => {
      const live = input.closest(".group")?.querySelector<HTMLElement>("[data-price-live]")
      if (!live) return
      const amount = input.dataset.price || ""
      const total = input.dataset.total || ""
      live.textContent = amount && total ? `${amount}. ${total}.` : ""
    })
  })
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas")
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"))
  } catch {
    return false
  }
}

let viewerLoad: Promise<void> | null = null

function loadModelViewer(): Promise<void> {
  if (customElements.get("model-viewer")) return Promise.resolve()
  if (viewerLoad) return viewerLoad
  viewerLoad = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.type = "module"
    script.src = "/vendor/model-viewer.min.js"
    script.addEventListener("load", () => resolve())
    script.addEventListener("error", () => reject(new Error("model viewer failed")))
    document.head.append(script)
  })
  return viewerLoad
}

function frameSrc(prefix: string, index: number): string {
  return `${prefix}${String(index).padStart(2, "0")}.webp`
}

function mountTurntable(slot: HTMLElement): void {
  if (slot.querySelector("[data-spin]")) return
  const count = Number(slot.dataset.frameCount || 0)
  const prefix = slot.dataset.framePrefix || ""
  const alt = slot.dataset.frameAlt || ""
  const region = document.createElement("div")
  region.className = "spin"
  region.dataset.spin = ""
  region.tabIndex = -1
  region.setAttribute("role", "region")
  region.setAttribute("aria-roledescription", "carousel")
  region.setAttribute("aria-label", alt)
  const frame = document.createElement("div")
  frame.className = "spin-frame"
  frame.dataset.watch = ""
  const image = document.createElement("img")
  image.dataset.spinView = ""
  image.alt = alt
  image.width = Number(slot.dataset.frameW || 0)
  image.height = Number(slot.dataset.frameH || 0)
  frame.append(image)
  const controls = document.createElement("div")
  controls.className = "spin-controls"
  const previous = document.createElement("button")
  previous.type = "button"
  previous.className = "button secondary"
  previous.dataset.spinPrev = ""
  previous.innerHTML = `${iconPrev} Previous frame`
  const next = document.createElement("button")
  next.type = "button"
  next.className = "button secondary"
  next.dataset.spinNext = ""
  next.innerHTML = `${iconNext} Next frame`
  controls.append(previous, next)
  const list = document.createElement("ol")
  list.hidden = true
  for (let index = 0; index < count; index += 1) {
    const item = document.createElement("li")
    item.dataset.frame = ""
    item.dataset.src = frameSrc(prefix, index)
    item.dataset.alt = alt
    item.dataset.render = "true"
    list.append(item)
  }
  region.append(frame, controls, list)
  slot.append(region)
  bindSpinRegion(region)
}

function nudgeOrbit(viewer: Element, key: string): void {
  const raw = viewer.getAttribute("camera-orbit") || "0deg 75deg auto"
  const parts = raw.trim().split(/\s+/)
  let theta = Number.parseFloat(parts[0] || "0")
  let phi = Number.parseFloat(parts[1] || "75")
  const radius = parts[2] || "auto"
  if (!Number.isFinite(theta)) theta = 0
  if (!Number.isFinite(phi)) phi = 75
  if (key === "ArrowLeft") theta -= 10
  if (key === "ArrowRight") theta += 10
  if (key === "ArrowUp") phi = Math.max(10, phi - 10)
  if (key === "ArrowDown") phi = Math.min(170, phi + 10)
  viewer.setAttribute("camera-orbit", `${theta}deg ${phi}deg ${radius}`)
}

function mountViewer(slot: HTMLElement): void {
  const viewer = document.createElement("model-viewer")
  viewer.setAttribute("src", slot.dataset.src || "")
  viewer.setAttribute("alt", slot.dataset.alt || "")
  viewer.setAttribute("camera-controls", "")
  viewer.setAttribute("disable-zoom", "")
  viewer.setAttribute("interaction-prompt", "none")
  viewer.setAttribute("touch-action", "pan-y")
  viewer.setAttribute("environment-image", "neutral")
  viewer.setAttribute("shadow-intensity", "0")
  viewer.tabIndex = -1
  viewer.removeAttribute("auto-rotate")
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) viewer.setAttribute("reveal", "immediate")
  viewer.addEventListener("load", () => slot.removeAttribute("aria-busy"))
  viewer.addEventListener("error", () => {
    viewer.remove()
    mountTurntable(slot)
    slot.removeAttribute("aria-busy")
  })
  slot.append(viewer)
}

async function activateModel(slot: HTMLElement): Promise<void> {
  if (slot.dataset.ready === "1") return
  slot.dataset.ready = "1"
  slot.setAttribute("aria-busy", "true")
  if (!hasWebGL()) {
    mountTurntable(slot)
    slot.removeAttribute("aria-busy")
    return
  }
  try {
    await loadModelViewer()
    if (!slot.isConnected) return
    mountViewer(slot)
  } catch {
    mountTurntable(slot)
    slot.removeAttribute("aria-busy")
  }
}

function bindModels(): void {
  document.querySelectorAll<HTMLInputElement>(".view-input").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.value !== "model" || !input.checked) return
      const slot = input.closest(".panel")?.querySelector<HTMLElement>("[data-model]")
      if (slot) void activateModel(slot)
    })
  })
  document.querySelectorAll<HTMLElement>("[data-model]").forEach((slot) => {
    slot.addEventListener("keydown", (event) => {
      if (event.target !== slot) return
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowDown") return
      const viewer = slot.querySelector("model-viewer")
      if (viewer) {
        event.preventDefault()
        nudgeOrbit(viewer, event.key)
        return
      }
      const region = slot.querySelector<HTMLElement>("[data-spin]")
      if (!region || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return
      event.preventDefault()
      region.dispatchEvent(new KeyboardEvent("keydown", { key: event.key, bubbles: true }))
    })
  })
}

function showImageError(frame: HTMLElement, image: HTMLImageElement): void {
  if (frame.querySelector("[data-note]")) return
  const note = document.createElement("p")
  note.className = "img-note"
  note.dataset.note = ""
  const text = document.createElement("span")
  text.dataset.noteText = ""
  text.textContent = "Image did not load."
  const retry = document.createElement("button")
  retry.type = "button"
  retry.className = "button secondary"
  retry.dataset.retry = ""
  retry.textContent = "Retry"
  retry.addEventListener("click", () => {
    note.remove()
    const next = new URL(image.currentSrc || image.src, window.location.href)
    next.searchParams.set("retry", String(Date.now()))
    image.src = `${next.pathname}${next.search}`
  })
  note.append(text, document.createTextNode(" "), retry)
  frame.append(note)
}

function bindImages(): void {
  document.querySelectorAll<HTMLImageElement>(".stage img, .frame img, .detail img").forEach((image) => {
    const frame = image.closest<HTMLElement>("[data-watch]")
    if (!frame || !image.getAttribute("src")) return
    const fail = () => showImageError(frame, image)
    image.addEventListener("error", fail)
    image.addEventListener("load", () => frame.querySelector("[data-note]")?.remove())
    if (image.complete && image.naturalWidth === 0) fail()
  })
}

export function start(): void {
  closeEndedPresales(Date.now())
  bindMenu()
  bindZoom()
  bindSpin()
  bindSizePrices()
  bindModels()
  bindImages()
}
