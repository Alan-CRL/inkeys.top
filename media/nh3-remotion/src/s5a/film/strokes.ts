// S5-A 成片里所有笔迹的轨迹与建模（模块加载时算一次，逐帧只取样）。
// 坐标是白板的内容坐标（屏幕逻辑像素）；每个功能在白板上占一块区域，镜头之间靠平移白板切换。
// 墨迹按软件 Draw3 的处理链路模拟，见 ../ink/draw3Ink.ts；书写节奏见 ./pace.ts；板书字形见 ./handText.ts。
// 第七版：不再用 sin x 和正弦曲线，板书改为解一元二次方程、立方体截面这类真实的课堂书写。

import { modelStroke, sampleRaw } from '../ink/draw3Ink'
import { staticPath, writeText, type Pen } from './handText'
import { cubic, endOf, paced, strokeOf, type P2, type Timed } from './pace'

export type { Timed } from './pace'

/**
 * 在同一处快速连画几圈：每圈略微错开（圈心缓慢漂移并带一点绕动），半径也有起伏，像手画的。
 * 角速度在起笔 0.25 秒内加速到位。
 */
export const circling = (cx: number, cy: number, radius: number, turnsPerSecond: number, drift = 60, startAngle = 0.9 * Math.PI, squash = 0.9) => (t: number) => {
  const ramp = 0.25
  const u = Math.min(t, ramp) / ramp
  const accel = ramp * (u * u * u - 0.5 * u * u * u * u) // ∫ smoothstep
  const angle = 2 * Math.PI * turnsPerSecond * (t < ramp ? accel : ramp * 0.5 + (t - ramp))
  const r = radius * (1 + 0.035 * Math.sin(angle * 0.43 + 0.6))
  const ox = cx + drift * t + 16 * Math.cos(2 * Math.PI * 0.7 * t)
  const oy = cy - 14 * t + 12 * Math.sin(2 * Math.PI * 0.7 * t)
  const a = startAngle - angle // 逆时针
  return [ox + r * Math.cos(a), oy + squash * r * Math.sin(a)] as const
}


// ======================================================================
// 第一幕 · 多层缓冲：从卡片升起到转场只写同一条长墨迹（一直不抬笔），L2 上是几条之前写好的长墨迹。
// ======================================================================

/** 正在写的长墨迹：一串向右漂移、大小起伏的连笔圈，像随手的涂写。约 4.6 秒。 */
export const A1_LONG = strokeOf(
  Array.from({ length: 1201 }, (_, i) => {
    const th = (i / 1200) * 5.1 * 2 * Math.PI
    const cx = 290 + 44 * th // 视图不跟拍，漂移收小，整条墨迹留在卡面里
    const cy = 600 + 60 * Math.sin(0.33 * th + 0.4)
    const rho = 118 + 42 * Math.sin(0.57 * th + 1.1)
    const a = 0.82 * Math.PI - th // 逆时针
    return [cx + rho * Math.cos(a), cy + 0.8 * rho * Math.sin(a)] as const
  }),
  { fast: 820, slow: 600, bend: 40, start: 0.5, end: 0.9, inLen: 60, outLen: 60 },
  12,
)
/** L2：之前写好的几条长墨迹（快速画的几圈、一道长弧、一道短的波折）。 */
export const A1_BG: Timed[] = [
  { stroke: modelStroke(sampleRaw(circling(1560, 270, 112, 2.1, 30, 0.9 * Math.PI, 0.85), 1.25), 11), at: 0 },
  { stroke: strokeOf(cubic([170, 960], [620, 1010], [1180, 840], [1760, 905], 120), { fast: 1300, slow: 1100, start: 0.5, end: 0.85 }, 11), at: 0 },
  { stroke: strokeOf(cubic([210, 250], [380, 150], [560, 330], [820, 210], 80), { fast: 1100, slow: 800, start: 0.5, end: 0.85 }, 11), at: 0 },
]

// ======================================================================
// 第二幕：快速画圈 → 外圈（预测特写）→ 平移到写满的一页：两支笔续写，橡皮擦掉右列两行。
// ======================================================================

export const LOOPS = modelStroke(sampleRaw(circling(920, 540, 300, 2.3), 2.25), 14)
/** 预测特写用的一笔：绕着刚才那几圈画一个大外圈，笔尖附近只有这一道墨。 */
export const ARC = modelStroke(sampleRaw(circling(990, 520, 470, 0.68, 0, 0.78 * Math.PI, 0.85), 1.15), 14)

