// UInk 规范图示的几何计算。
// 纯函数、不依赖 DOM，可以直接在 Node 中运行（几何自检脚本）。
// 只实现图示需要的部分，不是完整的 UInk 渲染器；尺寸公式与规范完全一致，
// 圆弧在求并集时按多边形采样（误差远小于一个像素）。
// 坐标系与 Canvas 相同：X 向右、Y 向下，旋转角为弧度、顺时针为正。

export interface Point {
  x: number
  y: number
}

export interface InkPoint extends Point {
  width: number
}

export interface Nib {
  shape?: number
  aspect?: number
  orientation?: number
}

export interface NibSize {
  shape: 'circle' | 'rect'
  /** 矩形笔尖的宽 W；圆形笔尖为直径 */
  width: number
  /** 矩形笔尖的高 H；圆形笔尖为直径 */
  height: number
}

export interface Viewport {
  x: number
  y: number
  scale: number
}

// 端帽 cap / lineCap 与拐角 lineJoin 的取值（common/nib.md）
export const CAP_ROUND = 0
export const CAP_SQUARE = 1
export const CAP_BUTT = 2
export const JOIN_ROUND = 0
export const JOIN_MITER = 1
export const JOIN_BEVEL = 2

// 圆弧采样数：半径 40 时最大误差约 0.04
const CIRCLE_STEPS = 72

/* ---------- 路径字符串 ---------- */

/** 数值保留两位小数，并去掉 -0 */
export const num = (v: number): string => String(Math.round(v * 100) / 100 + 0)

const pt = (p: Point): string => `${num(p.x)} ${num(p.y)}`

/** 闭合多边形 */
export function polygonPath(points: Point[]): string {
  if (!points.length) return ''
  return `M${points.map(pt).join(' L')} Z`
}

/** 开放折线（描边中心线） */
export function polylinePath(points: Point[]): string {
  if (!points.length) return ''
  return `M${points.map(pt).join(' L')}`
}

/* ---------- 向量 ---------- */

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y })
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y })
const mul = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k })
const len = (a: Point): number => Math.hypot(a.x, a.y)
const unit = (a: Point): Point => {
  const l = len(a)
  return l > 0 ? { x: a.x / l, y: a.y / l } : { x: 1, y: 0 }
}
// 书写方向 d 的法向（Y 向下时指向前进方向的右侧）
const normal = (d: Point): Point => ({ x: -d.y, y: d.x })

/** 绕 center 旋转 angle 弧度（Y 向下，正值为顺时针） */
export function rotatePoint(p: Point, center: Point, angle: number): Point {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const dx = p.x - center.x
  const dy = p.y - center.y
  return { x: center.x + dx * c - dy * s, y: center.y + dx * s + dy * c }
}

/** 凸包（单调链）。所有子路径都由它输出，方向一致，非零环绕填充时自然取并集。 */
export function convexHull(points: Point[]): Point[] {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  if (p.length < 3) return p
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower: Point[] = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop()
    lower.push(q)
  }
  const upper: Point[] = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop()
    upper.push(q)
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

function circleSamples(c: Point, r: number): Point[] {
  const out: Point[] = []
  for (let i = 0; i < CIRCLE_STEPS; i++) {
    const a = (i / CIRCLE_STEPS) * Math.PI * 2
    out.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) })
  }
  return out
}

/** 圆的路径（两段圆弧，供单独绘制圆形时使用） */
export function circlePath(c: Point, r: number): string {
  return `M${num(c.x + r)} ${num(c.y)} A${num(r)} ${num(r)} 0 1 1 ${num(c.x - r)} ${num(c.y)} A${num(r)} ${num(r)} 0 1 1 ${num(c.x + r)} ${num(c.y)} Z`
}

/* ---------- Ink（blocks/ink.md、common/nib.md） ---------- */

/** INK-4：首点为绝对坐标，之后为相对前一点的位移；JS 的 number 即 float64 累加 */
export function absolutePoints(points: InkPoint[]): InkPoint[] {
  let x = 0
  let y = 0
  return points.map((p, i) => {
    x = i === 0 ? p.x : x + p.x
    y = i === 0 ? p.y : y + p.y
    return { x, y, width: p.width }
  })
}

/** 笔尖尺寸表（NIB-1、NIB-6、NIB-7） */
export function nibSize(width: number, nib?: Nib): NibSize {
  const a = nib?.aspect
  // 没有 nib、shape 不是 Rectangle（含未知值，NIB-7）、或 aspect 无效（NIB-6）：圆形，width 为直径
  if (!nib || nib.shape !== 1 || typeof a !== 'number' || !Number.isFinite(a) || a <= 0) {
    return { shape: 'circle', width, height: width }
  }
  // 矩形：width 就是笔尖高度 H，宽度 W = aspect × H（D20，不做等面积换算）
  return { shape: 'rect', width: a * width, height: width }
}

