// 荧光笔：竖直的方头笔尖横扫，等宽，没有笔锋；一笔之内重叠不加深。
// 这里只处理接近水平的笔迹：沿途把笔尖的上下两端连成一条带子，两端是竖直的平边。

import type { Sample } from './path'

export type HighlighterOptions = {
  /** 笔尖高度（带子的高度）。 */
  height: number
  /** 笔尖宽度；软件里高宽比是 8:1。 */
  width: number
}

export function highlighterPathAt(samples: readonly Sample[], time: number, { height, width }: HighlighterOptions): string {
  if (time <= 0) return ''
  const points: { x: number; y: number }[] = []
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    if (s.t <= time) {
      points.push(s)
      continue
    }
    const p = samples[i - 1]
    const k = (time - p.t) / (s.t - p.t)
    points.push({ x: p.x + (s.x - p.x) * k, y: p.y + (s.y - p.y) * k })
    break
  }
  if (!points.length) return ''
  const f = (n: number) => n.toFixed(2)
  const first = points[0]
  const last = points[points.length - 1]
  const half = height / 2
  const top = [`${f(first.x - width / 2)} ${f(first.y - half)}`, ...points.map(p => `${f(p.x)} ${f(p.y - half)}`), `${f(last.x + width / 2)} ${f(last.y - half)}`]
  const bottom = [`${f(last.x + width / 2)} ${f(last.y + half)}`, ...points.reverse().map(p => `${f(p.x)} ${f(p.y + half)}`), `${f(first.x - width / 2)} ${f(first.y + half)}`]
  return `M${[...top, ...bottom].join('L')}Z`
}
