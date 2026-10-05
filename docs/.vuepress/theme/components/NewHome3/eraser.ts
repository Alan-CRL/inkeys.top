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

interface GuidePoint {
  x: number
  y: number
  cost: number
}

const DURATION = 2.8
const STEPS = 336
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

function buildSweep(width: number, height: number) {
  const guide: GuidePoint[] = []
  const insetX = Math.min(height * 0.13, width * 0.16)
  const insetY = height * 0.03
  const innerWidth = width - insetX * 2
  const innerHeight = height - insetY * 2
  const slant = innerWidth * 0.5
  const lanes = Math.max(13, 2 * Math.ceil((innerWidth + slant) / (height * 0.27) / 2) + 1)
  const add = (x: number, y: number, speed = 1) => {
    const previous = guide.at(-1)
    guide.push({ x, y, cost: previous ? previous.cost + Math.hypot(x - previous.x, y - previous.y) / speed : 0 })
  }
  const vertices: Array<{ x: number, y: number }> = []
  // 斜向弧线由左向右推进：两端自然缩短，中段形成完整的右上/左下擦拭，不沿水平行扫描。
  for (let lane = 0; lane < lanes; lane++) {
    const offset = (innerWidth + slant) * lane / (lanes - 1)
    const top = { x: insetX + Math.min(innerWidth, offset), y: insetY + Math.max(0, offset - innerWidth) / slant * innerHeight }
    const bottom = { x: insetX + Math.max(0, offset - slant), y: insetY + Math.min(1, offset / slant) * innerHeight }
    for (const p of lane % 2 ? [bottom, top] : [top, bottom]) {
      const previous = vertices.at(-1)
      if (!previous || Math.hypot(p.x - previous.x, p.y - previous.y) > 0.01) vertices.push(p)
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
  add(vertices[0].x, vertices[0].y)
  for (let index = 1; index < vertices.length; index++) {
    const start = corners[index - 1].after
    const end = corners[index].before
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    const diagonal = Math.abs(dx) > width * 0.08 && Math.abs(dy) > height * 0.2
    // 弧腹在端点处的一阶导数为零，与折返圆角严格共切；每次挥动略有不同，避免平行尺规感。
    const bow = diagonal ? Math.min(height * (0.10 + 0.018 * Math.sin(index * 0.9)), length * 0.13) : 0
    const sign = dy < 0 ? -1 : 1
    for (let step = 1; step <= 64; step++) {
      const u = step / 64
      const curve = Math.sin(Math.PI * u) ** 2 * bow * sign
      add(mix(start.x, end.x, u) + dy / (length || 1) * curve,
        mix(start.y, end.y, u) - dx / (length || 1) * curve,
        diagonal ? 0.32 + 0.68 * Math.sin(Math.PI * u) ** 0.75 : 0.3)
    }
    if (index === vertices.length - 1) continue
    const control = vertices[index]
    const after = corners[index].after
    // 二次圆角保持在端点包围范围内，不把光标甩到窄屏外；转身减速后再开始下一挥。
    for (let step = 1; step <= 24; step++) {
      const u = step / 24
      const v = 1 - u
      add(end.x * v * v + 2 * control.x * v * u + after.x * u * u,
        end.y * v * v + 2 * control.y * v * u + after.y * u * u,
        0.24 + 0.08 * Math.abs(2 * u - 1))
    }
  }
  const total = guide.at(-1)!.cost
  const cursors: Cursor[] = []
  const prefixes: string[] = []
  const paths: string[] = []
  const dt = DURATION / (STEPS * SUBSTEPS)
  const base = height * 0.14 + 1
  let radius = base
  let speed = total / DURATION * 0.5
  let decreaseTime = 0
  let index = 1
  let previous: Cursor | undefined
  let chunk = ''
  for (let step = 0; step <= STEPS * SUBSTEPS; step++) {
    const progress = step / (STEPS * SUBSTEPS)
    const cost = total * (0.5 * progress + 0.5 * progress * progress)
    while (index < guide.length - 1 && guide[index].cost < cost) index++
    const a = guide[index - 1]
    const b = guide[index]
    const fraction = clamp((cost - a.cost) / (b.cost - a.cost || 1))
    const x = mix(a.x, b.x, fraction)
    const y = mix(a.y, b.y, fraction)
    if (previous) {
      const measured = Math.hypot(x - previous.x, y - previous.y) / dt
      speed += (measured - speed) * (1 - Math.exp(-dt / 0.12))
      const target = base * (1 + 0.35 * clamp((speed / (total / DURATION) - 0.45) / 0.95))
      decreaseTime = target < radius ? decreaseTime + dt : 0
      // 借鉴原生速度橡皮的增长/保持/慢回落：转弯短暂减速先保持，避免每次折返都迅速变细。
      if (target >= radius || decreaseTime > 0.3) {
        radius += (target - radius) * (1 - Math.exp(-dt / (target >= radius ? 0.2 : 0.85)))
      }
    }
    const cursor = { x, y, radius }
    chunk += previous ? sweep(previous, cursor) : circle(cursor)
    previous = cursor
    // 几何细分到 480Hz，再按 120Hz 固定块显现；转弯不切角，SVG 节点数仍至多 337 个。
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
