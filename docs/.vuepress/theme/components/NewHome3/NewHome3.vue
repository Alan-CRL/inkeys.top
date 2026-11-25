<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue'
import { useDarkMode, VPLink } from 'vuepress-theme-plume/client'
import { useSiteLocaleData } from 'vuepress/client'
import { computeLayout, createActiveClock, createPainter, createScene } from './softPen'
import type { Painter } from './softPen'
import { createPlayback } from './playback'
import { getEraserFrame } from './eraser'
import { pointerTarget } from './parallax'
import SectionAbilities from './SectionAbilities.vue'
import SectionScenes from './SectionScenes.vue'
import SectionCraft from './SectionCraft.vue'
import SectionDownload from './SectionDownload.vue'
import { useCopy } from './copy'
import './home.css'
import { toolIcons } from './toolIcons'
import { PEN_ORDER, resolveSolidColor } from './styles'
import type { ColorChoice, PenKind, StrokeSize } from './styles'

const scene = createScene()
const downloadHref = '/download'
const starHref = 'https://github.com/Alan-CRL/Inkeys'
const { locale, copy } = useCopy()
// 主视觉里的 Inkeys 字样是装饰图形，另放一个只给搜索引擎与读屏读取的 h1（各语言的站点名）。
const siteLocale = useSiteLocaleData()
const root = ref<HTMLDivElement>()
const plane = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
const planeStyle = ref<Record<string, string>>({ aspectRatio: String(scene.aspect) })
const clock = createActiveClock()
const heroCopy = ref<HTMLDivElement>()
const copyStyle = ref<Record<string, string>>({})
// 首屏入场的三个部分：艺术字、标语（整句一起出现）、按钮。
const entranceDelays = [0, 0.3, 0.5]
const entranceStyles = shallowRef<Record<string, string>[]>(entranceDelays.map(() => ({ opacity: '0' })))
const playback = createPlayback()
const paused = ref(false)
const isDark = useDarkMode()
const iconPath = ref(iconPaths(0))
const controls = ref<HTMLDivElement>()
const paletteButton = ref<HTMLButtonElement>()
const panel = ref<HTMLDivElement>()
const panelOpen = ref(false)
const selectedPens = ref<PenKind[]>(['hard', 'laser'])
const selectedEraser = ref(true)
const eraserFrame = shallowRef<ReturnType<typeof getEraserFrame>>()
const artMaskPaths = ref<SVGGElement>()
const cssCanvasMask = ref(false)
const cssMaskName = `nh3-mask-${useId().replace(/[^a-zA-Z0-9_-]/g, '-')}`
type CSSCanvasDocument = Document & { getCSSCanvasContext?: (kind: '2d', name: string, width: number, height: number) => CanvasRenderingContext2D | null }
const toolChoices = [...PEN_ORDER, 'eraser'] as const
const selectedColor = ref<ColorChoice>('rainbow')
const selectedSize = ref<StrokeSize>('medium')
const artFrame = shallowRef(playback.read(0))
const tiltStyle = ref<Record<string, string>>({})
const penLabels = computed<Record<PenKind | 'eraser', string>>(() => copy.value.hero.pens)
const colorChoices: ColorChoice[] = ['rainbow', 'neutral', 'red', 'amber', 'green', 'cyan', 'blue', 'purple']
const colorLabels = computed<Record<ColorChoice, string>>(() => copy.value.hero.colors)
const sizeChoices: StrokeSize[] = ['thin', 'medium', 'thick']
const sizeLabels = computed<Record<StrokeSize, string>>(() => copy.value.hero.sizes)
const sizeWidths = { thin: 2.8, medium: 4, thick: 5.6 }

let painter: Painter | undefined
let frame = 0
let previousFrame = 0
let frozen: number | undefined
let inViewport = true
let mounted = false
let width = 0
let height = 0
let resizeObserver: ResizeObserver | undefined
let visibleObserver: IntersectionObserver | undefined
let targetX = 0
let targetY = 0
let tiltX = 0
let tiltY = 0
let iconProgress = 0
let iconVelocity = 0
let maskNode: SVGGElement | undefined
let maskPaths: readonly string[] = []
let maskSize = ''
let cssMaskContext: CanvasRenderingContext2D | undefined
let lastCanvasKey = ''
let lastEraserKey = ''
let warmedSize = ''
let cancelWarmup: (() => void) | undefined
let entranceComplete = false
let reduceMotion = false

function updateEntrance(now: number) {
  if (entranceComplete) return
  const time = frozen ?? clock.read(now)
  // 播放暂停只改变调度状态，不停止可见活跃时钟，因此早暂停也不会把文案卡在半显。
  entranceStyles.value = entranceDelays.map((delay, index) => {
    const progress = Math.max(0, Math.min(1, (time - delay) / 0.6))
    const eased = 1 - (1 - progress) ** 3
    // 标语和按钮淡入的同时上移 12px 到位；艺术字自己有书写动画，只淡入。
    const rise = index === 0 || reduceMotion || progress === 1 ? 0 : (1 - eased) * 12
    return rise ? { opacity: String(eased), transform: `translateY(${rise}px)` } : { opacity: String(eased) }
  })
  entranceComplete = time >= 1.1
}

