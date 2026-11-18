// “屏幕批注”卡片的布局常量（384×576 的 1 倍坐标）。
// 示例内容和墨迹都从这里取位置，保证圈住的就是那个标题、那颗行星，荧光笔盖住的就是那句话。

/** 假屏幕：向右伸出卡片；底边收在卡片内，主栏骑在这条底边上。 */
export const SCREEN = { x: 44, y: 204, width: 400, height: 316, radius: 16 }

/** 网页：标题“The red planet”在卡片坐标里的位置。 */
export const WEB = {
  paddingX: 22,
  paddingY: 18,
  headline: { x: SCREEN.x + 22, y: SCREEN.y + 18, width: 190, height: 38, fontSize: 30 },
}

/** PDF：纸张在屏幕里的边距、内边距和行高；phrase 是要被荧光笔盖住的那句话。 */
const PAPER = { margin: 20, padding: 26, headingHeight: 24, headingGap: 12, lineHeight: 26 }
export const PDF = {
  ...PAPER,
  phrase: {
    x: SCREEN.x + PAPER.margin + PAPER.padding,
    // 第二行的行框顶部。
    y: SCREEN.y + PAPER.margin + PAPER.padding + PAPER.headingHeight + PAPER.headingGap + PAPER.lineHeight,
    width: 100,
    height: PAPER.lineHeight,
  },
}

/** 视频：行星的轨道（屏幕内的坐标）。stopAngle 是定格时行星所在的角度。 */
export const ORBIT = {
  cx: 170,
  cy: 150,
  rx: 178,
  ry: 115,
  tilt: -16,
  planetRadius: 12,
  stopAngle: -52,
  degreesPerSecond: 84,
  inner: { rx: 104, ry: 62, planetRadius: 6, stopAngle: 150, degreesPerSecond: 110 },
}

export function orbitPoint(angle: number, rx: number, ry: number): { x: number; y: number } {
  const a = (angle * Math.PI) / 180
  const t = (ORBIT.tilt * Math.PI) / 180
  const x = Math.cos(a) * rx
  const y = Math.sin(a) * ry
  return { x: ORBIT.cx + x * Math.cos(t) - y * Math.sin(t), y: ORBIT.cy + x * Math.sin(t) + y * Math.cos(t) }
}

/** 定格时行星在卡片坐标里的位置。 */
const stop = orbitPoint(ORBIT.stopAngle, ORBIT.rx, ORBIT.ry)
export const PLANET_STOP = { x: SCREEN.x + stop.x, y: SCREEN.y + stop.y }
