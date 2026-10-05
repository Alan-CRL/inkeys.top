import { buildCenterlines } from './glyphs'
import type { Point } from './glyphs'
import { DEFAULT_STYLE, SIZE_SCALE, resolveSolidColor } from './styles'
import type { RenderStyle } from './styles'
import { getEraserFrame } from './eraser'

export const WRITE_SECONDS = 4.2
export const BASE_WIDTH = 15.5
const SAMPLE_SECONDS = 0.065

export interface TimedPoint extends Point {
  t: number
}

export interface InkPoint extends TimedPoint {
  width: number
  speed: number
  s: number
}

export interface Stroke {
  name: string
  raw: TimedPoint[]
  ink: InkPoint[]
  start: number
  end: number
}

export interface Scene {
  strokes: Stroke[]
  bounds: { minX: number, minY: number, maxX: number, maxY: number }
  aspect: number
  duration: number
  length: number
}

export interface AnimationState {
  phase: 'ink' | 'hold' | 'fade' | 'raw' | 'raw-hold' | 'static'
  rawTime: number
  inkTime: number
  opacity: number
}

const clamp = (n: number, low = 0, high = 1) => Math.max(low, Math.min(high, n))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (n: number) => {
  const t = clamp(n)
  return t * t * (3 - 2 * t)
}

export function timelineAt(elapsed: number, reduced = false): AnimationState {
  if (reduced) return { phase: 'static', rawTime: -1, inkTime: WRITE_SECONDS, opacity: 1 }
  const time = Math.max(0, elapsed)
  if (time < 7.9) {
    if (time < 4.2) return { phase: 'ink', rawTime: -1, inkTime: time, opacity: 1 }
    if (time < 7.2) return { phase: 'hold', rawTime: -1, inkTime: 4.2, opacity: 1 }
    return { phase: 'fade', rawTime: -1, inkTime: 4.2, opacity: 1 - smooth((time - 7.2) / 0.7) }
  }
  // 十进制秒数在取模后可能落到边界前一浮点位，统一到纳秒避免短暂显示上一阶段。
  const remainder = Math.round(((time - 7.9) % 12.45) * 1e9) / 1e9
  const loop = remainder >= 12.45 ? 0 : remainder
  if (loop < 4.2) return { phase: 'raw', rawTime: loop, inkTime: -1, opacity: 1 }
  if (loop < 4.55) return { phase: 'raw-hold', rawTime: 4.2, inkTime: -1, opacity: 1 }
  if (loop < 8.75) return { phase: 'ink', rawTime: 4.2, inkTime: loop - 4.55, opacity: 1 }
  if (loop < 11.75) return { phase: 'hold', rawTime: -1, inkTime: 4.2, opacity: 1 }
  return { phase: 'fade', rawTime: -1, inkTime: 4.2, opacity: 1 - smooth((loop - 11.75) / 0.7) }
}

/** 只累计活跃时间；切换标签、滚出首屏及系统偏好变化都不消耗动画时间。 */
export function createActiveClock() {
  let elapsed = 0
  let resumed: number | undefined
  return {
    read(now: number) { return elapsed + (resumed === undefined ? 0 : Math.max(0, now - resumed) / 1000) },
    seek(seconds: number, now: number) {
      elapsed = Math.max(0, seconds)
      if (resumed !== undefined) resumed = now
    },
    setRunning(running: boolean, now: number) {
      if (running && resumed === undefined) resumed = now
      if (!running && resumed !== undefined) {
        elapsed += Math.max(0, now - resumed) / 1000
        resumed = undefined
      }
    },
  }
}

export function computeLayout(viewportWidth: number, availableHeight: number, aspect: number) {
  // 除墨迹边界外再留 18px：覆盖位移和透视投影，窄屏外侧仍至少保留 24px。
  const safety = 18
  const maxWidth = Math.max(0, viewportWidth - 48 - safety * 2)
  const target = viewportWidth <= 640 ? maxWidth : Math.min(viewportWidth * 0.56, 900)
  const centerY = Math.max(0, availableHeight * 0.42)
  // 矮屏为完整橡皮圆周及透视预留纵向外延；所有阶段共用尺寸，擦除开始时不跳变。
  const maxHeight = Math.max(0, (centerY * 2 - safety * 2 - 24) / 1.36)
  const width = Math.min(target, maxWidth, maxHeight * aspect)
  return { width, height: width / aspect, centerY, safety }
}

