/**
 * 图层舞台的 3D 投影：CSS 变换与命中测试共用这一套数学，保证悬停判定与画面一致。
 * 坐标以舞台中心为原点，单位为 CSS 像素；z 轴朝向观察者为正（与 CSS 一致）。
 */
export interface StackPose {
  /** 绕 X 轴倾倒角（弧度），正值让上边缘远离观察者。 */
  ax: number
  /** 绕 Z 轴旋转角（弧度）。 */
  az: number
  /** 整体缩放（scale3d）。 */
  s: number
  /** 透视距离。 */
  perspective: number
  /** 投影后的屏幕平移，用于把拆解后的堆叠重新居中。 */
  tx: number
  ty: number
}

export interface Vec3 { x: number, y: number, z: number }

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
export const mix = (a: number, b: number, t: number) => a + (b - a) * t
export const easeInOut = (t: number) => {
  const u = clamp01(t)
  return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2
}

/** 与 CSS `scale3d(s,s,s) rotateX(ax) rotateZ(az)` 相同的点变换（CSS 自右向左作用）。 */
export function transformPoint(pose: StackPose, p: Vec3): Vec3 {
  const cz = Math.cos(pose.az)
  const sz = Math.sin(pose.az)
  const x1 = p.x * cz - p.y * sz
  const y1 = p.x * sz + p.y * cz
  const cx = Math.cos(pose.ax)
  const sx = Math.sin(pose.ax)
  const y2 = y1 * cx - p.z * sx
  const z2 = y1 * sx + p.z * cx
  return { x: x1 * pose.s, y: y2 * pose.s, z: z2 * pose.s }
}

/** CSS perspective 投影：屏幕坐标 = 点坐标 × d / (d - z)。 */
export function project(pose: StackPose, p: Vec3) {
  const q = transformPoint(pose, p)
  const f = pose.perspective / Math.max(1, pose.perspective - q.z)
  return { x: q.x * f + pose.tx, y: q.y * f + pose.ty }
}

/**
 * 屏幕点反投影到 z = depth 的图层平面，返回平面内 (x, y)。
 * 变换是仿射加透视除法，对固定 z 可化为 2×2 线性方程。
 */
export function unproject(pose: StackPose, screenX: number, screenY: number, depth: number) {
  const X = screenX - pose.tx
  const Y = screenY - pose.ty
  const o = transformPoint(pose, { x: 0, y: 0, z: depth })
  const ux = transformPoint(pose, { x: 1, y: 0, z: depth })
  const uy = transformPoint(pose, { x: 0, y: 1, z: depth })
  const A = { x: ux.x - o.x, y: ux.y - o.y, z: ux.z - o.z }
  const B = { x: uy.x - o.x, y: uy.y - o.y, z: uy.z - o.z }
  const P = pose.perspective
  // X(P - qz) = P·qx，其中 q = A·x + B·y + o；Y 同理。
  const a11 = P * A.x + X * A.z
  const a12 = P * B.x + X * B.z
  const b1 = X * P - X * o.z - P * o.x
  const a21 = P * A.y + Y * A.z
  const a22 = P * B.y + Y * B.z
  const b2 = Y * P - Y * o.z - P * o.y
  const det = a11 * a22 - a12 * a21
  if (Math.abs(det) < 1e-9) return null
  return { x: (b1 * a22 - a12 * b2) / det, y: (a11 * b2 - a21 * b1) / det }
}

/** 投影后包围盒：用于计算拆解状态下的缩放与居中。 */
export function projectedBounds(pose: StackPose, width: number, height: number, depths: number[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const z of depths) {
    for (const [x, y] of [[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]]) {
      const p = project(pose, { x, y, z })
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  return { minX, minY, maxX, maxY }
}

/** 拆解终态：先按 s=1 求包围盒，再迭代一次修正透视带来的非线性。 */
export function fitExploded(base: Omit<StackPose, 's' | 'tx' | 'ty'>, width: number, height: number, depths: number[], availWidth: number, availHeight: number) {
  let pose: StackPose = { ...base, s: 1, tx: 0, ty: 0 }
  for (let i = 0; i < 2; i++) {
    const b = projectedBounds({ ...pose, tx: 0, ty: 0 }, width, height, depths)
    const scale = Math.min(availWidth / (b.maxX - b.minX), availHeight / (b.maxY - b.minY))
    pose = { ...pose, s: Math.min(1, pose.s * scale) }
  }
  const b = projectedBounds({ ...pose, tx: 0, ty: 0 }, width, height, depths)
  return { ...pose, tx: -(b.minX + b.maxX) / 2, ty: -(b.minY + b.maxY) / 2 }
}

/** CSS 变换字符串，与 transformPoint 一一对应。 */
export function poseTransform(pose: StackPose) {
  return `translate3d(${pose.tx.toFixed(2)}px, ${pose.ty.toFixed(2)}px, 0)`
}

export function planeTransform(pose: StackPose) {
  return `scale3d(${pose.s}, ${pose.s}, ${pose.s}) rotateX(${pose.ax}rad) rotateZ(${pose.az}rad)`
}
