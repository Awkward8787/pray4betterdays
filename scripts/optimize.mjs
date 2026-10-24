import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import sharp from "sharp"

const root = new URL("..", import.meta.url).pathname
const mediaRoot = join(root, "public/media/first-design/black")
const widths = [480, 768, 1024]

const jobs = [
  {
    id: "front",
    file: "front-cutout.png",
    alt: "Black washed zip hoodie, rhinestone Pray 4 Better Days script, airbrushed praying hands with jewelry in clouds, studded hood edge and cuffs",
    render: false,
    zoomName: "front-cutout.png",
  },
  {
    id: "back",
    file: "back.png",
    alt: "Render: back of the black washed zip hoodie, plain back with studded hood rim and studded cuffs",
    render: true,
  },
  {
    id: "side",
    file: "side.png",
    alt: "Render: left side of the black washed zip hoodie, studded hood edge and studded cuff",
    render: true,
  },
  {
    id: "support",
    file: "front-three-quarter.png",
    alt: "Render: three-quarter front view of the black zip hoodie with the rhinestone Pray 4 Better Days script and praying hands",
    render: true,
  },
]

async function derivatives(file, id, width) {
  const targets = widths.filter((size) => size < width)
  if (!targets.includes(width)) targets.push(width)
  const dir = join(mediaRoot, id)
  mkdirSync(dir, { recursive: true })
  const avif = []
  const webp = []
  for (const size of targets) {
    const pipeline = () => sharp(file).resize({ width: size, withoutEnlargement: true })
    const avifName = `w${size}.avif`
    const webpName = `w${size}.webp`
    await pipeline().avif({ quality: 82, effort: 6, chromaSubsampling: "4:4:4" }).toFile(join(dir, avifName))
    await pipeline().webp({ quality: 92, alphaQuality: 100, smartSubsample: false, effort: 6 }).toFile(join(dir, webpName))
    avif.push({ src: `/media/first-design/black/${id}/${avifName}`, width: size })
    webp.push({ src: `/media/first-design/black/${id}/${webpName}`, width: size })
  }
  return { avif, webp }
}

const shots = {}
for (const job of jobs) {
  const file = join(mediaRoot, job.file)
  const meta = await sharp(file).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  const { avif, webp } = await derivatives(file, job.id, width)
  const shot = {
    alt: job.alt,
    width,
    height,
    zoom: job.zoomName ? `/media/first-design/black/${job.zoomName}` : "",
    avif,
    webp,
  }
  if (job.render) shot.render = true
  shots[job.id] = shot
  console.log(`${job.id} ${width}x${height} (${job.render ? "render" : "photo"})`)
}

const frame = await sharp(join(mediaRoot, "turntable/frame-00.webp")).metadata()
const black = {
  ...shots,
  model: {
    src: "/media/first-design/black/hoodie-3d.glb",
    alt: "Render: 3D model of the Pray 4 Better Days zip hoodie. Drag to rotate.",
    spin: {
      alt: "Render: 360 degree spin of the Pray 4 Better Days zip hoodie, front, sides and back",
      width: frame.width ?? 0,
      height: frame.height ?? 0,
      prefix: "/media/first-design/black/turntable/frame-",
      count: 36,
    },
  },
}

writeFileSync(join(root, "src/data/media.json"), JSON.stringify(shots.front, null, 2) + "\n")
writeFileSync(join(root, "src/data/black.json"), JSON.stringify(black, null, 2) + "\n")
console.log("wrote media.json and black.json without upscaling")
