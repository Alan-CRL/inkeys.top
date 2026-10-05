interface Cursor {
  x: number
  y: number
  radius: number
}

interface EraserFrame {
  path: string
  paths: readonly string[]
  cursor: Cursor
}

interface Point { x: number, y: number }

interface GuidePoint extends Point {
  cost: number
  length: number
  curvature: number
  speed: number
}

interface RouteCurve {
  kind: 'sweep' | 'connector' | 'turn'
  points: Point[]
}

export const ERASE_SECONDS = 4.8
const STEPS = Math.round(ERASE_SECONDS * 120)
const SUBSTEPS = 4
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const number = (value: number) => value.toFixed(3)
const point = (x: number, y: number) => `${number(x)} ${number(y)}`

function circle(cursor: Cursor) {
  const { x, y } = cursor
  // 半径与直径必须先统一取整：分别取整会让接近半圆的 SVG 弧被纠正为偏心大弧。
  const r = Math.round(cursor.radius * 1000) / 1000
  return `M${point(x + r, y)}a${point(r, r)} 0 1 1 ${point(-r * 2, 0)}a${point(r, r)} 0 1 1 ${point(r * 2, 0)}Z`
}

function sweep(a: Cursor, b: Cursor) {
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  if (length < 0.0001) return circle(b)
  if (Math.abs(b.radius - a.radius) >= length) return circle(a.radius > b.radius ? a : b)
  const dx = (b.x - a.x) / length
  const dy = (b.y - a.y) / length
  const slope = (a.radius - b.radius) / length
  const normal = Math.sqrt(1 - slope * slope)
  const ax = dx * slope + dy * normal
  const ay = dy * slope - dx * normal
  const bx = dx * slope - dy * normal
  const by = dy * slope + dx * normal
  const arc = (cursor: Cursor, from: number, to: number) => {
    const angle = (to - from + Math.PI * 2) % (Math.PI * 2)
    const count = Math.ceil(angle / (Math.PI / 2))
    let commands = ''
    for (let i = 0; i < count; i++) {
      const start = from + angle * i / count
      const end = from + angle * (i + 1) / count
      const k = 4 / 3 * Math.tan((end - start) / 4)
      const { x, y, radius: r } = cursor
      commands += `C${point(x + r * (Math.cos(start) - k * Math.sin(start)), y + r * (Math.sin(start) + k * Math.cos(start)))} ${point(x + r * (Math.cos(end) + k * Math.sin(end)), y + r * (Math.sin(end) - k * Math.cos(end)))} ${point(x + r * Math.cos(end), y + r * Math.sin(end))}`
    }
    return commands
  }
  const from = Math.atan2(ay, ax)
  const to = Math.atan2(by, bx)
  // 每段是单个公切线胶囊轮廓，避免圆盘+四边形的重合边缘在 Canvas 抗锯齿时重复计入覆盖率。
  return `M${point(a.x + ax * a.radius, a.y + ay * a.radius)}L${point(b.x + ax * b.radius, b.y + ay * b.radius)}${arc(b, from, to)}L${point(a.x + bx * a.radius, a.y + by * a.radius)}${arc(a, to, from)}Z`
}

function bezier(points: readonly Point[], t: number): Point {
  const work = points.map(p => ({ ...p }))
  for (let count = work.length - 1; count > 0; count--) {
    for (let i = 0; i < count; i++) work[i] = { x: mix(work[i].x, work[i + 1].x, t), y: mix(work[i].y, work[i + 1].y, t) }
  }
  return work[0]
}

function derivatives(points: readonly Point[]) {
  return points.slice(1).map((p, index) => ({ x: (p.x - points[index].x) * (points.length - 1), y: (p.y - points[index].y) * (points.length - 1) }))
}

function endpoint(points: readonly Point[], t: number) {
  const first = derivatives(points)
  const velocity = bezier(first, t)
  const acceleration = bezier(derivatives(first), t)
  const magnitude = Math.hypot(velocity.x, velocity.y) || 1
  const tangent = { x: velocity.x / magnitude, y: velocity.y / magnitude }
  const along = tangent.x * acceleration.x + tangent.y * acceleration.y
  return { tangent, curvature: { x: (acceleration.x - tangent.x * along) / magnitude ** 2, y: (acceleration.y - tangent.y * along) / magnitude ** 2 } }
}

