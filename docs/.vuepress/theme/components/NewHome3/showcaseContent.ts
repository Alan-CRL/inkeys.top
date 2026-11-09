import type { BarIconName } from '../NewHome/icons'
import layersData from './showcaseLayers.json'

/** 图层清单由 scripts/build-showcase-layers.py 生成；box/clip 为画布像素，自下而上排列。 */
export interface ShowcaseLayer {
  id: string
  box: [number, number, number, number]
  clip: [number, number][] | null
  themes: 'shared' | 'split'
  half: boolean
}

export interface ShowcasePage {
  width: number
  height: number
  layers: ShowcaseLayer[]
}

/** 悬停批注：标题说明是什么，正文一句话点到为止。 */
export interface LayerNote {
  title: string
  body: string
}

export interface ShowcaseScene {
  page: 'overview' | 'tools'
  mode: 'explode' | 'write'
  title: string
  paragraphs: string[]
  closing?: string
  alt: string
  notes: Record<string, LayerNote>
  /** 拆解时自下而上的高度分组，同组图层位于同一平面。 */
  levels?: string[][]
  /** 多个图层合为一项查看：键为图层，值为承载批注的图层。 */
  groups?: Record<string, string>
  /** write 模式下依次「写」上去的图层及顺序。 */
  writeOrder?: string[]
  /** write 模式下舞台两侧的笔触图标，使用原生工具栏图标。 */
  legend?: { id: string, icon: BarIconName, side: 'left' | 'right' }[]
}

const data = layersData as Record<'overview' | 'tools', ShowcasePage>

export function showcasePage(page: 'overview' | 'tools'): ShowcasePage {
  return data[page]
}

const mediaDir = '/feature-media/new-index3/layers'

/** 文件名规则与生成脚本一致：<id>-<light|dark|shared>-<full|half>.webp。 */
export function layerUrl(page: string, layer: ShowcaseLayer, theme: 'light' | 'dark', size: 'full' | 'half') {
  const variant = layer.themes === 'shared' ? 'shared' : theme
  return `${mediaDir}/${page}/${layer.id}-${variant}-${size}.webp`
}

export const overviewScene: ShowcaseScene = {
  page: 'overview',
  mode: 'explode',
  title: 'Inkeys · 自由书写',
  paragraphs: [
    '在屏幕上自由批注，让想法与讲解拥有更多可能。切换至白板，让思路在画布上无限延展；或跟随课件放映，逐页书写、从容讲解。',
  ],
  closing: '让书写不受场景限制，让表达自然延续。',
  alt: 'Inkeys 在课件、桌面与白板上书写批注的合成图',
  levels: [
    ['desktop', 'slide', 'board', 'dividers'],
    ['slide-ink', 'board-shapes', 'board-ink'],
    ['wordmark', 'tagline'],
    ['ppt-pager', 'toolbar', 'board-pager'],
  ],
  // 字标与标语不设批注：一眼可辨，无需交互。
  notes: {
    'desktop': { title: '屏幕批注', body: '在桌面与任意窗口上直接书写。' },
    'slide': { title: '课件放映', body: '跟随 PowerPoint 与 WPS 放映，逐页书写，批注随页保留。' },
    'slide-ink': { title: '课件批注', body: '圈出标题，划出重点，用箭头串起过程。' },
    'board': { title: '多页白板', body: '点阵画布，为推导留足空间。' },
    'board-shapes': { title: '图形工具', body: '坐标轴、曲线与辅助线，一次画准。' },
    'board-ink': { title: '白板手写', body: '笔锋随书写速度自然变化。' },
    'ppt-pager': { title: '放映翻页', body: '页码与翻页停靠屏幕两侧，书写中也能直接翻页。' },
    'toolbar': { title: '主工具栏', body: '按压回弹可被打断，光影随指针流动。' },
    'board-pager': { title: '白板分页', body: '前后翻页，随时回看。' },
  },
}

export const toolsScene: ShowcaseScene = {
  page: 'tools',
  mode: 'write',
  title: '多样笔触，自由表达',
  paragraphs: [
    '硬笔清晰利落，软笔富有笔锋，荧光笔突出重点，激光笔随写随隐。',
    '配合多种基础图形工具，从随手圈画到精细标注，让不同的想法都能找到合适的表达方式。',
  ],
  alt: '在 PDF 文档上使用软笔、荧光笔、图形工具与刷子批注',
  writeOrder: ['brush', 'pattern', 'geometry', 'highlight', 'handwriting'],
  // 刷子的底色与纹理分属两层，查看时作为同一种笔触一起抬起。
  groups: { pattern: 'brush' },
  legend: [
    { id: 'handwriting', icon: 'brush2', side: 'left' },
    { id: 'highlight', icon: 'highlighter', side: 'left' },
    { id: 'geometry', icon: 'geometry', side: 'right' },
    { id: 'brush', icon: 'paintBrush', side: 'right' },
  ],
  notes: {
    'background': { title: '任意文档', body: '浏览器里的 PDF，同样可以直接批注。' },
    'handwriting': { title: '软笔', body: '起笔、转折、收笔，笔锋分明。' },
    'highlight': { title: '荧光笔', body: '半透明叠加，重点醒目，原文清晰。' },
    'geometry': { title: '图形工具', body: '直线与虚线拼出立方体与截面，端点严丝合缝。' },
    'brush': { title: '刷子', body: '宽笔头一笔铺开，带出纸面般的纹理。' },
    'toolbar': { title: '主工具栏', body: '常用工具集中一处，随手切换。' },
  },
}

/** 尚无配图的三项：素材由作者补充，先以图层舞台的占位呈现。 */
export const pendingScenes = [
  { id: 'performance', title: '每一笔，都跟得上思路', paragraphs: ['从快速勾画到细致书写，让笔迹始终紧随笔尖。', 'GPU 加速的自研绘图引擎，配合实时平滑、墨迹预测与压感处理，让每一次起笔、转折与收笔都自然流畅。'] },
  { id: 'ui', title: '为每一次交互精心打磨', paragraphs: ['自研的主工具栏界面，让每一次操作都轻盈自然。', '细腻且可打断的回弹动画、随交互流转的动态光影，让每一次按压与切换都充满灵动。', '配合无级缩放、自由定位与停靠，让工具栏随心而动。设置界面则融入 Fluent 2 设计语言，让美感与实用兼得。'] },
  { id: 'compatibility', title: '从桌面到大屏，自在书写', paragraphs: ['无论是个人电脑、Windows 平板，还是教学触控大屏，都能以熟悉的方式自由书写。', '支持鼠标、触摸、屏幕笔与数位板，兼容 x86、x64 和原生 ARM64，并照顾仍在使用的旧版 Windows 设备。'] },
]

export const githubContent = {
  href: 'https://github.com/Alan-CRL/Inkeys',
}
