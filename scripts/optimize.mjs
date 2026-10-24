import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import sharp from "sharp"

const root = new URL("..", import.meta.url).pathname
const zoom = join(root, "public/media/first-design/zoom.png")
const dir = dirname(zoom)
const meta = await sharp(zoom).metadata()
const width = meta.width ?? 0
const height = meta.height ?? 0
const targets = [480, 768, 1024, 1600, 2000].filter((size) => size < width)
if (!targets.includes(width)) targets.push(width)

const avif = []
const webp = []

for (const size of targets) {
  const pipeline = () => sharp(zoom).resize({ width: size, withoutEnlargement: true })
  const avifName = `w${size}.avif`
  const webpName = `w${size}.webp`
  await pipeline().avif({ quality: 82, effort: 6, chromaSubsampling: "4:4:4" }).toFile(join(dir, avifName))
  await pipeline().webp({ quality: 92, alphaQuality: 100, smartSubsample: false, effort: 6 }).toFile(join(dir, webpName))
  avif.push({ src: `/media/first-design/${avifName}`, width: size })
  webp.push({ src: `/media/first-design/${webpName}`, width: size })
}

const shot = {
  alt: "Black zip hoodie with rhinestone lettering, praying hands, and studs.",
  width,
  height,
  zoom: "/media/first-design/zoom.png",
  avif,
  webp,
}

mkdirSync(join(root, "src/data"), { recursive: true })
writeFileSync(join(root, "src/data/media.json"), JSON.stringify(shot, null, 2) + "\n")
console.log(`wrote derivatives up to ${width}px (source is ${width}x${height}, not upscaled)`)