function timedGuide(points: Point[]) {
  const times = [0]
  for (let i = 1; i < points.length; i++) {
    const before = points[Math.max(0, i - 5)]
    const here = points[i]
    const after = points[Math.min(points.length - 1, i + 5)]
    const ax = here.x - before.x
    const ay = here.y - before.y
    const bx = after.x - here.x
    const by = after.y - here.y
    const angle = Math.atan2(Math.abs(ax * by - ay * bx), ax * bx + ay * by)
    const curvature = angle / Math.max(1, (Math.hypot(ax, ay) + Math.hypot(bx, by)) / 2)
    const edge = Math.min(i, points.length - 1 - i) * 0.8
    const speed = (240 + 650 / (1 + curvature * 75)) * (0.58 + 0.42 * smooth(edge / 28))
    times.push(times[i - 1] + Math.hypot(here.x - points[i - 1].x, here.y - points[i - 1].y) / speed)
  }
  return times
}

/** 彩虹轨迹直接来自设计曲线，压感只改变宽度，绝不以稀疏示意点修改字形。 */
function createInk(points: Point[], times: number[], start: number, duration: number, offset: number) {
  const ink: InkPoint[] = []
  const weight = times[times.length - 1]
  let distance = offset
  let width = BASE_WIDTH
  for (let i = 0; i < points.length; i++) {
    const t = start + times[i] / weight * duration
    let speed = 0
    if (i > 0) {
      const step = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
      const dt = t - ink[i - 1].t
      distance += step
      speed = step / Math.max(1e-6, dt)
      const desiredWidth = BASE_WIDTH * mix(1.15, 0.85, smooth(speed / 1050))
      width = mix(width, desiredWidth, 1 - Math.exp(-dt / 0.055))
    }
    ink.push({ ...points[i], t, speed, width, s: distance })
  }
  return ink
}
export function createScene(): Scene {
  const guides = buildCenterlines().map(line => ({ ...line, times: timedGuide(line.points) }))
  const totalWeight = guides.reduce((sum, guide) => sum + guide.times[guide.times.length - 1], 0)
  const lifts = guides.map((guide, index) => {
    const next = guides[index + 1]
    if (!next) return 0
    const from = guide.points[guide.points.length - 1]
    const to = next.points[0]
    // 抬笔后留出落稳和移笔时间，距离越远停顿越长；空中移动不绘制任何连接线。
    return clamp(0.09 + Math.hypot(to.x - from.x, to.y - from.y) / 1000, 0.1, 0.24)
  })
  const inputDuration = WRITE_SECONDS - lifts.reduce((sum, lift) => sum + lift, 0)
  let start = 0
  let distance = 0
  const strokes = guides.map((guide, index) => {
    const weight = guide.times[guide.times.length - 1]
    const duration = inputDuration * weight / totalWeight
    const raw: TimedPoint[] = []
    let turn = 0
    for (let i = 0; i < guide.points.length; i++) {
      const point = guide.points[i]
      const t = start + guide.times[i] / weight * duration
      if (i > 1) {
        const a = guide.points[i - 2]
        const b = guide.points[i - 1]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const ex = point.x - b.x
        const ey = point.y - b.y
        turn += Math.abs(Math.atan2(dx * ey - dy * ex, dx * ex + dy * ey))
      }
      const gap = raw.length ? t - raw[raw.length - 1].t : Infinity
      // 直段保持稀疏；小环、回描与急弯补点，避免示意折线把正常字形切成三角形。
      if (gap >= SAMPLE_SECONDS || (turn >= 0.42 && gap >= 0.02) || i === guide.points.length - 1) {
        raw.push({ x: point.x + Math.sin(i * 0.17) * 1.8, y: point.y + Math.sin(i * 0.11) * 1.8, t })
        turn = 0
      }
    }
    const end = start + duration
    const ink = createInk(guide.points, guide.times, start, duration, distance)
    distance = ink[ink.length - 1].s
    const stroke = { name: guide.name, raw, ink, start, end }
    start = end + lifts[index]
    return stroke
  })
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const stroke of strokes) {
    for (const point of [...stroke.raw, ...stroke.ink]) {
      // 所有笔型共用边界：粗激光实体半径 + 固定漫反射外扩，切笔不改变版面。
      const padding = BASE_WIDTH * SIZE_SCALE.thick / 2 + BASE_WIDTH + 3
      bounds.minX = Math.min(bounds.minX, point.x - padding)
      bounds.minY = Math.min(bounds.minY, point.y - padding)
      bounds.maxX = Math.max(bounds.maxX, point.x + padding)
      bounds.maxY = Math.max(bounds.maxY, point.y + padding)
    }
  }
  return { strokes, bounds, aspect: (bounds.maxX - bounds.minX) / (bounds.maxY - bounds.minY), duration: WRITE_SECONDS, length: distance }
}

