// 用 Patrick Hand 的字形中心线写字（用户点名的手写字体，SIL OFL；中心线由 scripts/patrick-centerlines.py 提取）。
// 每个字加少量确定性的随机变化（大小、倾斜、旋转、基线、字距），避免整齐得像印刷体；
// 每一笔都走 Draw3 墨迹模拟，粗细变化和片中其他墨迹一致。

import { strokeAt, capsulePath, type InkPoint, type ModeledStroke, type RawSample } from '../ink/draw3Ink'
import { PATRICK_HAND } from './patrickHand'
import { paced, type P2, type Timed } from './pace'

type GlyphData = { readonly adv: number; readonly strokes: readonly (readonly (readonly number[])[])[] }
const GLYPHS = PATRICK_HAND.glyphs as unknown as Record<string, GlyphData>

/** mulberry32：固定种子的伪随机，逐帧可复现。 */
const rng = (seed: number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type TextOpts = {
  /** 第一个字的左端与基线（白板坐标）。 */
  readonly x: number
  readonly y: number
  /** 字号：1em 对应的逻辑像素。 */
  readonly size: number
  readonly seed: number
  /** 整体右倾（x 方向剪切系数）。 */
  readonly slant?: number
  /** 随机变化的强度，1 为默认。 */
  readonly wobble?: number
}

export type GlyphStroke = { readonly pts: P2[]; readonly first: boolean; readonly space: boolean }

/** 排一行字：返回每一笔的中心线（白板坐标）与行尾 x。 */
export function layoutText(text: string, o: TextOpts): { strokes: GlyphStroke[]; end: number } {
  const r = rng(o.seed)
  const w = o.wobble ?? 1
  const sym = () => (r() * 2 - 1) * w
  const tilt = 0.008 * sym() // 整行基线略微倾斜
  let x = o.x
  let pendingSpace = false
  const strokes: GlyphStroke[] = []
  // 根号按数学写法一笔连写：左侧小勾 → 下折 → 上挑 → 顶横，横线盖住后面的数（直到空格或运算符）。
  // Patrick Hand 自带的 √ 是一个对勾，小字号下像斜杠，所以不用它的字形，而是在这里合成。
  let root: { index: number; x0: number; y0: number; u: number; slant: number } | null = null
  const closeRoot = () => {
    if (!root) return
    const { index, x0, y0, u, slant } = root
    const sl = (px: number, py: number): P2 => [px - (py - y0) * slant, py]
    const pts = roundCorners(
      [sl(x0 + 0.02 * u, y0 - 0.3 * u), sl(x0 + 0.1 * u, y0 - 0.37 * u), sl(x0 + 0.21 * u, y0 + 0.01 * u), sl(x0 + 0.41 * u, y0 - 0.84 * u), [x - 0.02 * o.size, y0 - 0.86 * u + 0.012 * o.size * sym()]],
      [0.03 * u, 0.045 * u, 0.07 * u],
    )
    strokes[index] = { ...strokes[index], pts }
    root = null
  }
  for (const ch of text) {
    if (root && !/[0-9a-zA-Z²³]/.test(ch)) closeRoot()
    if (ch === ' ') {
      x += o.size * (0.26 + 0.03 * sym())
      pendingSpace = true
      continue
    }
    if (ch === '√') {
      const s = 1 + 0.05 * sym()
      root = { index: strokes.length, x0: x, y0: o.y + 0.02 * o.size * sym() + (x - o.x) * tilt, u: o.size * s, slant: (o.slant ?? 0.1) + 0.03 * sym() }
      strokes.push({ pts: [], first: true, space: pendingSpace })
      pendingSpace = false
      x += 0.45 * o.size * s
      continue
    }
    const g = GLYPHS[ch]
    if (!g) {
      x += o.size * 0.4
      continue
    }
    // Patrick Hand 的上标很小，板书字号下像撇号：放大 1.35 倍，再下移一点，顶端不超出大写字母太多。
    const sup = ch === '²' || ch === '³' ? 1.35 : 1
    const s = (1 + 0.06 * sym()) * sup
    const rot = 0.035 * sym()
    const slant = (o.slant ?? 0.1) + 0.03 * sym()
    const dy = 0.025 * o.size * sym() + (x - o.x) * tilt + (sup - 1) * 0.5 * o.size
    const cx = (g.adv * o.size * s) / 2
    const cy = -0.35 * o.size
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)
    g.strokes.forEach((st, i) => {
      const pts = st.map(([gx, gy]) => {
        let px = gx * o.size * s
        const py = gy * o.size * s
        px -= py * slant
        const qx = px - cx
        const qy = py - cy
        return [x + cx + qx * cos - qy * sin, o.y + dy + cy + qx * sin + qy * cos] as const
      })
      strokes.push({ pts, first: i === 0, space: i === 0 && pendingSpace })
    })
    pendingSpace = false
    x += g.adv * o.size * s + o.size * (0.015 + 0.02 * sym())
  }
  closeRoot()
  return { strokes: strokes.filter((st) => st.pts.length > 1), end: x }
}

