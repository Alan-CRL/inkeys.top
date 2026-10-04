<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDarkMode } from 'vuepress-theme-plume/client'
import { computeLayout, createActiveClock, createPainter, createScene, timelineAt } from './softPen'
import type { Painter } from './softPen'

const scene = createScene()
const root = ref<HTMLDivElement>()
const plane = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
const planeStyle = ref<Record<string, string>>({ aspectRatio: String(scene.aspect) })
const clock = createActiveClock()
const paused = ref(false)
const reduced = ref(false)
const isDark = useDarkMode()

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
let motionPreference: MediaQueryList | undefined
let pointerPreference: MediaQueryList | undefined
let targetX = 0
let targetY = 0
let tiltX = 0
let tiltY = 0

function canAnimate() {
  return mounted && !document.hidden && inViewport
}

function paint(now: number) {
  const node = canvas.value
  if (!node || !painter) return
  const state = timelineAt(frozen ?? clock.read(now), reduced.value || paused.value)
  painter.render(state, width, height, window.devicePixelRatio, isDark.value ? 'dark' : 'light')
}

// 主题切换只重绘当前帧；手动暂停、减少动态效果和离屏状态都不重置时间轴。
watch(isDark, () => {
  if (mounted) paint(performance.now())
}, { flush: 'post' })

function applyTilt() {
  const node = canvas.value
  if (!node) return
  node.style.transform = `translate3d(${tiltX * 6}px, ${tiltY * 6}px, 0) rotateX(${-tiltY * 4}deg) rotateY(${tiltX * 4}deg)`
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
  applyTilt()
  paint(now)
  if ((!reduced.value && !paused.value && frozen === undefined) || moving) requestFrame()
}

function syncPlayback() {
  const now = performance.now()
  clock.setRunning(canAnimate() && !reduced.value && !paused.value && frozen === undefined, now)
  if (!canAnimate()) {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    previousFrame = 0
    return
  }
  paint(now)
  requestFrame()
}

function togglePlayback() {
  if (reduced.value) return
  if (paused.value) {
    // 继续时直接从完整彩虹的渐隐起点播放，不接续半截笔画或重复等待。
    frozen = undefined
    clock.seek(7.2, performance.now())
  }
  paused.value = !paused.value
  syncPlayback()
}

function resetPointer() {
  targetX = 0
  targetY = 0
  requestFrame()
}

function onPointerMove(event: PointerEvent) {
  if (reduced.value || !pointerPreference?.matches || event.pointerType === 'touch' || !canAnimate()) return
  const box = plane.value?.getBoundingClientRect()
  if (!box || !box.width || !box.height) return
  // 从未变换的外层测量，避免旋转后的边界反过来改变指针目标而抖动。
  const outsideX = Math.max(box.left - event.clientX, 0, event.clientX - box.right)
  const outsideY = Math.max(box.top - event.clientY, 0, event.clientY - box.bottom)
  const distance = Math.hypot(outsideX, outsideY)
  const proximity = Math.max(0, 1 - distance / 120)
  const strength = proximity * proximity * (3 - 2 * proximity)
  const normalizedX = Math.max(-1, Math.min(1, (event.clientX - box.left - box.width / 2) / (box.width / 2)))
  const normalizedY = Math.max(-1, Math.min(1, (event.clientY - box.top - box.height / 2) / (box.height / 2)))
  targetX = normalizedX * strength
  targetY = normalizedY * strength
  requestFrame()
}

function onPreferencesChange() {
  reduced.value = motionPreference?.matches ?? false
  if (reduced.value || !pointerPreference?.matches) {
    targetX = targetY = tiltX = tiltY = 0
    applyTilt()
  }
  syncPlayback()
}

function onVisibilityChange() {
  resetPointer()
  syncPlayback()
}

function resize() {
  const node = root.value
  if (!node) return
  const layout = computeLayout(node.clientWidth, node.clientHeight, scene.aspect)
  width = layout.width
  height = layout.height
  planeStyle.value = {
    width: `${width}px`,
    height: `${height}px`,
    top: `${layout.centerY}px`,
  }
  resetPointer()
  paint(performance.now())
}

