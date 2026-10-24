import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import sharp from "sharp"

const root = new URL("..", import.meta.url).pathname
const mediaRoot = join(root, "public/media/first-design/black")
const blackPath = join(root, "src/data/black.json")
const widths = [480, 768, 1024]

const jobs = [
  {
    id: "front",
    file: "front-cutout.png",
    alt: "Black washed zip hoodie, rhinestone Pray 4 Better Days script, airbrushed praying hands with jewelry in clouds, studded hood edge and cuffs",
    render: false,
    zoomName: "front-cutout.png",
    trim: true,
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

function previousBlack() {
  if (!existsSync(blackPath)) return {}
  return JSON.parse(readFileSync(blackPath, "utf8"))
}

async function trimAlpha(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * channels + 3]
      if (alpha === 0) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return
  const boxW = maxX - minX + 1
  const boxH = maxY - minY + 1
  if (boxW === width && boxH === height) return
  const trimmed = `${file}.trim.png`
  await sharp(file).extract({ left: minX, top: minY, width: boxW, height: boxH }).png().toFile(trimmed)
  const { renameSync } = await import("node:fs")
  renameSync(trimmed, file)
  console.log(`trimmed alpha padding to ${boxW}x${boxH}`)
}

async function derivatives(file, id, width) {
  const targets = widths.filter((size) => size <= width)
  if (!targets.includes(width) && width < 1024) targets.push(width)
  const dir = join(mediaRoot, id)
  rmSync(dir, { recursive: true, force: true })
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

async function cutTurntable() {
  const turnDir = join(mediaRoot, "turntable")
  const frames = readdirSync(turnDir)
    .filter((name) => /^frame-\d+\.webp$/.test(name))
    .sort()
  if (frames.length <= 24) {
    const meta = await sharp(join(turnDir, "frame-00.webp")).metadata()
    return { width: meta.width ?? 0, height: meta.height ?? 0, count: frames.length }
  }
  const picked = []
  for (let index = 0; index < 24; index += 1) {
    picked.push(Math.round((index * frames.length) / 24) % frames.length)
  }
  const nextDir = join(mediaRoot, "turntable-next")
  rmSync(nextDir, { recursive: true, force: true })
  mkdirSync(nextDir, { recursive: true })
  for (let index = 0; index < picked.length; index += 1) {
    const name = `frame-${String(index).padStart(2, "0")}.webp`
    await sharp(join(turnDir, frames[picked[index]]))
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(join(nextDir, name))
  }
  rmSync(turnDir, { recursive: true, force: true })
  const { renameSync } = await import("node:fs")
  renameSync(nextDir, turnDir)
  const meta = await sharp(join(turnDir, "frame-00.webp")).metadata()
  console.log(`turntable ${picked.length} frames at ${meta.width}x${meta.height}`)
  return { width: meta.width ?? 0, height: meta.height ?? 0, count: picked.length }
}

const previous = previousBlack()
const shots = {}
for (const job of jobs) {
  const file = join(mediaRoot, job.file)
  if (!existsSync(file)) {
    if (previous[job.id]) {
      const kept = previous[job.id]
      shots[job.id] = {
        ...kept,
        avif: (kept.avif || []).filter((file) => file.width !== 160),
        webp: (kept.webp || []).filter((file) => file.width !== 160),
      }
    }
    console.log(`kept ${job.id} derivatives`)
    continue
  }
  if (job.trim) await trimAlpha(file)
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
  if (job.render) rmSync(file)
}

const source = join(root, "assets/source/hoodie-praying-hands-black.png")
if (existsSync(source)) rmSync(source)

const spin = await cutTurntable()
const black = {
  ...shots,
  model: {
    src: "/media/first-design/black/hoodie-3d.glb",
    alt: "Render: 3D model of the Pray 4 Better Days zip hoodie.",
    spin: {
      alt: "Render: 360 degree spin of the Pray 4 Better Days zip hoodie, front, sides and back",
      width: spin.width,
      height: spin.height,
      prefix: "/media/first-design/black/turntable/frame-",
      count: spin.count,
    },
  },
}

const { writeFileSync } = await import("node:fs")
writeFileSync(join(root, "src/data/media.json"), JSON.stringify(shots.front, null, 2) + "\n")
writeFileSync(blackPath, JSON.stringify(black, null, 2) + "\n")
console.log("wrote media.json and black.json")
