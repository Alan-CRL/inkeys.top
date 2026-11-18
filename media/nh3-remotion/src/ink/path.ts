// 把一串控制点变成“像人写的”带时间采样点。
// 速度不是匀速：按人手运动的规律，弯得越急走得越慢（速度与曲率的 -1/3 次方成正比），
// 起笔从慢到快，收笔略慢但不停（笔还在动时抬起，笔锋才会留下）。

export type Point = readonly [number, number]
export type Sample = { x: number; y: number; t: number }

export type WriteOptions = {
  /** 这一笔总共写多久（秒）。 */
  duration: number
  /** 起笔速度占正常速度的比例。 */
  startSpeed?: number
  /** 收笔速度占正常速度的比例；小于 0.3 时接近停笔，笔锋会变短。 */
  endSpeed?: number
  /** 直线段的速度上限：把曲率下限设为 1 / 这个半径。 */
  straightRadius?: number
}

const smooth = (u: number) => {
  const v = Math.min(1, Math.max(0, u))
  return v * v * (3 - 2 * v)
}

// 向心 Catmull-Rom 样条，返回间距约 0.5 的折线。
function spline(points: readonly Point[]): Point[] {
  const out: Point[] = []
  const get = (i: number) => points[Math.min(points.length - 1, Math.max(0, i))]
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [get(i - 1), get(i), get(i + 1), get(i + 2)]
    const knot = (a: Point, b: Point) => Math.max(1e-4, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])))
    const t0 = 0
    const t1 = t0 + knot(p0, p1)
    const t2 = t1 + knot(p1, p2)
    const t3 = t2 + knot(p2, p3)
    const steps = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 0.5))
    for (let s = i === 0 ? 0 : 1; s <= steps; s++) {
      const t = t1 + ((t2 - t1) * s) / steps
      const mix = (a: Point, b: Point, ta: number, tb: number): Point => {
        const k = (t - ta) / (tb - ta)
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
      }
      const a1 = mix(p0, p1, t0, t1)
      const a2 = mix(p1, p2, t1, t2)
      const a3 = mix(p2, p3, t2, t3)
      const b1 = mix(a1, a2, t0, t2)
      const b2 = mix(a2, a3, t1, t3)
      out.push(mix(b1, b2, t1, t2))
    }
  }
  return out
}

export function writePath(points: readonly Point[], options: WriteOptions): Sample[] {
  const { duration, startSpeed = 0.35, endSpeed = 0.6, straightRadius = 260 } = options
  const line = spline(points)
  const count = line.length

  // 累计弧长。
  const length = [0]
  for (let i = 1; i < count; i++) length.push(length[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]))
  const total = length[count - 1]

  // 曲率：取前后各约 6 的三点求外接圆。
  const span = 12
  const curvature = line.map((p, i) => {
    const a = line[Math.max(0, i - span)]
    const b = line[Math.min(count - 1, i + span)]
    const ab = Math.hypot(b[0] - a[0], b[1] - a[1])
    const ap = Math.hypot(p[0] - a[0], p[1] - a[1])
    const pb = Math.hypot(b[0] - p[0], b[1] - p[1])
    const area = Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / 2
    return ab * ap * pb < 1e-6 ? 0 : (4 * area) / (ab * ap * pb)
  })

  // 速度：曲率的 -1/3 次方，再乘上起笔和收笔的包络。
  let speed = curvature.map((k, i) => {
    const base = Math.pow(Math.max(k, 1 / straightRadius), -1 / 3)
    const start = startSpeed + (1 - startSpeed) * smooth(length[i] / 36)
    const end = endSpeed + (1 - endSpeed) * smooth((total - length[i]) / 44)
    return base * start * end
  })
  // 平滑一下，避免速度突变。
  const window = 24
  speed = speed.map((_, i) => {
    let sum = 0
    let n = 0
    for (let j = Math.max(0, i - window); j <= Math.min(count - 1, i + window); j++) {
      sum += speed[j]
      n++
    }
    return sum / n
  })

  // 每一小段的用时，再整体缩放到指定时长。
  const time = [0]
  for (let i = 1; i < count; i++) time.push(time[i - 1] + (length[i] - length[i - 1]) / ((speed[i] + speed[i - 1]) / 2))
  const scale = duration / time[count - 1]

  // 按 8ms 重新采样，和真实输入设备的采样间隔接近。
  const samples: Sample[] = []
  const step = 0.008
  let cursor = 0
  for (let t = 0; t < duration; t += step) {
    while (cursor < count - 2 && time[cursor + 1] * scale < t) cursor++
    const t0 = time[cursor] * scale
    const t1 = time[cursor + 1] * scale
    const k = t1 > t0 ? (t - t0) / (t1 - t0) : 0
    samples.push({
      x: line[cursor][0] + (line[cursor + 1][0] - line[cursor][0]) * k,
      y: line[cursor][1] + (line[cursor + 1][1] - line[cursor][1]) * k,
      t,
    })
  }
  samples.push({ x: line[count - 1][0], y: line[count - 1][1], t: duration })
  return samples
}

// 手画的圈：从右上方起笔，逆时针一圈，收笔时顺着圆的走向越过起点一小段。
// 半径在途中略微变大，所以收笔那一段落在起笔的外侧，自然重叠。
export function loopPoints(options: { cx: number; cy: number; rx: number; ry: number; tilt?: number; overlap?: number; wobble?: number }): Point[] {
  const { cx, cy, rx, ry, tilt = -0.07, overlap = 30, wobble = 1 } = options
  const start = -52
  const sweep = 360 + overlap
  const cos = Math.cos(tilt)
  const sin = Math.sin(tilt)
  const points: Point[] = []
  const steps = Math.round(sweep / 26)
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const angle = ((start - sweep * u) * Math.PI) / 180
    // 手写的不规则：半径有两个很小的起伏，整体逐渐外扩 6%。
    const radius = 1 + 0.06 * u + wobble * (0.022 * Math.sin(2.3 * angle + 0.7) + 0.012 * Math.sin(4.1 * angle + 2))
    const x = Math.cos(angle) * rx * radius
    const y = Math.sin(angle) * ry * radius
    points.push([cx + x * cos - y * sin, cy + x * sin + y * cos])
  }
  return points
}