/** 写满的一页所在的白板区域（平移过去）。密度参照用户给的课堂截图：两列解题步骤铺满卡面。 */
export const PAGE_CENTER = { x: 3200, y: 580 }
const PAGE_SIZE = 64
const PAGE_LEAD = 96
const PAGE_TOP = 165
const COL = { left: 2300, right: 3210 }
const PAGE_PEN: Pen = { speed: 720, base: 5.6, gaps: { stroke: 0.035, glyph: 0.045, space: 0.08 } }
const LEFT_LINES = ['A = (0, 0, 0)', 'G = (6, 6, 6)', 'O = (3, 3, 3)', 'x + y + z = k', '3 + 3 + 3 = k ,  k = 9', 'E = (6, 3, 0)', 'F = (3, 6, 0)']
/** 两支笔同时续写的两行（左列最后两行）。 */
const LIVE_LINES = ['EF² = 3² + 3² = 18', 'OE² = OF² = 18']
const RIGHT_LINES = [
  'P = 6 × 3√2 = 18√2',
  'S = 6 × √3/4 × 18',
  '   = 27√3',
  'd = (k − 9)/√3',
  'S(d) = √3/2 [k² − 3(k − 6)²]',
  '   = √3/2 [−2k² + 36k − 108]',
  '   = 27√3 − 3√3 d²',
  '0 ≤ d < √3',
  'max at d = 0',
]
/** 被橡皮擦掉的右列行号（从 0 起）；擦完后第二支笔在第一行的位置写上改正的式子。 */
export const ERASED_ROWS = [4, 5]
const FIX_LINE = '= √3/2 (54 − 6d²)'
const lineY = (row: number) => PAGE_TOP + row * PAGE_LEAD
const opts = (x: number, row: number, seed: number) => ({ x, y: lineY(row), size: PAGE_SIZE, seed, wobble: 1.1 })
const page = (lines: readonly string[], x: number, seed: number, skip: readonly number[] = []) =>
  lines.flatMap((text, row) => (skip.includes(row) ? [] : writeText(text, opts(x, row, seed + row), PAGE_PEN)))
export const PAGE_STATIC = staticPath([...page(LEFT_LINES, COL.left, 100), ...page(RIGHT_LINES, COL.right, 200, ERASED_ROWS)])
/** 会被擦掉的两行单独成一条路径，好加橡皮的遮罩。 */
export const PAGE_ERASABLE = staticPath(ERASED_ROWS.flatMap((row) => writeText(RIGHT_LINES[row], opts(COL.right, row, 200 + row), PAGE_PEN)))
/** 两支笔：左列各写一行；第二支笔写完后移到右列，在擦掉的地方写改正的式子。 */
export const LIVE_PENS: Timed[][] = LIVE_LINES.map((text, i) => writeText(text, opts(COL.left, LEFT_LINES.length + i, 140 + i), { ...PAGE_PEN, speed: 700 }))
export const FIX_PEN: Timed[] = writeText(FIX_LINE, opts(COL.right + 70, ERASED_ROWS[0], 260), { ...PAGE_PEN, speed: 1250, gaps: { stroke: 0.02, glyph: 0.028, space: 0.05 } })

/** 橡皮：在被擦的两行上来回擦。半径按软件的标准档放大到看得清。 */
export const ERASER_R = 58
const eraseTop = lineY(ERASED_ROWS[0]) - 34
const eraseBottom = lineY(ERASED_ROWS[1]) - 10
export const ERASER_SECONDS = 1.7
export const eraserAt = (t: number): P2 => {
  const u = Math.min(1, Math.max(0, t / ERASER_SECONDS))
  // 来回四趟，同时缓慢下移；两端减速。
  const sweeps = 4
  const phase = u * sweeps
  const k = 0.5 - 0.5 * Math.cos(Math.PI * phase)
  const x = COL.right - 10 + k * 900 + 18 * Math.sin(phase * 2.7)
  const y = eraseTop + (eraseBottom - eraseTop) * u + 12 * Math.sin(phase * Math.PI * 1.3)
  return [x, y]
}
/** 橡皮扫过的轨迹（120Hz 采样，用于遮罩）。 */
export const ERASER_TRAIL: P2[] = Array.from({ length: Math.round(ERASER_SECONDS * 120) + 1 }, (_, i) => eraserAt(i / 120))

