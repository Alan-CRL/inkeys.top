<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, useId } from 'vue'
import { withBase } from 'vuepress/client'
import { useDarkMode } from 'vuepress-theme-plume/client'
import { primaryFeatures } from './featureContent'
import {
  anchorOf, createWheelGesture, dockScale, easeInOut, entryTarget, feedWheel, fitPage, lockWheelGesture, pageAt, pagerHeight,
  pagerLayout, scrollDuration, settleTarget, TOUCH_SLOP, TOUCH_TRIGGER, wheelTarget, type PagerLayout,
} from './featurePager'

const uid = `nh3-pager-${useId()}`
const count = primaryFeatures.length
const root = ref<HTMLElement>()
// SSR 与首次水合保持纵向排列；挂载后才切换为粘性翻页，失败时内容仍完整可读。
const paging = ref(false)
// 第 1 页随文档滑入时就已是当前页，与末页离开时保持当前页对称。
const active = ref(0)
const layout = shallowRef<PagerLayout>(pagerLayout(0, 1, count))
const fits = shallowRef(primaryFeatures.map(() => ({ zoom: 1, stageWidth: 0 })))
const scales = shallowRef(primaryFeatures.map(() => 1))
const dots = ref<HTMLElement>()
const isDark = useDarkMode()
// SSR 与水合阶段固定使用浅色图，避免属性与服务端输出不一致；挂载后再随站点主题切换。
const themed = ref(false)

let mounted = false
let frame = 0
let settleTimer: ReturnType<typeof setTimeout> | undefined
let animation: { frame: number, lock: number | null } | undefined
let dragging = false
let touching = false
// 键盘滚动由浏览器平滑执行，中途改写会打断 Home/End 等长距离跳转，因此等停下后再对齐。
let keyboard = false
let pointerY: number | null = null
let dockFrame = 0
let dockTargets = primaryFeatures.map(() => 1)
let resizeObserver: ResizeObserver | undefined
const wheelGesture = createWheelGesture()
// 竖向滑动由我们接管时：undecided 尚未判定，claimed 已接管（翻页并吞掉原生滚动），native 交给浏览器。
let swipe: { x: number, y: number, mode: 'undecided' | 'claimed' | 'native', fired: boolean } | null = null
let host: HTMLElement | null = null
let lastY = 0
let touchEnded = -Infinity

// 舞台最宽 840px 或 66vw；窄屏占满内容宽度。
const MEDIA_SIZES = '(min-width: 768px) min(840px, 66vw), 100vw'

/** 配图按当前站点主题取浅色或深色版本（点击放大读取 src，同样随之切换）。 */
function mediaSource(media: NonNullable<(typeof primaryFeatures)[number]['media']>) {
  const dark = themed.value && isDark.value
  return { src: dark ? media.darkSrc : media.src, srcset: dark ? media.darkSrcset : media.srcset }
}

function mediaSrcset(srcset: string) {
  return srcset.split(', ').map((item) => {
    const [url, width] = item.split(' ')
    return `${withBase(url)} ${width}`
  }).join(', ')
}

/** 舞台比例随配图；无配图时沿用 16:9（窄屏 4:3）。 */
function stageRatio(index: number, narrow: boolean) {
  const media = primaryFeatures[index].media
  return media ? media.width / media.height : narrow ? 4 / 3 : 16 / 9
}

function stageStyle(index: number) {
  const media = primaryFeatures[index].media
  const style: Record<string, string> = {}
  if (media) style.aspectRatio = `${media.width} / ${media.height}`
  if (paging.value && fits.value[index].stageWidth) style.width = `${fits.value[index].stageWidth}px`
  return style
}

// 约为固定顶栏的高度：第 1 页顶边进入此范围后顶栏切为页底色。
const NAV_CLEAR = 64
// 触摸结束后多久内的滚动仍视为惯性滑动。
const FLING_WINDOW = 3000

function pageState(index: number) {
  if (!paging.value) return undefined
  return index === active.value ? 'current' : index < active.value ? 'before' : 'after'
}

function measureLayout() {
  if (!root.value) return
  const previous = layout.value
  const top = root.value.getBoundingClientRect().top + window.scrollY
  const next = pagerLayout(Math.round(top), window.innerHeight, count)
  layout.value = next
  if ((previous.step !== next.step || previous.top !== next.top) && !animation) {
    // 视口变化后保持当前页，按新的步长回到对应锚点。
    const y = window.scrollY
    if (y >= previous.top - 1 && y <= anchorOf(previous, count - 1) + 1) {
      window.scrollTo({ top: anchorOf(next, active.value), behavior: 'instant' })
    }
  }
}

