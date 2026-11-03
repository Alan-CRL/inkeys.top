<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, useId } from 'vue'
import Ui3Bar from '../NewHome/Ui3Bar.vue'
import { createActiveClock } from './softPen'
import { pointerTarget } from './parallax'
import { createWallpaperSchedule, initialWallpaper } from './wallpaper'
import { downloadContent } from './featureContent'
import { fitReleaseBar, releaseFrame, releaseGroups, RELEASE_BAR_HEIGHT, RELEASE_BAR_WIDTH, RELEASE_SECONDS } from './releaseScene'

const root = ref<HTMLElement>()
const stage = ref<HTMLDivElement>()
const plane = ref<HTMLDivElement>()
const toolbar = ref<HTMLDivElement>()
const sceneId = `nh3-release-${useId().replace(/[^a-zA-Z0-9_-]/g, '-')}`
const clock = createActiveClock()
const wallpaperClock = createActiveClock()
const wallpaper = shallowRef(initialWallpaper())
let wallpaperSchedule: ReturnType<typeof createWallpaperSchedule> | undefined
let wallpaperTimer: ReturnType<typeof setTimeout> | undefined

// 两层壁纸仅在配色边界更新；漂移和淡化由可暂停的 CSS 动画完成。
function updateWallpaper() {
  wallpaperTimer = undefined
  if (!canAnimate() || !wallpaperSchedule) return
  const now = wallpaperClock.read(performance.now())
  wallpaper.value = wallpaperSchedule.advance(now)
  wallpaperTimer = setTimeout(updateWallpaper, Math.max(16, wallpaperSchedule.remaining(now) * 1000))
}

function syncWallpaper(now: number) {
  if (wallpaperTimer !== undefined) clearTimeout(wallpaperTimer)
  wallpaperTimer = undefined
  wallpaperClock.setRunning(active.value, now)
  if (active.value) updateWallpaper()
}
// SSR 默认输出完整终态；只有具备观察器的客户端才在挂载后武装一次入场。
const sceneFrame = shallowRef(releaseFrame(RELEASE_SECONDS))
const active = ref(false)
const fit = shallowRef({ ...fitReleaseBar(RELEASE_BAR_WIDTH + 16), natural: RELEASE_BAR_WIDTH })
const hasMeasured = ref(false)
const tiltStyle = shallowRef<Record<string, string>>({ transform: 'none', willChange: 'auto' })

let mounted = false
let inViewport = false
let entranceComplete = true
let frame = 0
let previousFrame = 0
let targetX = 0
let targetY = 0
let tiltX = 0
let tiltY = 0
let pendingPointer: { x: number, y: number } | undefined
let visibleObserver: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined

function canAnimate() {
  return mounted && inViewport && !document.hidden
}

function applyTilt() {
  const tilted = tiltX !== 0 || tiltY !== 0
  const transform = tilted
    ? `translate3d(${tiltX * 3}px, ${tiltY * 3}px, 0) rotateX(${-tiltY * 2}deg) rotateY(${tiltX * 2}deg)` : 'none'
  if (tiltStyle.value.transform !== transform) tiltStyle.value = { transform, willChange: tilted ? 'transform' : 'auto' }
}

function requestFrame() {
  if (!frame && canAnimate()) frame = requestAnimationFrame(tick)
}

function updateEntrance(now: number) {
  if (entranceComplete) return
  sceneFrame.value = releaseFrame(clock.read(now))
  entranceComplete = sceneFrame.value.complete
  if (entranceComplete) clock.setRunning(false, now)
}

function tick(now: number) {
  frame = 0
  if (!canAnimate()) return
  if (pendingPointer) {
    // 高频 pointermove 先合并，每帧最多一次读取未变换 plane，不逐按钮测量。
    const box = plane.value?.getBoundingClientRect()
    if (box) {
      const target = pointerTarget(box, pendingPointer.x, pendingPointer.y)
      targetX = target.x
      targetY = target.y
    }
    pendingPointer = undefined
  }
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
  applyTilt()
  updateEntrance(now)
  if (!entranceComplete || moving) requestFrame()
  else previousFrame = 0
}