function visibleCount(points: TimedPoint[], time: number) {
  let low = 0
  let high = points.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (points[middle].t <= time) low = middle + 1
    else high = middle
  }
  return low
}

function visibleInk(points: InkPoint[], time: number) {
  const count = visibleCount(points, time)
  const result = points.slice(0, count)
  if (count > 0 && count < points.length) {
    const a = points[count - 1]
    const b = points[count]
    const f = (time - a.t) / (b.t - a.t)
    result.push({ x: mix(a.x, b.x, f), y: mix(a.y, b.y, f), t: time,
      width: mix(a.width, b.width, f), speed: mix(a.speed, b.speed, f), s: mix(a.s, b.s, f) })
  }
  // 停驻点没有方向，剔除它们以免法线翻转；时间插值仍保留真正的活动笔尖。
  return result.filter((p, i) => i === 0 || Math.hypot(p.x - result[i - 1].x, p.y - result[i - 1].y) > 0.008)
}

const colors = [
  [0, 0, 134, 151], [0.17, 71, 184, 163], [0.29, 191, 206, 35],
  [0.40, 255, 193, 0], [0.53, 255, 120, 49], [0.64, 245, 83, 110],
  [0.76, 182, 113, 189], [0.88, 102, 91, 191], [1, 32, 165, 216],
]

// 深色背景下提高明度并收敛饱和度，保留彩虹层次而不依赖外发光。
const darkColors = [
  [0, 76, 198, 195], [0.17, 132, 214, 176], [0.29, 206, 215, 114],
  [0.40, 242, 198, 98], [0.53, 243, 163, 104], [0.64, 239, 133, 157],
  [0.76, 192, 149, 216], [0.88, 154, 153, 227], [1, 111, 182, 226],
]

export type PainterTheme = 'light' | 'dark'

function colorAt(fraction: number, theme: PainterTheme) {
  const palette = theme === 'dark' ? darkColors : colors
  const u = clamp(fraction)
  let i = 1
  while (i < palette.length - 1 && palette[i][0] < u) i++
  const a = palette[i - 1]
  const b = palette[i]
  const f = (u - a[0]) / (b[0] - a[0])
  return `rgb(${Math.round(mix(a[1], b[1], f))}, ${Math.round(mix(a[2], b[2], f))}, ${Math.round(mix(a[3], b[3], f))})`
}

interface RimPoint extends InkPoint {
  nx: number
  ny: number
}

function splitAtCorners(points: InkPoint[]) {
  const parts: InkPoint[][] = []
  let start = 0
  for (let i = 1; i < points.length - 1; i++) {
    const ax = points[i].x - points[i - 1].x
    const ay = points[i].y - points[i - 1].y
    const bx = points[i + 1].x - points[i].x
    const by = points[i + 1].y - points[i].y
    if (ax * bx + ay * by < 0.5 * Math.hypot(ax, ay) * Math.hypot(bx, by)) {
      // 回描和明确折角用圆接头，避免法线突变留下缺口；不改变连续书写时间。
      parts.push(points.slice(start, i + 1))
      start = i
    }
  }
  parts.push(points.slice(start))
  return parts
}