function measureFits() {
  const view = window.innerWidth
  const narrow = view < 768
  const gap = Math.max(20, Math.min(44, window.innerHeight * 0.035))
  // v-for 的 ref 数组不保证顺序，按文档顺序读取各页。
  const pages = root.value ? Array.from(root.value.querySelectorAll<HTMLElement>('.feature-page')) : []
  fits.value = pages.map((page, index) => {
    const copy = page.querySelector<HTMLElement>('.feature-copy')
    if (!copy) return fits.value[index]
    const style = getComputedStyle(page)
    const width = page.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    const height = page.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
    const zoom = fits.value[index]?.zoom || 1
    const next = fitPage({
      width, height, gap,
      copy: copy.getBoundingClientRect().height / zoom,
      ratio: stageRatio(index, narrow),
      maxWidth: narrow ? width : Math.min(840, view * 0.66),
      minStage: narrow ? 120 : 160,
      maxShare: narrow ? 0.5 : 0.58,
    })
    const current = fits.value[index]
    return current && current.zoom === next.zoom && Math.abs(current.stageWidth - next.stageWidth) < 2 ? current : next
  })
  root.value?.style.setProperty('--page-gap', `${gap}px`)
}

function measure() {
  if (!mounted) return
  measureLayout()
  measureFits()
  schedule()
}

function update() {
  frame = 0
  if (!mounted) return
  let y = window.scrollY
  // 触屏惯性自首屏滑入时在翻页区顶部停住，让第 1 页完整呈现；手指仍按着或其他滚动方式不干预。
  if (!animation && !touching && !dragging && !keyboard && performance.now() - touchEnded < FLING_WINDOW
    && lastY < layout.value.top - 1 && y > layout.value.top + 1) {
    y = layout.value.top
    window.scrollTo({ top: y, behavior: 'instant' })
  }
  lastY = y
  const previous = active.value
  const lock = animation?.lock
  active.value = lock !== null && lock !== undefined ? lock : pageAt(layout.value, y, previous)
  // 首屏与各页期间固定显示顶栏；第 1 页滑到顶栏下方后顶栏融入页底色，离开末页后交还 ScrollFrame。
  const mode = y > anchorOf(layout.value, count - 1) + 1 ? null : y >= layout.value.top - NAV_CLEAR ? 'immersive' : 'home'
  if (host && host.dataset.nh3Pager !== (mode ?? undefined)) {
    if (mode) host.dataset.nh3Pager = mode
    else delete host.dataset.nh3Pager
  }
  if (active.value !== previous && !animation && !touching && !dragging && !keyboard) {
    // 滚轮或键盘越过阈值后立即对齐到新页；触摸与拖动滚动条等松手后再对齐。
    // Home/End 等直接越出翻页区间的跳转不拉回。
    const target = settleTarget(layout.value, y, active.value)
    if (target !== null) animateTo(target, active.value)
  }
}

function schedule() {
  if (!frame && mounted) frame = requestAnimationFrame(update)
}

function settle() {
  settleTimer = undefined
  if (!mounted || animation || dragging || touching) return
  const target = settleTarget(layout.value, window.scrollY, active.value)
  if (target !== null && Math.abs(target - window.scrollY) > 2) animateTo(target, active.value)
}

function onScroll() {
  schedule()
  if (animation) return
  if (settleTimer !== undefined) clearTimeout(settleTimer)
  settleTimer = setTimeout(settle, 160)
}

function stopAnimation() {
  if (!animation) return
  cancelAnimationFrame(animation.frame)
  animation = undefined
}

function animateTo(target: number, lock: number | null) {
  stopAnimation()
  if (settleTimer !== undefined) clearTimeout(settleTimer)
  settleTimer = undefined
  const start = window.scrollY
  const distance = target - start
  const duration = scrollDuration(distance)
  const began = performance.now()
  const state = { frame: 0, lock }
  animation = state
  const step = (now: number) => {
    if (animation !== state) return
    const progress = (now - began) / duration
    window.scrollTo({ top: start + distance * easeInOut(progress), behavior: 'instant' })
    if (progress < 1) state.frame = requestAnimationFrame(step)
    else {
      animation = undefined
      schedule()
    }
  }
  state.frame = requestAnimationFrame(step)
}

function goTo(index: number) {
  animateTo(anchorOf(layout.value, index), index)
  active.value = index
}