function resetPointer() {
  pendingPointer = undefined
  targetX = targetY = 0
  if (tiltX || tiltY) requestFrame()
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || !canAnimate()) return
  pendingPointer = { x: event.clientX, y: event.clientY }
  requestFrame()
}

function syncActivity() {
  const now = performance.now()
  active.value = canAnimate()
  syncWallpaper(now)
  clock.setRunning(active.value && !entranceComplete, now)
  if (!active.value) {
    if (frame) cancelAnimationFrame(frame)
    frame = previousFrame = 0
    pendingPointer = undefined
    targetX = targetY = tiltX = tiltY = 0
    applyTilt()
    return
  }
  if (!entranceComplete || targetX !== tiltX || targetY !== tiltY) requestFrame()
}

function resize() {
  const node = stage.value
  if (!node) return
  const natural = toolbar.value?.offsetWidth || RELEASE_BAR_WIDTH
  fit.value = { ...fitReleaseBar(node.clientWidth, natural, window.innerWidth >= 900), natural }
  hasMeasured.value = true
  resetPointer()
}

onMounted(() => {
  if (!root.value) return
  mounted = true
  wallpaperSchedule = createWallpaperSchedule()
  if (typeof IntersectionObserver !== 'undefined') {
    entranceComplete = false
    sceneFrame.value = releaseFrame(0)
    visibleObserver = new IntersectionObserver(entries => {
      inViewport = entries.some(entry => entry.isIntersecting)
      syncActivity()
    })
    visibleObserver.observe(root.value)
  }
  else inViewport = true
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize)
    if (stage.value) resizeObserver.observe(stage.value)
    if (toolbar.value) resizeObserver.observe(toolbar.value)
  }
  document.addEventListener('visibilitychange', syncActivity)
  plane.value?.addEventListener('pointerleave', resetPointer)
  plane.value?.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('blur', resetPointer)
  window.addEventListener('scroll', resetPointer, { passive: true })
  window.addEventListener('resize', resize, { passive: true })
  resize()
  syncActivity()
})

