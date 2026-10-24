export function framePath(prefix: string, index: number): string {
  return `${prefix}${String(index).padStart(2, "0")}.webp`
}

export function framePaths(prefix: string, count: number): string[] {
  const total = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0
  const paths: string[] = []
  for (let index = 0; index < total; index += 1) paths.push(framePath(prefix, index))
  return paths
}
