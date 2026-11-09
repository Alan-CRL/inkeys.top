import { BASE_WIDTH, colorAt, createInk } from './softPen'
import type { InkPoint, PainterTheme } from './softPen'
import { SIZE_SCALE } from './styles'

export const RIBBON_SECONDS = 1.2
// 归一化控制点：左侧屏外起笔，中段绕一个圈，右上方屏外收笔；左下留给文字。
const GUIDE: [number, number][] = [
  [-0.08, 0.62], [0.1, 0.42], [0.3, 0.28], [0.5, 0.31], [0.66, 0.48], [0.65, 0.66],
  [0.56, 0.66], [0.57, 0.48], [0.72, 0.35], [0.86, 0.39], [0.97, 0.29], [1.1, 0.17],
]
// 全视口画布的像素预算，超出时降低绘制分辨率。
const PIXEL_BUDGET = 6e6

interface RibbonPoint extends InkPoint { nx: number, ny: number }
export interface Ribbon { points: RibbonPoint[], length: number, width: number }

/** 向心 Catmull-Rom 采样，保证大曲线平滑且圈内不出现尖角。 */
function sampleGuide(width: number, height: number) {
  // 曲线按横向构图设计：竖屏时保持比例，横向溢出两侧，只露出中段的圈。
  const guideWidth = Math.max(width, height * 1.5)
  const offset = (width - guideWidth) / 2
  const pts = GUIDE.map(([x, y]) => ({ x: offset + x * guideWidth, y: y * height }))
  const out: { x: number, y: number }[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < 64; j++) {
      const t = j / 64
      const t2 = t * t
      const t3 = t2 * t
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      })
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

/**
 * 压感宽度沿用 softPen 的 createInk（越快越细），收笔按软笔的五次曲线出锋。
 * 不直接用 createPainter：它按约 7 单位分段并加圆头，放大到整屏后圆头会显出一圈圈环纹。
 */
export function buildRibbon(cssWidth: number, cssHeight: number): Ribbon {
  const thickness = cssWidth < 768 ? 0.075 : 0.11
  const height = BASE_WIDTH * SIZE_SCALE.thick / thickness
  const width = height * cssWidth / cssHeight
  const points = sampleGuide(width, height)
  // 弯道放慢、直段加速，与真实书写的节奏一致。
  const times = [0]
  for (let i = 1; i < points.length; i++) {
    const a = points[Math.max(0, i - 4)]
    const b = points[i]
    const c = points[Math.min(points.length - 1, i + 4)]
    const turn = Math.abs(Math.atan2((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x), (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y)))
    times.push(times[i - 1] + Math.hypot(b.x - points[i - 1].x, b.y - points[i - 1].y) / (0.45 + 0.55 / (1 + turn * 6)))
  }
  const ink = createInk(points, times, 0, RIBBON_SECONDS, 0)
  const length = ink[ink.length - 1].s
  const tailLength = Math.min(length * 0.22, 220)
  const result = ink.map((point, i) => {
    const before = ink[Math.max(0, i - 1)]
    const after = ink[Math.min(ink.length - 1, i + 1)]
    const dx = after.x - before.x
    const dy = after.y - before.y
    const d = Math.hypot(dx, dy) || 1
    const tail = Math.max(0, Math.min(1, (length - point.s) / tailLength))
    const taper = 0.12 + 0.88 * tail * tail * tail * (tail * (tail * 6 - 15) + 10)
    return { ...point, width: point.width * SIZE_SCALE.thick * taper, nx: -dy / d, ny: dx / d }
  })
  return { points: result, length, width }
}

/** 共享法线的连续色带：相邻小段共边并重叠一格，颜色沿弧长渐变，不产生接缝与环纹。 */
export function paintRibbon(node: HTMLCanvasElement, data: Ribbon, progress: number, theme: PainterTheme) {
  const cssWidth = node.clientWidth
  const cssHeight = node.clientHeight
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(PIXEL_BUDGET / Math.max(1, cssWidth * cssHeight)))
  const pixelWidth = Math.round(cssWidth * dpr)
  const pixelHeight = Math.round(cssHeight * dpr)
  if (node.width !== pixelWidth || node.height !== pixelHeight) {
    node.width = pixelWidth
    node.height = pixelHeight
  }
  const ctx = node.getContext('2d')
  if (!ctx) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, pixelWidth, pixelHeight)
  const k = pixelWidth / data.width
  ctx.setTransform(k, 0, 0, k, 0, 0)
  const time = progress * RIBBON_SECONDS
  const pts = data.points
  let count = 0
  while (count < pts.length && pts[count].t <= time) count++
  if (count < 2) return
  const edge = (p: RibbonPoint, side: number) => [p.x + side * p.nx * p.width / 2, p.y + side * p.ny * p.width / 2]
  for (let i = 0; i < count - 1; i++) {
    const a = pts[i]
    const b = pts[Math.min(count - 1, i + 2)]
    const [ax, ay] = edge(a, 1)
    const [bx, by] = edge(b, 1)
    const [cx, cy] = edge(b, -1)
    const [dx, dy] = edge(a, -1)
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.lineTo(cx, cy)
    ctx.lineTo(dx, dy)
    ctx.closePath()
    ctx.fillStyle = colorAt(pts[i + 1].s / data.length, theme)
    ctx.fill()
  }
  // 笔尖：书写中以当前宽度的圆头收住，收笔后由出锋自然变细。
  const tip = pts[count - 1]
  ctx.beginPath()
  ctx.arc(tip.x, tip.y, tip.width / 2, 0, Math.PI * 2)
  ctx.fillStyle = colorAt(tip.s / data.length, theme)
  ctx.fill()
}
