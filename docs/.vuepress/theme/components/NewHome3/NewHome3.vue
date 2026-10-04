<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDarkMode } from 'vuepress-theme-plume/client'
import { computeLayout, createActiveClock, createPainter, createScene } from './softPen'
import type { Painter } from './softPen'
import { createPlayback } from './playback'
import { PEN_ORDER, resolveSolidColor } from './styles'
import type { ColorChoice, PenKind, StrokeSize } from './styles'

const scene = createScene()
const root = ref<HTMLDivElement>()
const plane = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
const planeStyle = ref<Record<string, string>>({ aspectRatio: String(scene.aspect) })
const clock = createActiveClock()
const playback = createPlayback()
const paused = ref(false)
const reduced = ref(false)
const isDark = useDarkMode()
const iconPath = ref(iconPaths(0))
const controls = ref<HTMLDivElement>()
const paletteButton = ref<HTMLButtonElement>()
const panel = ref<HTMLDivElement>()
const panelOpen = ref(false)
const selectedPens = ref<PenKind[]>(['hard'])
const selectedColor = ref<ColorChoice>('rainbow')
const selectedSize = ref<StrokeSize>('medium')
const artFrame = ref(playback.read(0))
const tiltStyle = ref<Record<string, string>>({})
const penLabels: Record<PenKind, string> = { hard: '硬笔', soft: '软笔', highlighter: '荧光笔', laser: '激光笔', brush: '刷子' }
const colorChoices: ColorChoice[] = ['rainbow', 'neutral', 'red', 'amber', 'green', 'cyan', 'blue', 'purple']
const colorLabels = { rainbow: '彩虹色', neutral: '中性色', red: '红色', amber: '琥珀色', green: '绿色', cyan: '青色', blue: '蓝色', purple: '紫色' }
const sizeChoices: StrokeSize[] = ['thin', 'medium', 'thick']
const sizeLabels = { thin: '细', medium: '中', thick: '粗' }

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

function canAnimate() {
  return mounted && !document.hidden && inViewport
}

function paint(now: number) {
  const node = canvas.value
  if (!node || !painter) return
  const current = playback.read(frozen ?? clock.read(now), reduced.value)
  artFrame.value = current
  painter.render(current.view === 'ink' ? current.state : { ...current.state, opacity: 0 }, width, height,
    window.devicePixelRatio, isDark.value ? 'dark' : 'light', current.style)
}

// 主题切换只重绘当前帧；手动暂停、减少动态效果和离屏状态都不重置时间轴。
watch(isDark, () => {
  if (mounted) paint(performance.now())
}, { flush: 'post' })

function applyTilt() {
  const node = canvas.value
  if (!node) return
  node.style.transform = `translate3d(${tiltX * 6}px, ${tiltY * 6}px, 0) rotateX(${-tiltY * 4}deg) rotateY(${tiltX * 4}deg)`
  tiltStyle.value = { transform: node.style.transform }
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
  if ((!reduced.value && playback.animating && frozen === undefined)
    || moving || (!reduced.value && iconMoving)) requestFrame()
}

function syncPlayback() {
  const now = performance.now()
  clock.setRunning(canAnimate() && !reduced.value && frozen === undefined, now)
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
  if (frozen !== undefined) {
    clock.seek(frozen, now)
    frozen = undefined
  }
  playback.toggle(clock.read(now))
  paused.value = playback.paused
  syncPlayback()
}

function updateSettings() {
  playback.configure({ pens: selectedPens.value, color: selectedColor.value, size: selectedSize.value },
    frozen ?? clock.read(performance.now()), reduced.value)
  syncPlayback()
}

function closePanel(returnFocus = false) {
  panelOpen.value = false
  if (returnFocus) paletteButton.value?.focus()
}

