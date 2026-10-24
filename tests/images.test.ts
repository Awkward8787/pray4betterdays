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
})
