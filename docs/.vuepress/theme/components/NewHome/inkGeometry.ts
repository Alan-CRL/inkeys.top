export type StrokeMode = 'raw' | 'smooth' | 'taper'

export interface InkPoint {
  x: number
  y: number
  w: number
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// 可复现的伪随机数，保证每次渲染的“原始输入”抖动一致
export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 按法线把中心线向两侧偏移 w / 2，得到变宽笔迹的左右轮廓
export function outline(points: InkPoint[]) {
  const left: [number, number][] = []
  const right: [number, number][] = []
  const last = points.length - 1
  for (let i = 0; i <= last; i++) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(last, i + 1)]
    let dx = next.x - prev.x
    let dy = next.y - prev.y
    const len = Math.hypot(dx, dy) || 1
    dx /= len
    dy /= len
    const half = points[i].w / 2
    left.push([points[i].x - dy * half, points[i].y + dx * half])
    right.push([points[i].x + dy * half, points[i].y - dx * half])
  }
  return { left, right }
}

export function outlinePath(points: InkPoint[]) {
  if (points.length < 2)
    return ''
  const { left, right } = outline(points)
  const fmt = ([x, y]: [number, number]) => `${x.toFixed(1)} ${y.toFixed(1)}`
  return `M${left.map(fmt).join('L')}L${right.reverse().map(fmt).join('L')}Z`
}

export function polylinePath(points: { x: number, y: number }[]) {
  return `M${points.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}`
}

// 带首尾笔锋的波浪线，用于软笔、压感等 SVG 示意
export function taperedWave(options: {
  width: number
  height: number
  amplitude: number
  cycles: number
  maxWidth: number
  minWidth?: number
  pressure?: (t: number) => number
  steps?: number
}) {
  const { width, height, amplitude, cycles, maxWidth, minWidth = 0.6, pressure = () => 1, steps = 80 } = options
  const points: InkPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const taper = Math.min(smoothstep(0, 0.16, t), smoothstep(1, 0.8, t))
    points.push({
      x: width * (0.06 + t * 0.88),
      y: height / 2 + Math.sin(t * Math.PI * 2 * cycles) * amplitude,
      w: minWidth + (maxWidth - minWidth) * taper * pressure(t),
    })
  }
  return points
}