function iconPaths(progress: number) {
  const pause = [
    [[7, 5], [10, 5], [10, 19], [7, 19]],
    [[14, 5], [17, 5], [17, 19], [14, 19]],
  ]
  const play = [
    [[8, 5], [12.3, 7.6], [12.3, 16.4], [8, 19]],
    [[11.7, 7.2], [19, 11.7], [19, 12.3], [11.7, 16.8]],
  ]
  // 两个子轮廓使用同一组命令连续变形，播放态在中间相接，不切换或叠放两套图标。
  return pause.map((vertices, part) => {
    const points = vertices.map((point, i) => point.map((value, axis) =>
      value + (play[part][i][axis] - value) * progress))
    const corners = points.map((point, i) => {
      const previous = points[(i + 3) % 4]
      const next = points[(i + 1) % 4]
      const incoming = Math.hypot(previous[0] - point[0], previous[1] - point[1])
      const outgoing = Math.hypot(next[0] - point[0], next[1] - point[1])
      const radius = Math.min(0.8, incoming / 2, outgoing / 2)
      const toward = (to: number[], length: number) => point.map((value, axis) =>
        value + (to[axis] - value) * radius / Math.max(length, 0.001))
      return { point, enter: toward(previous, incoming), leave: toward(next, outgoing) }
    })
    return `M${corners[0].enter.join(',')}` + corners.map((corner, i) =>
      `Q${corner.point.join(',')} ${corner.leave.join(',')}L${corners[(i + 1) % 4].enter.join(',')}`).join('') + 'Z'
  }).join(' ')
}

function canAnimate() {
  return mounted && !document.hidden && inViewport
}

function cancelEraserWarmup() {
  cancelWarmup?.()
  cancelWarmup = undefined
}

function warmEraserAtRest() {
  const size = `${width}:${height}`
  if (cancelWarmup || warmedSize === size || !selectedEraser.value || !canAnimate() || width <= 0 || height <= 0) return
  const warm = () => {
    cancelWarmup = undefined
    if (!canAnimate() || !selectedEraser.value || size !== `${width}:${height}`) return
    // 只在完整字停留时预建相同尺寸的几何，不改变播放时钟或发布擦除帧。
    getEraserFrame(0, width, height)
    warmedSize = size
  }
  if (typeof window.requestIdleCallback === 'function' && typeof window.cancelIdleCallback === 'function') {
    const id = window.requestIdleCallback(warm, { timeout: 250 })
    cancelWarmup = () => window.cancelIdleCallback(id)
  }
  else {
    const id = setTimeout(warm, 48)
    cancelWarmup = () => clearTimeout(id)
  }
}

function paint(now: number) {
  updateEntrance(now)
  const node = canvas.value
  if (!node || !painter) return
  const current = playback.read(frozen ?? clock.read(now))
  const previous = artFrame.value
  // Canvas 的书写时间独立推进；模板只发布实际可见字段变化，保持期不反复触发整棵控件更新。
  if (current.view !== previous.view || current.state.opacity !== previous.state.opacity
    || current.artColor !== previous.artColor || current.previousColor !== previous.previousColor
    || current.colorMix !== previous.colorMix || current.shimmer !== previous.shimmer
    || current.eraseProgress !== previous.eraseProgress || current.eraseOpacity !== previous.eraseOpacity) {
    artFrame.value = current
  }
  const eraserKey = `${current.eraseProgress}:${width}:${height}:${window.devicePixelRatio}`
  const eraserChanged = eraserKey !== lastEraserKey
  if (eraserChanged) {
    eraserFrame.value = current.eraseProgress >= 0 && width > 0 && height > 0
      ? getEraserFrame(current.eraseProgress, width, height) : undefined
    lastEraserKey = eraserKey
    if (eraserFrame.value) warmedSize = `${width}:${height}`
  }
  if (current.view === 'ink') {
    const { rawTime, inkTime, opacity } = current.state
    const { pen, color, size } = current.style
    const key = [rawTime, inkTime, opacity, current.eraseProgress, width, height,
      window.devicePixelRatio, isDark.value, pen, color, size].join(':')
    if (key !== lastCanvasKey) {
      painter.render(current.state, width, height, window.devicePixelRatio,
        isDark.value ? 'dark' : 'light', current.style, current.eraseProgress)
      lastCanvasKey = key
    }
  }
  if (current.eraseProgress < 0 && current.state.inkTime === 4.2
    && current.state.rawTime < 0 && current.state.opacity === 1) warmEraserAtRest()
  if ((maskNode || cssMaskContext) && (current.view !== 'art' || !eraserFrame.value)) {
    maskNode = undefined
    maskPaths = []
    maskSize = ''
  }
  // 艺术字使用 DOM 字体；隐藏 Canvas 时不再绘制不可见墨迹或重复回放擦除。
  if (current.view === 'art' && eraserFrame.value
    && (eraserChanged || (cssCanvasMask.value ? !cssMaskContext : !maskNode))) void nextTick(syncArtMask)
}

