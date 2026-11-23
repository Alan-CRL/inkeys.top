// 书写节奏：把一条路径变成“像人写的”原始输入（240Hz 采样），再交给 Draw3 墨迹模拟。
// 第七版起速度曲线做了两件事：加速度有上限（速度连续、不突变），再整体平滑一遍（加速度也连续）。
// 用户反馈过第六版“速度变化太快、有顿挫”，原因是弯直交界处速度阶跃。

import { modelStroke, sampleRaw, type ModeledStroke, type RawSample } from '../ink/draw3Ink'

export type P2 = readonly [number, number]

export const smooth01 = (v: number) => {
  const u = Math.min(1, Math.max(0, v))
  return u * u * (3 - 2 * u)
}

/** 折线按弧长等距重采样。 */
export function resample(points: readonly P2[], step: number): P2[] {
  const out: P2[] = [points[0]]
  let carry = 0
  for (let i = 1; i < points.length; i++) {
    let [ax, ay] = points[i - 1]
    const [bx, by] = points[i]
    let d = Math.hypot(bx - ax, by - ay)
    while (carry + d >= step) {
      const k = (step - carry) / d
      ax += (bx - ax) * k
      ay += (by - ay) * k
      out.push([ax, ay])
      d = Math.hypot(bx - ax, by - ay)
      carry = 0
    }
    carry += d
  }
  const last = points[points.length - 1]
  const tail = out[out.length - 1]
  if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > 0.01) out.push(last)
  return out
}

export type Pace = {
  /** 直的地方的速度、急弯处的速度（逻辑像素每秒）。 */
  readonly fast: number
  readonly slow: number
  /** 半径小于它的弯按急弯算。 */
  readonly bend?: number
  /** 起笔、收笔速度占正常速度的比例（收笔时笔仍在动，笔锋才收得自然）。 */
  readonly start?: number
  readonly end?: number
  /** 起笔加速、收笔减速各占多长的弧长。 */
  readonly inLen?: number
  readonly outLen?: number
  /** 加速度上限（逻辑像素每秒²），默认 6 倍 fast。 */
  readonly accel?: number
}

const boxSmooth = (v: readonly number[], win: number) => {
  const n = v.length
  const prefix = [0]
  for (let i = 0; i < n; i++) prefix.push(prefix[i] + v[i])
  return v.map((_, i) => {
    const a = Math.max(0, i - win)
    const b = Math.min(n - 1, i + win)
    return (prefix[b + 1] - prefix[a]) / (b - a + 1)
  })
}

/**
 * 弯处慢、直处快，起笔从慢到快，收笔略慢但不停。
 * 速度先按曲率求目标值，再做加速度限幅（正反各扫一次），最后平滑两遍。
 */
export function paced(points: readonly P2[], pace: Pace, t0 = 0): RawSample[] {
  const { fast, slow, bend = 120, start = 0.35, end = 0.75, inLen = 40, outLen = 50 } = pace
  const accel = pace.accel ?? 6 * fast
  const step = 2
  const line = resample(points, step)
  const n = line.length
  if (n < 3) {
    // 极短的一笔（点）：按慢速点一下。
    const dur = Math.max(0.03, (n - 1) * step / slow)
    return sampleRaw((t) => {
      const u = Math.min(1, t / dur)
      const a = line[0]
      const b = line[n - 1]
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]
    }, dur).map((s) => ({ ...s, t: s.t + t0 }))
  }
  const arc = [0]
  for (let i = 1; i < n; i++) arc.push(arc[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]))
  const total = arc[n - 1]
  const span = 6
  const target = line.map((p, i) => {
    const a = line[Math.max(0, i - span)]
    const b = line[Math.min(n - 1, i + span)]
    const ab = Math.hypot(b[0] - a[0], b[1] - a[1])
    const ap = Math.hypot(p[0] - a[0], p[1] - a[1])
    const pb = Math.hypot(b[0] - p[0], b[1] - p[1])
    const area = Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / 2
    const curvature = ab * ap * pb < 1e-6 ? 0 : (4 * area) / (ab * ap * pb)
    const v = fast + (slow - fast) * smooth01(curvature * bend)
    const env = (start + (1 - start) * smooth01(arc[i] / inLen)) * (end + (1 - end) * smooth01((total - arc[i]) / outLen))
    return v * env
  })
  // 加速度限幅：v² 每走 ds 最多变 2·a·ds。
  const v = boxSmooth(target, 6)
  for (let i = 1; i < n; i++) v[i] = Math.min(v[i], Math.sqrt(v[i - 1] * v[i - 1] + 2 * accel * (arc[i] - arc[i - 1])))
  for (let i = n - 2; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * accel * (arc[i + 1] - arc[i])))
  // 再平滑两遍，让加速度本身也连续。
  const sm = boxSmooth(boxSmooth(v, 10), 10)
  const time = [0]
  for (let i = 1; i < n; i++) time.push(time[i - 1] + (arc[i] - arc[i - 1]) / Math.max(1, (sm[i] + sm[i - 1]) / 2))
  const duration = time[n - 1]
  let k = 0
  return sampleRaw((t) => {
    while (k < n - 2 && time[k + 1] < t) k++
    while (k > 0 && time[k] > t) k--
    const u = time[k + 1] > time[k] ? Math.min(1, Math.max(0, (t - time[k]) / (time[k + 1] - time[k]))) : 0
    return [line[k][0] + (line[k + 1][0] - line[k][0]) * u, line[k][1] + (line[k + 1][1] - line[k][1]) * u]
  }, duration).map((s) => ({ ...s, t: s.t + t0 }))
}

export const cubic = (p0: P2, p1: P2, p2: P2, p3: P2, steps = 80): P2[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const m = 1 - t
    return [m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0], m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1]] as const
  })

/** 一笔：建模结果与它落笔的时刻（秒，相对所在镜头的书写起点）。 */
export type Timed = { readonly stroke: ModeledStroke; readonly at: number }

/** 一组笔画全部写完的时刻（秒）。 */
export const endOf = (list: readonly Timed[]) => list.reduce((m, s) => Math.max(m, s.at + s.stroke.duration), 0)

/** 一条路径直接建模成一笔。 */
export const strokeOf = (points: readonly P2[], pace: Pace, base: number) => modelStroke(paced(points, pace), base)