/** 矩形笔尖在某点的四个角。Fixed：宽沿 X、高沿 Y；FollowDirection：宽沿书写方向 dir */
function rectCorners(c: Point, size: NibSize, dir: Point | null): Point[] {
  const u = dir ? unit(dir) : { x: 1, y: 0 }
  const v = normal(u)
  const hw = size.width / 2
  const hh = size.height / 2
  return [
    add(c, add(mul(u, -hw), mul(v, -hh))),
    add(c, add(mul(u, hw), mul(v, -hh))),
    add(c, add(mul(u, hw), mul(v, hh))),
    add(c, add(mul(u, -hw), mul(v, hh))),
  ]
}

// 某点的书写方向（NIB-8）：首点取第一段、末点取最后一段，中间点取进入与离开方向的平分方向；
// 两者正好相反时取离开方向。长度为 0 的段跳过：向前、向后各找最近一个不重合的点
export function directionAt(points: Point[], i: number): Point {
  const c = points[i]
  let a = i - 1
  while (a >= 0 && len(sub(c, points[a])) < 1e-9) a--
  let b = i + 1
  while (b < points.length && len(sub(points[b], c)) < 1e-9) b++
  const prev = a >= 0 ? unit(sub(c, points[a])) : null
  const next = b < points.length ? unit(sub(points[b], c)) : null
  if (prev && next) {
    const s = add(prev, next)
    return len(s) > 1e-9 ? s : next
  }
  return prev ?? next ?? { x: 1, y: 0 }
}

/**
 * NIB-2：笔尖沿点序列扫过的区域。相邻两点之间按线性插值，
 * 两个凸形笔尖之间扫过的区域等于二者的凸包，整条笔迹是各段凸包的并集。
 * cap 缺省时圆形笔尖为 Round、矩形笔尖为 Butt（NIB-3）。
 * 圆形笔尖支持三种端帽；矩形笔尖忽略 cap，两端就是笔尖矩形自身的边（NIB-3）。
 * 返回一条多子路径的 path，须用 fill-rule="nonzero" 填充。
 */
export function sweepPath(points: InkPoint[], nib?: Nib, cap?: number): string {
  if (!points.length) return ''
  const sizes = points.map(p => nibSize(p.width, nib))
  const isRect = sizes[0].shape === 'rect'
  const follow = isRect && nib?.orientation === 1
  const endCap = isRect ? CAP_BUTT : cap === CAP_SQUARE || cap === CAP_BUTT ? cap : CAP_ROUND

  const shapeAt = (i: number): Point[] => {
    const c = points[i]
    if (isRect) return rectCorners(c, sizes[i], follow ? directionAt(points, i) : null)
    const r = sizes[i].width / 2
    const last = points.length - 1
    // 圆形笔尖的平头 / 方头：首末点只取垂直于书写方向的直径（方头再向外推半个宽度）
    if (endCap !== CAP_ROUND && last > 0 && (i === 0 || i === last)) {
      const d = directionAt(points, i)
      const u = unit(i === 0 ? mul(d, -1) : d)
      const n = normal(u)
      const base = endCap === CAP_SQUARE ? add(c, mul(u, r)) : c
      return [add(base, mul(n, r)), add(base, mul(n, -r))]
    }
    return circleSamples(c, r)
  }

  if (points.length === 1) return polygonPath(convexHull(shapeAt(0)))
  const parts: string[] = []
  for (let i = 0; i < points.length - 1; i++) {
    parts.push(polygonPath(convexHull([...shapeAt(i), ...shapeAt(i + 1)])))
  }
  return parts.join(' ')
}

/* ---------- Shape 描边（blocks/shape.md、NIB-4、NIB-5） ---------- */

/**
 * 固定宽度折线的描边轮廓，带端帽与拐角（NIB-4 缺省都为 Round）。
 * 由各段矩形、拐角块与端帽块组成，非零环绕取并集。
 * 单点（长度为 0 的虚线段）需要传入方向 dir：Round 画圆点，Square 画方点，Butt 不可见（NIB-5）。
 */