function syncArtMask() {
  const node = artMaskPaths.value
  const paths = eraserFrame.value?.paths
  if (!mounted || artFrame.value.view !== 'art' || !paths) return
  if (cssCanvasMask.value) {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    const pixelWidth = Math.ceil(width * dpr)
    const pixelHeight = Math.ceil(height * dpr)
    const size = `${width}:${height}:${pixelWidth}:${pixelHeight}`
    const reset = !cssMaskContext || size !== maskSize || paths.length < maskPaths.length
      || (maskPaths.length && paths[maskPaths.length - 1] !== maskPaths[maskPaths.length - 1])
    if (reset) {
      // WebKit 的命名 Canvas 会主动通知 CSS 遮罩客户端；不编码 PNG，也不转换 DOM 字体。
      cssMaskContext = (document as CSSCanvasDocument).getCSSCanvasContext?.('2d', cssMaskName, pixelWidth, pixelHeight) ?? undefined
      if (!cssMaskContext) return
      cssMaskContext.setTransform(1, 0, 0, 1, 0, 0)
      cssMaskContext.clearRect(0, 0, pixelWidth, pixelHeight)
      cssMaskContext.globalCompositeOperation = 'source-over'
      cssMaskContext.fillStyle = '#fff'
      cssMaskContext.fillRect(0, 0, pixelWidth, pixelHeight)
      cssMaskContext.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0)
      cssMaskContext.globalCompositeOperation = 'destination-out'
      maskPaths = []
    }
    for (let index = maskPaths.length; index < paths.length; index++) cssMaskContext!.fill(new Path2D(paths[index]))
    maskPaths = paths
    maskSize = size
    return
  }
  if (!node) return
  const size = `${width}:${height}`
  // 仅追加不可变的新片段；回退、缩放或重新挂载时才重建，不逐帧 patch 整段历史 SVG。
  if (node !== maskNode || size !== maskSize || paths.length < maskPaths.length
    || (maskPaths.length && paths[maskPaths.length - 1] !== maskPaths[maskPaths.length - 1])) {
    if (node.replaceChildren) node.replaceChildren()
    else while (node.firstChild) node.removeChild(node.firstChild)
    maskPaths = []
  }
  for (let index = maskPaths.length; index < paths.length; index++) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', paths[index])
    node.appendChild(path)
  }
  maskNode = node
  maskSize = size
  maskPaths = paths
}

// 主题切换只重绘当前帧；手动暂停和离屏状态都不重置时间轴。
watch(isDark, () => {
  if (mounted) paint(performance.now())
}, { flush: 'post' })

function applyTilt() {
  // 文字、艺术字和光标由同一内层承担变换；外框保持不动，用于稳定测距。
  const tilted = tiltX !== 0 || tiltY !== 0
  const transform = tilted
    ? `translate3d(${tiltX * 6}px, ${tiltY * 6}px, 0) rotateX(${-tiltY * 4}deg) rotateY(${tiltX * 4}deg)` : 'none'
  // 触屏及鼠标离开后释放强制 3D 合成提示，零姿态不需要常驻 GPU 变换层。
  if (tiltStyle.value.transform !== transform) tiltStyle.value = { transform, willChange: tilted ? 'transform' : 'auto' }
}

function requestFrame() {
  if (!frame && canAnimate()) frame = requestAnimationFrame(tick)
}

function tick(now: number) {
  frame = 0
  if (!canAnimate()) return
  const dt = previousFrame ? Math.min((now - previousFrame) / 1000, 0.1) : 1 / 60
  previousFrame = now
  const follow = 1 - Math.exp(-dt / 0.16)
  tiltX += (targetX - tiltX) * follow
  tiltY += (targetY - tiltY) * follow
  const moving = Math.abs(targetX - tiltX) + Math.abs(targetY - tiltY) > 0.0005
  if (!moving) {
    tiltX = targetX
    tiltY = targetY
  }
  const previousIcon = iconProgress
  const iconTarget = paused.value ? 1 : 0
  const steps = Math.ceil(dt / 0.008)
  for (let i = 0; i < steps; i++) {
    const step = dt / steps
    iconVelocity += ((iconTarget - iconProgress) * 360 - iconVelocity * 28) * step
    iconProgress += iconVelocity * step
  }
  const iconMoving = Math.abs(iconTarget - iconProgress) + Math.abs(iconVelocity) > 0.001
  if (!iconMoving) {
    iconProgress = iconTarget
    iconVelocity = 0
  }
  if (previousIcon !== iconProgress) iconPath.value = iconPaths(iconProgress)
  applyTilt()
  paint(now)
  if (((playback.animating || !entranceComplete) && frozen === undefined) || moving || iconMoving) requestFrame()
}

