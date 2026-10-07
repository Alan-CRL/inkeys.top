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
  kind: 'sweep' | 'turn'
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
  const velocity = bezier(derivatives(points), t)
  const magnitude = Math.hypot(velocity.x, velocity.y) || 1
  return { tangent: { x: velocity.x / magnitude, y: velocity.y / magnitude } }
}

/** 局部纯几何接口供遮罩与命令行验证共用；曲线数据不参与页面公共 API。 */
export function createEraserRoute(width: number, height: number) {
  const insetX = Math.min(height * 0.16, width * 0.16)
  const insetY = height * 0.03
  const innerWidth = width - insetX * 2
  const innerHeight = height - insetY * 2
  const slant = innerWidth * 0.5
  const lanes = Math.max(11, 2 * Math.ceil((innerWidth + slant) / (height * 0.42) / 2) + 1)
  const lanesData: Array<{ start: Point, end: Point }> = []
  const diagonalLength = Math.hypot(slant, innerHeight)
  const up = { x: slant / diagonalLength, y: -innerHeight / diagonalLength }
  const normal = { x: -up.y, y: up.x }
  const project = (p: Point) => p.x * up.x + p.y * up.y
  const shift = (p: Point, along: number) => ({ x: p.x + up.x * along, y: p.y + up.y * along })
  // 每个斜带只挥动一次；相邻带间距与光标直径相配，不再过密往返。
  for (let lane = 0; lane < lanes - 1; lane++) {
    const offset = (innerWidth + slant) * (lane + 0.5) / (lanes - 1)
    const top = { x: insetX + Math.min(innerWidth, offset), y: insetY + Math.max(0, offset - innerWidth) / slant * innerHeight }
    const bottom = { x: insetX + Math.max(0, offset - slant), y: insetY + Math.min(1, offset / slant) * innerHeight }
    const [start, end] = lane % 2 ? [top, bottom] : [bottom, top]
    lanesData.push({ start, end })
  }
  // 折返的两端先投到同一沿笔方向位置，形成宽半圆，而不是斜错位后强拧成尖弯。
  for (let index = 0; index < lanesData.length - 1; index++) {
    const current = lanesData[index]
    const next = lanesData[index + 1]
    const outward = index % 2 ? -1 : 1
    const gap = Math.abs((next.start.x - current.end.x) * normal.x + (next.start.y - current.end.y) * normal.y)
    const along = (outward > 0 ? Math.min(project(current.end), project(next.start)) : Math.max(project(current.end), project(next.start))) - outward * gap * 0.22
    current.end = shift(current.end, along - project(current.end))
    next.start = shift(next.start, along - project(next.start))
  }
  // 首个下回身略向下舒展，擦到大写 I 左下方的激光外扩；不追加外围补擦或放大整个光标。
  lanesData[1].end.y += height * 0.05
  lanesData[2].start.y += height * 0.05
  const curves: RouteCurve[] = []
  for (let index = 0; index < lanesData.length; index++) {
    const { start, end } = lanesData[index]
    const length = Math.hypot(end.x - start.x, end.y - start.y)
    const bow = Math.min(height * 0.025, length * 0.045)
    const leg: RouteCurve = { kind: 'sweep', points: [start, { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - bow * 2 }, end] }
    curves.push(leg)
    const next = lanesData[index + 1]
    if (!next) continue
    const nextLength = Math.hypot(next.end.x - next.start.x, next.end.y - next.start.y)
    const nextBow = Math.min(height * 0.025, nextLength * 0.045)
    const nextPoints = [next.start, { x: (next.start.x + next.end.x) / 2, y: (next.start.y + next.end.y) / 2 - nextBow * 2 }, next.end]
    const from = endpoint(leg.points, 1).tangent
    const to = endpoint(nextPoints, 0).tangent
    const handle = Math.hypot(next.start.x - end.x, next.start.y - end.y) * 0.65
    // 单个宽圆弧回身；两端保持切向连续，内部曲率另行约束，避免仅接头平滑却弯内近尖点。
    curves.push({ kind: 'turn', points: [end,
      { x: end.x + from.x * handle, y: end.y + from.y * handle },
      { x: next.start.x - to.x * handle, y: next.start.y - to.y * handle }, next.start] })
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
      const previous = guide[guide.length - 1]
      guide.push({ ...p, curvature, speed: Math.max(0.12, 1 / Math.sqrt(1 + height * curvature * 5)), cost: 0,
        length: previous ? previous.length + Math.hypot(p.x - previous.x, p.y - previous.y) : 0 })
    }
  }
  // 先按法向加速度限制弯内速度，再双向约束切向加速度；减速从入弯前开始。
  const nominalSpeed = height * 2
  const acceleration = height * 9
  for (const p of guide) p.speed = Math.min(nominalSpeed, Math.sqrt(height * 5.5 / Math.max(p.curvature, 1e-8)))
  guide[0].speed = 0
  guide[guide.length - 1].speed = 0
  for (const direction of [1, -1]) {
    const first = direction > 0 ? 1 : guide.length - 2
    const end = direction > 0 ? guide.length : -1
    for (let index = first; index !== end; index += direction) {
      const current = guide[index]
      const previous = guide[index - direction]
      const distance = Math.abs(current.length - previous.length)
      current.speed = Math.min(current.speed, Math.sqrt(previous.speed ** 2 + 2 * acceleration * distance))
    }
  }
  for (let index = 1; index < guide.length; index++) {
    const p = guide[index]
    const previous = guide[index - 1]
    p.cost = previous.cost + 2 * (p.length - previous.length) / (p.speed + previous.speed || 1)
  }
  return { curves, guide }
}