/** 局部纯几何接口供遮罩与命令行验证共用；曲线数据不参与页面公共 API。 */
export function createEraserRoute(width: number, height: number) {
  const insetX = Math.min(height * 0.13, width * 0.16)
  const insetY = height * 0.03
  const innerWidth = width - insetX * 2
  const innerHeight = height - insetY * 2
  const slant = innerWidth * 0.5
  const lanes = Math.max(13, 2 * Math.ceil((innerWidth + slant) / (height * 0.27) / 2) + 1)
  const vertices: Array<{ x: number, y: number }> = []
  const strokeEnds = new Set<number>()
  // 斜向弧线由左向右推进：两端自然缩短，中段形成完整的右上/左下擦拭，不沿水平行扫描。
  for (let lane = 0; lane < lanes; lane++) {
    const offset = (innerWidth + slant) * lane / (lanes - 1)
    const top = { x: insetX + Math.min(innerWidth, offset), y: insetY + Math.max(0, offset - innerWidth) / slant * innerHeight }
    const bottom = { x: insetX + Math.max(0, offset - slant), y: insetY + Math.min(1, offset / slant) * innerHeight }
    for (const [within, p] of (lane % 2 ? [bottom, top] : [top, bottom]).entries()) {
      const previous = vertices.at(-1)
      if (!previous || Math.hypot(p.x - previous.x, p.y - previous.y) > 0.01) {
        if (within === 1 && previous) strokeEnds.add(vertices.length)
        vertices.push(p)
      }
    }
  }
  const corners = vertices.map((p, index) => {
    const previous = vertices[Math.max(0, index - 1)]
    const next = vertices[Math.min(vertices.length - 1, index + 1)]
    const incoming = Math.hypot(p.x - previous.x, p.y - previous.y)
    const outgoing = Math.hypot(next.x - p.x, next.y - p.y)
    const trim = Math.min(height * 0.13, incoming * 0.44, outgoing * 0.44)
    return {
      before: { x: p.x - (p.x - previous.x) / (incoming || 1) * trim, y: p.y - (p.y - previous.y) / (incoming || 1) * trim },
      after: { x: p.x + (next.x - p.x) / (outgoing || 1) * trim, y: p.y + (next.y - p.y) / (outgoing || 1) * trim },
    }
  })
  const legs: RouteCurve[] = []
  for (let index = 1; index < vertices.length; index++) {
    const start = corners[index - 1].after
    const end = corners[index].before
    const length = Math.hypot(end.x - start.x, end.y - start.y)
    const diagonal = Math.abs(end.x - start.x) > width * 0.08 && Math.abs(end.y - start.y) > height * 0.2
    const bow = diagonal ? Math.min(height * (0.09 + 0.012 * Math.sin(index * 0.9)), length * 0.10) : 0
    // 二次弧控制点始终在弦的屏幕上方，两个方向的挥动均上拱，整段不引入 S 形反曲。
    legs.push({ kind: strokeEnds.has(index) ? 'sweep' : 'connector', points: [start, { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - bow * 2 }, end] })
  }
  const strokes = legs.filter((leg, index) => leg.kind === 'sweep' || index === 0 || index === legs.length - 1)
  const curves: RouteCurve[] = []
  for (let index = 0; index < strokes.length; index++) {
    const leg = strokes[index]
    curves.push(leg)
    const next = strokes[index + 1]
    if (!next) continue
    const start = leg.points.at(-1)!
    const end = next.points[0]
    const from = endpoint(leg.points, 1)
    const to = endpoint(next.points, 0)
    const edgeReturn = Math.abs(end.x - start.x) < height * 0.04
      && (Math.min(start.x, end.x) > width * 0.8 || Math.max(start.x, end.x) < width * 0.2)
    // 两侧回身收小控制臂，完整圆形光标在最大视差下仍留在窄屏内；仍匹配同一切向与曲率。
    const handle = Math.min(height * 0.60, Math.hypot(end.x - start.x, end.y - start.y) * 2.1) * (edgeReturn ? 0.65 : 1)
    const p1 = { x: start.x + from.tangent.x * handle / 5, y: start.y + from.tangent.y * handle / 5 }
    const p4 = { x: end.x - to.tangent.x * handle / 5, y: end.y - to.tangent.y * handle / 5 }
    // 五次连接弧同时匹配单位切向和弧长曲率；不再把弯曲长弧接到直线圆角上。
    const p2 = { x: 2 * p1.x - start.x + from.curvature.x * handle ** 2 / 20, y: 2 * p1.y - start.y + from.curvature.y * handle ** 2 / 20 }
    const p3 = { x: 2 * p4.x - end.x + to.curvature.x * handle ** 2 / 20, y: 2 * p4.y - end.y + to.curvature.y * handle ** 2 / 20 }
    curves.push({ kind: 'turn', points: [start, p1, p2, p3, p4, end] })
  }
  const guide: GuidePoint[] = []
  for (const curve of curves) {
    const first = derivatives(curve.points)
    const second = derivatives(first)
    const count = curve.kind === 'turn' ? 96 : 128
    for (let step = guide.length ? 1 : 0; step <= count; step++) {
      const t = step / count
      const p = bezier(curve.points, t)
      const velocity = bezier(first, t)
      const acceleration = bezier(second, t)
      const curvature = Math.abs(velocity.x * acceleration.y - velocity.y * acceleration.x) / Math.max(1e-8, Math.hypot(velocity.x, velocity.y) ** 3)
      const previous = guide.at(-1)
      guide.push({ ...p, curvature, speed: Math.max(0.12, 1 / Math.sqrt(1 + height * curvature * 5)), cost: 0,
        length: previous ? previous.length + Math.hypot(p.x - previous.x, p.y - previous.y) : 0 })
    }
  }
  // 沿弧长双向平滑目标速度，使减速先于折返发生；不存在全程不断加速的额外时间映射。
  for (const direction of [1, -1]) {
    const first = direction > 0 ? 1 : guide.length - 2
    const end = direction > 0 ? guide.length : -1
    for (let index = first; index !== end; index += direction) {
      const current = guide[index]
      const previous = guide[index - direction]
      const weight = 1 - Math.exp(-Math.abs(current.length - previous.length) / (height * 0.025))
      current.speed = mix(previous.speed, current.speed, weight)
    }
  }
  const length = guide.at(-1)!.length
  for (let index = 0; index < guide.length; index++) {
    const p = guide[index]
    const edge = Math.min(p.length, length - p.length)
    p.speed *= Math.max(0.035, Math.sqrt(clamp(edge / (height * 0.22))))
    if (index) {
      const previous = guide[index - 1]
      p.cost = previous.cost + (p.length - previous.length) / ((p.speed + previous.speed) / 2)
    }
  }
  return { curves, guide }
}

