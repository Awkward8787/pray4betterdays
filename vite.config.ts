import { readFileSync } from "node:fs"
import { defineConfig, type Plugin } from "vite"
import { renderRoute, type Ctx } from "./src/lib/render"
import type { Product, Shot, Site } from "./src/lib/types"

function loadCtx(assets: Ctx["assets"]): Ctx {
  const site = JSON.parse(readFileSync(new URL("./src/data/site.json", import.meta.url), "utf8")) as Site
  const products = JSON.parse(readFileSync(new URL("./src/data/products.json", import.meta.url), "utf8")) as Product[]
  const hero = JSON.parse(readFileSync(new URL("./src/data/media.json", import.meta.url), "utf8")) as Shot
  return { site, products, hero, now: new Date(), assets }
}

function pages(): Plugin {
  return {
    name: "pages",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] ?? "/"
        if (url.includes(".") && !url.endsWith(".html")) return next()
        const page = renderRoute(url, loadCtx({ css: [], js: "/src/entry.ts" }))
        const html = await server.transformIndexHtml(url, page.html)
        res.statusCode = page.status
        res.setHeader("Content-Type", "text/html; charset=utf-8")
        res.end(html)
      })
    },
  }
}

export default defineConfig({
  plugins: [pages()],
  build: {
    manifest: true,
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/entry.ts",
    },
  },
})
