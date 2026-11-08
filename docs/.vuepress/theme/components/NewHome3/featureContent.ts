interface FeatureContent {
  id: string
  title: string
  paragraphs: string[]
  mediaLabel: string
  status?: string
  note?: string
}

/** 翻页主功能：标题含「 · 」时拆为品牌与主题；正文逐句成行，closing 为细线引出的收束句。 */
interface PrimaryFeature {
  id: string
  title: string
  paragraphs: string[]
  closing?: string
  mediaLabel: string
  /** 配图；缺省时显示素材占位。 */
  media?: FeatureMedia
}

/** 配图：src 为点击放大时加载的原图，srcset 另含页内显示用的小图，按显示尺寸择一加载。 */
interface FeatureMedia {
  src: string
  srcset: string
  /** 深色主题下使用的同构图片。 */
  darkSrc: string
  darkSrcset: string
  width: number
  height: number
  alt: string
}

const mediaDir = '/feature-media/new-index3'

/** 图片放在 public/feature-media/new-index3，按主题以 <name>-<light|dark>-1200.webp 与 -2000.webp 成对存放。 */
function featureMedia(name: string, width: number, height: number, alt: string): FeatureMedia {
  const urls = (theme: 'light' | 'dark') => {
    const src = `${mediaDir}/${name}-${theme}-2000.webp`
    return { src, srcset: `${mediaDir}/${name}-${theme}-1200.webp 1200w, ${src} 2000w` }
  }
  const light = urls('light')
  const dark = urls('dark')
  return { ...light, darkSrc: dark.src, darkSrcset: dark.srcset, width, height, alt }
}

/** 「焕新发布」之后的细节功能与更多功能暂时隐藏；恢复时改回 true。 */
export const showMoreFeatures = false

export const primaryFeatures: PrimaryFeature[] = [
  {
    id: 'overview',
    title: 'Inkeys · 自由书写',
    paragraphs: [
      '在屏幕上自由批注，让想法与讲解拥有更多可能。',
      '切换至白板，让思路在画布上无限延展。',
      '或跟随课件放映，逐页书写、从容讲解。',
    ],
    closing: '让书写不受场景限制，让表达自然延续。',
    mediaLabel: '屏幕批注 · 多页白板 · PPT 批注',
    media: featureMedia('overview', 2000, 1125, 'Inkeys 在课件与桌面上自由书写批注，并通过工具栏切换页面与工具'),
  },
  {
    id: 'performance',
    title: '每一笔，都跟得上思路',
    paragraphs: [
      '从快速勾画到细致书写，让笔迹始终紧随笔尖。',
      'GPU 加速的自研绘图引擎，配合实时平滑、墨迹预测与压感处理，让每一次起笔、转折与收笔都自然流畅。',
    ],
    mediaLabel: '笔迹与书写体验',
  },
  {
    id: 'tools',
    title: '多样笔触，自由表达',
    paragraphs: [
      '硬笔清晰利落，软笔富有笔锋，荧光笔突出重点，激光笔随写随隐。',
      '配合多种基础图形工具，从随手圈画到精细标注，让不同的想法都能找到合适的表达方式。',
    ],
    mediaLabel: '多种笔触与基础图形',
    media: featureMedia('tools', 2000, 1250, '在 PDF 文档上使用多种笔触与基础图形进行批注'),
  },
  {
    id: 'ui',
    title: '为每一次交互精心打磨',
    paragraphs: [
      '自研的主工具栏界面，让每一次操作都轻盈自然。',
      '细腻且可打断的回弹动画、随交互流转的动态光影，让每一次按压与切换都充满灵动。',
      '配合无级缩放、自由定位与停靠，让工具栏随心而动。',
      '设置界面则融入 Fluent 2 设计语言，让美感与实用兼得。',
    ],
    mediaLabel: '工具栏与设置界面',
  },
  {
    id: 'compatibility',
    title: '从桌面到大屏，自在书写',
    paragraphs: [
      '无论是个人电脑、Windows 平板，还是教学触控大屏，都能以熟悉的方式自由书写。',
      '支持鼠标、触摸、屏幕笔与数位板，兼容 x86、x64 和原生 ARM64，并照顾仍在使用的旧版 Windows 设备，让书写体验不受设备局限。',
    ],
    mediaLabel: 'Windows 设备与多种输入',
  },
]