function buildSweep(width: number, height: number) {
  const { guide } = createEraserRoute(width, height)
  const total = guide.at(-1)!.cost
  const cursors: Cursor[] = []
  const prefixes: string[] = []
  const paths: string[] = []
  const dt = ERASE_SECONDS / (STEPS * SUBSTEPS)
  const base = height * 0.14 + 1
  let radius = base
  let speed = 0
  let decreaseTime = 0
  let index = 1
  let previous: Cursor | undefined
  let chunk = ''
  for (let step = 0; step <= STEPS * SUBSTEPS; step++) {
    const progress = step / (STEPS * SUBSTEPS)
    const cost = total * progress
    while (index < guide.length - 1 && guide[index].cost < cost) index++
    const a = guide[index - 1]
    const b = guide[index]
    const fraction = clamp((cost - a.cost) / (b.cost - a.cost || 1))
    const x = mix(a.x, b.x, fraction)
    const y = mix(a.y, b.y, fraction)
    if (previous) {
      const measured = Math.hypot(x - previous.x, y - previous.y) / dt
      speed += (measured - speed) * (1 - Math.exp(-dt / 0.12))
      const target = base * (1 + 0.35 * clamp((speed / (guide.at(-1)!.length / ERASE_SECONDS) - 0.45) / 0.95))
      decreaseTime = target < radius ? decreaseTime + dt : 0
      // 借鉴原生速度橡皮的增长/保持/慢回落：转弯短暂减速先保持，避免每次折返都迅速变细。
      if (target >= radius || decreaseTime > 0.3) {
        radius += (target - radius) * (1 - Math.exp(-dt / (target >= radius ? 0.2 : 0.85)))
      }
    }
    const cursor = { x, y, radius }
    chunk += previous ? sweep(previous, cursor) : circle(cursor)
    previous = cursor
    // 几何细分到 480Hz，再按 120Hz 固定块显现；转弯不切角，SVG 节点数随演示时长有界。
    if (step % SUBSTEPS === 0) {
      cursors.push(cursor)
      paths.push(chunk)
      prefixes.push((prefixes.at(-1) || '') + chunk)
      chunk = ''
    }
  }
  return { cursors, prefixes, paths }
}

// 只保留最近两种尺寸；所有帧按固定时间采样重建，跳帧、暂停和定格回退均不依赖上次画面。
const cache = new Map<string, ReturnType<typeof buildSweep>>()

export function getEraserFrame(progress: number, width: number, height: number): EraserFrame {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return { path: '', paths: [], cursor: { x: 0, y: 0, radius: 0 } }
  }
  const key = `${width}:${height}`
  let cached = cache.get(key)
  if (!cached) {
    cached = buildSweep(width, height)
    if (cache.size >= 2) cache.delete(cache.keys().next().value!)
    cache.set(key, cached)
  }
  const time = clamp(Number.isFinite(progress) ? progress : 0) * STEPS
  const index = Math.min(STEPS, Math.floor(time + 1e-9))
  const a = cached.cursors[index]
  if (time === 0) return { path: '', paths: [], cursor: { ...a } }
  // 120Hz 固定步长同时更新遮罩和光标；前缀只增不换，避免重算活动圆头产生边缘覆盖率回退。
  return { path: cached.prefixes[index], paths: cached.paths.slice(0, index + 1), cursor: { ...a } }
}