function ribbon(points: RimPoint[], start: number, end: number, roundStart: boolean, roundEnd: boolean) {
  const path = new Path2D()
  const a = points[start]
  const b = points[end]
  path.moveTo(a.x + a.nx * a.width / 2, a.y + a.ny * a.width / 2)
  for (let i = start + 1; i <= end; i++) {
    const p = points[i]
    path.lineTo(p.x + p.nx * p.width / 2, p.y + p.ny * p.width / 2)
  }
  if (roundEnd) {
    const angle = Math.atan2(b.ny, b.nx)
    path.arc(b.x, b.y, b.width / 2, angle, angle - Math.PI, true)
  }
  else path.lineTo(b.x - b.nx * b.width / 2, b.y - b.ny * b.width / 2)
  for (let i = end - 1; i >= start; i--) {
    const p = points[i]
    path.lineTo(p.x - p.nx * p.width / 2, p.y - p.ny * p.width / 2)
  }
  if (roundStart) {
    const angle = Math.atan2(-a.ny, -a.nx)
    path.arc(a.x, a.y, a.width / 2, angle, angle - Math.PI, true)
  }
  path.closePath()
  return path
}

export interface Painter {
  render: (state: AnimationState, cssWidth: number, cssHeight: number, dpr?: number, theme?: PainterTheme, style?: RenderStyle, eraseProgress?: number) => void
}

function styledInk(points: InkPoint[], stroke: Stroke, style: RenderStyle) {
  const scale = SIZE_SCALE[style.size]
  const first = stroke.ink[0].s
  const last = stroke.ink[stroke.ink.length - 1].s
  const length = last - first
  return points.map(point => {
    // 起笔保持原有圆头，只在末端舒缓收束；五次曲线两端斜率/曲率归零，无硬截断。
    const tail = clamp((last - point.s) / Math.min(length * 0.22, 55))
    const taper = style.pen === 'soft'
      ? 0.12 + 0.88 * tail * tail * tail * (tail * (tail * 6 - 15) + 10)
      : 1
    return { ...point, width: point.width * scale * taper }
  })
}