function wheelDelta(event: WheelEvent) {
  // 行、页模式折算为像素，与触控板的像素增量使用同一门槛。
  return event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1)
}

// 页内一次手势翻一页：累计滚动量达到门槛才触发，触发后同一手势的余下事件（含触控板惯性）一律吞掉；
// 事件中断、方向反转或幅度在衰减后重新上升都算新手势，因此紧接着的下一次滑动同样能翻页。
// 自首屏向下将越过翻页区顶部时先停在第 1 页；第 1 页向上、末页向下均交还原生滚动，进出对称。
function onWheel(event: WheelEvent) {
  keyboard = false
  const delta = wheelDelta(event)
  if (event.ctrlKey || !delta || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
  const now = performance.now()
  const y = window.scrollY
  if (animation) {
    // 翻页或停靠动画期间的事件都属于刚才的手势。
    feedWheel(wheelGesture, now, delta, true, false)
    wheelGesture.locked = true
    wheelGesture.direction = Math.sign(delta)
    event.preventDefault()
    return
  }
  const entry = entryTarget(layout.value, y, delta)
  if (entry !== null) {
    event.preventDefault()
    lockWheelGesture(wheelGesture, now, delta)
    animateTo(entry, 0)
    return
  }
  const target = wheelTarget(layout.value, y, active.value, Math.sign(delta))
  const verdict = feedWheel(wheelGesture, now, delta, false, target !== null)
  if (verdict === 'pass' && !wheelGesture.locked) return
  event.preventDefault()
  if (verdict === 'fire' && target !== null) goTo(target)
}

function interrupt() {
  stopAnimation()
  schedule()
}

function onKeyDown() {
  keyboard = true
  interrupt()
}

function onPointerDown(event: PointerEvent) {
  keyboard = false
  if (event.pointerType === 'mouse') dragging = true
  interrupt()
}

function onPointerUp() {
  if (!dragging) return
  dragging = false
  onScroll()
}

function onTouchStart(event: TouchEvent) {
  keyboard = false
  touching = true
  interrupt()
  const touch = event.touches[0]
  swipe = event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY, mode: 'undecided', fired: false } : null
}

// 翻页区内的竖向滑动由我们接管：一次滑动翻一页，不再依赖原生滚动的位置与惯性；
// 无页可翻（第 1 页向下拉回首屏、末页向上离开）或横向滑动时不接管，保持原生滚动。
function onTouchMove(event: TouchEvent) {
  const touch = event.touches[0]
  if (!swipe || swipe.mode === 'native' || event.touches.length !== 1 || !touch) {
    if (swipe && event.touches.length > 1) swipe.mode = 'native'
    return
  }
  const dx = touch.clientX - swipe.x
  const dy = touch.clientY - swipe.y
  if (swipe.mode === 'undecided') {
    if (Math.abs(dx) < TOUCH_SLOP && Math.abs(dy) < TOUCH_SLOP) return
    const direction = Math.abs(dy) > Math.abs(dx) ? -Math.sign(dy) : 0
    const engaged = animation !== undefined || wheelTarget(layout.value, window.scrollY, active.value, direction) !== null
    // 原生滚动一旦开始就无法取消，此时让给浏览器。
    swipe.mode = engaged && event.cancelable ? 'claimed' : 'native'
    if (swipe.mode === 'native') return
  }
  event.preventDefault()
  if (swipe.fired || animation || Math.abs(dy) < TOUCH_TRIGGER) return
  const target = wheelTarget(layout.value, window.scrollY, active.value, -Math.sign(dy))
  swipe.fired = true
  if (target !== null) goTo(target)
}

function onTouchEnd(event: TouchEvent) {
  if (event.touches.length) return
  touching = false
  // 只有真正滑动过（而非点按）才可能留下惯性。
  if (swipe && swipe.mode !== 'undecided') touchEnded = performance.now()
  swipe = null
  onScroll()
}

function dockTick() {
  dockFrame = 0
  let moving = false
  scales.value = scales.value.map((scale, index) => {
    const next = scale + (dockTargets[index] - scale) * 0.24
    if (Math.abs(dockTargets[index] - next) > 0.002) {
      moving = true
      return next
    }
    return dockTargets[index]
  })
  if (moving) dockFrame = requestAnimationFrame(dockTick)
}