export function strokeOutline(points: Point[], width: number, cap = CAP_ROUND, join = JOIN_ROUND, dir?: Point): string {
  const h = width / 2
  const parts: Point[][] = []
  const capPart = (p: Point, outward: Point) => {
    if (cap === CAP_BUTT) return
    if (cap === CAP_SQUARE) {
      const u = unit(outward)
      const n = normal(u)
      parts.push([add(p, mul(n, h)), add(p, mul(n, -h)), add(add(p, mul(u, h)), mul(n, -h)), add(add(p, mul(u, h)), mul(n, h))])
      return
    }
    parts.push(circleSamples(p, h))
  }

  if (points.length === 1 || points.every(p => len(sub(p, points[0])) < 1e-9)) {
    const d = unit(dir ?? { x: 1, y: 0 })
    capPart(points[0], d)
    capPart(points[0], mul(d, -1))
    return parts.map(p => polygonPath(convexHull(p))).join(' ')
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const n = mul(normal(unit(sub(b, a))), h)
    parts.push([add(a, n), add(b, n), sub(b, n), sub(a, n)])
  }
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]
    const d1 = unit(sub(p, points[i - 1]))
    const d2 = unit(sub(points[i + 1], p))
    if (join === JOIN_ROUND) {
      parts.push(circleSamples(p, h))
      continue
    }
    // 外侧：前一段转向的反方向
    const turn = d1.x * d2.y - d1.y * d2.x
    const side = turn > 0 ? -1 : 1
    const n1 = mul(normal(d1), side)
    const n2 = mul(normal(d2), side)
    const o1 = add(p, mul(n1, h))
    const o2 = add(p, mul(n2, h))
    const block = [p, o1, o2]
    if (join === JOIN_MITER) {
      const m = unit(add(n1, n2))
      const cos = m.x * n1.x + m.y * n1.y
      // 尖角长度（外侧尖端到内侧拐点）与描边宽度之比为 1 / cos，超过限值 4 时退回斜切（SHAPE-10）
      if (cos > 0.25) block.push(add(p, mul(m, h / cos)))
    }
    parts.push(block)
  }
  capPart(points[0], sub(points[0], points[1]))
  const last = points.length - 1
  capPart(points[last], sub(points[last], points[last - 1]))
  return parts.map(p => polygonPath(convexHull(p))).join(' ')
}

export function polylineLength(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += len(sub(points[i], points[i - 1]))
  return total
}

/** 折线上距起点 s 处的点与该处方向 */
export function pointAtLength(points: Point[], s: number): { point: Point, dir: Point } {
  let rest = s
  for (let i = 1; i < points.length; i++) {
    const seg = sub(points[i], points[i - 1])
    const l = len(seg)
    if (rest <= l || i === points.length - 1) {
      const t = l > 0 ? Math.min(Math.max(rest / l, 0), 1) : 0
      return { point: add(points[i - 1], mul(seg, t)), dir: unit(seg) }
    }
    rest -= l
  }
  return { point: points[0], dir: { x: 1, y: 0 } }
}

/** 折线上 [s0, s1] 之间的部分 */
export function subPolyline(points: Point[], s0: number, s1: number): Point[] {
  const out = [pointAtLength(points, s0).point]
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    acc += len(sub(points[i], points[i - 1]))
    if (acc > s0 && acc < s1) out.push(points[i])
  }
  out.push(pointAtLength(points, s1).point)
  return out
}

/**
 * SHAPE-7：把长度为 length 的路径按 dashArray / dashOffset 分段，返回可见段 [起点, 终点]。
 * dashOffset 与 SVG stroke-dashoffset 含义相同：路径起点对应图案中的 dashOffset 位置。
 * 长度为 0 的段以 [s, s] 返回（由端帽决定是否画成点，NIB-5）。
 * dashArray 缺失、为空或无效时按实线（整段）返回。
 */
export function dashSegments(length: number, dashArray?: number[], dashOffset = 0): Array<[number, number]> {
  const valid = !!dashArray && dashArray.length > 0 && dashArray.length % 2 === 0
    && dashArray.every(v => Number.isFinite(v) && v >= 0) && Number.isFinite(dashOffset)
  const total = valid ? dashArray.reduce((a, b) => a + b, 0) : 0
  if (!valid || !(total > 0)) return [[0, length]]

  const out: Array<[number, number]> = []
  let pos = -(((dashOffset % total) + total) % total)
  for (let i = 0; pos <= length; i = (i + 1) % dashArray.length) {
    const d = dashArray[i]
    if (i % 2 === 0) {
      const s = Math.max(pos, 0)
      const e = Math.min(pos + d, length)
      if (e > s || (d === 0 && pos >= 0)) out.push([s, e])
    }
    pos += d
  }
  return out
}

/** 虚线描边轮廓：每个可见段按 strokeOutline 画出，长度为 0 的段沿路径方向画点 */
export function dashOutline(points: Point[], width: number, dashArray?: number[], dashOffset = 0, cap = CAP_ROUND, join = JOIN_ROUND): string {
  const total = polylineLength(points)
  return dashSegments(total, dashArray, dashOffset)
    .map(([s, e]) => {
      if (e > s) return strokeOutline(subPolyline(points, s, e), width, cap, join)
      const at = pointAtLength(points, s)
      return strokeOutline([at.point], width, cap, join, at.dir)
    })
    .filter(Boolean)
    .join(' ')
}

/* ---------- Shape 几何（blocks/shape.md） ---------- */

export interface ShapeGeometry {
  points?: Point[]
  centerX?: number
  centerY?: number
  width?: number
  height?: number
  size?: number
  radius?: number
  rotation?: number
  cornerRadiusX?: number
  cornerRadiusY?: number
}

