<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, useId } from 'vue'
import Ui3Bar from '../NewHome/Ui3Bar.vue'
import { createActiveClock } from './softPen'
import { pointerTarget } from './parallax'
import { fitReleaseBar, releaseFrame, releaseGroups, RELEASE_BAR_HEIGHT, RELEASE_BAR_WIDTH, RELEASE_SECONDS } from './releaseScene'

defineProps<{ downloadHref: string }>()

const root = ref<HTMLElement>()
const stage = ref<HTMLDivElement>()
const plane = ref<HTMLDivElement>()
const toolbar = ref<HTMLDivElement>()
const sceneId = `nh3-release-${useId().replace(/[^a-zA-Z0-9_-]/g, '-')}`
const clock = createActiveClock()
// SSR 默认输出完整终态；只有具备观察器的客户端才在挂载后武装一次入场。
const sceneFrame = shallowRef(releaseFrame(RELEASE_SECONDS))
const active = ref(false)
const fit = shallowRef({ ...fitReleaseBar(RELEASE_BAR_WIDTH + 64), natural: RELEASE_BAR_WIDTH })
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
    ? `translate3d(${tiltX * 6}px, ${tiltY * 6}px, 0) rotateX(${-tiltY * 4}deg) rotateY(${tiltX * 4}deg)` : 'none'
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
  fit.value = { ...fitReleaseBar(node.clientWidth, natural), natural }
  hasMeasured.value = true
  resetPointer()
}

onMounted(() => {
  if (!root.value) return
  mounted = true
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
  document.documentElement.addEventListener('pointerleave', resetPointer)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('blur', resetPointer)
  window.addEventListener('scroll', resetPointer, { passive: true })
  window.addEventListener('resize', resize, { passive: true })
  resize()
  syncActivity()
})

onBeforeUnmount(() => {
  mounted = false
  active.value = false
  clock.setRunning(false, performance.now())
  if (frame) cancelAnimationFrame(frame)
  visibleObserver?.disconnect()
  resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', syncActivity)
  document.documentElement.removeEventListener('pointerleave', resetPointer)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('blur', resetPointer)
  window.removeEventListener('scroll', resetPointer)
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <section ref="root" class="nh3-release" :aria-labelledby="`${sceneId}-title`">
    <h2 :id="`${sceneId}-title`" class="nh3-release-title" :style="sceneFrame.title">Inkeys3 焕新发布</h2>
    <div ref="stage" class="nh3-release-stage">
      <div ref="plane" class="nh3-release-plane" :style="hasMeasured ? { width: `${fit.width}px`, height: `${fit.height}px` } : undefined">
        <div class="nh3-release-entrance" :style="sceneFrame.toolbar">
          <div class="nh3-release-scale" :style="hasMeasured ? { width: `${fit.natural}px`, height: `${RELEASE_BAR_HEIGHT}px`, transform: `scale(${fit.scale})` } : undefined">
            <div class="nh3-release-surface" :style="tiltStyle">
              <div ref="toolbar" class="nh3-release-toolbar">
                <Ui3Bar :groups="releaseGroups" variant="release" :download-href="downloadHref" :paused="!active" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="nh3-release-copy" :style="sceneFrame.copy">
      <p>历经两年多的设计、开发与测试，Inkeys3 焕新而来。</p>
      <p>相较于 Inkeys2，我们重构<strong>底层架构</strong>，带来全新的 <strong>UI3</strong> 界面与 <strong>Draw3</strong> 绘制引擎。从更自然的交互、更细腻的光影，到更流畅的屏幕书写，让熟悉的体验再进一步。</p>
    </div>
  </section>
</template>

<style scoped>
.nh3-release {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: clamp(80px, 9vw, 128px) 0 clamp(100px, 12vw, 180px);
  color: var(--vp-c-text-1);
  text-align: center;
}

.nh3-release-title {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0 24px;
  border: 0;
  color: #087f91;
  font-size: clamp(32px, 4.8vw, 64px);
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.025em;
}

[data-theme='dark'] .nh3-release-title {
  color: #8eb8b3;
}

.nh3-release-stage {
  position: relative;
  display: grid;
  place-items: center;
  width: min(1200px, 100%);
  height: clamp(210px, 28vw, 350px);
  margin: 22px auto 12px;
}

.nh3-release-plane {
  --nh3-release-fallback-scale: 1;

  position: relative;
  z-index: 1;
  width: calc(682px * var(--nh3-release-fallback-scale));
  height: calc(80px * var(--nh3-release-fallback-scale));
  max-width: calc(100% - 64px);
}

.nh3-release-entrance {
  width: 100%;
  height: 100%;
}

.nh3-release-scale {
  position: absolute;
  top: 0;
  left: 0;
  width: 682px;
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

.nh3-release-copy {
  position: relative;
  z-index: 1;
  max-width: 730px;
  margin: 0 auto;
  padding: 0 28px;
  color: var(--vp-c-text-2);
  font-size: clamp(16px, 1.35vw, 19px);
  line-height: 1.95;
  text-wrap: balance;
}

.nh3-release-copy p {
  margin: 0;
}

.nh3-release-copy p + p {
  margin-top: 18px;
}

.nh3-release-copy strong {
  color: var(--vp-c-text-1);
  font-weight: 650;
}

/* SSR 尚未测量时按各档最窄视口缩放整组；挂载后由精确行内尺寸接管。 */
@media (max-width: 745px) {
  .nh3-release-plane { --nh3-release-fallback-scale: 0.37536656; }
}

@media (min-width: 375px) and (max-width: 745px) {
  .nh3-release-plane { --nh3-release-fallback-scale: 0.45601173; }
}

@media (min-width: 480px) and (max-width: 745px) {
  .nh3-release-plane { --nh3-release-fallback-scale: 0.60997067; }
}

@media (min-width: 640px) and (max-width: 745px) {
  .nh3-release-plane { --nh3-release-fallback-scale: 0.84457478; }
}

@media (max-width: 319px) {
  .nh3-release-plane { --nh3-release-fallback-scale: 0.3; }
}

@media (max-width: 640px) {
  .nh3-release-stage {
    margin-top: 18px;
    margin-bottom: 4px;
  }

  .nh3-release-copy {
    max-width: 520px;
    font-size: 16px;
    line-height: 1.9;
  }
}
</style>