function updateDock() {
  const buttons = dots.value ? Array.from(dots.value.querySelectorAll<HTMLElement>('button')) : []
  dockTargets = buttons.map((button) => {
    if (pointerY === null) return 1
    const rect = button.getBoundingClientRect()
    return dockScale(pointerY - (rect.top + rect.height / 2))
  })
  if (!dockFrame) dockFrame = requestAnimationFrame(dockTick)
}

function onDotsMove(event: PointerEvent) {
  pointerY = event.pointerType === 'mouse' ? event.clientY : null
  updateDock()
}

function onDotsLeave() {
  pointerY = null
  updateDock()
}

onMounted(() => {
  mounted = true
  themed.value = true
  host = root.value?.closest<HTMLElement>('.new-home3-page') ?? null
  paging.value = true
  requestAnimationFrame(() => {
    measure()
    lastY = window.scrollY
    active.value = pageAt(layout.value, lastY, 0)
  })
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', measure, { passive: true })
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointerup', onPointerUp, { passive: true })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('touchcancel', onTouchEnd, { passive: true })
  if (typeof ResizeObserver !== 'undefined') {
    // 上方内容与字体加载都会改变锚点位置或文字高度。
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(document.body)
    root.value?.querySelectorAll('.feature-copy').forEach(copy => resizeObserver?.observe(copy))
  }
  document.fonts?.ready.then(measure)
})

onBeforeUnmount(() => {
  mounted = false
  stopAnimation()
  if (frame) cancelAnimationFrame(frame)
  if (dockFrame) cancelAnimationFrame(dockFrame)
  if (settleTimer !== undefined) clearTimeout(settleTimer)
  resizeObserver?.disconnect()
  if (host) delete host.dataset.nh3Pager
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', measure)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('touchcancel', onTouchEnd)
})
</script>

<template>
  <div
    ref="root" class="feature-pager" :class="{ 'is-paging': paging }"
    :style="paging ? { height: `${pagerHeight(layout)}px`, '--pager-vh': `${layout.viewport}px` } : undefined"
  >
    <template v-if="paging">
      <!-- 翻页时锚点按滚动路程定位，保持 #nh3-feature-<id> 落在对应页。 -->
      <span
        v-for="(feature, index) in primaryFeatures" :id="`nh3-feature-${feature.id}`" :key="feature.id"
        class="feature-pager-anchor" :style="{ top: `${index * layout.step}px` }" aria-hidden="true"
      />
    </template>
    <div class="feature-pager-viewport">
      <section
        v-for="(feature, index) in primaryFeatures" :id="paging ? undefined : `nh3-feature-${feature.id}`" :key="feature.id"
        class="feature-page feature-introduction" :data-state="pageState(index)"
        :inert="paging && index !== active" :aria-labelledby="`${uid}-${feature.id}`"
      >
        <div class="feature-page-content" :style="paging ? { zoom: fits[index].zoom } : undefined">
          <div
            class="feature-page-stage" :class="{ 'has-media': feature.media }" :aria-hidden="feature.media ? undefined : 'true'"
            :style="stageStyle(index)"
          >
            <!-- 点击放大由 plume 的 photoSwipe 接管（见 config.ts 的 selector），放大时读取 src 原图。 -->
            <img
              v-if="feature.media" class="feature-page-media" :src="withBase(mediaSource(feature.media).src)" :srcset="mediaSrcset(mediaSource(feature.media).srcset)"
              :sizes="MEDIA_SIZES" :alt="feature.media.alt" :width="feature.media.width" :height="feature.media.height"
              decoding="async" :loading="index === 0 ? 'eager' : 'lazy'" :fetchpriority="index === 0 ? 'high' : undefined"
            >
            <div v-else class="feature-page-frame">
              <span>{{ feature.mediaLabel }}</span>
              <span class="placeholder-note">素材占位</span>
            </div>
          </div>
          <div class="feature-copy feature-statement">
            <!-- 含「 · 」的标题拆开品牌与主题；保留原文空格与分隔点，读屏仍是完整标题。 -->
            <h2 v-if="feature.title.includes(' · ')" :id="`${uid}-${feature.id}`">
              <span class="statement-brand">{{ feature.title.split(' · ')[0] }}</span><span class="statement-dot"> · </span><span class="statement-theme">{{ feature.title.split(' · ')[1] }}</span>
            </h2>
            <h2 v-else :id="`${uid}-${feature.id}`">{{ feature.title }}</h2>
            <p v-for="paragraph in feature.paragraphs" :key="paragraph" class="statement-line">{{ paragraph }}</p>
            <p v-if="feature.closing" class="statement-close">{{ feature.closing }}</p>
          </div>
        </div>
      </section>
      <nav
        v-if="paging" ref="dots" class="feature-pager-dots"
        aria-label="功能介绍分页" @pointermove="onDotsMove" @pointerleave="onDotsLeave"
      >
        <button
          v-for="(feature, index) in primaryFeatures" :key="feature.id" type="button"
          :aria-label="feature.title" :aria-current="index === active ? 'true' : undefined" @click="goTo(index)"
        >
          <span class="feature-pager-dot" :style="{ transform: `scale(${scales[index]})` }" />
        </button>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.feature-pager {
  --page-pad-x: max(48px, 6vw);
  --page-pad-top: max(72px, 9vh);
  --page-pad-bottom: max(32px, 6vh);
  --page-gap: 36px;
  --page-stage: #dfe9e6;
  --page-dot: rgba(40, 60, 66, 0.28);
  --page-dot-active: #286a71;
  position: relative;
}

