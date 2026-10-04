<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDarkMode } from 'vuepress-theme-plume/client'
import { computeLayout, createActiveClock, createPainter, createScene, timelineAt } from './softPen'
import type { AnimationState, Painter } from './softPen'

const scene = createScene()
const root = ref<HTMLDivElement>()
const plane = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
const planeStyle = ref<Record<string, string>>({ aspectRatio: String(scene.aspect) })
const clock = createActiveClock()
const transitionClock = createActiveClock()
const paused = ref(false)
const reduced = ref(false)
const isDark = useDarkMode()
const iconPath = ref(iconPaths(0))

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
let pauseTransition: { from: AnimationState } | undefined
let iconProgress = 0
let iconVelocity = 0

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

function getPaintState(now: number): AnimationState {
  if (reduced.value) return timelineAt(0, true)
  if (pauseTransition) {
    const time = transitionClock.read(now)
    const ease = (value: number) => value * value * (3 - 2 * value)
    if (time < 0.22) {
      return { ...pauseTransition.from, opacity: pauseTransition.from.opacity * (1 - ease(time / 0.22)) }
    }
    if (time < 0.52) return { ...timelineAt(0, true), opacity: ease((time - 0.22) / 0.3) }
    pauseTransition = undefined
    transitionClock.setRunning(false, now)
    // 快速再次点击只改变目标状态；先完成当前淡入，再无缝转入正常渐隐。
    if (!paused.value) {
      frozen = undefined
      clock.seek(7.2, now)
      clock.setRunning(canAnimate(), now)
    }
  }
  return timelineAt(frozen ?? clock.read(now), paused.value)
}

function canAnimate() {
  return mounted && !document.hidden && inViewport
}

function paint(now: number) {
  const node = canvas.value
  if (!node || !painter) return
  const state = getPaintState(now)
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
  const iconTarget = paused.value ? 1 : 0
  const steps = Math.ceil(dt / 0.008)
  for (let i = 0; i < steps; i++) {
    const step = dt / steps
    iconVelocity += ((iconTarget - iconProgress) * 360 - iconVelocity * 28) * step
    iconProgress += iconVelocity * step
  }
  const iconMoving = Math.abs(iconTarget - iconProgress) + Math.abs(iconVelocity) > 0.001
  if (!iconMoving || reduced.value) {
    iconProgress = iconTarget
    iconVelocity = 0
  }
  iconPath.value = iconPaths(iconProgress)
  applyTilt()
  paint(now)
  if ((!reduced.value && (pauseTransition || (!paused.value && frozen === undefined)))
    || moving || (!reduced.value && iconMoving)) requestFrame()
}

function syncPlayback() {
  const now = performance.now()
  clock.setRunning(canAnimate() && !reduced.value && !paused.value && !pauseTransition && frozen === undefined, now)
  transitionClock.setRunning(canAnimate() && !reduced.value && !!pauseTransition, now)
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
  const now = performance.now()
  previousFrame = now
  const from = getPaintState(now)
  if (!paused.value && !pauseTransition) {
    // 冻结当前几何后先淡出，再淡入完整彩虹；灰点只保留在淡出的旧画面里。
    pauseTransition = { from }
    transitionClock.seek(0, now)
  }
  else if (paused.value && !pauseTransition) {
    frozen = undefined
    clock.seek(7.2, now)
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
  if (reduced.value) {
    if (pauseTransition) {
      pauseTransition = undefined
      frozen = undefined
      transitionClock.setRunning(false, performance.now())
      clock.seek(7.2, performance.now())
    }
    iconProgress = paused.value ? 1 : 0
    iconVelocity = 0
    iconPath.value = iconPaths(iconProgress)
  }
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
  transitionClock.setRunning(false, performance.now())
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
      :aria-label="paused ? '继续动画' : '暂停动画'"
      @click="togglePlayback"
    >
      <svg class="nh3-playback-surface" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 1C44 1 47 4 47 24C47 44 44 47 24 47C4 47 1 44 1 24C1 4 4 1 24 1Z" />
      </svg>
      <svg class="nh3-playback-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path :d="iconPath" />
      </svg>
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
  --nh3-playback-hover: rgba(110, 139, 161, 0.17);
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
  --nh3-playback-hover: rgba(2, 8, 16, 0.4);
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
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  border-radius: 16px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  cursor: pointer;
  transition: transform 360ms cubic-bezier(0.2, 0.8, 0.25, 1.35);
}

.nh3-playback-surface {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  fill: var(--nh3-control-bg);
  stroke: var(--nh3-control-border);
  stroke-width: 1px;
  transition: fill 220ms cubic-bezier(0.2, 0.7, 0.2, 1);
  pointer-events: none;
}

.nh3-playback-icon {
  position: relative;
  width: 24px;
  height: 24px;
  fill: currentColor;
  pointer-events: none;
}

@media (hover: hover) and (pointer: fine) {
  .nh3-playback:hover:not(:disabled) {
    transform: scale(1.07);
  }

  .nh3-playback:hover:not(:disabled) .nh3-playback-surface {
    fill: var(--nh3-playback-hover);
  }
}

.nh3-playback:active:not(:disabled) {
  transform: scale(0.94);
  transition-duration: 120ms;
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
  .nh3-playback,
  .nh3-playback-surface {
    transition: none;
  }

  .nh3-mark {
    will-change: auto;
  }
}
</style>
