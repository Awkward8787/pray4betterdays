import { cpSync, rmSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const dist = join(root, "dist")
const preview = join(root, "preview-dist")

rmSync(preview, { recursive: true, force: true })
cpSync(dist, preview, { recursive: true })
console.log("preview matches dist")