/* 无脚本或水合前：按顺序纵向排列，样式与翻页一致。 */
.feature-page { box-sizing: border-box; padding: 40px 0; }
.feature-page-content { display: flex; flex-direction: column; align-items: center; gap: var(--page-gap); }
.feature-page-stage {
  box-sizing: border-box;
  display: flex;
  width: min(880px, 100%);
  aspect-ratio: 16 / 9;
  padding: 6.5% 7.5%;
  border-radius: clamp(16px, 2.2vw, 28px);
  background: var(--page-stage);
  overflow: hidden;
}
.feature-page-frame {
  box-sizing: border-box;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 16px;
  border: 1px dashed rgba(40, 72, 80, 0.22);
  border-radius: clamp(8px, 1.1vw, 14px);
  background: rgba(255, 255, 255, 0.42);
  box-shadow: 0 18px 48px -24px rgba(23, 52, 60, 0.28);
  color: var(--vp-c-text-3);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
  overflow-wrap: anywhere;
}
.placeholder-note { font-size: 11px; opacity: 0.7; }
/* 配图撑满整个舞台：舞台比例取自图片，仅保留圆角，不加底板、边框与阴影；点击放大。 */
.feature-page-stage.has-media { padding: 0; background: none; }
.feature-page-media {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
  cursor: zoom-in;
}

.feature-copy { box-sizing: border-box; width: 100%; max-width: 44rem; text-align: center; }
.feature-copy h2 {
  margin: 0 0 clamp(10px, 1.6vh, 18px);
  padding: 0;
  border: 0;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Source Han Serif CN', 'Songti SC', 'STSong', 'SimSun', serif;
  font-size: clamp(22px, min(2.3vw, 4vh), 34px);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
  overflow-wrap: anywhere;
}
.feature-copy p { margin: 0; color: var(--vp-c-text-2); font-size: clamp(14px, min(1.1vw, 2.05vh), 16.5px); line-height: 1.8; overflow-wrap: anywhere; }
.feature-copy p + p { margin-top: 8px; }

/* 宣言式排版：品牌斜体衬线呼应首屏字标，正文逐句成行且不加强调，收束句以细线引出。 */
.feature-statement h2 {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  margin-bottom: clamp(16px, 3vh, 30px);
  font-size: clamp(30px, min(3.4vw, 5.8vh), 54px);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.06em;
}
.statement-brand {
  font-family: 'DM Serif Display', Georgia, serif;
  font-style: italic;
  font-weight: 400;
  letter-spacing: 0.01em;
}
.statement-dot { margin: 0 0.08em; color: var(--page-dot-active); white-space: pre; }
.feature-statement .statement-line {
  color: var(--vp-c-text-2);
  font-size: clamp(14px, min(1.2vw, 2.2vh), 17px);
  line-height: 2;
  letter-spacing: 0.06em;
  text-wrap: balance;
}
.feature-statement .statement-line + .statement-line { margin-top: 0; }
.feature-statement .statement-close {
  margin-top: clamp(14px, 2.6vh, 26px);
  color: var(--vp-c-text-1);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Source Han Serif CN', 'Songti SC', 'STSong', 'SimSun', serif;
  font-size: clamp(15px, min(1.3vw, 2.4vh), 19px);
  font-weight: 500;
  letter-spacing: 0.14em;
}
.feature-statement .statement-close::before {
  content: '';
  display: block;
  width: 28px;
  height: 1px;
  margin: 0 auto clamp(14px, 2.6vh, 26px);
  background: var(--page-dot-active);
  opacity: 0.7;
}

