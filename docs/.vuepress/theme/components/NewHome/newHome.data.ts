import type { BarIconName } from './icons'

// 文案与素材集中在这里维护。media 留空时各区块显示占位样式，
// 填入 { type, src, poster } 即可替换为官方渲染图或动图，布局不变。

export interface MediaSource {
  type: 'image' | 'video'
  src: string
  poster?: string
  alt?: string
}

export type BarButtonId =
  | 'main'
  | 'select'
  | 'draw'
  | 'geometry'
  | 'eraser'
  | 'recall'
  | 'clean'
  | 'more'
  | 'setting'
  | 'whiteboard'
  | 'freeze'

export interface BarButtonItem {
  id: BarButtonId
  label: string
  icon: BarIconName
  size: 'twoTwo' | 'twoOne'
  selected?: boolean
}

export interface HeroFeature {
  id: BarButtonId
  eyebrow: string
  title: string
  desc: string
  href: string
  hrefText: string
  media?: MediaSource
}

export interface SectionCard {
  id: string
  title: string
  desc: string
  media?: MediaSource
}

export interface StatItem {
  value: string
  unit: string
  label: string
}

export interface PenEffect {
  id: 'soft' | 'hard' | 'laser' | 'highlighter' | 'brush'
  name: string
  desc: string
  icon: BarIconName
  comingSoon?: boolean
}

export interface SimpleFeature {
  title: string
  desc: string
}

export const heroCopy = {
  badge: 'Inkeys3 · 即将到来',
  titleLead: '落笔，',
  titleAccent: '即所想。',
  tagline: '智绘教 Inkeys3 带来全新 UI3 界面与 Draw3 画笔引擎。更跟手的笔迹，更安静的界面，更细腻的光影。',
  primaryText: '下载',
  primaryLink: '/download',
  moreText: '了解更多',
  hint: '悬停主栏按钮，了解每一项功能',
}

// 与 Inkeys3 默认布局一致：A1 | 扩展区 | A2（结束放映仅在 PPT 场景出现，不复刻）
export const barGroups: BarButtonItem[][] = [
  [
    { id: 'select', label: '选择', icon: 'select', size: 'twoTwo' },
    { id: 'draw', label: '软笔', icon: 'brush2', size: 'twoTwo', selected: true },
    { id: 'geometry', label: '形状', icon: 'geometry', size: 'twoTwo' },
    { id: 'eraser', label: '橡皮', icon: 'eraser', size: 'twoTwo' },
    { id: 'recall', label: '撤回', icon: 'recall', size: 'twoTwo' },
    { id: 'clean', label: '清空', icon: 'clean', size: 'twoTwo' },
  ],
  [
    { id: 'more', label: '更多', icon: 'more', size: 'twoTwo' },
    { id: 'setting', label: '设置', icon: 'setting', size: 'twoTwo' },
  ],
  [
    { id: 'whiteboard', label: '白板', icon: 'whiteboard', size: 'twoOne' },
    { id: 'freeze', label: '定格', icon: 'freeze', size: 'twoOne' },
  ],
]

export const heroFeatures: HeroFeature[] = [
  {
    id: 'main',
    eyebrow: 'Inkeys3',
    title: '一次从界面到笔迹的重塑',
    desc: 'UI3 与 Draw3 同时到来。熟悉的主栏，全新的光影、动效与画笔。',
    href: '#nh-ui3',
    hrefText: '认识 UI3',
  },
  {
    id: 'draw',
    eyebrow: '画笔 · Draw3',
    title: '笔尖落下，笔迹即至',
    desc: '实时平滑、实时笔锋与墨迹预测。软笔、硬笔、激光笔、荧光笔随心切换。',
    href: '#nh-draw3',
    hrefText: '了解 Draw3',
  },
  {
    id: 'select',
    eyebrow: '选择',
    title: '随时回到桌面',
    desc: '一键切换到选择模式，墨迹保留，与屏幕上的一切照常交互。',
    href: '#nh-features',
    hrefText: '更多功能',
  },
  {
    id: 'geometry',
    eyebrow: '形状',
    title: '随手一画，也能笔直',
    desc: '直线、虚线、矩形与填充矩形，配合抬笔拉直与停留拉直。',
    href: '#nh-features',
    hrefText: '更多功能',
  },
  {
    id: 'eraser',
    eyebrow: '橡皮',
    title: '懂你力度的橡皮',
    desc: '根据速度或压感计算橡皮粗细，慢擦细节，快擦大片。',
    href: '#nh-features',
    hrefText: '更多功能',
  },
  {
    id: 'recall',
    eyebrow: '撤回',
    title: '放心试错',
    desc: '撤回与重做随手可达，墨迹自动保存，写错一笔也不慌。',
    href: '#nh-features',
    hrefText: '更多功能',
  },
  {
    id: 'clean',
    eyebrow: '清空',
    title: '一键，回到空白',
    desc: '瞬间清空当前画面，开始下一段讲解。',
    href: '#nh-features',
    hrefText: '更多功能',
  },
  {
    id: 'more',
    eyebrow: '更多',
    title: '主栏只留下必要的',
    desc: '常用功能收纳在更多中，按钮布局可按习惯调整。',
    href: '#nh-ui3',
    hrefText: '认识 UI3',
  },
  {
    id: 'setting',
    eyebrow: '设置',
    title: '细致，但不繁琐',
    desc: '主题、画笔、压感与界面布局，都能按你的习惯调整。',
    href: '#nh-ui3',
    hrefText: '认识 UI3',
  },
  {
    id: 'whiteboard',
    eyebrow: '白板',
    title: '随开随写的白板',
    desc: '从屏幕批注一键切换到白板，适合板书与推演。',
    href: '#nh-features',
    hrefText: '更多功能',
  },
  {
    id: 'freeze',
    eyebrow: '定格',
    title: '让画面停下来',
    desc: '冻结当前屏幕，在静止的画面上从容批注，视频与动画不再跑掉。',
    href: '#nh-features',
    hrefText: '更多功能',
  },
]