// ======================================================================
// 第三幕：A 实时笔锋（细笔、放大视图），B 模拟压感 · 快细慢粗（连笔线圈），C 手抖修正（下划线）。
// ======================================================================

export const REGION = { A: { x: 960, y: 600 }, B: { x: 960, y: 2100 }, C: { x: 3000, y: 2100 } }

/** 实时笔锋：一笔长而快的弧线。细笔（基准 18），镜头放大约 2.2 倍，画面上的粗细与笔锋比例接近软件截图。 */
const A = REGION.A
export const TAPER = strokeOf(
  cubic([A.x - 330, A.y + 110], [A.x - 120, A.y + 160], [A.x + 80, A.y - 150], [A.x + 360, A.y - 120], 120),
  { fast: 1500, slow: 1500, start: 0.4, end: 0.85, inLen: 120, outLen: 160, accel: 5200 },
  18,
)

/**
 * 快细慢粗：一串连笔线圈（像书法练习的 ℓℓℓ）。圈顶转弯处慢、墨粗；斜着上下的长笔画快、墨细。
 * 轨迹是上下翻转的长幅摆线：x = r·θ − λr·sin θ，y = −λr·cos θ（λ > 1 时圈顶打结）。
 * 软件的笔宽在原始输入速度 0 到 500 之间从 1.4 倍过渡到 0.8 倍，所以慢段要压到约 150 才粗得明显。
 */
const B = REGION.B
const LOOP_R = 58
const LOOP_L = 2.5
const LOOP_TURNS = 2.0
export const LOOPCHAIN = strokeOf(
  Array.from({ length: 481 }, (_, i) => {
    const th = -0.25 * Math.PI + (i / 480) * (LOOP_TURNS * 2 * Math.PI)
    return [B.x - 480 + LOOP_R * th - LOOP_L * LOOP_R * Math.sin(th), B.y + 20 - LOOP_L * LOOP_R * Math.cos(th)] as const
  }),
  { fast: 2600, slow: 150, bend: 60, start: 0.5, end: 0.85, inLen: 60, outLen: 80, accel: 14000 },
  30,
)

/** 手抖修正：在一行算式下面慢慢画下划线。原始输入（光标）在抖，墨迹却是顺的。 */
const C = REGION.C
export const C_FORMULA = staticPath(writeText('a² + b² = c²', { x: C.x - 330, y: C.y + 10, size: 120, seed: 31 }, { speed: 900, base: 10 }))
export const JITTER_SECONDS = 1.05
export const JITTER_RAW = sampleRaw((t) => {
  const x = C.x - 400 + 800 * (0.5 - 0.5 * Math.cos((Math.PI * t) / JITTER_SECONDS)) * 0.92 + 800 * 0.08 * (t / JITTER_SECONDS)
  // 手抖：几组不同频率的小幅抖动叠加（夸大到看得清）。
  const shake = 11 * Math.sin(2 * Math.PI * 9.2 * t) + 7 * Math.sin(2 * Math.PI * 13.7 * t + 1.3) + 5 * Math.sin(2 * Math.PI * 5.1 * t + 2.1)
  const drift = 14 * Math.sin((Math.PI * t) / JITTER_SECONDS)
  return [x, C.y + 75 + drift + shake] as const
}, JITTER_SECONDS)
/** 修正后的墨：先对原始输入做时间加权平滑（软件里是防抖与弹簧模型），再建模。 */
export const JITTER_INK = modelStroke(
  JITTER_RAW.map((p, i) => {
    let x = 0
    let y = 0
    let wsum = 0
    for (let j = Math.max(0, i - 26); j <= Math.min(JITTER_RAW.length - 1, i + 26); j++) {
      const w = 1 - Math.abs(j - i) / 27
      x += JITTER_RAW[j].x * w
      y += JITTER_RAW[j].y * w
      wsum += w
    }
    return { x: x / wsum, y: y / wsum, t: p.t }
  }),
  14, // 比别的笔细一些，让下面浅灰的抖动线露得出来
)

// 时长自检用（esbuild 打包后打印）。
export const DURATIONS = {
  long: A1_LONG.duration,
  livePens: LIVE_PENS.map(endOf),
  fix: endOf(FIX_PEN),
  taper: TAPER.duration,
  loopchain: LOOPCHAIN.duration,
  jitter: JITTER_INK.duration,
  staticChars: { page: PAGE_STATIC.length },
}
export { paced }