/** 七种 shapeType 的轮廓路径。Line / Polyline 为开放的中心线，其余闭合。 */
export function shapePath(shapeType: number, g: ShapeGeometry): string {
  if (shapeType === 0 || shapeType === 1) return polylinePath(g.points ?? [])
  if (shapeType === 6) return polygonPath(g.points ?? [])

  const c = { x: g.centerX ?? 0, y: g.centerY ?? 0 }
  const rot = g.rotation ?? 0
  const deg = num((rot * 180) / Math.PI)
  const at = (x: number, y: number) => pt(rotatePoint({ x: c.x + x, y: c.y + y }, c, rot))

  if (shapeType === 5) {
    const r = g.radius ?? 0
    return circlePath(c, r)
  }
  if (shapeType === 4) {
    const rx = (g.width ?? 0) / 2
    const ry = (g.height ?? 0) / 2
    return `M${at(rx, 0)} A${num(rx)} ${num(ry)} ${deg} 1 1 ${at(-rx, 0)} A${num(rx)} ${num(ry)} ${deg} 1 1 ${at(rx, 0)} Z`
  }

  // Rectangle（2）与 Square（3）
  const w = shapeType === 3 ? g.size ?? 0 : g.width ?? 0
  const h = shapeType === 3 ? g.size ?? 0 : g.height ?? 0
  const hw = w / 2
  const hh = h / 2
  let rx = shapeType === 2 ? g.cornerRadiusX ?? 0 : 0
  let ry = shapeType === 2 ? g.cornerRadiusY ?? 0 : 0
  // SHAPE-3：两个圆角半径都大于 0 且分别不超过半宽、半高时才生效，否则按直角
  if (!(rx > 0 && ry > 0 && rx <= hw && ry <= hh)) {
    rx = 0
    ry = 0
  }
  if (rx === 0) return `M${at(-hw, -hh)} L${at(hw, -hh)} L${at(hw, hh)} L${at(-hw, hh)} Z`
  const arc = (x: number, y: number) => ` A${num(rx)} ${num(ry)} ${deg} 0 1 ${at(x, y)}`
  return `M${at(-hw + rx, -hh)} L${at(hw - rx, -hh)}${arc(hw, -hh + ry)} L${at(hw, hh - ry)}${arc(hw - rx, hh)}`
    + ` L${at(-hw + rx, hh)}${arc(-hw, hh - ry)} L${at(-hw, -hh + ry)}${arc(-hw + rx, -hh)} Z`
}

/* ---------- viewport（blocks/canvas.md，CANVAS-16–CANVAS-18） ---------- */

export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 }

/** Canvas → Device：deviceX = (canvasX − x) × scale */
export function viewportMap(p: Point, vp: Viewport = DEFAULT_VIEWPORT): Point {
  return { x: (p.x - vp.x) * vp.scale, y: (p.y - vp.y) * vp.scale }
}

/** Device → Canvas：canvasX = deviceX / scale + x */
export function viewportInverse(p: Point, vp: Viewport = DEFAULT_VIEWPORT): Point {
  return { x: p.x / vp.scale + vp.x, y: p.y / vp.scale + vp.y }
}

/** 与 viewportMap 等价的仿射矩阵 [a, b, c, d, e, f]，可直接写进 SVG transform="matrix(…)" */
export function viewportMatrix(vp: Viewport): [number, number, number, number, number, number] {
  return [vp.scale, 0, 0, vp.scale, -vp.x * vp.scale, -vp.y * vp.scale]
}

/** CANVAS-18：Device 当前能看到的 Canvas 范围 */
export function visibleRect(device: { width: number, height: number }, vp: Viewport): { x: number, y: number, width: number, height: number } {
  return { x: vp.x, y: vp.y, width: device.width / vp.scale, height: device.height / vp.scale }
}

/* ---------- Media 的 fit 与 crop（blocks/media.md，MEDIA-1、MEDIA-3） ---------- */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const FIT_FILL = 0
export const FIT_CONTAIN = 1
export const FIT_COVER = 2
export const FIT_NONE = 3

export interface FitResult {
  /** 实际采用的 fit（不认识的值已按 Fill 处理） */
  fit: number
  /** 实际使用的资源区域（资源坐标）；没有 crop 或 crop 被忽略时为整个资源 */
  crop: Rect
  /** 该区域画到框里的位置（框坐标，可以超出框；超出部分由框裁掉） */
  dest: Rect
  scaleX: number
  scaleY: number
}

/**
 * MEDIA-1：先按 crop 取出资源的一部分，再按 fit 放进左上角 (0, 0)、大小为 box 的框里。
 * MEDIA-3：crop 与资源范围取交集；交集为空或字段无效时忽略 crop；不认识的 fit 按 Fill。
 * transform 与 viewport 在此之后应用，不在这里处理。
 */