function syncPlayback() {
  const now = performance.now()
  clock.setRunning(canAnimate() && frozen === undefined, now)
  if (!canAnimate()) {
    cancelEraserWarmup()
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    previousFrame = 0
    return
  }
  paint(now)
  requestFrame()
}

function togglePlayback() {
  const now = performance.now()
  previousFrame = now
  if (frozen !== undefined) {
    clock.seek(frozen, now)
    frozen = undefined
  }
  playback.toggle(clock.read(now))
  paused.value = playback.paused
  syncPlayback()
}

function updateSettings() {
  if (!selectedEraser.value) cancelEraserWarmup()
  playback.configure({ pens: selectedPens.value, eraser: selectedEraser.value, color: selectedColor.value, size: selectedSize.value },
    frozen ?? clock.read(performance.now()))
  syncPlayback()
}

function toggleTool(tool: PenKind | 'eraser') {
  if (tool === 'eraser') selectedEraser.value = !selectedEraser.value
  else selectedPens.value = selectedPens.value.includes(tool)
    ? selectedPens.value.filter(pen => pen !== tool) : [...selectedPens.value, tool]
  updateSettings()
}

function closePanel(returnFocus = false) {
  // 收起后立即 inert，先移出内部焦点，避免不可见控件继续接收键盘操作。
  if (returnFocus || panel.value?.contains(document.activeElement)) paletteButton.value?.focus()
  panelOpen.value = false
}

function togglePanel(event: MouseEvent) {
  if (panelOpen.value) {
    closePanel(event.detail === 0)
    return
  }
  panelOpen.value = true
  if (event.detail === 0) {
    void nextTick(() => {
      if (panelOpen.value) panel.value?.querySelector<HTMLButtonElement>('button')?.focus()
    })
  }
}

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && panelOpen.value) {
    event.preventDefault()
    closePanel(true)
  }
}

function onOutsidePointer(event: PointerEvent) {
  if (panelOpen.value && !controls.value?.contains(event.target as Node)) closePanel()
}

function colorBackground(color: ColorChoice) {
  if (color === 'rainbow') return isDark.value
    ? 'linear-gradient(105deg, #55ccbc, #dedb68 27%, #ff9569 45%, #fa83af 65%, #a194f4 80%, #62bcf4)'
    : 'linear-gradient(105deg, #078b99, #b3cd33 27%, #ffb500 40%, #ff7157 55%, #ce5897 72%, #289fca)'
  const solid = resolveSolidColor(color, isDark.value ? 'dark' : 'light')
  return `linear-gradient(${solid}, ${solid})`
}

function resetPointer() {
  targetX = 0
  targetY = 0
  requestFrame()
}

function onPointerMove(event: PointerEvent) {
  // 以实际输入事件为准；混合设备的 hover/pointer 媒体能力可能与当前鼠标不一致。
  if (event.pointerType !== 'mouse' || !canAnimate()) return
  const box = plane.value?.getBoundingClientRect()
  if (!box || !box.width || !box.height) return
  const target = pointerTarget(box, event.clientX, event.clientY)
  targetX = target.x
  targetY = target.y
  requestFrame()
}

function onVisibilityChange() {
  resetPointer()
  syncPlayback()
}

function resize() {
  const node = root.value
  if (!node) return
  cancelEraserWarmup()
  const layout = computeLayout(node.clientWidth, node.clientHeight, scene.aspect)
  const copyHeight = heroCopy.value?.offsetHeight ?? (node.clientWidth <= 640 ? 134 : 108)
  const gap = node.clientHeight < 420 ? 16 : 24
  const edge = Math.max(16, Math.min(24, node.clientWidth * 0.02))
  // 窄屏为右下控件另留一行；矮屏只收紧字区尺寸，不把标语或下载入口挤出首屏。
  const bottom = node.clientWidth <= 640 ? edge + 48 + 12 : edge
  const top = 18
  const maxHeight = Math.max(0, (node.clientHeight - top - bottom - copyHeight - gap) / 1.36)
  height = Math.min(layout.height, maxHeight)
  width = height * scene.aspect
  const centerY = Math.max(top + height * 0.68,
    Math.min(layout.centerY, node.clientHeight - bottom - copyHeight - gap - height * 0.68))
  planeStyle.value = {
    width: `${width}px`,
    height: `${height}px`,
    top: `${centerY}px`,
  }
  copyStyle.value = { top: `${centerY + height * 0.68 + gap}px` }
  resetPointer()
  paint(performance.now())
}

