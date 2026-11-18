// 三道笔迹。位置全部由 layout.ts 的常量算出，不单独写死。
import { loopPoints, writePath } from '../../ink/path'
import { buildSoftStroke } from '../../ink/softPen'
import { PDF, PLANET_STOP, WEB } from './layout'

// 软件里是 3 单位粗细配 500 像素每秒；这里按同一比例放大，让笔锋在小卡片里看得清。
// 书写加快后把“预期速度”同比例调高，保住转弯粗、长弧细的变化。
const SOFT_PEN = { base: 5.2, expectedSpeed: 1090 }

/** 第一拍：圈出网页标题。圈比屏幕大，上沿和左沿越过屏幕边框。 */
const headline = WEB.headline
export const headlineLoop = buildSoftStroke(
  writePath(loopPoints({ cx: headline.x + headline.width / 2, cy: headline.y + headline.height / 2, rx: headline.width / 2 + 40, ry: headline.height / 2 + 29, tilt: -0.07, overlap: 30 }), { duration: 0.8 }),
  SOFT_PEN,
)

/** 第三拍：圈出定格后的行星，圈的上沿越过屏幕边框。 */
export const planetLoop = buildSoftStroke(
  writePath(loopPoints({ cx: PLANET_STOP.x, cy: PLANET_STOP.y + 1, rx: 39, ry: 37, tilt: -0.14, overlap: 36, wobble: 0.8 }), { duration: 0.6 }),
  SOFT_PEN,
)

/** 第二拍：荧光笔只盖住“687 Earth days,”这几个词，起止都贴着文字，不画到屏幕外面。 */
const phrase = PDF.phrase
const middle = phrase.y + phrase.height / 2 + 0.5
const from = phrase.x - 1
const to = phrase.x + phrase.width + 1
export const phraseSweep = writePath(
  [0, 0.25, 0.5, 0.75, 1].map((u, i) => [from + (to - from) * u, middle + [0.7, -0.5, 0.4, -0.3, 0.2][i]] as const),
  { duration: 0.5, startSpeed: 0.55, endSpeed: 0.25 },
)
export const HIGHLIGHTER_NIB = { height: 21, width: 21 / 8 }