function togglePanel(event: MouseEvent) {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value && event.detail === 0) {
    void nextTick(() => panel.value?.querySelector<HTMLInputElement>('input')?.focus())
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
    playback.settleReduced(frozen ?? clock.read(performance.now()))
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

  // 仅开发环境冻结完整时间轴，例如 ?t=10 可检查默认循环的硬笔书写。
  if (import.meta.env.DEV) {
    const query = new URLSearchParams(window.location.search).get('t')
    if (query !== null && query.trim() && Number.isFinite(Number(query))) frozen = Math.max(0, Number(query))
  }
  if (reduced.value) playback.settleReduced(frozen ?? clock.read(performance.now()))

  motionPreference.addEventListener('change', onPreferencesChange)
  pointerPreference.addEventListener('change', onPreferencesChange)
  document.addEventListener('visibilitychange', onVisibilityChange)
  document.documentElement.addEventListener('pointerleave', resetPointer)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('blur', resetPointer)
  window.addEventListener('resize', resize, { passive: true })
  document.addEventListener('pointerdown', onOutsidePointer)
  document.addEventListener('keydown', onPanelKeydown)

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
  document.removeEventListener('pointerdown', onOutsidePointer)
  document.removeEventListener('keydown', onPanelKeydown)
})
</script>

<template>
  <div ref="root" class="nh3-root">
    <div ref="plane" class="nh3-plane" :style="planeStyle">
      <canvas ref="canvas" class="nh3-mark" role="img" aria-label="Inkeys" />
      <div v-if="artFrame.view === 'art'" class="nh3-art" :style="{ ...tiltStyle, opacity: artFrame.state.opacity, fontSize: `${width * 0.25}px` }" aria-hidden="true">
        <div class="nh3-art-lettering" :style="{ backgroundImage: colorBackground(artFrame.previousColor) }"><span class="nh3-art-ink">Ink</span><span class="nh3-art-eys">eys</span></div>
        <div class="nh3-art-lettering nh3-art-overlay" :style="{ backgroundImage: colorBackground(artFrame.artColor), opacity: artFrame.colorMix }"><span class="nh3-art-ink">Ink</span><span class="nh3-art-eys">eys</span></div>
        <div class="nh3-art-lettering nh3-art-overlay nh3-art-shine" :style="{ opacity: artFrame.shimmer < 0 ? 0 : 1, backgroundPosition: `${135 - artFrame.shimmer * 170}% 50%` }"><span class="nh3-art-ink">Ink</span><span class="nh3-art-eys">eys</span></div>
      </div>
    </div>
    <div ref="controls" class="nh3-controls">
      <div v-if="panelOpen" id="nh3-style-panel" ref="panel" class="nh3-style-panel" role="dialog" aria-label="书写样式">
        <button class="nh3-panel-close" type="button" aria-label="关闭样式调整" @click="closePanel($event.detail === 0)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
        </button>
        <fieldset class="nh3-options">
          <legend>笔类型</legend>
          <div class="nh3-pen-options">
            <label v-for="pen in PEN_ORDER" :key="pen"><input v-model="selectedPens" type="checkbox" :value="pen" @change="updateSettings">{{ penLabels[pen] }}</label>
          </div>
        </fieldset>
        <fieldset class="nh3-options">
          <legend>颜色</legend>
          <div class="nh3-color-options">
            <label v-for="color in colorChoices" :key="color" class="nh3-color-choice" :style="{ '--nh3-swatch': colorBackground(color) }">
              <input v-model="selectedColor" type="radio" name="nh3-color" :value="color" :aria-label="colorLabels[color]" @change="updateSettings">
              <span aria-hidden="true" />
            </label>
          </div>
        </fieldset>
        <fieldset class="nh3-options">
          <legend>粗细</legend>
          <div class="nh3-size-options">
            <label v-for="size in sizeChoices" :key="size"><input v-model="selectedSize" type="radio" name="nh3-size" :value="size" @change="updateSettings"><span>{{ sizeLabels[size] }}</span></label>
          </div>
        </fieldset>
      </div>
      <button ref="paletteButton" class="nh3-playback nh3-palette" type="button" aria-label="调整书写样式" aria-controls="nh3-style-panel" :aria-expanded="panelOpen" @click="togglePanel">
        <svg class="nh3-playback-surface" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 1C44 1 47 4 47 24C47 44 44 47 24 47C4 47 1 44 1 24C1 4 4 1 24 1Z" /></svg>
        <svg class="nh3-playback-icon nh3-palette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.3a2.1 2.1 0 0 0 1.4-3.6c-.6-.6-.2-1.7.7-1.7h1.2A4.4 4.4 0 0 0 21 11.3 8.5 8.5 0 0 0 12 3Z" /><circle cx="7.2" cy="10" r="1" /><circle cx="10.5" cy="6.8" r="1" /><circle cx="15" cy="7.4" r="1" /><circle cx="17.5" cy="11" r="1" /></svg>
      </button>
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