onMounted(() => {
  const node = canvas.value
  if (!node || !root.value) return
  mounted = true
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  painter = createPainter(scene, node)
  // 能力检测而非 UA：旧 WebKit 不可靠地刷新 HTML 引用的 SVG 遮罩。
  cssCanvasMask.value = typeof (document as CSSCanvasDocument).getCSSCanvasContext === 'function'
    && typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    && CSS.supports('-webkit-mask-image', `-webkit-canvas(${cssMaskName})`)

  // 仅开发环境冻结完整时间轴，例如 ?t=10 可检查默认循环的硬笔书写。
  if (import.meta.env.DEV) {
    const query = new URLSearchParams(window.location.search).get('t')
    if (query !== null && query.trim() && Number.isFinite(Number(query))) frozen = Math.max(0, Number(query))
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  document.documentElement.addEventListener('pointerleave', resetPointer)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('blur', resetPointer)
  window.addEventListener('resize', resize, { passive: true })
  document.addEventListener('pointerdown', onOutsidePointer)
  document.addEventListener('keydown', onPanelKeydown)

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(root.value)
    if (heroCopy.value) resizeObserver.observe(heroCopy.value)
  }
  if ('IntersectionObserver' in window) {
    visibleObserver = new IntersectionObserver(entries => {
      inViewport = entries.some(entry => entry.isIntersecting)
      if (!inViewport) resetPointer()
      syncPlayback()
    })
    visibleObserver.observe(root.value)
  }
  resize()
  syncPlayback()
})

onBeforeUnmount(() => {
  mounted = false
  cancelEraserWarmup()
  painter?.dispose()
  if (cssMaskContext) {
    cssMaskContext.canvas.width = cssMaskContext.canvas.height = 1
    cssMaskContext = undefined
  }
  clock.setRunning(false, performance.now())
  if (frame) cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  visibleObserver?.disconnect()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  document.documentElement.removeEventListener('pointerleave', resetPointer)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('blur', resetPointer)
  window.removeEventListener('resize', resize)
  document.removeEventListener('pointerdown', onOutsidePointer)
  document.removeEventListener('keydown', onPanelKeydown)
})
</script>