export function fitRect(src: { width: number, height: number }, box: { width: number, height: number }, fit = FIT_FILL, crop?: Rect | null): FitResult {
  let area: Rect = { x: 0, y: 0, width: src.width, height: src.height }
  if (crop && [crop.x, crop.y, crop.width, crop.height].every(Number.isFinite) && crop.width > 0 && crop.height > 0) {
    const x0 = Math.max(crop.x, 0)
    const y0 = Math.max(crop.y, 0)
    const x1 = Math.min(crop.x + crop.width, src.width)
    const y1 = Math.min(crop.y + crop.height, src.height)
    if (x1 > x0 && y1 > y0) area = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
  }

  const mode = fit === FIT_CONTAIN || fit === FIT_COVER || fit === FIT_NONE ? fit : FIT_FILL
  let sx = box.width / area.width
  let sy = box.height / area.height
  if (mode === FIT_CONTAIN || mode === FIT_COVER) {
    sx = sy = mode === FIT_CONTAIN ? Math.min(sx, sy) : Math.max(sx, sy)
  } else if (mode === FIT_NONE) {
    // 1 资源像素 = 1 Canvas 单位，贴左上角
    sx = sy = 1
  }
  const w = area.width * sx
  const h = area.height * sy
  // Contain / Cover 居中；Fill 正好铺满；None 贴左上角
  const centered = mode === FIT_CONTAIN || mode === FIT_COVER
  const dest = { x: centered ? (box.width - w) / 2 : 0, y: centered ? (box.height - h) / 2 : 0, width: w, height: h }
  return { fit: mode, crop: area, dest, scaleX: sx, scaleY: sy }
}

/* ---------- 图形预设（appendix/shape-presets.md） ---------- */

/** 对象 transform：[a, b, c, d, e, f]，x' = a·x + c·y + e，y' = b·x + d·y + f（MEDIA-2） */
export type Affine = [number, number, number, number, number, number]

export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0]

export function applyAffine(t: Affine, p: Point): Point {
  return { x: t[0] * p.x + t[2] * p.y + t[4], y: t[1] * p.x + t[3] * p.y + t[5] }
}

/** 2×2 矩阵 [[a, c], [b, d]] 的最大奇异值 */
function maxSingular(a: number, b: number, c: number, d: number): number {
  const s = a * a + b * b + c * c + d * d
  const det = a * d - b * c
  return Math.sqrt((s + Math.sqrt(Math.max(s * s - 4 * det * det, 0))) / 2)
}

/** transform 线性部分的最大奇异值 M（PRESET-6） */
export function affineMaxScale(t: Affine = IDENTITY): number {
  return maxSingular(t[0], t[1], t[2], t[3])
}

/** PRESET-6：半径 R 的圆弧每段的最大角度，误差不超过 0.25 个 Canvas 单位 */
export function presetArcStep(radius: number, m = 1): number {
  const tol = 0.25 / Math.max(1, m)
  return radius <= tol ? Math.PI / 2 : 2 * Math.acos(1 - tol / radius)
}

export interface PresetConstruction {
  start?: Point
  end?: Point
  vertices?: Point[]
  mode?: number
  constraint?: number
  cornerRadius?: number
  sides?: number
  sweep?: number
}

export interface PresetPart {
  shapeType: number
  geometry: ShapeGeometry
  /** 箭头部件：始终为实线（PRESET-9） */
  solid?: boolean
}

export interface PlanarResult {
  parts: PresetPart[]
  /** 由参数派生出的顶点与关键点（图示标注用） */
  derived: Point[]
}

/**
 * 平面预设的局部几何（PRESET-9–PRESET-13，transform 之前）。
 * styleWidth 只影响箭头大小；m 为对象 transform 的最大奇异值，只影响圆弧采样。
 * 缺少必需参数或取值无效时返回 null（读取器应退回对象层，PRESET-4）。
 */
