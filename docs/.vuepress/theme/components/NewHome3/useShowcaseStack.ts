import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { withBase } from 'vuepress/client'
import { useDarkMode } from 'vuepress-theme-plume/client'
import { layerUrl, showcasePage } from './showcaseContent'
import type { ShowcaseLayer, ShowcaseScene } from './showcaseContent'
import { clamp01, easeInOut, fitExploded, mix, project, unproject } from './stackProjection'
import type { StackPose } from './stackProjection'

// 拆解时相邻层级的间距（相对舞台宽度），以及悬停抬升的距离。
const GAP = 0.17
const LIFT = 46
// 悬停抬升时的缩放，与 ShowcaseStack.css 中 .is-lifted 保持一致。
const LIFT_SCALE = 1.035
// alpha 命中图的采样步长（画布像素）。
const ALPHA_STEP = 6

const seg = (p: number, from: number, to: number) => clamp01((p - from) / (to - from))

export function useShowcaseStack(scene: ShowcaseScene, track: Ref<HTMLElement | undefined>, viewport: Ref<HTMLElement | undefined>) {
  const page = showcasePage(scene.page)
  const layers = page.layers
  const isDark = useDarkMode()
  // SSR 与水合阶段固定浅色，挂载后再随站点主题切换，避免属性不一致。
  const themed = ref(false)
  const theme = computed<'light' | 'dark'>(() => (themed.value && isDark.value ? 'dark' : 'light'))
  // flat：窄屏或减少动态效果时不粘性、不拆解，只保留逐层查看。
  const flat = ref(true)
  const stage = shallowRef({ width: 960, height: 960 * page.height / page.width, viewWidth: 1200, viewHeight: 800 })
  const progress = ref(1)
  const active = ref<string | null>(null)
  const pinned = ref<string | null>(null)

  const levelOf = new Map<string, number>()
  scene.levels?.forEach((level, index) => level.forEach(id => levelOf.set(id, index)))
  // 分组后的查看键：同组图层共用一条批注，一起抬起。
  const keyOf = (id: string) => scene.groups?.[id] ?? id
  const writeIndex = new Map((scene.writeOrder ?? []).map((id, index) => [id, index]))
  const legendIds = new Set(scene.legend?.map(item => item.id) ?? [])
  const keyLayers = layers.filter(layer => scene.notes[layer.id] && !legendIds.has(layer.id))
  const alphaMaps = new Map<string, { w: number, h: number, data: Uint8ClampedArray }>()

  const explode = computed(() => {
    if (flat.value || scene.mode !== 'explode') return 0
    const p = progress.value
    // 停留 → 拆开 → 悬停查看 → 合回：两段缓动之间留出足够的静止区间。
    return easeInOut((p - 0.1) / 0.3) * (1 - easeInOut((p - 0.8) / 0.17))
  })

  /** write 模式：按顺序从左往右擦出每一层，模拟一笔笔写上去。 */
  function revealOf(id: string) {
    if (flat.value || scene.mode !== 'write') return 1
    const index = writeIndex.get(id)
    if (index === undefined) return 1
    const span = 0.72 / writeIndex.size
    const start = 0.06 + index * span
    return seg(progress.value, start, start + span * 0.92)
  }

  const pose = computed<StackPose>(() => {
    const { width, height, viewWidth, viewHeight } = stage.value
    const e = explode.value
    const perspective = width * 2.4
    if (e <= 0) return { ax: 0, az: 0, s: 1, perspective, tx: 0, ty: 0 }
    const depths = Array.from({ length: scene.levels?.length ?? 1 }, (_, i) => i * width * GAP)
    const end = fitExploded({ ax: 58 * Math.PI / 180, az: -9 * Math.PI / 180, perspective }, width, height, depths,
      viewWidth - 48, viewHeight - 24)
    return {
      ax: mix(0, end.ax, e),
      az: mix(0, end.az, e),
      s: mix(1, end.s, e),
      perspective,
      tx: mix(0, end.tx, e),
      ty: mix(0, end.ty, e),
    }
  })

  function depthOf(id: string) {
    return (levelOf.get(id) ?? 0) * stage.value.width * GAP * explode.value
  }

  function layerFrame(layer: ShowcaseLayer) {
    const [x, y, w, h] = layer.box
    return {
      left: `${x / page.width * 100}%`,
      top: `${y / page.height * 100}%`,
      width: `${w / page.width * 100}%`,
      height: `${h / page.height * 100}%`,
      transform: `translate3d(0, 0, ${depthOf(layer.id).toFixed(2)}px)`,
    }
  }

  function layerState(layer: ShowcaseLayer) {
    const current = active.value
    const reveal = revealOf(layer.id)
    const lifted = current !== null && keyOf(layer.id) === current
    return {
      lifted,
      dimmed: current !== null && !lifted,
      clip: reveal >= 1 ? undefined : `inset(-2% ${((1 - reveal) * 102).toFixed(2)}% -2% -2%)`,
      hidden: reveal <= 0,
    }
  }

  const srcOf = (layer: ShowcaseLayer, size: 'full' | 'half') => withBase(layerUrl(scene.page, layer, theme.value, size))
  const srcsetOf = (layer: ShowcaseLayer) => `${srcOf(layer, 'half')} ${Math.round(layer.box[2] / 2)}w, ${srcOf(layer, 'full')} ${layer.box[2]}w`
  const sizesOf = (layer: ShowcaseLayer) => `${Math.ceil(stage.value.width * layer.box[2] / page.width)}px`

  function onLayerLoad(layer: ShowcaseLayer, event: Event) {
    if (!scene.notes[keyOf(layer.id)]) return
    const img = event.target as HTMLImageElement
    const w = Math.max(1, Math.ceil(layer.box[2] / ALPHA_STEP))
    const h = Math.max(1, Math.ceil(layer.box[3] / ALPHA_STEP))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(img, 0, 0, w, h)
    const pixels = ctx.getImageData(0, 0, w, h).data
    const data = new Uint8ClampedArray(w * h)
    for (let i = 0; i < data.length; i++) data[i] = pixels[i * 4 + 3]
    alphaMaps.set(layer.id, { w, h, data })
  }

  /** 自上而下逐层反投影到各自平面，取第一个落在不透明像素上的图层。 */
  function hitTest(clientX: number, clientY: number) {
    const node = viewport.value
    if (!node) return null
    const rect = node.getBoundingClientRect()
    const sx = clientX - rect.left - rect.width / 2
    const sy = clientY - rect.top - rect.height / 2
    const { width, height } = stage.value
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i]
      const reveal = revealOf(layer.id)
      const key = keyOf(layer.id)
      if (!scene.notes[key] || reveal < 0.6) continue
      // 当前抬起的图层按抬升后的平面与绕中心的缩放判定，避免悬停时失焦或误选下层。
      const lifted = key === active.value
      const point = unproject(pose.value, sx, sy, depthOf(layer.id) + (lifted ? LIFT : 0))
      if (!point) continue
      const factor = lifted ? LIFT_SCALE : 1
      const cu = (point.x + width / 2) / width * page.width - (layer.box[0] + layer.box[2] / 2)
      const cv = (point.y + height / 2) / height * page.height - (layer.box[1] + layer.box[3] / 2)
      const u = cu / factor + layer.box[2] / 2
      const v = cv / factor + layer.box[3] / 2
      // 逐层写出时，裁切在右侧尚未露出的部分不参与命中。
      if (u < 0 || v < 0 || u >= layer.box[2] * Math.min(1, reveal) || v >= layer.box[3]) continue
      const map = alphaMaps.get(layer.id)
      // 尚未取到 alpha 时退回矩形判定，加载完成后自然变精确。
      if (!map) return key
      const a = map.data[Math.min(map.h - 1, Math.floor(v / ALPHA_STEP)) * map.w + Math.min(map.w - 1, Math.floor(u / ALPHA_STEP))]
      if (a > 40) return key
    }
    return null
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || pinned.value) return
    active.value = hitTest(event.clientX, event.clientY)
  }

  function onPointerLeave(event: PointerEvent) {
    if (event.pointerType === 'mouse' && !pinned.value) active.value = null
  }

  /** 触屏没有悬停：轻点某层固定显示，再点空白处或同一层取消。 */
  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse') return
    const id = hitTest(event.clientX, event.clientY)
    pinned.value = id && id !== pinned.value ? id : null
    active.value = pinned.value
  }

  function focusLayer(id: string | null) {
    pinned.value = null
    active.value = id
  }

  function togglePin(id: string) {
    pinned.value = pinned.value === id ? null : id
    active.value = pinned.value
  }

  function hoverLegend(id: string | null) {
    if (!pinned.value) active.value = id
  }

  /** 批注卡锚定在当前图层（含抬升）投影后的外侧，放不下时翻到另一侧或压在图层内。 */
  const callout = computed(() => {
    const id = active.value
    const note = id ? scene.notes[id] : undefined
    const group = id ? layers.filter(item => keyOf(item.id) === id) : []
    if (!id || !note || !group.length) return null
    const { width, height, viewWidth, viewHeight } = stage.value
    const corners = group.flatMap((layer) => {
      const z = depthOf(layer.id) + LIFT
      const [x, y, w, h] = layer.box
      return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([u, v]) =>
        project(pose.value, { x: u / page.width * width - width / 2, y: v / page.height * height - height / 2, z }))
    })
    const right = Math.max(...corners.map(p => p.x))
    const left = Math.min(...corners.map(p => p.x))
    const top = Math.min(...corners.map(p => p.y))
    const bottom = Math.max(...corners.map(p => p.y))
    const card = Math.min(300, viewWidth - 32)
    const half = viewWidth / 2
    const fitsRight = right + 28 + card <= half - 16
    const fitsLeft = left - 28 - card >= -half + 16
    let side: 'right' | 'left' | 'inside' = fitsRight ? 'right' : fitsLeft ? 'left' : 'inside'
    if (fitsRight && fitsLeft) side = half - right >= left + half ? 'right' : 'left'
    const cardX = side === 'right' ? right + 28 : side === 'left' ? left - 28 - card : Math.max(-half + 16, Math.min(right - card - 24, half - card - 16))
    const cardY = Math.max(-viewHeight / 2 + 16, Math.min(top + 12, viewHeight / 2 - 120))
    const lineY = Math.max(top + 8, Math.min(bottom - 8, cardY + 26))
    const anchor = side === 'left' ? { x: left + 10, y: lineY } : side === 'right' ? { x: right - 10, y: lineY } : null
    const edge = { x: side === 'left' ? cardX + card : cardX, y: cardY + 26 }
    return { id, note, cardX, cardY, card, anchor, edge }
  })

  let mounted = false
  let frame = 0
  let visible = false
  let reduced = false
  let observer: IntersectionObserver | undefined
  let resizeObserver: ResizeObserver | undefined
  let motionQuery: MediaQueryList | undefined

  function measure() {
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight
    const narrow = vw < 768
    flat.value = narrow || reduced
    const gutter = Math.max(20, vw * 0.04)
    const reserve = 72 + 64
    // 笔触图标立在舞台两侧，宽屏时为它们各留一列。
    const rail = scene.legend && !narrow ? 72 : 0
    const viewWidth = vw - (narrow ? 0 : gutter * 2 + rail * 2)
    const viewHeight = flat.value ? viewWidth * page.height / page.width : vh - reserve
    const width = Math.min(viewWidth, viewHeight * page.width / page.height)
    stage.value = { width, height: width * page.height / page.width, viewWidth, viewHeight: flat.value ? width * page.height / page.width : viewHeight }
    schedule()
  }

  function update() {
    frame = 0
    if (!mounted || !track.value) return
    if (flat.value) {
      progress.value = 1
      return
    }
    const rect = track.value.getBoundingClientRect()
    const range = rect.height - window.innerHeight
    progress.value = range > 0 ? clamp01(-rect.top / range) : 1
  }

  function schedule() {
    if (!frame && mounted && visible) frame = requestAnimationFrame(update)
  }

  function onMotion() {
    reduced = !!motionQuery?.matches
    measure()
  }

  onMounted(() => {
    mounted = true
    themed.value = true
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced = motionQuery.matches
    motionQuery.addEventListener('change', onMotion)
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      schedule()
    }, { rootMargin: '20% 0px' })
    if (track.value) observer.observe(track.value)
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(document.documentElement)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', measure, { passive: true })
    measure()
  })

  onBeforeUnmount(() => {
    mounted = false
    if (frame) cancelAnimationFrame(frame)
    observer?.disconnect()
    resizeObserver?.disconnect()
    motionQuery?.removeEventListener('change', onMotion)
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', measure)
  })

  return {
    layers, flat, stage, progress, active, pinned, keyLayers, pose, callout,
    layerFrame, layerState, srcOf, srcsetOf, sizesOf, revealOf, onLayerLoad,
    onPointerMove, onPointerLeave, onPointerDown, focusLayer, togglePin, hoverLegend,
  }
}
