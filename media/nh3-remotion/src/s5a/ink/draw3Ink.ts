// S5-A 专用的软笔模拟：按软件 Draw3 的处理链路逐步复刻，让片中墨迹与软件内一致。
// 源码对照（D:\Project\Inkeys\Repo\Inkeys）：
// 1. 平滑：Ink Stroke Modeler 的弹簧阻尼位置模型（Draw3.InkPrediction.cpp:236，
//    spring_mass_constant = 11/32400、drag = 72），输入按直线插值、以 360Hz 输出（120 FPS 档）。
//    抬笔时按 ModelEndOfStroke 继续迭代追到抬笔点。
// 2. 笔宽：StrokeWidthEstimator::Append（Draw3.StrokeGeometry.cpp:525），
//    目标直径 = lerp(1.4D, 0.8D, smoothstep(原始输入速度 / 500))，60ms 指数低通，
//    再受 ClampRadiusTransition 的时间（每秒 3 倍基准）与距离（每像素 0.35）双重限速。
// 3. 实时笔锋：ApplyLiveTipTaper（同文件 :394），最近 55ms 的弧长，尖端倍率
//    1 − 0.7·smoothstep(弧长 / 4·最大半径)，沿弧长 smoothstep 过渡；随后 EnforceCapsuleTangency。
// 4. 绘制：inkPixelShader.hlsl 的不等半径胶囊并集。这里用两端圆加公切线四边形精确画出同一形状。
// 坐标单位是“屏幕逻辑像素”（96 DPI），绘制时整体缩放到画面上，速度阈值因此和软件一致。

export type RawSample = { x: number; y: number; t: number }
export type InkPoint = { x: number; y: number; r: number; t: number }

const OUTPUT_RATE = 360
const EXPECTED_SPEED = 500
const SPRING_MASS = 11 / 32400
const DRAG = 72
const WIDTH_TIME_CONSTANT = 0.06
const MAX_DIAMETER_CHANGE_PER_BASE_PER_SECOND = 3
const MAX_RADIUS_CHANGE_PER_PIXEL = 0.35
const CAPSULE_RADIUS_SLOPE = 0.95
export const LIVE_TIP_SECONDS = 0.055

const smooth = (v: number) => {
  const u = Math.min(1, Math.max(0, v))
  return u * u * (3 - 2 * u)
}
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

// ---------- 原始输入：由一条随时间变化的连续轨迹采样 ----------

/** 按设备采样率（默认 240Hz，接近笔和触控）采样一条连续轨迹 position(t)。 */
export function sampleRaw(position: (t: number) => readonly [number, number], duration: number, rate = 240): RawSample[] {
  const out: RawSample[] = []
  const count = Math.max(1, Math.round(duration * rate))
  for (let i = 0; i <= count; i++) {
    const t = (duration * i) / count
    const [x, y] = position(t)
    out.push({ x, y, t })
  }
  return out
}

// ---------- 建模：平滑位置 + 笔宽 ----------

export type ModeledStroke = {
  /** 每个输出点（360Hz），带时间；time 对应产生它的输入时刻。 */
  readonly points: InkPoint[]
  /** 抬笔后追到抬笔点的那几个点（只在笔迹写完后出现）。 */
  readonly ending: InkPoint[]
  readonly duration: number
  readonly base: number
}

