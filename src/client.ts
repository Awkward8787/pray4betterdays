import { iconBan } from "./lib/icons"

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
  let scale = 1

  const apply = () => {
    const base = Number(image.dataset.baseW || image.naturalWidth || image.width || 1)
    image.style.width = `${Math.round(base * scale)}px` // ds-allow-hardcode
  }

  const reset = () => {
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
      reset()
      dialog.showModal()
    })
  })

  dialog.addEventListener("close", () => {
    opener?.focus()
    image.removeAttribute("src")
    reset()
  })

  document.querySelector("#zoom-in")?.addEventListener("click", () => {
    scale = Math.min(4, scale * 1.25)
    apply()
  })
  document.querySelector("#zoom-out")?.addEventListener("click", () => {
    scale = Math.max(1, scale / 1.25)
    apply()
  })

  stage.addEventListener("wheel", (event) => {
    event.preventDefault()
    scale = event.deltaY < 0 ? Math.min(4, scale * 1.1) : Math.max(1, scale / 1.1)
    apply()
  }, { passive: false })

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
    scale = Math.min(4, Math.max(1, baseScale * (distance(event.touches) / start)))
    apply()
  }, { passive: false })
}

function bindSpin(): void {
  document.querySelectorAll<HTMLElement>("[data-spin]").forEach((region) => {
    const view = region.querySelector<HTMLImageElement>("[data-spin-view]")
    const frames = [...region.querySelectorAll<HTMLElement>("[data-frame]")]
    if (!view || frames.length === 0) return
    let index = 0
    const show = (next: number) => {
      index = (next + frames.length) % frames.length
      const frame = frames[index]
      view.src = frame.dataset.src || ""
      view.alt = frame.dataset.alt || ""
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
  })
}

function bindImages(): void {
  document.querySelectorAll<HTMLImageElement>("[data-frame] img, .stage img, .frame img").forEach((image) => {
    const frame = image.closest("[data-watch]")
    const note = frame?.querySelector<HTMLElement>("[data-note]")
    const text = frame?.querySelector<HTMLElement>("[data-note-text]")
    const retry = frame?.querySelector<HTMLButtonElement>("[data-retry]")
    if (!note || !text) return
    const fail = () => {
      note.hidden = false
      text.textContent = "Image did not load."
      if (retry) retry.hidden = false
    }
    const ready = () => {
      note.hidden = true
      if (retry) retry.hidden = true
    }
    if (image.complete && image.naturalWidth === 0) fail()
    else if (!image.complete) {
      note.hidden = false
      text.textContent = "Loading image"
    }
    image.addEventListener("load", ready)
    image.addEventListener("error", fail)
    retry?.addEventListener("click", () => {
      text.textContent = "Loading image"
      retry.hidden = true
      const next = new URL(image.currentSrc || image.src, window.location.href)
      next.searchParams.set("retry", String(Date.now()))
      image.src = next.toString()
    })
  })
}

export function start(): void {
  closeEndedPresales(Date.now())
  bindMenu()
  bindZoom()
  bindSpin()
  bindImages()
}