/** 竖直矩形笔尖的连续扫掠；所有凸多边形同向填充，一笔只合成一次透明度。 */
function fixedNibPath(points: InkPoint[], height: number) {
  const path = new Path2D()
  const hx = height / 16
  const hy = height / 2
  const cross = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  for (let i = 0; i < Math.max(1, points.length - 1); i++) {
    const a = points[i]
    const b = points[Math.min(i + 1, points.length - 1)]
    const corners = [a, b].flatMap(p => [
      { x: p.x - hx, y: p.y - hy }, { x: p.x + hx, y: p.y - hy },
      { x: p.x + hx, y: p.y + hy }, { x: p.x - hx, y: p.y + hy },
    ]).sort((p, q) => p.x - q.x || p.y - q.y)
    const hull: Point[] = []
    for (const p of corners) {
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop()
      hull.push(p)
    }
    const lower = hull.length
    for (let j = corners.length - 2; j >= 0; j--) {
      const p = corners[j]
      while (hull.length > lower && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop()
      hull.push(p)
    }
    path.moveTo(hull[0].x, hull[0].y)
    for (let j = 1; j < hull.length; j++) path.lineTo(hull[j].x, hull[j].y)
    path.closePath()
  }
  return path
}

interface LaserLayer { canvas: HTMLCanvasElement, x: number, y: number }

function laserSamples(points: InkPoint[], pixelScale: number) {
  const keep = new Set([0, points.length - 1])
  const spans = [[0, points.length - 1]]
  while (spans.length) {
    const [from, to] = spans.pop()!
    const a = points[from]
    const b = points[to]
    let error = 0.15
    let split = -1
    for (let i = from + 1; i < to; i++) {
      const p = points[i]
      const t = (p.t - a.t) / (b.t - a.t)
      const deviation = Math.hypot(p.x - mix(a.x, b.x, t), p.y - mix(a.y, b.y, t)) * pixelScale
      if (deviation > error) { error = deviation; split = i }
    }
    if (split !== -1) {
      keep.add(split)
      spans.push([from, split], [split, to])
    }
  }
  // 按时间插值的屏幕误差小于 0.15 像素，既保留书写速度，也避免同一区域反复栅格化。
  return [...keep].sort((a, b) => a - b).map(index => points[index])
}

function createLaserLayer(stroke: Stroke, diameter: number, color: string, k: number, tx: number, ty: number) {
  const radius = diameter * k / 2
  const coreRadius = radius / 3
  const scatterWidth = coreRadius * 0.4
  // 对应 Draw3：漫反射外扩不随所选实体宽度变化，只随整个字形缩放。
  const glow = BASE_WIDTH * k
  const pad = radius + glow + 2
  const points = laserSamples(visibleInk(stroke.ink, Infinity), k)
  const pixels = points.map(p => ({ x: p.x * k + tx, y: p.y * k + ty, t: p.t }))
  const x = Math.floor(Math.min(...pixels.map(p => p.x)) - pad)
  const y = Math.floor(Math.min(...pixels.map(p => p.y)) - pad)
  const width = Math.ceil(Math.max(...pixels.map(p => p.x)) + pad) - x
  const height = Math.ceil(Math.max(...pixels.map(p => p.y)) + pad) - y
  const coverage = new Float32Array(width * height * 4)
  const frame = new Float32Array(coverage.length)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  const image = context.createImageData(width, height)
  const rgb = [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16) / 255)
  let nextSegment = 1
  let lastTime = -1
  type Region = { left: number, top: number, right: number, bottom: number }
  let lastPartial: Region | undefined

  function segmentRegion(a: Point, b: Point): Region {
    return {
      left: Math.max(0, Math.floor(Math.min(a.x, b.x) - pad) - x),
      top: Math.max(0, Math.floor(Math.min(a.y, b.y) - pad) - y),
      right: Math.min(width, Math.ceil(Math.max(a.x, b.x) + pad) - x),
      bottom: Math.min(height, Math.ceil(Math.max(a.y, b.y) + pad) - y),
    }
  }

  function addSegment(target: Float32Array, a: Point, b: Point) {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const squared = dx * dx + dy * dy
    const region = segmentRegion(a, b)
    const { left, top, right, bottom } = region
    for (let py = top; py < bottom; py++) {
      for (let px = left; px < right; px++) {
        const vx = px + x + 0.5 - a.x
        const vy = py + y + 0.5 - a.y
        const t = squared > 1e-8 ? clamp((vx * dx + vy * dy) / squared) : 0
        const nx = vx - t * dx
        const ny = vy - t * dy
        const distance = Math.hypot(nx, ny)
        if (distance > radius + glow + 1) continue
        const aa = Math.max(1.25, 1.25 * (Math.abs(nx) + Math.abs(ny)) / Math.max(distance, 1e-4))
        const core = distance - coreRadius
        const border = distance - radius
        const offset = (py * width + px) * 4
        // 同笔先做四通道 MAX，再解析材质；不能逐段叠加发光，否则交叉会过曝。
        target[offset] = Math.max(target[offset], 1 - smooth(core / aa + 0.5))
        target[offset + 1] = Math.max(target[offset + 1], 1 - smooth((Math.abs(core) - scatterWidth) / aa + 0.5))
        target[offset + 2] = Math.max(target[offset + 2], 1 - smooth(border / aa + 0.5))
        target[offset + 3] = Math.max(target[offset + 3], clamp(1 - border / glow) ** 2)
      }
    }
    return region
  }

  return {
    render(time: number): LaserLayer {
      if (time === lastTime) return { canvas, x, y }
      let dirty = lastPartial
      const include = (region: Region) => {
        dirty = dirty ? {
          left: Math.min(dirty.left, region.left), top: Math.min(dirty.top, region.top),
          right: Math.max(dirty.right, region.right), bottom: Math.max(dirty.bottom, region.bottom),
        } : region
      }
      if (time < lastTime) {
        coverage.fill(0)
        nextSegment = 1
        dirty = { left: 0, top: 0, right: width, bottom: height }
      }
      lastTime = time
      const count = visibleCount(pixels, time)
      // 只栅格化新完成的线段。活动尾段不写入前缀，避免插值圆头残影及定格回退不一致。
      while (nextSegment < count) {
        include(addSegment(coverage, pixels[nextSegment - 1], pixels[nextSegment]))
        nextSegment++
      }
      let partial: [Point, Point] | undefined
      lastPartial = undefined
      if (count > 0 && count < pixels.length) {
        const a = pixels[count - 1]
        const b = pixels[count]
        const fraction = (time - a.t) / (b.t - a.t)
        partial = [a, { x: mix(a.x, b.x, fraction), y: mix(a.y, b.y, fraction) }]
        lastPartial = segmentRegion(...partial)
        include(lastPartial)
      }
      if (!dirty) return { canvas, x, y }
      // 仅恢复/解析新墨迹和上一活动笔尖的包围盒，完整前缀不反复上传或计算材质。
      const { left, top, right, bottom } = dirty
      for (let row = top; row < bottom; row++) {
        const start = (row * width + left) * 4
        frame.set(coverage.subarray(start, (row * width + right) * 4), start)
      }
      if (partial) addSegment(frame, ...partial)
      for (let row = top; row < bottom; row++) {
        for (let offset = (row * width + left) * 4; offset < (row * width + right) * 4; offset += 4) {
          const core = frame[offset]
          const scatter = frame[offset + 1] * 0.94
          const border = frame[offset + 2] * 0.98
          const diffuse = frame[offset + 3]
          if (diffuse === 0 && core === 0 && scatter === 0 && border === 0) {
            image.data.fill(0, offset, offset + 4)
            continue
          }
          const edge = smooth((diffuse - 0.20) / 0.09) * (1 - frame[offset + 2]) * 0.72
          const alpha = 1 - (1 - diffuse) * (1 - border) * (1 - scatter) * (1 - core)
          for (let channel = 0; channel < 3; channel++) {
            const c = rgb[channel]
            let value = mix(c, mix(c, 1, 0.43), edge) * diffuse
            value = c * border + value * (1 - border)
            value = mix(c, 1, 0.94) * scatter + value * (1 - scatter)
            value = core + value * (1 - core)
            image.data[offset + channel] = Math.round(value / alpha * 255)
          }
          image.data[offset + 3] = Math.round(alpha * 255)
        }
      }
      context.putImageData(image, 0, 0, left, top, right - left, bottom - top)
      return { canvas, x, y }
    },
  }
}

