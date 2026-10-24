import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs"
import { extname, join, relative, sep } from "node:path"
import { framePaths } from "../src/lib/frames"

const textExt = new Set([".html", ".css", ".js", ".svg", ".xml", ".txt", ".json"])

export function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const file = join(dir, name)
    if (statSync(file).isDirectory()) out.push(...walk(file))
    else out.push(file)
  }
  return out
}

export function mediaRefs(text: string): string[] {
  const refs = [...text.matchAll(/\/media\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+/g)].map((match) => match[0])
  for (const match of text.matchAll(/data-frame-prefix="([^"]*)"[^>]*data-frame-count="(\d+)"/g)) {
    refs.push(...framePaths(match[1], Number(match[2])))
  }
  return [...new Set(refs)]
}

function isText(file: string, root: string): boolean {
  const name = file.slice(root.length)
  const ext = extname(file).toLowerCase()
  if (ext === "" && !name.endsWith(".htaccess")) return false
  if (ext !== "" && !textExt.has(ext) && !name.endsWith(".htaccess")) return false
  return true
}

export function referencedMedia(root: string): Set<string> {
  const refs = new Set<string>()
  for (const file of walk(root)) {
    if (!isText(file, root)) continue
    for (const ref of mediaRefs(readFileSync(file, "utf8"))) refs.add(ref)
  }
  return refs
}

export function unreferencedMedia(root: string): string[] {
  const refs = referencedMedia(root)
  const media = join(root, "media")
  return walk(media).flatMap((file) => {
    const rel = `/${relative(root, file).split(sep).join("/")}`
    return refs.has(rel) ? [] : [rel]
  })
}

function removeEmpty(dir: string): void {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const file = join(dir, name)
    if (statSync(file).isDirectory()) removeEmpty(file)
  }
  if (existsSync(dir) && statSync(dir).isDirectory() && readdirSync(dir).length === 0) rmSync(dir, { recursive: true })
}

export function missingReferencedFrames(root: string): string[] {
  const missing: string[] = []
  for (const ref of referencedMedia(root)) {
    if (!/\/frame-\d{2}\.webp$/.test(ref)) continue
    if (!existsSync(join(root, ref.slice(1)))) missing.push(ref)
  }
  return missing
}

export function pruneUnreferencedMedia(root: string): string[] {
  const extra = unreferencedMedia(root)
  for (const rel of extra) rmSync(join(root, rel.slice(1)))
  removeEmpty(join(root, "media"))
  return extra
}