<template>
  <div ref="root" class="nh3-root" :lang="locale">
    <div ref="plane" class="nh3-plane" :style="planeStyle">
      <div class="nh3-entrance" :style="entranceStyles[0]">
      <div class="nh3-surface" :style="tiltStyle" role="img" aria-label="Inkeys">
      <canvas v-show="artFrame.view === 'ink'" ref="canvas" class="nh3-mark" aria-hidden="true" />
      <svg v-if="artFrame.view === 'art' && eraserFrame && !cssCanvasMask" class="nh3-mask-defs" aria-hidden="true" width="0" height="0">
        <defs>
          <mask id="nh3-art-erasure" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" :width="width" :height="height" x="0" y="0" style="mask-type: luminance">
            <rect :width="width" :height="height" fill="white" />
            <g ref="artMaskPaths" fill="black" />
          </mask>
        </defs>
      </svg>
      <div v-if="artFrame.view === 'art'" class="nh3-art" :style="{ opacity: artFrame.state.opacity, fontSize: `${width * 0.25}px`, ...(cssCanvasMask ? { WebkitMaskImage: eraserFrame ? `-webkit-canvas(${cssMaskName})` : 'none' } : { maskImage: eraserFrame ? 'url(#nh3-art-erasure)' : 'none' }) }" aria-hidden="true">
        <div class="nh3-art-lettering" :style="{ backgroundImage: colorBackground(artFrame.previousColor) }"><span class="nh3-art-ink">Ink</span><span class="nh3-art-eys">eys</span></div>
        <div class="nh3-art-lettering nh3-art-overlay" :style="{ backgroundImage: colorBackground(artFrame.artColor), opacity: artFrame.colorMix }"><span class="nh3-art-ink">Ink</span><span class="nh3-art-eys">eys</span></div>
        <div class="nh3-art-lettering nh3-art-overlay nh3-art-shine" :style="{ opacity: artFrame.shimmer < 0 ? 0 : 1, backgroundPosition: `${135 - artFrame.shimmer * 170}% 50%` }"><span class="nh3-art-ink">Ink</span><span class="nh3-art-eys">eys</span></div>
      </div>
      <svg v-if="eraserFrame" class="nh3-eraser-cursor" :viewBox="`0 0 ${width} ${height}`" :style="{ opacity: artFrame.state.opacity * artFrame.eraseOpacity }" aria-hidden="true">
        <g :transform="`translate(${eraserFrame.cursor.x} ${eraserFrame.cursor.y})`">
          <!-- 原生按下状态：白底、向内 0.04D 灰边与双竖向胶囊，擦除中保持不透明。 -->
          <circle :r="eraserFrame.cursor.radius" fill="white" />
          <circle :r="eraserFrame.cursor.radius * 0.96" fill="none" stroke="#cfcfcf" :stroke-width="eraserFrame.cursor.radius * 0.08" />
          <rect v-for="side in [-1, 1]" :key="side" :x="(side * 0.24 - 0.1) * eraserFrame.cursor.radius" :y="-0.48 * eraserFrame.cursor.radius" :width="0.2 * eraserFrame.cursor.radius" :height="0.96 * eraserFrame.cursor.radius" :rx="0.1 * eraserFrame.cursor.radius" fill="#cfcfcf" />
        </g>
      </svg>
      </div>
      </div>
    </div>
    <div ref="heroCopy" class="nh3-copy" :style="copyStyle">
      <h1 class="nh3-sr-only">{{ siteLocale.title }}</h1>
      <p class="nh3-tagline" :style="entranceStyles[1]"><span v-for="clause in copy.hero.tagline" :key="clause" class="nh3-clause">{{ clause }}</span></p>
      <div class="nh3-actions" :style="entranceStyles[2]">
        <VPLink class="nh3-btn nh3-btn-primary" :href="downloadHref" target="_blank" no-icon>{{ copy.hero.download }}</VPLink>
        <VPLink class="nh3-btn nh3-btn-secondary" :href="starHref" target="_blank" rel="noopener noreferrer" no-icon>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg>
          {{ copy.hero.star }}
        </VPLink>
      </div>
    </div>
    <div ref="controls" v-memo="[panelOpen, selectedPens, selectedEraser, selectedColor, selectedSize, isDark, paused, iconPath, locale]" class="nh3-controls" :class="{ 'is-open': panelOpen }">
      <div id="nh3-style-panel" ref="panel" class="nh3-style-panel" :class="{ 'is-open': panelOpen }" :inert="!panelOpen" :aria-hidden="!panelOpen" role="group" :aria-label="copy.hero.stylePanel">
        <div class="nh3-style-content">
          <fieldset class="nh3-options">
            <legend class="nh3-sr-only">{{ copy.hero.penGroup }}</legend>
            <div class="nh3-pen-options">
              <button v-for="tool in toolChoices" :key="tool" class="nh3-tool" type="button" :tabindex="panelOpen ? 0 : -1" :aria-pressed="tool === 'eraser' ? selectedEraser : selectedPens.includes(tool)" @click="toggleTool(tool)">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" v-html="toolIcons[tool]" />
                <span>{{ penLabels[tool] }}</span>
              </button>
            </div>
          </fieldset>
          <fieldset class="nh3-options">
            <legend class="nh3-sr-only">{{ copy.hero.colorGroup }}</legend>
            <div class="nh3-color-options">
              <label v-for="color in colorChoices" :key="color" class="nh3-color-choice" :style="{ '--nh3-swatch': colorBackground(color) }">
                <input v-model="selectedColor" type="radio" name="nh3-color" :tabindex="panelOpen ? 0 : -1" :value="color" :aria-label="colorLabels[color]" @change="updateSettings">
                <span aria-hidden="true" />
              </label>
            </div>
          </fieldset>
          <fieldset class="nh3-options">
            <legend class="nh3-sr-only">{{ copy.hero.sizeGroup }}</legend>
            <div class="nh3-size-options">
              <label v-for="size in sizeChoices" :key="size">
                <input v-model="selectedSize" type="radio" name="nh3-size" :tabindex="panelOpen ? 0 : -1" :value="size" :aria-label="sizeLabels[size]" @change="updateSettings">
                <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6" :stroke-width="sizeWidths[size]" /></svg></span>
              </label>
            </div>
          </fieldset>
        </div>
      </div>
      <button ref="paletteButton" class="nh3-playback nh3-palette" type="button" :aria-label="copy.hero.openStylePanel" aria-controls="nh3-style-panel" :aria-expanded="panelOpen" @click="togglePanel">
        <svg class="nh3-playback-icon nh3-palette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.3a2.1 2.1 0 0 0 1.4-3.6c-.6-.6-.2-1.7.7-1.7h1.2A4.4 4.4 0 0 0 21 11.3 8.5 8.5 0 0 0 12 3Z" /><circle cx="7.2" cy="10" r="1" /><circle cx="10.5" cy="6.8" r="1" /><circle cx="15" cy="7.4" r="1" /><circle cx="17.5" cy="11" r="1" /></svg>
      </button>
    <button
      class="nh3-playback"
      type="button"
      :aria-pressed="paused"
      :aria-label="paused ? copy.hero.resume : copy.hero.pause"
      @click="togglePlayback"
    >
      <svg class="nh3-playback-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path :d="iconPath" />
      </svg>
    </button>
    </div>
  </div>
  <div class="nh3-main" :lang="locale">
    <SectionAbilities />
    <SectionScenes />
    <SectionCraft />
    <SectionDownload />
  </div>
</template>

<style>
/* 页面级令牌、顶栏、文字与按钮样式见 home.css；这里只有首屏自己的布局。 */
.nh3-root {
  --nh3-control-gap: clamp(16px, 2vw, 24px);
  min-height: calc(100vh - var(--vp-nav-height, 64px));
  min-height: calc(100svh - var(--vp-nav-height, 64px));
  box-sizing: border-box;
  position: relative;
  background: transparent;
}

