// 软笔模型：按软件的规则计算（源码 Draw3.StrokeGeometry.cpp / Draw3.InkPrediction.cpp，
// 调查记录见 .trellis/tasks/11-16-new-index3-s1-card-motion/research/codex-ui-survey-result.md 第 4 节）。
//
// 1. 粗细随速度：慢则粗（1.4 倍），快则细（0.8 倍），经过 60ms 的低通。
// 2. 起笔没有渐粗：先保持基准粗细，再跟随速度。
// 3. 实时笔锋：笔迹最前端最近 55ms 走过的那一段沿弧长收细，尖端最低到 30%。
//    每一帧都按“写到此刻为止”重新计算，所以书写过程中笔锋一直跟在最前端。

import type { Sample } from './path'

export type Dot = { x: number; y: number; r: number }

export type SoftStroke = {
  samples: Sample[]
  /** 每个采样点处、还没有加笔锋的半径。 */
  radii: number[]
  duration: number
}

export type SoftPenOptions = {
  /** 基准直径。 */
  base: number
  /** “预期速度”：达到这个速度时笔迹最细。软件里是 3 单位粗细配 500 像素每秒。 */
  expectedSpeed: number
}

const TAPER_WINDOW = 0.055
const WIDTH_TIME_CONSTANT = 0.06

const smooth = (u: number) => {
  const v = Math.min(1, Math.max(0, u))
  return v * v * (3 - 2 * v)
}

export function buildSoftStroke(samples: Sample[], { base, expectedSpeed }: SoftPenOptions): SoftStroke {
  const radii: number[] = []
  let width = base
  for (let i = 0; i < samples.length; i++) {
    if (i > 0) {
      const dt = samples[i].t - samples[i - 1].t
      const dist = Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y)
      if (dt > 0) {
        const target = 1.4 * base + (0.8 * base - 1.4 * base) * smooth(dist / dt / expectedSpeed)
        const alpha = Math.min(0.35, Math.max(0.02, dt / WIDTH_TIME_CONSTANT))
        let next = width + (target - width) * alpha
        // 半径变化同时受时间和距离限制：每秒最多 1.5 倍基准，每像素最多 0.35。
        const limit = 2 * Math.min(1.5 * base * dt, 0.35 * dist)
        next = Math.min(width + limit, Math.max(width - limit, next))
        width = next
      }
    }
    radii.push(width / 2)
  }
  return { samples, radii, duration: samples[samples.length - 1].t }
}

/** 写到 time（秒）这一刻的笔迹；time 超过笔迹时长后就是抬笔后的成品。 */
export function softStrokeAt(stroke: SoftStroke, time: number): Dot[] {
  const { samples, radii } = stroke
  if (time <= 0) return []
  const now = Math.min(time, stroke.duration)

  // 取到当前时刻为止的采样点，最后一个点按时间插值，保证每帧的笔尖位置连续。
  const dots: (Dot & { t: number })[] = []
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    if (s.t <= now) {
      dots.push({ x: s.x, y: s.y, r: radii[i], t: s.t })
      continue
    }
    const p = samples[i - 1]
    const k = (now - p.t) / (s.t - p.t)
    if (k > 1e-3) dots.push({ x: p.x + (s.x - p.x) * k, y: p.y + (s.y - p.y) * k, r: radii[i - 1] + (radii[i] - radii[i - 1]) * k, t: now })
    break
  }
  if (dots.length < 2) return dots

  // 实时笔锋：最近 55ms 走过的那一段。
  const end = dots[dots.length - 1]
  let first = dots.length - 1
  while (first > 0 && end.t - dots[first - 1].t <= TAPER_WINDOW) first--
  const distance = new Array<number>(dots.length - first).fill(0)
  let length = 0
  for (let i = dots.length - 1; i > first; i--) {
    length += Math.hypot(dots[i].x - dots[i - 1].x, dots[i].y - dots[i - 1].y)
    distance[i - 1 - first] = length
  }
  if (length > 0) {
    const tip = 1 - 0.7 * smooth(length / (4 * end.r))
    for (let i = first; i < dots.length; i++) dots[i].r *= tip + (1 - tip) * smooth(distance[i - first] / length)
  }
  return dots
}

/**
 * 把带半径的点变成两条路径：每个点一个圆，相邻两点之间一个梯形。
 * 分成两条是为了让每条路径内部的绕向一致，重叠处不会互相抵消；两条叠在一起就是完整的笔迹。
 */
export function dotsToPaths(dots: readonly Dot[]): { circles: string; joints: string } {
  const f = (n: number) => n.toFixed(2)
  let circles = ''
  let joints = ''
  for (let i = 0; i < dots.length; i++) {
    const p = dots[i]
    circles += `M${f(p.x - p.r)} ${f(p.y)}a${f(p.r)} ${f(p.r)} 0 1 0 ${f(2 * p.r)} 0a${f(p.r)} ${f(p.r)} 0 1 0 ${f(-2 * p.r)} 0Z`
    if (i === 0) continue
    const q = dots[i - 1]
    const dx = p.x - q.x
    const dy = p.y - q.y
    const dist = Math.hypot(dx, dy)
    if (dist < 1e-3) continue
    const nx = -dy / dist
    const ny = dx / dist
    joints += `M${f(q.x + nx * q.r)} ${f(q.y + ny * q.r)}L${f(p.x + nx * p.r)} ${f(p.y + ny * p.r)}L${f(p.x - nx * p.r)} ${f(p.y - ny * p.r)}L${f(q.x - nx * q.r)} ${f(q.y - ny * q.r)}Z`
  }
  return { circles, joints }
}
