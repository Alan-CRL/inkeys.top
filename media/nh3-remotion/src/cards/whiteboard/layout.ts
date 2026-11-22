// “自由白板”卡片的布局常量。
// 卡片坐标：384×576 的 1 倍坐标。白板坐标：以假屏幕的左上角为原点（屏幕和“屏幕批注”那张卡片是同一个位置）。
import { SCREEN } from '../screen-annotation/layout'

export { SCREEN }

/** 软件的一个逻辑单位（DIP）对应多少卡片像素；和“屏幕批注”卡片里主栏用的比例相同。 */
export const UNIT = 0.775

// 白板底色用软件自带的两种预设（调查记录见任务目录 research/codex-whiteboard-survey-result.md）：
// 浅色版米白 #F5F1E6，深色版墨蓝 #172A46。出厂的墨绿在纯色调的网页里显得突兀，所以不用。
// 点阵是可选图案，点距 24、直径 2、不透明度 0.18；浅底画黑点，深底画白点。
// 主笔迹浅底用黑、深底用白；强调笔迹浅底用软件默认的红，红色在墨蓝上偏暗，深底改用调色板里的橙。
const DOTS = { dotOpacity: 0.18, dotGap: 24 * UNIT, dotRadius: 1 * UNIT }
export const BOARDS = {
  light: { ...DOTS, color: '#f5f1e6', gutter: '#e4dfd2', dot: '#000000', ink: '#000000', accent: '#ff1000' },
  dark: { ...DOTS, color: '#172a46', gutter: '#0e1b2e', dot: '#ffffff', ink: '#ffffff', accent: '#ff8b00' },
} as const
export type Board = (typeof BOARDS)[keyof typeof BOARDS]

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