.nh3-plane {
  position: absolute;
  left: 50%;
  top: 42%;
  width: min(56vw, 900px, calc(100vw - 84px));
  transform: translate(-50%, -50%);
  perspective: 1200px;
}

.nh3-surface {
  position: relative;
  width: 100%;
  height: 100%;
  transform-origin: center;
  will-change: auto;
}

.nh3-entrance {
  width: 100%;
  height: 100%;
  perspective: 1200px;
}

/* 文案和按钮位于视差平面之外，不随指针倾斜。 */
.nh3-copy {
  position: absolute;
  left: 24px;
  right: 24px;
  top: 65%;
  text-align: center;
}

.nh3-tagline {
  margin: 0;
  color: var(--nh3-text);
  font-size: clamp(17px, 1.4vw, 20px);
  font-weight: 400;
  line-height: 1.75;
}

.nh3-root:lang(en) .nh3-tagline {
  line-height: 1.6;
}

/* 按钮一行放不下时整体换行，各占一行并居中。 */
.nh3-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
}

.nh3-mark {
  display: block;
  width: 100%;
  height: 100%;
  background: transparent;
}

/* 书写控制平时退到 35%，鼠标进入首屏、键盘聚焦或面板打开时才完全显示。 */
.nh3-controls {
  position: absolute;
  right: var(--nh3-control-gap);
  bottom: var(--nh3-control-gap);
  display: flex;
  gap: 8px;
  z-index: 2;
  opacity: 0.35;
  transition: opacity var(--nh3-dur) var(--nh3-ease);
  /* 首屏入场的最后一步：标语和按钮到位后再淡入。 */
  animation: nh3-fade-in var(--nh3-dur-slow) var(--nh3-ease-out) 900ms backwards;
}

.nh3-controls:focus-within,
.nh3-controls.is-open {
  opacity: 1;
}

@media (hover: hover) and (pointer: fine) {
  .nh3-root:hover .nh3-controls {
    opacity: 1;
  }
}

.nh3-playback {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: var(--nh3-r-control);
  background: var(--nh3-surface);
  color: var(--nh3-text2);
  font: inherit;
  cursor: pointer;
  transition: background-color var(--nh3-dur) var(--nh3-ease), transform var(--nh3-dur-press) var(--nh3-ease);
}

.nh3-playback-icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
  pointer-events: none;
}

@media (hover: hover) and (pointer: fine) {
  .nh3-playback:hover {
    background: var(--nh3-surface-hover);
  }
}

.nh3-playback:active {
  transform: scale(0.94);
}

.nh3-playback:focus-visible {
  outline: 2px solid var(--nh3-accent);
  outline-offset: 3px;
}

.nh3-palette-icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.nh3-palette-icon circle {
  fill: currentColor;
  stroke: none;
}

.nh3-style-panel {
  position: absolute;
  right: calc(100% + 8px);
  bottom: 0;
  width: max-content;
  height: 40px;
  box-sizing: border-box;
  border-radius: var(--nh3-r-control);
  background: var(--nh3-surface);
  color: var(--nh3-text);
  /* 揭示只做矩形裁切，不缩放内容。 */
  clip-path: inset(0 0 0 100% round var(--nh3-r-control));
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: clip-path var(--nh3-dur-slow) var(--nh3-ease-out), opacity var(--nh3-dur) var(--nh3-ease), visibility 0s var(--nh3-dur-slow);
}

.nh3-style-panel.is-open {
  clip-path: inset(0 0 0 0 round var(--nh3-r-control));
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition-delay: 0s;
}