/** base：基准直径（逻辑像素）。 */
export function modelStroke(raw: readonly RawSample[], base: number): ModeledStroke {
  const points: InkPoint[] = []
  let px = raw[0].x
  let py = raw[0].y
  let vx = 0
  let vy = 0
  let time = raw[0].t
  let diameter = base
  let lastX = px
  let lastY = py
  let lastT = time

  const widthStep = (x: number, y: number, t: number, inputSpeed: number) => {
    const target = lerp(1.4 * base, 0.8 * base, smooth(inputSpeed / EXPECTED_SPEED))
    const dt = Math.max(0, t - lastT)
    const alpha = Math.min(0.35, Math.max(0.02, 1 - Math.exp(-dt / WIDTH_TIME_CONSTANT)))
    const desired = lerp(diameter, target, alpha)
    const dist = Math.hypot(x - lastX, y - lastY)
    const maxDelta = Math.min(0.5 * base * MAX_DIAMETER_CHANGE_PER_BASE_PER_SECOND * dt, MAX_RADIUS_CHANGE_PER_PIXEL * dist)
    const r = diameter / 2 + Math.min(maxDelta, Math.max(-maxDelta, desired / 2 - diameter / 2))
    diameter = 2 * r
    lastX = x
    lastY = y
    lastT = t
    return r
  }

  const springStep = (ax: number, ay: number, t: number) => {
    const dt = t - time
    const accX = (ax - px) / SPRING_MASS - DRAG * vx
    const accY = (ay - py) / SPRING_MASS - DRAG * vy
    vx += dt * accX
    vy += dt * accY
    px += dt * vx
    py += dt * vy
    time = t
  }

  points.push({ x: px, y: py, r: base / 2, t: time })
  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1]
    const b = raw[i]
    const dt = b.t - a.t
    if (dt <= 0) continue
    const inputSpeed = Math.hypot(b.x - a.x, b.y - a.y) / dt // 笔宽用原始输入速度
    const n = Math.max(1, Math.ceil(dt * OUTPUT_RATE))
    for (let k = 1; k <= n; k++) {
      const u = k / n
      springStep(lerp(a.x, b.x, u), lerp(a.y, b.y, u), lerp(a.t, b.t, u))
      points.push({ x: px, y: py, r: widthStep(px, py, time, inputSpeed), t: time })
    }
  }

  // 抬笔：继续迭代追到最后一个输入点（ModelEndOfStroke，最多 20 次，越过时步长减半）。
  const ending: InkPoint[] = []
  const end = raw[raw.length - 1]
  let step = 1 / OUTPUT_RATE
  for (let i = 0; i < 20; i++) {
    const save = { px, py, vx, vy, time }
    springStep(end.x, end.y, time + step)
    const moved = Math.hypot(px - save.px, py - save.py)
    if (moved < 0.001) break
    // 若这一步越过了终点，撤回并减半步长。
    const sx = px - save.px
    const sy = py - save.py
    const proj = ((end.x - save.px) * sx + (end.y - save.py) * sy) / (sx * sx + sy * sy)
    if (proj < 1) {
      ;({ px, py, vx, vy, time } = save)
      step *= 0.5
      continue
    }
    ending.push({ x: px, y: py, r: diameter / 2, t: time })
    if (Math.hypot(px - end.x, py - end.y) < 0.001) break
  }
  return { points, ending, duration: end.t, base }
}

// ---------- 实时笔锋 ----------

/** 软件的 ApplyLiveTipTaper（笔仍在移动、age = 0 的情形），原地修改并返回。 */
function applyLiveTip(points: InkPoint[], seconds = LIVE_TIP_SECONDS): InkPoint[] {
  if (points.length < 2) return points
  const endTime = points[points.length - 1].t
  let first = points.length - 1
  while (first > 0 && points[first - 1].t >= endTime - seconds) first--
  let length = 0
  let refR = points[first].r
  for (let i = first + 1; i < points.length; i++) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    refR = Math.max(refR, points[i].r)
  }
  if (length <= 0 || refR <= 0) return points
  const tipScale = 1 - 0.7 * smooth(length / (4 * refR))
  let arc = 0
  for (let i = first + 1; i < points.length; i++) {
    arc += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    points[i].r *= lerp(1, tipScale, smooth(arc / length))
  }
  // EnforceCapsuleTangency：相邻两点半径差不超过距离的 0.95 倍，正反各扫一遍。
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    const m = CAPSULE_RADIUS_SLOPE * d
    points[i].r = points[i - 1].r + Math.min(m, Math.max(-m, points[i].r - points[i - 1].r))
  }
  for (let i = points.length - 1; i > 0; i--) {
    const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    const m = CAPSULE_RADIUS_SLOPE * d
    points[i - 1].r = points[i].r + Math.min(m, Math.max(-m, points[i - 1].r - points[i].r))
  }
  return points
}

/** 笔迹最前端笔锋段的起点下标（最近 55ms）。 */
export function liveTipStart(points: readonly InkPoint[], seconds = LIVE_TIP_SECONDS): number {
  const endTime = points[points.length - 1].t
  let first = points.length - 1
  while (first > 0 && points[first - 1].t >= endTime - seconds) first--
  return first
}

const copyUntil = (stroke: ModeledStroke, time: number) => stroke.points.filter((p) => p.t <= time).map((p) => ({ ...p }))