export function planarPreset(preset: string, c: PresetConstruction, styleWidth = 2, m = 1): PlanarResult | null {
  const s = c.start
  const e = c.end
  const poly = (shapeType: number, points: Point[], derived: Point[] = points): PlanarResult =>
    ({ parts: [{ shapeType, geometry: { points } }], derived })

  if (preset === 'polyline') return c.vertices && c.vertices.length >= 2 ? poly(1, c.vertices) : null
  if (preset === 'polygon') return c.vertices && c.vertices.length >= 3 ? poly(6, c.vertices) : null
  if (!s || !e) return null

  // 外框：l、r、t、b、w、h、cx、cy
  const l = Math.min(s.x, e.x)
  const r = Math.max(s.x, e.x)
  const t = Math.min(s.y, e.y)
  const b = Math.max(s.y, e.y)
  const w = r - l
  const h = b - t
  const cx = l + w / 2
  const cy = t + h / 2
  // 外框的另外两个角也是派生点（圆角矩形时在图形之外）
  const rect = (corner: number): PlanarResult => ({
    parts: [{ shapeType: 2, geometry: { centerX: cx, centerY: cy, width: w, height: h, cornerRadiusX: corner, cornerRadiusY: corner } }],
    derived: [{ x: e.x, y: s.y }, { x: s.x, y: e.y }],
  })
  // 把 e − s 绕 s 顺时针旋转得到正多边形顶点（Y 向下，正角为顺时针）
  const regular = (n: number): Point[] => Array.from({ length: n }, (_, i) => rotatePoint(e, s, (2 * Math.PI * i) / n))

  switch (preset) {
    case 'line':
      return { parts: [{ shapeType: 0, geometry: { points: [s, e] } }], derived: [] }
    case 'arrow': {
      // PRESET-9：箭头长 3w，半宽 1.5w，三点 Polyline，始终为实线
      const d = sub(e, s)
      if (!(len(d) > 0)) return null
      const u = unit(d)
      const n = normal(u)
      const base = sub(e, mul(u, 3 * styleWidth))
      const a = add(base, mul(n, 1.5 * styleWidth))
      const z = sub(base, mul(n, 1.5 * styleWidth))
      return {
        parts: [{ shapeType: 0, geometry: { points: [s, e] } }, { shapeType: 1, geometry: { points: [a, e, z] }, solid: true }],
        derived: [a, z],
      }
    }
    case 'rectangle':
      return rect(Math.min(Math.max(c.cornerRadius ?? 0, 0), Math.min(w, h) / 2))
    case 'rounded-rectangle':
      return rect(Math.min(w, h) * 0.2)
    case 'circle': {
      // PRESET-10：mode 缺省为 1（Center）
      if ((c.mode ?? 1) === 1) return { parts: [{ shapeType: 5, geometry: { centerX: s.x, centerY: s.y, radius: len(sub(e, s)) } }], derived: [] }
      const side = Math.max(w, h)
      const sx = Math.sign(e.x - s.x) || 1
      const sy = Math.sign(e.y - s.y) || 1
      const center = { x: s.x + (sx * side) / 2, y: s.y + (sy * side) / 2 }
      return { parts: [{ shapeType: 5, geometry: { centerX: center.x, centerY: center.y, radius: side / 2 } }], derived: [center] }
    }
    case 'ellipse':
      return { parts: [{ shapeType: 4, geometry: { centerX: cx, centerY: cy, width: w, height: h } }], derived: [{ x: cx, y: cy }] }
    case 'triangle': {
      // PRESET-11：有 vertices 直接用；等边以 s 为中心、e 为第一个顶点；其余取外框
      if (c.vertices?.length === 3) return poly(6, c.vertices)
      if (c.constraint === 2) return poly(6, regular(3), regular(3).slice(1))
      return poly(6, [{ x: cx, y: t }, { x: r, y: b }, { x: l, y: b }])
    }
    case 'parallelogram': {
      if (c.vertices?.length === 4) return poly(6, c.vertices)
      const k = (e.x - s.x) / 4
      const a = { x: e.x - k, y: s.y }
      const z = { x: s.x + k, y: e.y }
      return poly(6, [s, a, e, z], [a, z])
    }
    case 'rhombus':
      if (c.vertices?.length === 4) return poly(6, c.vertices)
      return poly(6, [{ x: cx, y: t }, { x: r, y: cy }, { x: cx, y: b }, { x: l, y: cy }])
    case 'trapezoid':
      if (c.vertices?.length === 4) return poly(6, c.vertices)
      return poly(6, [{ x: l + w / 4, y: t }, { x: r - w / 4, y: t }, { x: r, y: b }, { x: l, y: b }])
    case 'regular-polygon': {
      const n = c.sides ?? 3
      if (!Number.isInteger(n) || n < 3 || n > 14) return null
      const pts = regular(n)
      return poly(6, pts, pts.slice(1))
    }
    case 'arc':
    case 'sector': {
      // PRESET-12：等角采样（含两端），段数 max(2, ceil(|sweep| / step))
      const sweep = c.sweep
      const R = len(sub(e, s))
      if (typeof sweep !== 'number' || !(Math.abs(sweep) > 0) || Math.abs(sweep) > 2 * Math.PI + 1e-9 || !(R > 0)) return null
      const a0 = Math.atan2(e.y - s.y, e.x - s.x)
      const segs = Math.max(2, Math.ceil(Math.abs(sweep) / presetArcStep(R, m)))
      const pts = Array.from({ length: segs + 1 }, (_, i) => {
        const a = a0 + (sweep * i) / segs
        return { x: s.x + R * Math.cos(a), y: s.y + R * Math.sin(a) }
      })
      const end = pts[pts.length - 1]
      if (preset === 'arc') return poly(1, pts, [end])
      const full = Math.abs(Math.abs(sweep) - 2 * Math.PI) < 1e-9
      // 扇形：弧点之后加上圆心闭合；整圆时不加圆心，并去掉与首点重合的末点
      return poly(6, full ? pts.slice(0, -1) : [...pts, s], full ? [] : [end])
    }
  }
  return null
}

export interface SolidConstruction {
  start: Point
  height: number
  baseSize?: Point
  radius?: number
  sides?: number
  baseRotation?: number
  mirrored?: boolean
  offset?: Point
}