export const ui3Copy = {
  eyebrow: 'UI3',
  title: '安静的界面，细腻的光影。',
  desc: '从按钮尺寸到缓动曲线，UI3 重新打磨了每一个细节。它不抢内容的风头，却在你需要时恰好出现。',
}

export const ui3Cards: Record<'design' | 'interaction' | 'lighting' | 'motion' | 'theme', SectionCard> = {
  design: {
    id: 'design',
    title: '界面设计',
    desc: '浮动主栏只保留真正需要的按钮，其余按需展开。统一的网格、圆角与留白，让工具退到内容身后。',
  },
  interaction: {
    id: 'interaction',
    title: '交互',
    desc: '按下时微缩到 0.95，松开时带一点回弹。每一次点击都有确定的反馈。',
  },
  lighting: {
    id: 'lighting',
    title: '光影',
    desc: '指针与笔尖就是光源。边缘高光随你移动，界面有了厚度。',
  },
  motion: {
    id: 'motion',
    title: '动画',
    desc: '统一的缓动曲线，展开、切换与收起一气呵成。',
  },
  theme: {
    id: 'theme',
    title: '深色与浅色',
    desc: '两套精调配色，在明亮的教室和昏暗的会场都清晰耐看。',
  },
}

export const draw3Copy = {
  eyebrow: 'Draw3',
  title: '每一笔，都跟手。',
  desc: '全新自研画笔引擎，从输入、建模到渲染全链路重写，只为让屏幕上的笔迹像纸上一样自然。',
  beautifyTitle: '笔的美化',
  beautifyDesc: '在你书写的同时完成，而不是抬笔之后。',
  effectsTitle: '笔的效果',
  effectsDesc: '不同的场景，交给不同的笔。',
}

export const draw3Stats: StatItem[] = [
  { value: '120', unit: 'FPS', label: '笔迹建模档位' },
  { value: '≈16.7', unit: 'ms', label: '卡尔曼墨迹预测' },
  { value: 'D3D11.1', unit: '', label: 'GPU 硬件加速渲染' },
  { value: '3', unit: '层', label: '分层合成与脏矩形呈现' },
]

export const draw3Beautify: SectionCard[] = [
  {
    id: 'smoothing',
    title: '实时平滑',
    desc: '基于 ink-stroke-modeler 实时建模，抖动被抚平，形状却不走样。',
  },
  {
    id: 'taper',
    title: '实时笔锋',
    desc: '起笔与收笔自然收尖，书写过程中就能看到，不必等到抬笔。',
  },
  {
    id: 'pressure',
    title: '压感与模拟压感',
    desc: '数位笔读取真实压感；鼠标与触摸按速度模拟压感，同样有粗细变化。',
  },
  {
    id: 'prediction',
    title: '墨迹预测',
    desc: '卡尔曼滤波预测笔尖的下一步，抵消系统延迟，笔迹紧跟笔尖。',
  },
]

export const penEffects: PenEffect[] = [
  { id: 'soft', name: '软笔', desc: '有笔锋，有粗细，像真正的笔。', icon: 'brush2' },
  { id: 'hard', name: '硬笔', desc: '等宽稳定的线条，适合书写与标注。', icon: 'brush1' },
  { id: 'laser', name: '激光笔', desc: '带光晕的指示笔迹，停留片刻后自动淡出。', icon: 'laser' },
  { id: 'highlighter', name: '荧光笔', desc: '扁头半透明，划重点不遮挡文字。', icon: 'highlighter' },
  { id: 'brush', name: '刷子', desc: '更丰富的笔触质感。', icon: 'paintBrush', comingSoon: true },
]

export const moreCopy = {
  eyebrow: '不止于此',
  title: '那些一直在的好功能。',
}

export const moreFeatures: SimpleFeature[] = [
  { title: '轻松上手', desc: '下载解压即可使用，简洁的界面下是强大的功能。' },
  { title: '开源 & 免费', desc: '在 GitHub 上开源，完全免费使用。' },
  { title: 'PPT 联动', desc: '支持 PowerPoint 与 WPS，按键翻页，墨迹跟随页面。' },
  { title: '超级置顶', desc: '基于 UiAccess，在任务栏、开始菜单、屏幕键盘等界面之上保持置顶。' },
  { title: '全局多指', desc: '画笔、荧光笔、橡皮与形状均支持多指同时书写。' },
  { title: '智能绘图', desc: '抬笔拉直与停留拉直，随手一画也规整。' },
  { title: '兼容性', desc: '支持 Windows 7 RTM 及以上系统。' },
  { title: '原生多架构', desc: '提供 x86、x64 与原生 Arm64 版本。' },
]

export const ctaCopy = {
  title: '准备好落笔了吗？',
  desc: '开源，免费，下载解压即用。',
  primaryText: '下载智绘教',
  primaryLink: '/download',
  secondaryText: '使用教程',
  secondaryLink: '/wiki/wiki',
  githubText: 'GitHub',
  githubLink: 'https://github.com/Alan-CRL/Inkeys',
}
