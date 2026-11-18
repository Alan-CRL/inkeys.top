// 两页上的手写笔迹。位置全部由 layout.ts 的常量算出。
import { writeText } from '../../ink/handwriting'
import { writePath, type Point } from '../../ink/path'
import { buildSoftStroke } from '../../ink/softPen'
import { EQUATION, LABEL, WAVE } from './layout'

// 软件里软笔的基准粗细是 3 个逻辑单位；小字和曲线用同一支笔。
// “预期速度”按各自的书写速度取，保住慢处粗、快处细的变化。
export const PEN_WIDTH = 3
/** 形状的线是等宽的，取 3 个逻辑单位的真实大小，比手写的笔迹略细。 */
export const SHAPE_WIDTH = 2.5
const TEXT_PEN = { base: PEN_WIDTH, expectedSpeed: 380 }
const WAVE_PEN = { base: PEN_WIDTH * 1.12, expectedSpeed: 520 }

/** 算式 y = sin x。 */
export const equation = writeText(['y', ' ', '=', ' ', 's', 'in', ' ', 'x'], {
  origin: [EQUATION.x, EQUATION.y],
  height: EQUATION.height,
  pen: TEXT_PEN,
  pace: 12.5,
  gaps: { stroke: 0.055, glyph: 0.075, space: 0.11 },
})

/** 正弦曲线：一笔写完。振幅和周期带一点手写的不规则，收笔在向下穿过中线的途中，留下笔锋。 */
const waveSteps = Math.round(WAVE.periods * 16)
const wavePoints: Point[] = Array.from({ length: waveSteps + 1 }, (_, i) => {
  const u = i / waveSteps
  const phase = u * WAVE.periods * 2 * Math.PI
  const amplitude = WAVE.amplitude * (1 + 0.05 * Math.sin(1.7 * phase + 0.6) - 0.04 * u)
  return [WAVE.x0 + (WAVE.x1 - WAVE.x0) * (u + 0.006 * Math.sin(2.3 * phase)), WAVE.y - amplitude * Math.sin(phase) + 2.2 * Math.sin(0.45 * phase)] as const
})
export const WAVE_DURATION = 1.45
export const wave = buildSoftStroke(writePath(wavePoints, { duration: WAVE_DURATION, startSpeed: 0.4, endSpeed: 0.75 }), WAVE_PEN)

/** 第二页：棱柱旁的“h”。 */
export const label = writeText(['h'], { origin: [LABEL.x, LABEL.y], height: LABEL.height, pen: TEXT_PEN, pace: 11 })