onMounted(() => {
  const node = canvas.value
  if (!node || !root.value) return
  mounted = true
  painter = createPainter(scene, node)
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  pointerPreference = window.matchMedia('(hover: hover) and (pointer: fine)')
  reduced.value = motionPreference.matches

  // 仅开发环境冻结完整时间轴，例如 ?t=13 可检查循环中的第二次彩虹书写。
  if (import.meta.env.DEV) {
    const query = new URLSearchParams(window.location.search).get('t')
    if (query !== null && query.trim() && Number.isFinite(Number(query))) frozen = Math.max(0, Number(query))
  }

  motionPreference.addEventListener('change', onPreferencesChange)
  pointerPreference.addEventListener('change', onPreferencesChange)
  document.addEventListener('visibilitychange', onVisibilityChange)
  document.documentElement.addEventListener('pointerleave', resetPointer)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('blur', resetPointer)
  window.addEventListener('resize', resize, { passive: true })

  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(root.value)
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
  clock.setRunning(false, performance.now())
  if (frame) cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  visibleObserver?.disconnect()
  motionPreference?.removeEventListener('change', onPreferencesChange)
  pointerPreference?.removeEventListener('change', onPreferencesChange)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  document.documentElement.removeEventListener('pointerleave', resetPointer)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('blur', resetPointer)
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <div ref="root" class="nh3-root">
    <div ref="plane" class="nh3-plane" :style="planeStyle">
      <canvas ref="canvas" class="nh3-mark" role="img" aria-label="Inkeys" />
    </div>
    <button
      class="nh3-playback"
      type="button"
      :disabled="reduced"
      :aria-pressed="paused"
      @click="togglePlayback"
    >
      {{ paused ? '继续动画' : '暂停动画' }}
    </button>
  </div>
</template>

<style>
/* pageClass 由 Plume 在 SSR 中输出，导航与首屏共享底色，离开此页即不再匹配。 */
.new-home3-page {
  --nh3-bg: #f6f9fb;
  --nh3-mint: rgba(136, 218, 195, 0.24);
  --nh3-lavender: rgba(173, 163, 232, 0.23);
  --nh3-pearl: rgba(255, 236, 214, 0.18);
  --nh3-control-bg: rgba(255, 255, 255, 0.48);
  --nh3-control-hover: rgba(255, 255, 255, 0.76);
  --nh3-control-border: rgba(73, 99, 120, 0.14);
  --vp-c-text-1: #283e4c;
  --vp-c-text-2: #506473;
  --vp-c-text-3: #6b7c8a;
  --vp-c-brand-1: #087f91;
  --vp-nav-bg-color: transparent;
  --vp-nav-screen-bg-color: #f4f8fa;
  background-color: var(--nh3-bg);
  background-image:
    radial-gradient(ellipse at 12% 15%, var(--nh3-mint), transparent 60%),
    radial-gradient(ellipse at 88% 45%, var(--nh3-lavender), transparent 65%),
    radial-gradient(ellipse at 45% 95%, var(--nh3-pearl), transparent 60%);
  background-size: 100% 100svh;
  background-repeat: no-repeat;
}

[data-theme='dark'] .new-home3-page {
  --nh3-bg: #111820;
  --nh3-mint: rgba(36, 102, 100, 0.23);
  --nh3-lavender: rgba(80, 65, 137, 0.22);
  --nh3-pearl: rgba(91, 76, 111, 0.09);
  --nh3-control-bg: rgba(178, 204, 231, 0.07);
  --nh3-control-hover: rgba(178, 204, 231, 0.12);
  --nh3-control-border: rgba(186, 207, 230, 0.16);
  --vp-c-text-1: #e6edf5;
  --vp-c-text-2: #b3c1d1;
  --vp-c-text-3: #8b9db0;
  --vp-c-brand-1: #7bc9cc;
  --vp-nav-screen-bg-color: #151e29;
}

/* 保留原生导航和移动菜单，仅清除导航横条的填充与分隔线。 */
.new-home3-page .vp-navbar .divider {
  display: none;
}

.theme-plume.new-home3-page .vp-nav .vp-navbar {
  background: transparent;
  border-bottom: 0;
}

.new-home3-page .vp-navbar-search .mini-search-button {
  background: var(--nh3-control-bg);
  border-color: var(--nh3-control-border);
}

.new-home3-page .vp-navbar-search .mini-search-button:hover {
  background: var(--nh3-control-hover);
  border-color: var(--vp-c-brand-1);
}

.new-home3-page .vp-navbar-search .mini-search-button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}

.nh3-root {
  --nh3-control-gap: clamp(16px, 2vw, 24px);
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

.nh3-mark {
  display: block;
  width: 100%;
  height: 100%;
  background: transparent;
  transform-origin: center;
  will-change: transform;
}

.nh3-playback {
  position: absolute;
  right: var(--nh3-control-gap);
  bottom: var(--nh3-control-gap);
  padding: 10px 16px;
  border: 1px solid var(--nh3-control-border);
  border-radius: 12px;
  background: var(--nh3-control-bg);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  cursor: pointer;
}

.nh3-playback:hover:not(:disabled) {
  background: var(--nh3-control-hover);
}

.nh3-playback:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}

.nh3-playback:disabled {
  opacity: 0.55;
  cursor: default;
}

@media (max-width: 640px) {
  .nh3-plane {
    width: calc(100vw - 84px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nh3-mark {
    will-change: auto;
  }
}
</style>
