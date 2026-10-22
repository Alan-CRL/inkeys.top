<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, useId } from 'vue'
import Ui3Bar from '../NewHome/Ui3Bar.vue'
import { createActiveClock } from './softPen'
import { pointerTarget } from './parallax'
import { createWallpaperSchedule, initialWallpaper } from './wallpaper'
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
        <h2 :id="`${sceneId}-title`" class="nh3-release-title">Inkeys3</h2>
        <p class="nh3-release-subtitle">焕新发布</p>
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
    </div>
  </section>
</template>

<style scoped>
@font-face {
  font-family: 'Archivo Black Release';
  src: url('./fonts/archivo-black-release.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

.nh3-release {
  position: relative;
  z-index: 1;
  isolation: isolate;
  overflow: hidden;
  padding: 56px 24px 40px;
  color: var(--vp-c-text-1);
}

.nh3-release-card {
  container-type: inline-size;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 35% minmax(0, 65%);
  align-items: center;
  width: 100%;
  max-width: 1200px;
  height: clamp(360px, 45svh, 420px);
  margin: 0 auto;
  padding: 40px 48px;
  border: 1px solid rgba(73, 99, 120, 0.12);
  border-radius: 28px;
  background: linear-gradient(120deg, #f8fafb, #eef2f5);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

[data-theme='dark'] .nh3-release-card {
  border-color: rgba(177, 205, 220, 0.1);
  background: linear-gradient(120deg, #202c36, #18232e);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
}

.nh3-release-heading {
  position: relative;
  z-index: 1;
}

.nh3-release-title {
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--vp-c-text-1);
  font-family: 'Archivo Black Release', Arial, sans-serif;
  font-size: min(clamp(72px, 7.2vw, 104px), 8.5cqw);
  font-weight: 400;
  font-synthesis: none;
  line-height: 1.05;
  letter-spacing: -0.045em;
}

.nh3-release-subtitle {
  margin: 16px 0 0;
  color: var(--vp-c-text-2);
  font-size: clamp(20px, 1.8vw, 24px);
  line-height: 1.4;
  letter-spacing: 0.08em;
}

.nh3-release-stage {
  position: relative;
  justify-self: end;
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
  .nh3-release-card {
    grid-template-columns: minmax(0, 1fr);
    gap: 32px;
    height: auto;
    padding: 32px 24px;
  }

  .nh3-release-title { font-size: min(clamp(52px, 8vw, 72px), 23cqw); }
  .nh3-release-stage { justify-self: center; max-width: 567px; height: 240px; }
  .nh3-release-desktop { left: 24px; }
  .nh3-release-position { left: 8px; }
  .nh3-release-plane { inset-inline-start: 0; --nh3-release-fallback-scale: 0.37; }
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
