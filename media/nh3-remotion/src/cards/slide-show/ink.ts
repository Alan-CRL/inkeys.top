import { loopPoints, writePath, type Point } from '../../ink/path'
import { buildSoftStroke } from '../../ink/softPen'
import { barX, CHART, STEPS, TITLE } from './Deck'

const pen = { base: 3.1, expectedSpeed: 420 }

/** 第 1 页：激光笔圈住进度线的最后一步。它只是“看这里”，不留在页面上。 */
export const LASER_TARGET = { x: STEPS.x[2], y: STEPS.y + 9 }
export const laserLoop = writePath(loopPoints({ cx: LASER_TARGET.x, cy: LASER_TARGET.y, rx: 33, ry: 29, tilt: 0.05, overlap: 24 }), { duration: 0.8 })

/** 第 1 页：用笔圈住标题。这一笔留在第 1 页上。 */
export const titleCircle = buildSoftStroke(writePath(loopPoints({
  cx: TITLE.x + TITLE.width / 2,
  cy: TITLE.baseline - TITLE.fontSize * 0.3,
  rx: TITLE.width / 2 + 14,
  ry: TITLE.fontSize * 0.72,
  tilt: -0.04,
}), { duration: 0.95 }), { ...pen, expectedSpeed: 560 })

// 第 2 页：一条沿着柱顶往上走的箭头，悬在柱子上方，不用懂图表也看得出“在涨”。
const top = (index: number): Point => [barX(index) + CHART.barWidth / 2, CHART.baseline - CHART.heights[index]]
const lift = 20
const trend: Point[] = [
  [top(0)[0] - 4, top(0)[1] - lift + 2],
  [top(1)[0], top(1)[1] - lift - 1],
  [top(2)[0], top(2)[1] - lift - 3],
  [top(3)[0], top(3)[1] - lift - 4],
  [top(4)[0] + 2, top(4)[1] - lift],
]
export const trendArrow = buildSoftStroke(writePath(trend, { duration: 0.8 }), pen)

// 箭头尖：从一侧落笔，划到尖端再折回另一侧，一笔写成。
const [tipX, tipY] = trend[trend.length - 1]
const [fromX, fromY] = trend[trend.length - 2]
const heading = Math.atan2(tipY - fromY, tipX - fromX)
const barb = (turn: number, length: number): Point => [tipX + Math.cos(heading + turn) * length, tipY + Math.sin(heading + turn) * length]
export const arrowTip = buildSoftStroke(
  writePath([barb(Math.PI - 0.62, 15), barb(Math.PI - 0.5, 7), [tipX + 1, tipY - 1], barb(Math.PI + 0.55, 7), barb(Math.PI + 0.66, 15)], { duration: 0.26 }),
  pen,
)

/** 箭头杆写完到落笔写箭头尖之间的间隔（秒）。 */
export const TIP_GAP = 0.09
