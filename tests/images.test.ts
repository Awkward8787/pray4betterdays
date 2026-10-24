/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from "vitest"
import { start } from "../src/client"

function stage(src: string): HTMLImageElement {
  document.body.innerHTML = `<figure class="stage" data-watch><img src="${src}" alt="Black zip hoodie."></figure>`
  return document.querySelector("img") as HTMLImageElement
}

describe("image errors", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  it("shows Retry only after a real load failure", () => {
    const image = stage("/media/first-design/w941.webp")
    Object.defineProperty(image, "complete", { configurable: true, get: () => true })
    Object.defineProperty(image, "naturalWidth", { configurable: true, get: () => 941 })
    start()
    expect(document.body.textContent).not.toContain("Retry")
    expect(document.querySelector("[data-spin]")).toBeNull()
    image.dispatchEvent(new Event("error"))
    expect(document.body.textContent).toContain("Image did not load.")
    expect(document.body.textContent).toContain("Retry")
    image.dispatchEvent(new Event("load"))
    expect(document.body.textContent).not.toContain("Retry")
  })

  it("announces a size price without moving focus", () => {
    document.body.innerHTML = `<div class="group">
      <p class="live" data-price-live aria-live="polite"></p>
      <label class="size"><input class="size-input" type="radio" name="size-black" value="s" data-price="$85.00" data-total="Total $85.00" checked></label>
      <label class="size"><input class="size-input" type="radio" name="size-black" value="2xl" data-price="$90.00" data-total="Total $90.00"></label>
    </div>`
    start()
    const live = document.querySelector("[data-price-live]") as HTMLElement
    const next = document.querySelector('input[value="2xl"]') as HTMLInputElement
    expect(live.textContent).toBe("")
    next.focus()
    next.checked = true
    next.dispatchEvent(new Event("change", { bubbles: true }))
    expect(live.textContent).toBe("$90.00. Total $90.00.")
    expect(document.activeElement).toBe(next)
  })

  it("loads the 3D view only after the toggle", () => {
    document.body.innerHTML = `<div class="panel"><label class="view-tab">3D view<input class="view-input" type="radio" value="model"></label><div class="model-slot" data-model tabindex="0" data-src="/media/first-design/black/hoodie-3d.glb" data-alt="Render: 3D model" data-frame-prefix="/media/first-design/black/turntable/frame-" data-frame-count="36" data-frame-w="1714" data-frame-h="2023" data-frame-alt="Render: 360 degree spin"></div></div>`
    start()
    expect(document.querySelector('script[src="/vendor/model-viewer.min.js"]')).toBeNull()
    expect(document.querySelector("[data-spin-view]")).toBeNull()
    const input = document.querySelector("input") as HTMLInputElement
    input.checked = true
    input.dispatchEvent(new Event("change", { bubbles: true }))
    const image = document.querySelector("[data-spin-view]") as HTMLImageElement | null
    const script = document.querySelector('script[src="/vendor/model-viewer.min.js"]')
    expect(image || script).toBeTruthy()
    if (image) {
      expect(image.getAttribute("src")).toBe("/media/first-design/black/turntable/frame-00.webp")
      expect(document.querySelectorAll("[data-spin-view]").length).toBe(1)
    }
    expect(document.body.innerHTML).not.toContain("auto-rotate")
  })
})