export function createPainter(scene: Scene, canvas: HTMLCanvasElement): Painter {
  const ctx = canvas.getContext('2d')!
  const inkCanvas = document.createElement('canvas')
  const inkCtx = inkCanvas.getContext('2d')!
  let lastKey = ''
  let lastInkKey = ''
  let laserCacheKey = ''
  let eraserSizeKey = ''
  const eraserPaths: Path2D[] = []
  const laserCache = new Map<Stroke, ReturnType<typeof createLaserLayer>>()
  return {
    render(state, cssWidth, cssHeight, pixelRatio = 1, theme = 'light', style = DEFAULT_STYLE, eraseProgress = -1) {
      if (cssWidth < 1 || cssHeight < 1) return
      const dpr = clamp(pixelRatio, 1, 2)
      const pixelWidth = Math.round(cssWidth * dpr)
      const pixelHeight = Math.round(cssHeight * dpr)
      const styleKey = [theme, style.pen, style.color, style.size].join(':')
      const inkKey = [pixelWidth, pixelHeight, cssWidth, cssHeight, state.inkTime, styleKey].join(':')
      const key = [inkKey, state.rawTime, state.opacity, eraseProgress].join(':')
      if (key === lastKey) return
      lastKey = key
      const redrawInk = inkKey !== lastInkKey
      lastInkKey = inkKey
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight
        || inkCanvas.width !== pixelWidth || inkCanvas.height !== pixelHeight) {
        canvas.width = inkCanvas.width = pixelWidth
        canvas.height = inkCanvas.height = pixelHeight
      }
      const { minX, minY, maxX, maxY } = scene.bounds
      const scale = Math.min(cssWidth / (maxX - minX), cssHeight / (maxY - minY))
      const k = dpr * scale
      const tx = (cssWidth - (maxX + minX) * scale) * dpr / 2
      const ty = (cssHeight - (maxY + minY) * scale) * dpr / 2
      for (const context of [ctx, inkCtx]) {
        context.setTransform(1, 0, 0, 1, 0, 0)
        if (context === ctx || redrawInk) context.clearRect(0, 0, pixelWidth, pixelHeight)
        context.setTransform(k, 0, 0, k, tx, ty)
      }
      const nextLaserKey = [k, tx, ty, styleKey].join(':')
      if (laserCacheKey !== nextLaserKey) {
        laserCache.clear()
        laserCacheKey = nextLaserKey
      }
      ctx.globalAlpha = state.opacity
      ctx.lineWidth = 1.15 / scale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = theme === 'dark' ? 'rgba(176, 191, 211, 0.38)' : 'rgba(93, 103, 115, 0.38)'
      ctx.fillStyle = theme === 'dark' ? 'rgba(176, 191, 211, 0.52)' : 'rgba(93, 103, 115, 0.48)'
      for (const stroke of scene.strokes) {
        const count = visibleCount(stroke.raw, state.rawTime)
        if (!count) continue
        ctx.beginPath()
        ctx.moveTo(stroke.raw[0].x, stroke.raw[0].y)
        for (let i = 1; i < count; i++) ctx.lineTo(stroke.raw[i].x, stroke.raw[i].y)
        ctx.stroke()
        ctx.beginPath()
        for (let i = 0; i < count; i++) {
          const p = stroke.raw[i]
          const radius = Math.min(1.65 / scale, 3)
          ctx.moveTo(p.x + radius, p.y)
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        }
        ctx.fill()
      }

      const previous: Array<[InkPoint, InkPoint]> = []
      // 不支持彩虹的笔型由播放控制器选定本轮纯色；直接调用绘制器时也有稳定退路。
      const solid = resolveSolidColor(style.color === 'rainbow' ? 'cyan' : style.color, theme)
      for (const stroke of redrawInk ? scene.strokes : []) {
        const visible = styledInk(visibleInk(stroke.ink, state.inkTime), stroke, style)
        if (!visible.length) continue
        if (style.pen === 'highlighter' || style.pen === 'brush') {
          inkCtx.save()
          inkCtx.globalAlpha = style.pen === 'highlighter' ? 0.35 : 1
          inkCtx.fillStyle = solid
          inkCtx.fill(fixedNibPath(visible, BASE_WIDTH * 2 * SIZE_SCALE[style.size]))
          inkCtx.restore()
          continue
        }
        if (style.pen === 'laser') {
          const time = Math.min(state.inkTime, stroke.end)
          let cached = laserCache.get(stroke)
          if (!cached) {
            cached = createLaserLayer(stroke, BASE_WIDTH * SIZE_SCALE[style.size], solid, k, tx, ty)
            laserCache.set(stroke, cached)
          }
          const layer = cached.render(time)
          inkCtx.save()
          inkCtx.setTransform(1, 0, 0, 1, 0, 0)
          inkCtx.drawImage(layer.canvas, layer.x, layer.y)
          inkCtx.restore()
          continue
        }
        if (visible.length < 2) continue
        for (const part of splitAtCorners(visible)) {
          const rim: RimPoint[] = part.map((point, i) => {
            const before = part[Math.max(0, i - 1)]
            const after = part[Math.min(part.length - 1, i + 1)]
            const dx = after.x - before.x
            const dy = after.y - before.y
            const length = Math.hypot(dx, dy) || 1
            return { ...point, nx: -dy / length, ny: dx / length }
          })
          // 共享法线的连续轮廓分片，颜色沿弧长而非屏幕坐标；相邻分片轻微重叠以消除抗锯齿接缝。
          let from = 0
          while (from < rim.length - 1) {
            let to = from + 1
            while (to < rim.length - 1 && rim[to].s - rim[from].s < 7) to++
            const a = rim[from]
            const b = rim[to]
            const shape = ribbon(rim, Math.max(0, from - 1), to, from === 0, to === rim.length - 1)
            const crosses = previous.some(([p, q]) => {
              if (a.s - q.s < BASE_WIDTH * 4) return false
              const dx = b.x - a.x
              const dy = b.y - a.y
              const px = q.x - p.x
              const py = q.y - p.y
              const cross = dx * py - dy * px
              // 只处理真正相交且夹角明确的非邻接线段，不把同向回描当成交叉投影。
              if (Math.abs(cross) < Math.hypot(dx, dy) * Math.hypot(px, py) * 0.35) return false
              const u = ((p.x - a.x) * py - (p.y - a.y) * px) / cross
              const v = ((p.x - a.x) * dy - (p.y - a.y) * dx) / cross
              return u >= 0 && u < 1 && v >= 0 && v < 1
            })
            if (crosses) {
              // source-atop 将交叉阴影限制在已有墨迹上；不会在背景留下整条投影。
              inkCtx.save()
              inkCtx.globalCompositeOperation = 'source-atop'
              inkCtx.shadowColor = theme === 'dark' ? 'rgba(7, 10, 22, 0.34)' : 'rgba(35, 30, 70, 0.24)'
              inkCtx.shadowBlur = 3 * k
              inkCtx.shadowOffsetY = 1.4 * k
              inkCtx.fillStyle = theme === 'dark' ? 'rgba(9, 12, 24, 0.18)' : 'rgba(35, 30, 70, 0.13)'
              inkCtx.fill(shape)
              inkCtx.restore()
            }
            const gradient = inkCtx.createLinearGradient(a.x, a.y, b.x + 0.0001, b.y)
            gradient.addColorStop(0, style.color === 'rainbow' ? colorAt(a.s / scene.length, theme) : solid)
            gradient.addColorStop(1, style.color === 'rainbow' ? colorAt(b.s / scene.length, theme) : solid)
            // 连续圆接头作为实心内核：原生 stroke 对整段中心线做圆角并集，覆盖轮廓自交的小孔。
            // 内核取本段最小宽度，外缘仍由变宽轮廓决定；不是沿采样点逐个盖圆章。
            const first = Math.max(0, from - 1)
            inkCtx.beginPath()
            inkCtx.moveTo(rim[first].x, rim[first].y)
            let coreWidth = rim[first].width
            for (let i = first + 1; i <= to; i++) {
              inkCtx.lineTo(rim[i].x, rim[i].y)
              coreWidth = Math.min(coreWidth, rim[i].width)
            }
            inkCtx.lineWidth = coreWidth
            inkCtx.lineJoin = 'round'
            inkCtx.lineCap = 'round'
            inkCtx.strokeStyle = gradient
            inkCtx.stroke()
            inkCtx.fillStyle = gradient
            inkCtx.fill(shape)
            previous.push([a, b])
            from = to
          }
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(inkCanvas, 0, 0)
      ctx.globalAlpha = 1
      if (eraseProgress > 0) {
        // 只擦除最终合成层，材质缓存保留完整墨迹；暂停淡出、主题切换及进度回退均可重建。
        ctx.save()
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = '#000'
        const nextEraserSize = `${cssWidth}:${cssHeight}`
        if (eraserSizeKey !== nextEraserSize) {
          eraserPaths.length = 0
          eraserSizeKey = nextEraserSize
        }
        const { paths } = getEraserFrame(eraseProgress, cssWidth, cssHeight)
        // 分段栅格化固定前缀，避免复杂并集路径改变抗锯齿分解后让边缘像素重新出现。
        while (eraserPaths.length < paths.length) eraserPaths.push(new Path2D(paths[eraserPaths.length]))
        for (let index = 0; index < paths.length; index++) ctx.fill(eraserPaths[index])
        ctx.restore()
      }
    },
  }
}
