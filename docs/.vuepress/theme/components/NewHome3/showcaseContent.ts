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

/** 悬停批注：标题说明是什么，正文说明能做什么，source 注明这一层的真实来源。 */
export interface LayerNote {
  title: string
  body: string
  source: string
}

/** 拆解时同一高度的一组图层；label 显示在拆解图左侧。 */
export interface LayerLevel {
  title: string
  detail: string
  layers: string[]
}

export interface ShowcaseScene {
  page: 'overview' | 'tools'
  mode: 'explode' | 'write'
  title: string
  paragraphs: string[]
  closing?: string
  alt: string
  notes: Record<string, LayerNote>
  levels?: LayerLevel[]
  /** write 模式下依次「写」上去的图层及顺序。 */
  writeOrder?: string[]
  /** write 模式下的笔触图例，顺序即图例顺序。 */
  legend?: { id: string, swatch: string }[]
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

const NATIVE_UI = 'Inkeys-draw dev 5f1fd1b · 原生离屏渲染'

export const overviewScene: ShowcaseScene = {
  page: 'overview',
  mode: 'explode',
  title: 'Inkeys · 自由书写',
  paragraphs: [
    '在屏幕上自由批注，让想法与讲解拥有更多可能。',
    '切换至白板，让思路在画布上无限延展。',
    '或跟随课件放映，逐页书写、从容讲解。',
  ],
  closing: '让书写不受场景限制，让表达自然延续。',
  alt: 'Inkeys 在课件、桌面与白板上书写批注的合成图，可逐层查看',
  levels: [
    { title: '底图', detail: '桌面、课件与白板', layers: ['desktop', 'slide', 'board', 'dividers'] },
    { title: '墨迹', detail: 'Inkeys 实机渲染', layers: ['slide-ink', 'board-shapes', 'board-ink'] },
    { title: '字标', detail: '网页软笔绘制', layers: ['wordmark', 'tagline'] },
    { title: '界面', detail: '原生工具栏与分页', layers: ['ppt-pager', 'toolbar', 'board-pager'] },
  ],
  notes: {
    'desktop': { title: '屏幕批注', body: '不必切换软件，直接在桌面和任意窗口上书写。', source: 'Windows 11 桌面底图' },
    'slide': { title: '课件放映', body: '跟随 PowerPoint 与 WPS 放映，逐页书写，各页批注分别保留。', source: '课件底图' },
    'slide-ink': { title: '课件批注', body: '圈出标题、划出重点、用箭头串起过程，一份课件讲得更清楚。', source: 'Inkeys 渲染管线输出' },
    'board': { title: '多页白板', body: '切换到白板，点阵画布给推导留足空间。', source: 'Inkeys-draw 718b0eb · 原生离屏渲染' },
    'board-shapes': { title: '图形工具', body: '坐标轴、双曲线与虚线辅助线，用图形工具一次画准。', source: 'Inkeys-draw feature/shape d060e39 · 原生离屏渲染' },
    'board-ink': { title: '白板手写', body: '公式与推导由软笔写成，笔锋随书写速度自然变化。', source: 'Inkeys-draw 718b0eb · 原生离屏渲染' },
    'wordmark': { title: 'Inkeys 字标', body: '与首屏同一支软笔、同一套彩虹配色。', source: '网页软笔绘制器离屏渲染' },
    'ppt-pager': { title: '放映翻页', body: '放映时在屏幕两侧显示页码与翻页按钮，书写中也能直接翻页。', source: NATIVE_UI },
    'toolbar': { title: '主工具栏', body: '选择、软笔、图形、橡皮一键切换；按压回弹可被打断，光影随指针流动。', source: NATIVE_UI },
    'board-pager': { title: '白板分页', body: '白板同样分页，前后翻页随时回看。', source: NATIVE_UI },
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
  alt: '在 PDF 文档上使用软笔、荧光笔与图形工具批注，笔迹可逐层查看',
  writeOrder: ['brush', 'pattern', 'geometry', 'highlight', 'handwriting'],
  legend: [
    { id: 'handwriting', swatch: '#ff1000' },
    { id: 'highlight', swatch: '#f2d64b' },
    { id: 'geometry', swatch: '#2f62b8' },
    { id: 'brush', swatch: '#efe6cf' },
    { id: 'pattern', swatch: '#81745b' },
  ],
  notes: {
    'background': { title: '任意文档', body: '浏览器里打开的 PDF，也能直接在上面批注。', source: 'Chrome 与 PDF 底图' },
    'handwriting': { title: '软笔', body: '起笔、转折、收笔都有笔锋，推导写得又快又清楚。', source: 'Inkeys-draw dev 97e6192 · 原生离屏渲染' },
    'highlight': { title: '荧光笔', body: '半透明笔迹叠在文字上，重点一眼可见，原文依旧清晰。', source: 'Inkeys-draw dev 97e6192 · 原生离屏渲染' },
    'geometry': { title: '图形工具', body: '直线与虚线拼出立方体与截面，端点对得整整齐齐。', source: 'Inkeys-draw feature/shape d060e39 · 原生离屏渲染' },
    'brush': { title: '平头笔', body: '宽扁的笔头一笔铺开，为草图垫出一块纸面。', source: 'Inkeys-draw dev 97e6192 · 原生离屏渲染' },
    'pattern': { title: '纹理笔刷（预览）', body: '点阵纹理展示的是仍在开发中的笔刷能力，当前版本暂不提供。', source: '按平头笔覆盖范围裁切的纹理演示' },
    'toolbar': { title: '主工具栏', body: '常用工具集中在一处，书写中随手切换。', source: NATIVE_UI },
  },
}

/** 尚无配图的三项：素材由作者补充，先以图层舞台的占位呈现。 */
export const pendingScenes = [
  { id: 'performance', title: '每一笔，都跟得上思路', paragraphs: ['从快速勾画到细致书写，让笔迹始终紧随笔尖。', 'GPU 加速的自研绘图引擎，配合实时平滑、墨迹预测与压感处理，让每一次起笔、转折与收笔都自然流畅。'], mediaLabel: '笔迹与书写体验' },
  { id: 'ui', title: '为每一次交互精心打磨', paragraphs: ['自研的主工具栏界面，让每一次操作都轻盈自然。', '细腻且可打断的回弹动画、随交互流转的动态光影，让每一次按压与切换都充满灵动。', '配合无级缩放、自由定位与停靠，让工具栏随心而动。设置界面则融入 Fluent 2 设计语言，让美感与实用兼得。'], mediaLabel: '工具栏与设置界面' },
  { id: 'compatibility', title: '从桌面到大屏，自在书写', paragraphs: ['无论是个人电脑、Windows 平板，还是教学触控大屏，都能以熟悉的方式自由书写。', '支持鼠标、触摸、屏幕笔与数位板，兼容 x86、x64 和原生 ARM64，并照顾仍在使用的旧版 Windows 设备。'], mediaLabel: 'Windows 设备与多种输入' },
]

export const githubContent = {
  href: 'https://github.com/Alan-CRL/Inkeys',
}