/** 折线的每个内角换成一段二次贝塞尔圆角（radii[i] 对应第 i 个内角）。 */
function roundCorners(points: readonly P2[], radii: readonly number[]): P2[] {
  const out: P2[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const [ax, ay] = points[i - 1]
    const [bx, by] = points[i]
    const [cx, cy] = points[i + 1]
    const la = Math.hypot(bx - ax, by - ay)
    const lc = Math.hypot(cx - bx, cy - by)
    const rr = Math.min(radii[i - 1] ?? 0, la / 3, lc / 3)
    const p0: P2 = [bx + ((ax - bx) / la) * rr, by + ((ay - by) / la) * rr]
    const p2: P2 = [bx + ((cx - bx) / lc) * rr, by + ((cy - by) / lc) * rr]
    for (let k = 0; k <= 8; k++) {
      const t = k / 8
      const m = 1 - t
      out.push([m * m * p0[0] + 2 * m * t * bx + t * t * p2[0], m * m * p0[1] + 2 * m * t * by + t * t * p2[1]])
    }
  }
  out.push(points[points.length - 1])
  return out
}

export type Pen = {
  /** 写字速度（逻辑像素每秒）与基准笔宽。 */
  readonly speed: number
  readonly base: number
  /** 同一个字两笔之间、两个字之间、空格处的停顿（秒）。 */
  readonly gaps?: { readonly stroke: number; readonly glyph: number; readonly space: number }
}

/** 写一行字：逐笔建模并排好落笔时刻（从 0 秒起）。 */
export function writeText(text: string, o: TextOpts, pen: Pen, t0 = 0): Timed[] {
  const gaps = pen.gaps ?? { stroke: 0.045, glyph: 0.06, space: 0.1 }
  const { strokes } = layoutText(text, o)
  const out: Timed[] = []
  let time = t0
  strokes.forEach((st, i) => {
    if (i > 0) time += st.space ? gaps.space : st.first ? gaps.glyph : gaps.stroke
    // 匀速书写：速度保持在软件的变粗阈值（500）以上，笔宽稳定在 0.8 倍，粗细和字体本身一样均匀。
    const raw = paced(st.pts, { fast: pen.speed, slow: pen.speed, start: 0.9, end: 0.95, inLen: o.size * 0.08, outLen: o.size * 0.08 })
    const stroke = flatStroke(raw, pen.base)
    out.push({ stroke, at: time })
    time += stroke.duration
  })
  return out
}

/**
 * 板书小字直接沿字形中心线成墨，粗细恒定（0.9 倍基准）。
 * 不走 Draw3 的弹簧平滑：它让墨迹滞后笔尖约“速度 × 0.024 秒”，一笔只有 0.1 秒的小字会被削圆，
 * 6、9 下面的小圈直接消失。用户要的是字体原样（Patrick Hand 的均匀粗细）。
 */
function flatStroke(raw: readonly RawSample[], base: number): ModeledStroke {
  const r = 0.45 * base
  const points: InkPoint[] = raw.map((p) => ({ x: p.x, y: p.y, r, t: p.t }))
  return { points, ending: [], duration: raw[raw.length - 1].t, base }
}

/** 写完后的样子，抽稀后预先拼成一条路径（板书很密，逐帧重算太贵）。 */
export function staticPath(list: readonly Timed[]): string {
  // 坐标保留一位小数即可（白板逻辑像素，放大 1 倍左右观看），路径体积小一半以上。
  return list.map(({ stroke }) => capsulePath(thin(strokeAt(stroke, stroke.duration + 1, 0, false).points, 1.1))).join('').replace(/(\.\d)\d+/g, '$1')
}

/** 抽稀：相邻保留点的间距至少为半径的 k 倍（胶囊并集的外形几乎不变）。 */
export function thin(points: readonly InkPoint[], k = 0.6): InkPoint[] {
  if (points.length <= 2) return [...points]
  const out = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]
    const q = out[out.length - 1]
    if (Math.hypot(p.x - q.x, p.y - q.y) >= k * Math.min(p.r, q.r) || Math.abs(p.r - q.r) > 0.3) out.push(p)
  }
  out.push(points[points.length - 1])
  return out
}