/* 翻页：粘性视口只显示当前页，其余页叠放在上下两侧待命。 */
.is-paging .feature-pager-anchor { position: absolute; left: 0; width: 1px; height: 1px; pointer-events: none; }
.is-paging .feature-pager-viewport {
  position: sticky;
  top: 0;
  height: var(--pager-vh, 100vh);
  overflow: hidden;
}
.is-paging .feature-page {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--page-pad-top) var(--page-pad-x) var(--page-pad-bottom);
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  transform: translate3d(0, 12vh, 0);
  transition: opacity 0.28s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 0.6s;
}
.is-paging .feature-page[data-state='before'] { transform: translate3d(0, -9vh, 0); }
.is-paging .feature-page[data-state='current'] {
  opacity: 1;
  visibility: visible;
  transform: none;
  /* 旧页先淡出，新页稍后进入，避免两页内容在中途叠在一起。 */
  transition: opacity 0.45s ease 0.18s, transform 0.72s cubic-bezier(0.22, 1, 0.36, 1) 0.1s, visibility 0s;
}
.is-paging .feature-page-content { width: 100%; }
.is-paging .feature-page-stage { flex: none; max-width: 100%; }

/* 内容浮入：舞台、标题、正文依次错峰；离开时延后复位，避免淡出过程中跳动。 */
.is-paging .feature-page-stage, .is-paging .feature-copy > * {
  opacity: 0;
  transform: translate3d(0, 18px, 0);
  transition: opacity 0s linear 0.6s, transform 0s linear 0.6s;
}
.is-paging .feature-page[data-state='current'] .feature-page-stage,
.is-paging .feature-page[data-state='current'] .feature-copy > * {
  opacity: 1;
  transform: none;
  transition: opacity 0.55s ease var(--float-delay, 0.14s), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) var(--float-delay, 0.14s);
}
.is-paging .feature-copy > :nth-child(1) { --float-delay: 0.22s; }
.is-paging .feature-copy > :nth-child(2) { --float-delay: 0.29s; }
.is-paging .feature-copy > :nth-child(3) { --float-delay: 0.36s; }
.is-paging .feature-copy > :nth-child(4) { --float-delay: 0.43s; }
.is-paging .feature-copy > :nth-child(n + 5) { --float-delay: 0.5s; }

/* 页码点：无悬停时同尺寸，当前页仅换色；放大由指针距离驱动。 */
.feature-pager-dots {
  position: absolute;
  top: 50%;
  right: clamp(8px, 2vw, 28px);
  z-index: 2;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  transform: translate3d(0, -50%, 0);
}
.feature-pager-dots button {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.feature-pager-dot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--page-dot);
  transition: background-color 0.3s ease;
}
.feature-pager-dots button[aria-current='true'] .feature-pager-dot { background: var(--page-dot-active); }
.feature-pager-dots button:hover .feature-pager-dot { background: color-mix(in srgb, var(--page-dot-active) 55%, var(--page-dot)); }
.feature-pager-dots button[aria-current='true']:hover .feature-pager-dot { background: var(--page-dot-active); }
.feature-pager-dots button:focus-visible { border-radius: 50%; outline: 2px solid var(--page-dot-active); outline-offset: -2px; }

[data-theme='dark'] .feature-pager {
  --page-stage: #1f2c2d;
  --page-dot: rgba(201, 222, 220, 0.26);
  --page-dot-active: #9acbc1;
}
[data-theme='dark'] .feature-page-frame { border-color: rgba(201, 222, 220, 0.18); background: rgba(8, 12, 13, 0.55); box-shadow: 0 18px 48px -24px rgba(0, 0, 0, 0.7); }

@media (max-width: 767px) {
  .feature-pager { --page-pad-x: 28px; --page-pad-top: max(68px, 9vh); --page-pad-bottom: max(24px, 4vh); }
  .feature-page-stage { aspect-ratio: 4 / 3; padding: 6%; }
  .feature-statement h2 { font-size: clamp(24px, 7.2vw, 30px); letter-spacing: 0.03em; }
  .feature-statement .statement-line { font-size: 14px; line-height: 1.85; letter-spacing: 0.03em; text-wrap: pretty; }
  .feature-statement .statement-close { font-size: 15px; letter-spacing: 0.08em; }
  .feature-pager-dots { right: 2px; }
  .feature-pager-dots button { width: 20px; height: 20px; }
  .feature-pager-dot { width: 6px; height: 6px; }
}
</style>