/** 在相邻两个输出点之间按时间插值出 time 时刻的点（没有落在区间内时返回 null）。 */
const pointAt = (points: readonly InkPoint[], time: number): InkPoint | null => {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (a.t < time && time < b.t) {
      const k = (time - a.t) / (b.t - a.t)
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), r: lerp(a.r, b.r, k), t: time }
    }
  }
  return null
}

/**
 * 写到 time（秒）这一刻屏幕上的笔迹。
 * - ahead > 0 时附加预测段（这里取真实的后续轨迹作为理想预测），笔锋按预测末端计算，和软件一致；
 * - time 超过时长即为抬笔后的成品：真实点 + 追到终点的点，再加笔锋。
 * 墨尖与预测末端都按精确时刻在相邻输出点之间插值：慢放时每帧只前进零点几个输出点，
 * 只取离散点会让墨尖和预测段长度在相邻点之间来回跳（用户反馈过预测尖头往复跳变）。
 * 返回全部点和真实/预测的分界下标。
 */
export function strokeAt(stroke: ModeledStroke, time: number, ahead = 0, taper = true): { points: InkPoint[]; realEnd: number } {
  // taper = false：不加实时笔锋（板书小字一笔很短，55ms 的收尖会盖住整笔，粗细就忽大忽小）。
  const tipOf = taper ? applyLiveTip : (pts: InkPoint[]) => pts
  if (time >= stroke.duration) {
    const points = tipOf([...stroke.points.map((p) => ({ ...p })), ...stroke.ending.map((p) => ({ ...p }))])
    return { points, realEnd: points.length - 1 }
  }
  const real = copyUntil(stroke, time)
  const tip = pointAt(stroke.points, time)
  if (tip) real.push(tip)
  const realEnd = real.length - 1
  let all = real
  if (ahead > 0) {
    const future = stroke.points.filter((p) => p.t > time && p.t <= time + ahead).map((p) => ({ ...p }))
    const end = pointAt(stroke.points, time + ahead)
    all = [...real, ...future, ...(end ? [end] : [])]
  }
  return { points: tipOf(all), realEnd }
}

// ---------- 绘制：不等半径胶囊的并集 ----------

const f = (n: number) => n.toFixed(3)

/**
 * 把点列变成一条 SVG 路径：每点一个圆，相邻两点之间是两圆的外公切线四边形（和着色器的胶囊同形）。
 * 圆和四边形统一成顺时针，nonzero 填充下互相叠加而不抵消。
 */
export function capsulePath(points: readonly InkPoint[]): string {
  let d = ''
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    d += `M${f(p.x - p.r)} ${f(p.y)}A${f(p.r)} ${f(p.r)} 0 1 1 ${f(p.x + p.r)} ${f(p.y)}A${f(p.r)} ${f(p.r)} 0 1 1 ${f(p.x - p.r)} ${f(p.y)}Z`
    if (i === 0) continue
    const q = points[i - 1]
    const dx = p.x - q.x
    const dy = p.y - q.y
    const dist = Math.hypot(dx, dy)
    if (dist < 1e-6 || Math.abs(q.r - p.r) >= dist) continue // 一圆包住另一圆时只剩大圆
    const ux = dx / dist
    const uy = dy / dist
    const b = (q.r - p.r) / dist
    const a = Math.sqrt(Math.max(0, 1 - b * b))
    const m1 = [b * ux - a * uy, b * uy + a * ux]
    const m2 = [b * ux + a * uy, b * uy - a * ux]
    let quad = [
      [q.x + q.r * m1[0], q.y + q.r * m1[1]],
      [p.x + p.r * m1[0], p.y + p.r * m1[1]],
      [p.x + p.r * m2[0], p.y + p.r * m2[1]],
      [q.x + q.r * m2[0], q.y + q.r * m2[1]],
    ]
    let area = 0
    for (let k = 0; k < 4; k++) area += quad[k][0] * quad[(k + 1) % 4][1] - quad[(k + 1) % 4][0] * quad[k][1]
    if (area < 0) quad = quad.reverse()
    d += `M${f(quad[0][0])} ${f(quad[0][1])}L${f(quad[1][0])} ${f(quad[1][1])}L${f(quad[2][0])} ${f(quad[2][1])}L${f(quad[3][0])} ${f(quad[3][1])}Z`
  }
  return d
}