export interface SolidPart {
  /** 0 Line、1 Polyline */
  shapeType: 0 | 1
  /** Canvas 坐标（已应用对象 transform） */
  points: Point[]
  /** 隐藏边：写成 Dashed 虚线（PRESET-18） */
  hidden: boolean
  /** 底边 / 顶边 / 侧棱（圆柱、圆锥为底面圆周、顶面圆周、轮廓母线） */
  role: 'bottom' | 'top' | 'side'
}

type Vec3 = [number, number, number]
const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross3 = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

/**
 * 立体预设的部件（PRESET-14–PRESET-19）：斜二测投影、背面判断与部件顺序。
 * 多面体（cuboid、cube、prism、pyramid）每个 i 依次输出底边 i、顶边 i（锥体没有）、侧棱 i。
 * 圆柱、圆锥的部件顺序规范只规定了切段方式，这里按“底面圆周各段 → 顶面圆周各段 → 轮廓母线”输出。
 * 参数无效时返回空数组（读取器应退回对象层，PRESET-4）。
 */
export function solidParts(preset: string, c: SolidConstruction, transform: Affine = IDENTITY): SolidPart[] {
  const h = c.height
  if (!c.start || !Number.isFinite(h) || h === 0) return []
  const curved = preset === 'cylinder' || preset === 'cone'
  const apexed = preset === 'cone' || preset === 'pyramid'

  // PRESET-14：投影系数；圆柱、圆锥不受 mirrored 影响
  const k = 1 / (2 * Math.SQRT2)
  const kx = curved ? 0 : c.mirrored ? -k : k
  const ky = curved ? -1 / 3 : -k
  const th = c.baseRotation ?? 0
  const cs = Math.cos(th)
  const sn = Math.sin(th)
  const off = c.offset ?? { x: 0, y: 0 }

  // PRESET-15：绕竖直轴旋转后投影到局部坐标，再经对象 transform 到 Canvas
  const proj = ([x, y, z]: Vec3): Point => {
    const xr = cs * x - sn * y
    const yr = sn * x + cs * y
    return applyAffine(transform, { x: c.start.x + xr + kx * yr, y: c.start.y + ky * yr + z })
  }

  // PRESET-17：视线 V、内部点 I；法线按“面上一点 − I”定向为朝外后判断背面
  const V: Vec3 = [kx * cs - sn, -kx * sn - cs, ky]
  const I: Vec3 = [off.x / 2, off.y / 2, h / 2]
  const isBack = (n: Vec3, p: Vec3): boolean => {
    const nn: Vec3 = dot3(n, sub3(p, I)) < 0 ? [-n[0], -n[1], -n[2]] : n
    return dot3(nn, V) < -1e-6 * Math.hypot(...nn)
  }
  const apex: Vec3 = [off.x, off.y, h]
  const bottomBack = isBack([0, 0, 1], [0, 0, 0])
  const topBack = isBack([0, 0, 1], apex)
  const line = (a: Vec3, b: Vec3, hidden: boolean, role: SolidPart['role']): SolidPart =>
    ({ shapeType: 0, points: [proj(a), proj(b)], hidden, role })

  if (!curved) {
    // PRESET-19：底面顶点编号
    let base: Array<[number, number]>
    if (preset === 'cuboid' || preset === 'cube') {
      const bx = preset === 'cube' ? Math.abs(h) : c.baseSize?.x ?? 0
      const by = preset === 'cube' ? Math.abs(h) : c.baseSize?.y ?? 0
      if (!(bx > 0 && by > 0)) return []
      base = [[-bx / 2, -by / 2], [bx / 2, -by / 2], [bx / 2, by / 2], [-bx / 2, by / 2]]
    } else if (preset === 'prism' || preset === 'pyramid') {
      const n = c.sides ?? 3
      const R = c.radius ?? 0
      if (!Number.isInteger(n) || n < 3 || n > 8 || !(R > 0)) return []
      // v0 = (radius, 0)，依次按 2π / sides 顺时针（Y 向下时角度递增）
      base = Array.from({ length: n }, (_, i) => [R * Math.cos((2 * Math.PI * i) / n), R * Math.sin((2 * Math.PI * i) / n)])
    } else {
      return []
    }
    const n = base.length
    const B: Vec3[] = base.map(([x, y]) => [x, y, 0])
    const T: Vec3[] = base.map(([x, y]) => [x + off.x, y + off.y, h])
    const up: Vec3 = [off.x, off.y, h]
    // 侧面 i 由底边 i 与对应的顶边（或锥顶）构成
    const side = B.map((v, i) => isBack(cross3(sub3(B[(i + 1) % n], v), apexed ? sub3(apex, v) : up), v))
    const parts: SolidPart[] = []
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const prev = (i + n - 1) % n
      // PRESET-18：两个相邻面都是背面时，边才隐藏
      parts.push(line(B[i], B[j], bottomBack && side[i], 'bottom'))
      if (!apexed) parts.push(line(T[i], T[j], topBack && side[i], 'top'))
      parts.push(line(B[i], apexed ? apex : T[i], side[i] && side[prev], 'side'))
    }
    return parts
  }

  const R = c.radius ?? 0
  if (!(R > 0)) return []
  const cone = preset === 'cone'
  const at = (phi: number, z = 0): Vec3 => [R * Math.cos(phi) + (z ? off.x : 0), R * Math.sin(phi) + (z ? off.y : 0), z]
  // 侧面在角度 phi 处的法线：切向 × 母线方向
  const sideBack = (phi: number): boolean => {
    const p = at(phi)
    const tangent: Vec3 = [-Math.sin(phi), Math.cos(phi), 0]
    const gen: Vec3 = cone ? sub3(apex, p) : [off.x, off.y, h]
    return isBack(cross3(tangent, gen), p)
  }

  // PRESET-16：采样数至少 32，向上取整为 4 的倍数；首点为模型角度 −θ（投影后落在椭圆极值上）
  const mPrime = maxSingular(1, kx, 0, ky)
  const step = presetArcStep(R * mPrime, affineMaxScale(transform))
  const count = Math.ceil(Math.max(32, Math.ceil((2 * Math.PI) / step)) / 4) * 4
  const a0 = -th
  // 把角度归到 [a0, a0 + 2π)；贴近 a0 + 2π 的值归为 a0，避免与首个采样点重复
  const wrap = (phi: number) => {
    let t = (phi - a0) % (2 * Math.PI)
    if (t < 0) t += 2 * Math.PI
    return a0 + (2 * Math.PI - t < 1e-9 ? 0 : t)
  }
  const angles = Array.from({ length: count }, (_, i) => a0 + (2 * Math.PI * i) / count)

  // 轮廓母线的切点：a·cosφ + b·sinφ = c
  const a = V[0] - (V[2] * off.x) / h
  const b = V[1] - (V[2] * off.y) / h
  const cc = cone ? (-V[2] * R) / h : 0
  const hyp = Math.hypot(a, b)
  const silhouettes: number[] = []
  if (Math.abs(cc) < hyp) {
    const mid = Math.atan2(b, a)
    const d = Math.acos(cc / hyp)
    silhouettes.push(wrap(mid - d), wrap(mid + d))
  }
  for (const phi of silhouettes) {
    if (!angles.some(x => Math.abs(x - phi) < 1e-9)) angles.push(phi)
  }
  angles.sort((x, y) => x - y)

  // 圆周按可见性切段：从可见性变化处开始，同一可见性的连续弧合并成一个 Polyline
  const ring = (z: number, faceBack: boolean, role: SolidPart['role']): SolidPart[] => {
    const m = angles.length
    // hidden[i]：第 i 个采样点到下一个采样点之间的弧，按弧中点判断
    const hidden = angles.map((phi, i) => {
      const next = i === m - 1 ? angles[0] + 2 * Math.PI : angles[i + 1]
      return faceBack && sideBack((phi + next) / 2)
    })
    const startAt = hidden.findIndex((v, i) => v !== hidden[(i + m - 1) % m])
    if (startAt < 0) {
      const pts = [...angles, angles[0]].map(phi => proj(at(phi, z)))
      return [{ shapeType: 1, points: pts, hidden: hidden[0], role }]
    }
    const out: SolidPart[] = []
    let cur: Point[] = []
    for (let n = 0; n < m; n++) {
      const i = (startAt + n) % m
      if (n > 0 && hidden[i] !== hidden[(i + m - 1) % m]) {
        cur.push(proj(at(angles[i], z)))
        out.push({ shapeType: 1, points: cur, hidden: hidden[(i + m - 1) % m], role })
        cur = []
      }
      cur.push(proj(at(angles[i], z)))
    }
    cur.push(proj(at(angles[startAt], z)))
    out.push({ shapeType: 1, points: cur, hidden: hidden[(startAt + m - 1) % m], role })
    return out
  }

  const parts = ring(0, bottomBack, 'bottom')
  if (!cone) parts.push(...ring(h, topBack, 'top'))
  // 轮廓母线一侧是正面，按 PRESET-18 总是可见
  for (const phi of silhouettes) parts.push(line(at(phi), cone ? apex : at(phi, h), false, 'side'))
  return parts
}

/**
 * PRESET-21：闭合虚线的相位坐标。perimeter 为轮廓周长 P，d 为从轮廓起点量起的距离，
 * w 为部件描边宽度。四个锚点（0、P/4、P/2、3P/4）处总是一段实线的中点（点线时为一个点）。
 */
export function closedDashPhase(perimeter: number, d: number, w: number, dotted = false): number {
  const quarter = perimeter / 4
  const centered = d - quarter * Math.floor(d / quarter + 0.5)
  return Math.abs(centered) + (dotted ? 0 : 2 * w)
}
