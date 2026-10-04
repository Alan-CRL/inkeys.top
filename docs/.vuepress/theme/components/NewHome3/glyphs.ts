/** 同一套书写比例：基线 0、x 高度 100、大写/上伸 160、下伸 70，统一右倾。 */
export interface Point {
  x: number
  y: number
}

export interface Centerline {
  name: string
  points: Point[]
}

type Cubic = [number, number, number, number, number, number]

interface Gesture {
  name: string
  origin: number
  start: [number, number]
  curves: Cubic[]
}

const SLANT = 0.14
const SAMPLE_STEP = 0.8

// 各字共用基线、倾角和圆弧尺度；只有 k → e 保留自然连笔，y 与 s 各自收笔。
const gestures: Gesture[] = [
  {
    name: 'I',
    origin: 0,
    start: [6, -157],
    curves: [
      [20, -161, 49, -160, 61, -157],
      [51, -154, 41, -154, 33, -154],
      [33, -105, 28, -49, 24, -4],
      [16, -4, 8, -3, 4, 0],
      [22, 2, 45, 2, 64, 0],
    ],
  },
  {
    name: 'n',
    origin: 91,
    start: [12, -100],
    curves: [
      [10, -72, 8, -29, 8, 0],
      [13, -39, 26, -98, 57, -99],
      [88, -100, 70, -40, 74, -16],
      [77, 4, 91, 2, 103, -12],
    ],
  },
  {
    name: 'k-stem',
    origin: 209,
    start: [8, 0],
    curves: [
      [9, -46, 15, -130, 27, -151],
      [42, -178, 62, -141, 39, -99],
      [22, -65, 11, -28, 8, 0],
    ],
  },
  {
    // k 分两笔：开放的上臂只落到腰部一次，下臂自然带入 e，避免闭环与反复回描。
    name: 'ke',
    origin: 209,
    start: [72, -95],
    curves: [
      [60, -82, 40, -60, 26, -49],
      [43, -50, 53, -7, 78, -2],
      [91, 0, 101, -15, 112, -26],
      [134, -39, 166, -54, 166, -77],
      [166, -109, 127, -111, 117, -78],
      [106, -42, 115, -9, 140, -2],
      [160, 4, 175, -9, 183, -24],
    ],
  },
  {
    name: 'y',
    origin: 414,
    start: [12, -100],
    curves: [
      [6, -67, -4, -18, 15, -5],
      [40, 14, 62, -61, 65, -100],
      [63, -46, 56, 23, 40, 56],
      [25, 84, -1, 67, 8, 45],
      [18, 22, 45, 13, 72, -6],
    ],
  },
  {
    name: 's',
    origin: 516,
    start: [62, -88],
    curves: [
      [48, -110, 12, -102, 9, -78],
      [6, -59, 31, -52, 46, -39],
      [76, -12, 43, 13, 11, -4],
      [4, -8, 0, -13, -2, -18],
    ],
  },
]

export function buildCenterlines(): Centerline[] {
  return gestures.map(({ name, origin, start, curves }) => {
    const points: Point[] = [{ x: start[0], y: start[1] }]
    let a = points[0]
    for (const [bx, by, cx, cy, dx, dy] of curves) {
      // 密集曲线与原始点层无关，等距采样只服务于速度、压感及连续轮廓计算。
      const steps = Math.ceil((Math.hypot(bx - a.x, by - a.y)
        + Math.hypot(cx - bx, cy - by) + Math.hypot(dx - cx, dy - cy)) / SAMPLE_STEP)
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const u = 1 - t
        points.push({
          x: u ** 3 * a.x + 3 * u * u * t * bx + 3 * u * t * t * cx + t ** 3 * dx,
          y: u ** 3 * a.y + 3 * u * u * t * by + 3 * u * t * t * cy + t ** 3 * dy,
        })
      }
      a = { x: dx, y: dy }
    }
    const spaced: Point[] = [points[0]]
    let remaining = SAMPLE_STEP
    for (let i = 1; i < points.length; i++) {
      let from = points[i - 1]
      const to = points[i]
      let distance = Math.hypot(to.x - from.x, to.y - from.y)
      while (distance >= remaining) {
        const fraction = remaining / distance
        from = { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction }
        spaced.push(from)
        distance -= remaining
        remaining = SAMPLE_STEP
      }
      remaining -= distance
    }
    const last = points[points.length - 1]
    if (Math.hypot(last.x - spaced[spaced.length - 1].x, last.y - spaced[spaced.length - 1].y) > 0.001) spaced.push(last)
    return { name, points: spaced.map(point => ({ x: origin + point.x - point.y * SLANT, y: point.y })) }
  })
}