/** 焕新发布卡片中「立即下载」的链接。 */
export const downloadContent = {
  href: 'https://1709404.share.123pan.cn/123pan/duk9-Gdr4d',
}

// 内联 HTML 仅来自仓库内受控静态文案；不得接入用户输入或远程内容。
export const detailFeatures: FeatureContent[] = [
  {
    id: 'eraser',
    title: '笔速橡皮与快捷修正',
    paragraphs: [
      '<mark>橡皮大小随擦除速度自动调整</mark>：慢速移动便于修改细节，快速移动扩大擦除范围，减少反复调整大小的操作。',
      '支持按输入设备设置擦除方式，也可使用鼠标右键或支持笔尾擦除的触控笔临时调用橡皮。配合<strong>多级撤回与重做</strong>，方便恢复误擦或误清空的内容，减少重复书写。',
    ],
    mediaLabel: '笔速橡皮与快捷修正',
  },
  {
    id: 'topmost',
    title: '超级置顶',
    paragraphs: [
      '增强批注与工具栏的窗口置顶能力，在更多桌面界面之上保持显示。切换应用、展开系统面板或进行多窗口演示时，减少标注被遮挡、工具需要重新唤回的情况，让讲解与操作保持连贯。',
    ],
    mediaLabel: '超级置顶',
    note: '超级置顶适用于受支持的 Windows 8 及以上系统。',
  },
  {
    id: 'pptcom',
    title: 'PowerPoint 与 WPS 联动',
    paragraphs: [
      '支持与 <strong>PowerPoint、WPS 演示</strong>自动联动，放映时提供页码、翻页与结束放映等控制。保持书写状态即可切换幻灯片，<mark>各页批注随页面分别保留</mark>；返回前页时，可以继续查看和补充。',
      '需要展开推导时，可切入白板，再回到课件继续演示。放映结束后的提示页也可用于补充说明，为课堂总结保留书写空间。',
    ],
    mediaLabel: 'PowerPoint 与 WPS 联动',
    note: '具体联动能力依演示软件版本与放映方式而异。',
  },
]

export const extraFeatures: FeatureContent[] = [
  {
    id: 'freeze',
    title: '画面定格',
    paragraphs: [
      '在桌面批注时，一键<strong>定格当前屏幕画面</strong>，对视频、动画或动态内容中的关键细节进行圈注与说明。解除定格后返回实时画面，方便在动态展示与细节分析之间切换。',
    ],
    mediaLabel: '画面定格',
  },
  {
    id: 'ddb',
    title: 'DDB 插件',
    paragraphs: [
      '通过可选的 DDB 插件，按需拦截教学设备上多余的批注悬浮窗与侧栏，减少重复工具、界面遮挡和误触。支持针对不同软件<strong>分别设置拦截项目</strong>，保持清晰、统一的课堂操作界面。',
    ],
    mediaLabel: 'DDB 插件',
  },
  {
    id: 'operation',
    title: '批注与电脑操作切换',
    paragraphs: [
      '切换到电脑操作时，可<mark>保留屏幕上的批注</mark>，继续点击、滚动和操作下方窗口。通过工具栏或快捷键返回批注状态时，可恢复最近使用的批注工具，减少反复选取。撤回、重做与清空也支持键盘快捷操作。',
    ],
    mediaLabel: '批注与电脑操作切换',
  },
  {
    id: 'multitouch',
    title: '多点书写与同屏协作',
    paragraphs: [
      '在支持多点触控的设备上，可<strong>同时进行多处书写与标注</strong>，方便多人参与讲解、共同完成推导。针对触控输入中的短暂断触提供续接处理，减少连续笔迹被意外打断的情况。',
    ],
    mediaLabel: '多点书写与同屏协作',
  },
]
