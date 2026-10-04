import { buildCenterlines } from './glyphs'
import type { Point } from './glyphs'

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
  const maxHeight = Math.max(0, centerY * 2 - safety * 2 - 24)
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
      const padding = BASE_WIDTH * 1.15 / 2 + 6
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
  render: (state: AnimationState, cssWidth: number, cssHeight: number, dpr?: number, theme?: PainterTheme) => void
}

export function createPainter(scene: Scene, canvas: HTMLCanvasElement): Painter {
  const ctx = canvas.getContext('2d')!
  const inkCanvas = document.createElement('canvas')
  const inkCtx = inkCanvas.getContext('2d')!
  let lastKey = ''
  return {
    render(state, cssWidth, cssHeight, pixelRatio = 1, theme = 'light') {
      if (cssWidth < 1 || cssHeight < 1) return
      const dpr = clamp(pixelRatio, 1, 2)
      const pixelWidth = Math.round(cssWidth * dpr)
      const pixelHeight = Math.round(cssHeight * dpr)
      const key = [pixelWidth, pixelHeight, state.rawTime, state.inkTime, state.opacity, theme].join(':')
      if (key === lastKey) return
      lastKey = key
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
        context.clearRect(0, 0, pixelWidth, pixelHeight)
        context.setTransform(k, 0, 0, k, tx, ty)
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
      for (const stroke of scene.strokes) {
        const visible = visibleInk(stroke.ink, state.inkTime)
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
            gradient.addColorStop(0, colorAt(a.s / scene.length, theme))
            gradient.addColorStop(1, colorAt(b.s / scene.length, theme))
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
    },
  }
}
