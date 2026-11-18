// “自由白板”卡片的布局常量。
// 卡片坐标：384×576 的 1 倍坐标。白板坐标：以假屏幕的左上角为原点（屏幕和“屏幕批注”那张卡片是同一个位置）。
import { SCREEN } from '../screen-annotation/layout'

export { SCREEN }

/** 软件的一个逻辑单位（DIP）对应多少卡片像素；和“屏幕批注”卡片里主栏用的比例相同。 */
export const UNIT = 0.775

// 白板的出厂外观（调查记录见任务目录 research/codex-whiteboard-survey-result.md）：
// 底色 #123B32，与软件的深浅主题无关；点阵是可选图案，点距 24、直径 2，深底上是白点、不透明度 0.18。
export const BOARD = { color: '#123b32', gutter: '#0b2620', dot: '#ffffff', dotOpacity: 0.18, dotGap: 24 * UNIT, dotRadius: 1 * UNIT }
/** 深底白板上的默认笔色是白色；黄色取自默认调色板。 */
export const CHALK = { white: '#ffffff', yellow: '#ffc510' }

/** 相邻两页之间的间隙（只在翻页的过渡里看得到）。 */
export const PAGE_GUTTER = 14
export const PAGE_PITCH = SCREEN.width + PAGE_GUTTER

/** 第一页：算式写在左上，曲线横贯中部。 */
export const EQUATION = { x: 34, y: 34, height: 28 }
export const WAVE = { x0: 30, x1: 324, y: 178, amplitude: 40, periods: 2.5 }

/** 第二页：六棱柱。center 是底面中心，radius 是底面外接圆半径，height 是高。 */
export const PRISM = { center: { x: 140, y: 212 }, radius: 60, height: 116, sides: 6 }
/** 棱柱旁的标注“h”。 */
export const LABEL = { x: 236, y: 126, height: 27 }

/** 镜头在卡片里对准的位置：网页文字区以下那块区域的中心。 */
export const ANCHOR = { x: 192, y: 390 }
/** 这条线以上留给网页叠加的文字，画面不进入。 */
export const MATTE = 196
