import { readFileSync, renameSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { NodeIO } from "@gltf-transform/core"
import { EXTMeshoptCompression, EXTTextureWebP, KHRMeshQuantization } from "@gltf-transform/extensions"
import { meshopt } from "@gltf-transform/functions"
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer"

const root = new URL("..", import.meta.url).pathname
const file = join(root, "public/media/first-design/black/hoodie-3d.glb")
const decoderSrc = readFileSync(join(root, "node_modules/three/examples/jsm/libs/meshopt_decoder.module.js"), "utf8").replace(
  /\nexport \{ MeshoptDecoder \};\s*$/,
  "\n",
)
writeFileSync(join(root, "public/vendor/meshopt_decoder.js"), decoderSrc)
console.log("wrote public/vendor/meshopt_decoder.js")
const buf = readFileSync(file)
const jsonLen = buf.readUInt32LE(12)
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"))
if ((json.extensionsUsed || []).includes("EXT_meshopt_compression")) {
  console.log(`already meshopt compressed (${statSync(file).size} bytes)`)
  process.exit(0)
}

await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO()
  .registerExtensions([EXTTextureWebP, KHRMeshQuantization, EXTMeshoptCompression])
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder })
const document = await io.read(file)
await document.transform(meshopt({ encoder: MeshoptEncoder, level: "high" }))
const next = `${file}.next.glb`
await io.write(next, document)
const written = readFileSync(next)
const writtenLen = written.readUInt32LE(12)
const writtenJson = JSON.parse(written.subarray(20, 20 + writtenLen).toString("utf8"))
if (!(writtenJson.extensionsRequired || []).includes("EXT_meshopt_compression")) {
  throw new Error("meshopt extension missing")
}
if (!(writtenJson.extensionsUsed || []).includes("EXT_texture_webp")) {
  throw new Error("webp textures dropped")
}
renameSync(next, file)
console.log(`meshopt glb ${statSync(file).size} bytes`)