/* 面板内的选项是中性色的小块：选中项用页面底色垫起来，不用主题色。 */
.nh3-style-content { display: flex; align-items: center; justify-content: flex-start; gap: 8px; height: 100%; padding: 4px; box-sizing: border-box; opacity: 0; transition: opacity var(--nh3-dur) var(--nh3-ease); }
/* 面板展开一小段后选项再淡入。 */
.nh3-style-panel.is-open .nh3-style-content { opacity: 1; transition-delay: 120ms; }
.nh3-options { min-width: 0; margin: 0; padding: 0; border: 0; }
.nh3-options + .nh3-options { padding-left: 8px; border-left: 1px solid var(--nh3-line); }
.nh3-sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.nh3-pen-options { display: flex; gap: 2px; }
.nh3-tool { box-sizing: border-box; display: flex; align-items: center; gap: 6px; flex-shrink: 0; height: 32px; padding: 0 10px; border: 0; border-radius: 8px; background: transparent; color: var(--nh3-text3); font: inherit; font-size: 13px; font-weight: 400; line-height: 1; white-space: nowrap; cursor: pointer; transition: background-color var(--nh3-dur) var(--nh3-ease), color var(--nh3-dur) var(--nh3-ease), transform var(--nh3-dur-press) var(--nh3-ease); }
.nh3-tool svg { width: 16px; height: 16px; flex-shrink: 0; pointer-events: none; }
.nh3-tool[aria-pressed='true'] { color: var(--nh3-text); background: var(--nh3-bg); font-weight: 500; }
.nh3-tool:focus-visible { outline: 2px solid var(--nh3-accent); outline-offset: 1px; }
.nh3-tool:active { transform: scale(0.94); }
.nh3-color-options { display: flex; gap: 2px; }
.nh3-color-choice { position: relative; display: grid; place-items: center; width: 28px; height: 32px; cursor: pointer; }
.nh3-color-choice input, .nh3-size-options input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.nh3-color-choice span { width: 16px; height: 16px; border-radius: 50%; background: var(--nh3-swatch); transition: transform var(--nh3-dur-press) var(--nh3-ease); }
.nh3-color-choice input:checked + span { outline: 2px solid var(--nh3-text); outline-offset: 2px; }
.nh3-color-choice input:focus-visible + span { outline: 2px solid var(--nh3-accent); outline-offset: 2px; }
.nh3-size-options { display: flex; gap: 2px; }
.nh3-size-options label { position: relative; width: 32px; cursor: pointer; }
.nh3-size-options span { display: grid; place-items: center; height: 32px; border-radius: 8px; color: var(--nh3-text3); transition: background-color var(--nh3-dur) var(--nh3-ease), color var(--nh3-dur) var(--nh3-ease), transform var(--nh3-dur-press) var(--nh3-ease); }
.nh3-size-options svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-linecap: round; }
.nh3-size-options input:checked + span { background: var(--nh3-bg); color: var(--nh3-text); }
.nh3-size-options input:focus-visible + span { outline: 2px solid var(--nh3-accent); outline-offset: 1px; }
.nh3-color-choice:active span, .nh3-size-options label:active span { transform: scale(0.94); }

@media (hover: hover) and (pointer: fine) {
  .nh3-tool:not([aria-pressed='true']):hover, .nh3-size-options input:not(:checked) + span:hover { background: var(--nh3-surface-hover); color: var(--nh3-text); }
}

@media (max-width: 1099px) {
  .nh3-style-panel { right: 0; bottom: calc(100% + 8px); width: min(480px, calc(100vw - 2 * var(--nh3-control-gap))); height: auto; max-height: max(48px, calc(100vh - var(--vp-nav-height, 64px) - 2 * var(--nh3-control-gap) - 60px)); max-height: max(48px, calc(100svh - var(--vp-nav-height, 64px) - 2 * var(--nh3-control-gap) - 60px)); overflow-y: auto; overscroll-behavior: contain; }
  .nh3-style-content { flex-direction: column; align-items: stretch; gap: 8px; padding: 8px; }
  .nh3-options + .nh3-options { border-left: 0; border-top: 1px solid var(--nh3-line); padding-left: 0; padding-top: 8px; }
  .nh3-pen-options { flex-wrap: wrap; gap: 4px; }
  .nh3-tool { flex: 1 0 calc(33.333% - 4px); justify-content: center; height: 40px; font-size: 14px; }
  .nh3-color-options { justify-content: space-between; padding: 0 6px; }
  .nh3-color-choice { height: 40px; }
  .nh3-color-choice span { width: 20px; height: 20px; }
  .nh3-size-options { gap: 4px; }
  .nh3-size-options label { flex: 1; }
  .nh3-size-options span { height: 40px; }
}

.nh3-mask-defs { position: absolute; pointer-events: none; }
.nh3-eraser-cursor { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; transform-origin: center; color: var(--nh3-text2); }

/* 艺术字只复用字体规则；扫光位置由活跃时钟驱动，隐藏页面不会悄悄推进。 */
.nh3-art {
  position: absolute;
  inset: 0;
  -webkit-mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  display: grid;
  place-items: center;
  pointer-events: none;
  transform-origin: center;
}

.nh3-art-lettering {
  grid-area: 1 / 1;
  line-height: 1.2;
  letter-spacing: -0.045em;
  white-space: nowrap;
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  padding: 0.08em 0.12em;
}

.nh3-art-ink { font-family: 'Google Sans Flex', 'HarmonyOS Sans SC', system-ui, sans-serif; font-weight: 650; }
.nh3-art-eys { font-family: 'DM Serif Display', Georgia, serif; font-style: italic; font-weight: 400; }
.nh3-art-shine { background-image: linear-gradient(110deg, transparent 42%, rgba(255, 255, 255, 0.65) 50%, transparent 58%); background-size: 200% 100%; }

@media (max-width: 640px) {
  .nh3-plane {
    width: calc(100vw - 84px);
  }
}

@media (max-height: 500px) {
  .nh3-tagline { font-size: 16px; line-height: 1.65; }
  .nh3-actions { margin-top: 16px; }
}
</style>
