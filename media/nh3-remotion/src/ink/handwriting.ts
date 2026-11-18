// 手写小字：把字形（归一化的贝塞尔路线）变成带时间的软笔笔画，并排出先后。
// 字形路线取自 media/inkeys3-brush-showcase/handwriting-revision/v3 的作者路线（y、=、s、i、n），x 是这次新写的。
// 坐标：大写字高为 1，基线在 y = 1，小写字母的顶在 y ≈ 0.35。

import { writePath, type Point, type Sample } from './path'
import { buildSoftStroke, type SoftPenOptions, type SoftStroke } from './softPen'

type Triple = readonly [Point, Point, Point]
export type GlyphStroke = { readonly start: Point; readonly segments: readonly Triple[] }

const C = (start: Point, ...segments: Triple[]): GlyphStroke => ({ start, segments })

/** 每个字形：若干笔，以及它占的宽度（含右侧留白）。 */
export const GLYPHS: Record<string, { readonly strokes: readonly GlyphStroke[]; readonly width: number }> = {
  y: {
    width: 0.86,
    strokes: [
      C(
        [0.08, 0.35],
        [[0.02, 0.7], [0.06, 0.97], [0.25, 0.94]],
        [[0.44, 0.92], [0.56, 0.55], [0.58, 0.36]],
        [[0.54, 0.85], [0.51, 1.28], [0.3, 1.42]],
        [[0.12, 1.54], [0.07, 1.27], [0.25, 1.1]],
        [[0.43, 0.96], [0.56, 0.95], [0.73, 0.83]],
      ),
    ],
  },
  '=': {
    width: 0.98,
    strokes: [C([0.05, 0.5], [[0.25, 0.48], [0.49, 0.52], [0.72, 0.45]]), C([0.02, 0.78], [[0.27, 0.74], [0.48, 0.78], [0.68, 0.71]])],
  },
  s: {
    width: 0.66,
    strokes: [C([0.56, 0.39], [[0.36, 0.27], [0.15, 0.33], [0.16, 0.48]], [[0.17, 0.64], [0.55, 0.68], [0.54, 0.84]], [[0.52, 1.03], [0.24, 1.02], [0.09, 0.89]])],
  },
  // i 和 n 连写：i 的竖画带出一个上挑，直接接到 n 的起笔；点最后补。
  in: {
    width: 1.5,
    strokes: [
      C(
        [0.18, 0.37],
        [[0.14, 0.56], [0.07, 0.82], [0.15, 0.93]],
        [[0.23, 1.05], [0.38, 0.91], [0.45, 0.81]],
        [[0.5, 0.68], [0.55, 0.47], [0.58, 0.36]],
        [[0.55, 0.56], [0.53, 0.78], [0.54, 0.96]],
        [[0.71, 0.51], [0.88, 0.29], [1.02, 0.44]],
        [[1.15, 0.61], [0.99, 0.94], [1.17, 0.98]],
        [[1.28, 1.01], [1.36, 0.89], [1.44, 0.8]],
      ),
      C([0.23, 0.13], [[0.24, 0.1], [0.27, 0.11], [0.27, 0.15]]),
    ],
  },
  x: {
    width: 0.74,
    strokes: [
      C([0.04, 0.43], [[0.17, 0.36], [0.26, 0.52], [0.34, 0.68]], [[0.42, 0.84], [0.5, 1.0], [0.65, 0.9]]),
      C([0.62, 0.37], [[0.5, 0.5], [0.28, 0.76], [0.05, 0.99]]),
    ],
  },
  h: {
    width: 0.7,
    strokes: [
      C(
        [0.14, 0.02],
        [[0.12, 0.3], [0.1, 0.66], [0.11, 0.98]],
        [[0.16, 0.66], [0.3, 0.36], [0.44, 0.42]],
        [[0.58, 0.5], [0.46, 0.9], [0.58, 0.97]],
        [[0.66, 1.0], [0.73, 0.9], [0.78, 0.83]],
      ),
    ],
  },
}

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, steps: number, out: Point[]) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const v = 1 - t
    out.push([
      v * v * v * p0[0] + 3 * v * v * t * p1[0] + 3 * v * t * t * p2[0] + t * t * t * p3[0],
      v * v * v * p0[1] + 3 * v * v * t * p1[1] + 3 * v * t * t * p2[1] + t * t * t * p3[1],
    ])
  }
}

/** 一笔的路线，按给定的原点（字的左上角）和字高放到画面坐标里。 */
export function glyphPolyline(stroke: GlyphStroke, origin: Point, height: number): Point[] {
  const points: Point[] = [stroke.start]
  let from = stroke.start
  for (const [a, b, to] of stroke.segments) {
    cubic(from, a, b, to, 10, points)
    from = to
  }
  return points.map(([x, y]) => [origin[0] + x * height, origin[1] + y * height] as const)
}

function polylineLength(points: readonly Point[]): number {
  let length = 0
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  return length
}

// writePath 的起笔、收笔、曲率窗口都是按一两百像素长的笔画定的。
// 小字只有几十像素，先放大到同一量级再算速度，算完把坐标缩回去。
const WRITE_SCALE = 5

export function writeSmall(points: readonly Point[], duration: number, options: { startSpeed?: number; endSpeed?: number } = {}): Sample[] {
  const big = points.map(([x, y]) => [x * WRITE_SCALE, y * WRITE_SCALE] as const)
  return writePath(big, { duration, startSpeed: 0.45, endSpeed: 0.7, ...options }).map(s => ({ x: s.x / WRITE_SCALE, y: s.y / WRITE_SCALE, t: s.t }))
}

export type TimedStroke = {
  readonly stroke: SoftStroke
  /** 落笔的时刻（秒，相对这一组的开头）。 */
  readonly at: number
}

export type WriteTextOptions = {
  readonly origin: Point
  /** 大写字高（画面坐标）。 */
  readonly height: number
  readonly pen: SoftPenOptions
  /** 书写的大致速度：每秒走多少个字高。 */
  readonly pace: number
  /** 同一个字里两笔之间、两个字之间、空格处的停顿（秒）。 */
  readonly gaps?: { readonly stroke: number; readonly glyph: number; readonly space: number }
}

/**
 * 写一行字。tokens 里每一项是 GLYPHS 的键，空格用 ' '。
 * 返回每一笔和它落笔的时刻，以及整行写完的时刻。
 */
export function writeText(tokens: readonly string[], { origin, height, pen, pace, gaps = { stroke: 0.07, glyph: 0.1, space: 0.14 } }: WriteTextOptions): { strokes: TimedStroke[]; duration: number; width: number } {
  const strokes: TimedStroke[] = []
  let x = origin[0]
  let time = 0
  let pending = 0
  for (const token of tokens) {
    if (token === ' ') {
      x += 0.34 * height
      pending = gaps.space
      continue
    }
    const glyph = GLYPHS[token]
    glyph.strokes.forEach((spec, index) => {
      const points = glyphPolyline(spec, [x, origin[1]], height)
      const length = polylineLength(points)
      // 每一笔有一个固定的起落时间，其余按长度算；一个点也要花一点时间。
      const duration = 0.06 + length / (pace * height)
      time += index === 0 ? pending : gaps.stroke
      strokes.push({ stroke: buildSoftStroke(writeSmall(points, duration), pen), at: time })
      time += duration
    })
    pending = gaps.glyph
    x += glyph.width * height
  }
  return { strokes, duration: time, width: x - origin[0] }
}