function buildSweep(width: number, height: number) {
  const { guide } = createEraserRoute(width, height)
  const total = guide[guide.length - 1].cost
  const cursors: Cursor[] = []
  const paths: string[] = []
  const dt = ERASE_SECONDS / (STEPS * SUBSTEPS)
  const base = height * 0.18 + 1
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
    const direction = (at: number) => {
      const before = guide[Math.max(0, at - 1)]
      const after = guide[Math.min(guide.length - 1, at + 1)]
      const length = Math.hypot(after.x - before.x, after.y - before.y) || 1
      return { x: (after.x - before.x) / length, y: (after.y - before.y) / length }
    }
    const from = direction(index - 1)
    const to = direction(index)
    const span = b.cost - a.cost
    const t2 = fraction * fraction
    const t3 = t2 * fraction
    const interpolate = (axis: 'x' | 'y') => (2 * t3 - 3 * t2 + 1) * a[axis] + (t3 - 2 * t2 + fraction) * from[axis] * a.speed * span
      + (-2 * t3 + 3 * t2) * b[axis] + (t3 - t2) * to[axis] * b.speed * span
    const x = interpolate('x')
    const y = interpolate('y')
    if (previous) {
      const measured = Math.hypot(x - previous.x, y - previous.y) / dt
      speed += (measured - speed) * (1 - Math.exp(-dt / 0.12))
      const target = base * (1 + 0.35 * clamp((speed / (guide[guide.length - 1].length / ERASE_SECONDS) - 0.45) / 0.95))
      decreaseTime = target < radius ? decreaseTime + dt : 0
      // 借鉴原生速度橡皮的增长/保持/慢回落：转弯短暂减速先保持，避免每次折返都迅速变细。
      if (target >= radius || decreaseTime > 0.3) {
        radius += (target - radius) * (1 - Math.exp(-dt / (target >= radius ? 0.2 : 0.85)))
      }
    }
    const cursor = { x, y, radius }
    chunk += previous ? sweep(previous, cursor) : circle(cursor)
    previous = cursor
    cursors.push(cursor)
    // 蒙版保留不可变 120Hz 块；光标独立保存 480Hz 细采样，显示时按真实时间插值。
    if (step % SUBSTEPS === 0) {
      paths.push(chunk)
      chunk = ''
    }
  }
  return { cursors, paths }
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
  const precise = time * SUBSTEPS
  const fineIndex = Math.min(STEPS * SUBSTEPS, Math.floor(precise))
  const from = cached.cursors[fineIndex]
  const to = cached.cursors[Math.min(fineIndex + 1, cached.cursors.length - 1)]
  const fraction = precise - fineIndex
  const cursor = { x: mix(from.x, to.x, fraction), y: mix(from.y, to.y, fraction), radius: mix(from.radius, to.radius, fraction) }
  const paths = time === 0 ? [] : cached.paths.slice(0, index + 1)
  // 诊断整条路径时才拼接；正常渲染只消费新块，避免缓存数百条巨大累计字符串。
  return { get path() { return paths.join('') }, paths, cursor }
}