.nh3-controls {
  position: absolute;
  right: var(--nh3-control-gap);
  bottom: var(--nh3-control-gap);
  display: flex;
  gap: 12px;
  z-index: 2;
}

.nh3-playback {
  position: relative;
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
  right: 0;
  bottom: calc(100% + 16px);
  width: min(320px, calc(100vw - 2 * var(--nh3-control-gap)));
  max-height: calc(100svh - var(--vp-nav-height, 64px) - 2 * var(--nh3-control-gap) - 64px);
  overflow-y: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
  padding: 22px;
  border: 1px solid var(--nh3-control-border);
  border-radius: 24px;
  background: color-mix(in srgb, var(--nh3-bg) 91%, transparent);
  box-shadow: 0 12px 40px rgba(15, 32, 49, 0.12);
  backdrop-filter: blur(24px);
  color: var(--vp-c-text-1);
}

.nh3-panel-close {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 6px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.nh3-panel-close:hover { background: var(--nh3-playback-hover); }
.nh3-panel-close svg { width: 18px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; }
.nh3-panel-close:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 1px; }
.nh3-options { min-width: 0; margin: 0; padding: 0; border: 0; }
.nh3-options + .nh3-options { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--nh3-control-border); }
.nh3-options legend { float: left; width: 100%; margin-bottom: 12px; font-size: 13px; font-weight: 600; }
.nh3-pen-options { clear: both; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.nh3-pen-options label { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
.nh3-pen-options input { width: 16px; height: 16px; margin: 0; accent-color: var(--vp-c-brand-1); }
.nh3-color-options { clear: both; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.nh3-color-choice { position: relative; display: grid; place-items: center; height: 36px; cursor: pointer; }
.nh3-color-choice input, .nh3-size-options input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.nh3-color-choice span { width: 25px; height: 25px; border-radius: 50%; background: var(--nh3-swatch); box-shadow: inset 0 0 0 1px rgba(127, 127, 127, 0.15); }
.nh3-color-choice input:checked + span { outline: 2px solid var(--vp-c-text-2); outline-offset: 4px; }
.nh3-color-choice input:focus-visible + span { outline: 2px solid var(--vp-c-brand-1); outline-offset: 4px; }
.nh3-size-options { clear: both; display: flex; gap: 8px; }
.nh3-size-options label { position: relative; flex: 1; cursor: pointer; }
.nh3-size-options span { display: block; padding: 7px 0; text-align: center; font-size: 13px; border: 1px solid var(--nh3-control-border); border-radius: 10px; }
.nh3-size-options input:checked + span { background: var(--nh3-playback-hover); border-color: var(--vp-c-brand-1); }
.nh3-size-options input:focus-visible + span { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }

/* 艺术字只复用字体规则；扫光位置由活跃时钟驱动，隐藏页面不会悄悄推进。 */
.nh3-art {
  position: absolute;
  inset: 0;
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