onBeforeUnmount(() => {
  mounted = false
  active.value = false
  syncWallpaper(performance.now())
  clock.setRunning(false, performance.now())
  if (frame) cancelAnimationFrame(frame)
  visibleObserver?.disconnect()
  resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', syncActivity)
  plane.value?.removeEventListener('pointerleave', resetPointer)
  plane.value?.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('blur', resetPointer)
  window.removeEventListener('scroll', resetPointer)
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <section ref="root" class="nh3-release" :aria-labelledby="`${sceneId}-title`">
    <div class="nh3-release-card" :style="sceneFrame.card">
      <div class="nh3-release-heading" :style="sceneFrame.title">
        <!-- 与功能翻页的标题一致：斜体衬线品牌 + 强调色分隔点 + 衬线主题；读屏仍是完整标题。 -->
        <h2 :id="`${sceneId}-title`" class="nh3-release-title">
          <span class="release-brand">Inkeys3</span><span class="release-dot"> · </span><span class="release-theme">焕新发布</span>
        </h2>
      </div>
      <div ref="stage" class="nh3-release-stage">
        <div class="nh3-release-desktop" aria-hidden="true" :style="{ '--wallpaper-play': active ? 'running' : 'paused' }">
          <div v-for="(palette, index) in wallpaper.palettes" :key="index" class="nh3-release-wallpaper"
            :class="[`palette-${palette}`, { 'is-current': index === wallpaper.current, 'is-entering': wallpaper.fading && index !== wallpaper.current }]">
            <div class="nh3-release-wallpaper-colors" />
          </div>
        </div>
        <!-- 左侧给主按钮探出留白，右侧圆角与桌面重合；裁切层不参与视差。 -->
        <div ref="plane" class="nh3-release-plane">
          <div class="nh3-release-position" :style="hasMeasured ? { width: `${fit.width}px`, height: `${fit.height}px` } : undefined">
            <div class="nh3-release-entrance" :style="sceneFrame.toolbar">
              <div class="nh3-release-scale" :style="hasMeasured ? { width: `${fit.natural}px`, height: `${RELEASE_BAR_HEIGHT}px`, transform: `scale(${fit.scale})` } : undefined">
                <div class="nh3-release-surface" :style="tiltStyle">
                  <div ref="toolbar" class="nh3-release-toolbar">
                    <Ui3Bar :groups="releaseGroups" variant="release" crop-last-group :paused="!active" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="nh3-release-actions" :style="sceneFrame.toolbar">
        <a class="nh3-release-download no-icon" :href="downloadContent.href" target="_blank" rel="noopener noreferrer">立即下载</a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.nh3-release {
  --release-card: #dfe9e6;
  --release-accent: #286a71;
  --release-on-accent: #fff;
  --release-serif: 'Noto Serif SC', 'Source Han Serif SC', 'Source Han Serif CN', 'Songti SC', 'STSong', 'SimSun', serif;

  position: relative;
  z-index: 1;
  isolation: isolate;
  overflow: hidden;
  padding: 24px 24px 48px;
  color: var(--vp-c-text-1);
}

[data-theme='dark'] .nh3-release {
  --release-card: #1f2c2d;
  --release-accent: #9acbc1;
  --release-on-accent: #0f2623;
}

/* 与功能介绍配图同宽、同色、同圆角：纯色平整底板，不加边框与阴影。 */
.nh3-release-card {
  container-type: inline-size;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(22px, 3.4vh, 34px);
  width: min(840px, 66vw);
  margin: 0 auto;
  padding: 44px 48px 48px;
  border-radius: clamp(16px, 2.2vw, 28px);
  background: var(--release-card);
}

.nh3-release-heading {
  position: relative;
  z-index: 1;
  max-width: 100%;
  text-align: center;
}

.nh3-release-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--vp-c-text-1);
  font-family: var(--release-serif);
  font-size: clamp(30px, min(3.4vw, 5.8vh), 54px);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.06em;
  overflow-wrap: anywhere;
}

.release-brand {
  font-family: 'DM Serif Display', Georgia, serif;
  font-style: italic;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.release-dot { margin: 0 0.08em; color: var(--release-accent); white-space: pre; }

.nh3-release-actions { display: flex; justify-content: center; }

.nh3-release-download {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 34px;
  border-radius: 24px;
  background: var(--release-accent);
  color: var(--release-on-accent);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.nh3-release-download:hover {
  background: color-mix(in srgb, var(--release-accent) 86%, var(--vp-c-text-1));
  color: var(--release-on-accent);
  text-decoration: none;
}

.nh3-release-download:focus-visible { outline: 2px solid var(--release-accent); outline-offset: 4px; }

.nh3-release-stage {
  position: relative;
  width: 100%;
  max-width: 511px;
  height: clamp(240px, 22vw, 280px);
}

/* 外壳始终有不透明底色，交叉淡化不会透出卡片后方笔迹。 */
.nh3-release-desktop {
  position: absolute;
  inset: 0 0 0 48px;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid rgba(91, 123, 140, 0.12);
  border-radius: 24px;
  background: #c4dcd9;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

[data-theme='dark'] .nh3-release-desktop {
  border-color: rgba(170, 201, 219, 0.13);
  background: #28423f;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
}

.nh3-release-wallpaper {
  position: absolute;
  inset: 0;
  opacity: 0;
}

.nh3-release-wallpaper.is-current { opacity: 1; }
.nh3-release-wallpaper.is-entering {
  z-index: 1;
  /* 与首屏一致，局部保留演示动画，不受主题全局 reduced-motion 重置影响。 */
  animation: nh3-wallpaper-fade 6s ease-in-out both !important;
  animation-play-state: var(--wallpaper-play, paused) !important;
}

.nh3-release-wallpaper-colors {
  position: absolute;
  inset: -15%;
  background:
    radial-gradient(ellipse at 15% 15%, var(--wallpaper-a), transparent 70%),
    linear-gradient(135deg, var(--wallpaper-a), var(--wallpaper-b) 55%, var(--wallpaper-c));
  animation: nh3-wallpaper-drift 24s ease-in-out infinite !important;
  animation-play-state: var(--wallpaper-play, paused) !important;
}

.palette-0 { --wallpaper-a: #b4e2d4; --wallpaper-b: #b2c6dd; --wallpaper-c: #c2bcda; }
.palette-1 { --wallpaper-a: #b8cedc; --wallpaper-b: #bbbfe0; --wallpaper-c: #dcc6ce; }
.palette-2 { --wallpaper-a: #b9d5d2; --wallpaper-b: #c1cfbb; --wallpaper-c: #dfd5bf; }
[data-theme='dark'] .palette-0 { --wallpaper-a: #284e46; --wallpaper-b: #304254; --wallpaper-c: #46435d; }
[data-theme='dark'] .palette-1 { --wallpaper-a: #304957; --wallpaper-b: #414760; --wallpaper-c: #584550; }
[data-theme='dark'] .palette-2 { --wallpaper-a: #304b48; --wallpaper-b: #424e40; --wallpaper-c: #595142; }

@keyframes nh3-wallpaper-drift {
  0%, 100% { transform: translate(-3%, -2%) rotate(-3deg); }
  50% { transform: translate(3%, 2%) rotate(3deg); }
}

@keyframes nh3-wallpaper-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.nh3-release-plane {
  --nh3-release-fallback-scale: 1;

  position: absolute;
  inset: 0 0 0 -12px;
  overflow: hidden;
  border-radius: 0 24px 24px 0;
}

.nh3-release-position {
  position: absolute;
  top: 57%;
  left: 12px;
  width: calc(551px * var(--nh3-release-fallback-scale));
  height: calc(80px * var(--nh3-release-fallback-scale));
  transform: translateY(-50%);
}

.nh3-release-entrance {
  width: 100%;
  height: 100%;
}

.nh3-release-scale {
  position: absolute;
  top: 0;
  left: 0;
  width: 551px;
  height: 80px;
  perspective: 1200px;
  transform: scale(var(--nh3-release-fallback-scale));
  transform-origin: 0 0;
}

.nh3-release-surface {
  width: 100%;
  height: 100%;
  transform-origin: center;
}

.nh3-release-toolbar {
  width: max-content;
  height: 80px;
  font-family: 'Microsoft YaHei UI', 'Microsoft YaHei', system-ui, sans-serif;
}

/* 首次测量前按各档最窄宽度保守缩放，避免 SSR 的原尺寸主栏撑出页面。 */
@media (min-width: 900px) and (max-width: 920px) {
  .nh3-release-plane { --nh3-release-fallback-scale: 0.975; }
}

@media (max-width: 899px) {
  .nh3-release-card { padding: 36px 32px 40px; }
  .nh3-release-stage { max-width: 567px; height: 240px; }
  .nh3-release-desktop { left: 24px; }
  .nh3-release-position { left: 8px; }
  .nh3-release-plane { inset-inline-start: 0; --nh3-release-fallback-scale: 0.37; }
}

@media (max-width: 767px) {
  .nh3-release { padding: 16px 20px 40px; }
  .nh3-release-card { width: 100%; padding: 32px 20px 36px; }
  .nh3-release-title { font-size: clamp(24px, 7.2vw, 30px); letter-spacing: 0.03em; }
}

@media (min-width: 375px) and (max-width: 899px) {
  .nh3-release-plane { --nh3-release-fallback-scale: 0.47; }
}

@media (min-width: 480px) and (max-width: 899px) {
  .nh3-release-plane { --nh3-release-fallback-scale: 0.66; }
}

@media (min-width: 640px) and (max-width: 899px) {
  .nh3-release-plane { --nh3-release-fallback-scale: 0.95; }
}

@media (min-width: 680px) and (max-width: 899px) {
  .nh3-release-plane { --nh3-release-fallback-scale: 1; }
}
</style>
