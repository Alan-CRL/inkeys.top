<script setup lang="ts">
import type { BarButtonId, BarButtonItem } from './newHome.data'
import { onBeforeUnmount, ref } from 'vue'
import Ui3BarButton from './Ui3BarButton.vue'

interface Props {
  groups: BarButtonItem[][]
  activeId?: BarButtonId
  progress?: boolean
  paused?: boolean
  controls?: string
}

withDefaults(defineProps<Props>(), {
  progress: false,
  paused: false,
})

const emit = defineEmits<{
  activate: [id: BarButtonId]
  complete: []
  interact: [active: boolean]
}>()

// UI3 MainButton：80x80，超椭圆 n = 3，边框 1 DIP（描边居中，因此内缩 0.5）
function superellipsePath(size: number, inset: number, n: number, steps = 96) {
  const r = size / 2 - inset
  const c = size / 2
  const e = 2 / n
  const points: string[] = []
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const cos = Math.cos(t)
    const sin = Math.sin(t)
    const x = c + r * Math.sign(cos) * Math.abs(cos) ** e
    const y = c + r * Math.sign(sin) * Math.abs(sin) ** e
    points.push(`${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return `M${points.join('L')}Z`
}

const mainShape = superellipsePath(80, 0.5, 3)
const mainClip = `path('${superellipsePath(80, 0, 3)}')`

const bar = ref<HTMLElement | null>(null)
let frame = 0
let pointer = { x: 0, y: 0 }
let hovering = false
let focused = false

function syncInteract() {
  emit('interact', hovering || focused)
}

function applyLight() {
  frame = 0
  const el = bar.value
  if (!el)
    return
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--lx', `${pointer.x - rect.left}px`)
  el.style.setProperty('--ly', `${pointer.y - rect.top}px`)
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerType !== 'mouse' && event.pointerType !== 'pen')
    return
  pointer = { x: event.clientX, y: event.clientY }
  if (!frame)
    frame = requestAnimationFrame(applyLight)
}

function onPointerEnter(event: PointerEvent) {
  hovering = true
  bar.value?.classList.add('is-lit')
  onPointerMove(event)
  syncInteract()
}

function onPointerLeave() {
  hovering = false
  bar.value?.classList.remove('is-lit')
  syncInteract()
}

function onFocusIn() {
  focused = true
  syncInteract()
}

function onFocusOut(event: FocusEvent) {
  const wrap = event.currentTarget as HTMLElement
  if (event.relatedTarget instanceof Node && wrap.contains(event.relatedTarget))
    return
  focused = false
  syncInteract()
}

onBeforeUnmount(() => {
  if (frame)
    cancelAnimationFrame(frame)
})
</script>

<template>
  <div
    class="nh-bar"
    role="toolbar"
    aria-label="Inkeys3 主栏"
    @pointerenter="onPointerEnter"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <button
      type="button"
      class="nh-main-btn"
      :class="{ 'is-active': activeId === 'main' }"
      aria-label="Inkeys3 主按钮"
      :aria-controls="controls"
      @pointerenter="emit('activate', 'main')"
      @focus="emit('activate', 'main')"
      @click="emit('activate', 'main')"
    >
      <span class="nh-main-shadow" aria-hidden="true" />
      <span class="nh-main-glass" :style="{ clipPath: mainClip }" aria-hidden="true" />
      <svg class="nh-main-shape" viewBox="0 0 80 80" aria-hidden="true">
        <path :d="mainShape" />
      </svg>
      <svg class="nh-main-logo" viewBox="0 0 256 256" aria-hidden="true">
        <path class="nh-logo-frame" d="M125.396 177.775H192C195.314 177.775 198 175.089 198 171.775V83.7752C198 80.4615 195.314 77.7752 192 77.7752H179.79L135.09 169.011L125.396 177.775Z" />
        <path class="nh-logo-frame" d="M134.765 81.0459L136.367 77.7752H65C61.6863 77.7752 59 80.4615 59 83.7752V171.775C59 175.089 61.6863 177.775 65 177.775H98.1147L100.073 151.854L134.765 81.0459Z" />
        <path class="nh-logo-pen" d="M142.794 78.5224L143.05 77.9998L150.214 63.3763L150.81 62.1478C151.558 60.6205 152.789 59.4872 154.228 58.8418C156.061 58.0201 158.231 57.9889 160.176 58.9416L171.844 64.6587C173.787 65.6106 175.093 67.3431 175.567 69.2929C175.941 70.8271 175.8 72.4958 175.051 74.0246L174.533 75.0817L173.103 77.9998L167.029 90.3966L142.794 78.5224Z" />
        <path class="nh-logo-pen" d="M140.154 83.9104L164.395 95.7872L131.276 163.383L107.035 151.507L140.154 83.9104Z" />
        <path class="nh-logo-pen" d="M105.679 157.524L127.353 168.142L116.449 178L107.348 186.228L103.623 184.742L104.132 178L105.679 157.524Z" />
        <path class="nh-logo-pen" d="M96.9033 195.5681C96.1087 197.19 96.7794 199.1489 98.4013 199.9434C100.0231 200.7389 101.9821 200.0678 102.7767 198.4458L105.7098 192.4589L99.8369 189.5811L96.9033 195.5681Z" />
      </svg>
      <span
        v-if="activeId === 'main' && progress"
        class="nh-main-progress"
        :class="{ 'is-paused': paused }"
        aria-hidden="true"
        @animationend="emit('complete')"
      />
    </button>

    <div ref="bar" class="nh-main-bar">
      <span class="nh-bar-spot" aria-hidden="true" />
      <span class="nh-bar-edge" aria-hidden="true" />
      <template v-for="(group, index) in groups" :key="index">
        <span v-if="index > 0" class="nh-bar-divider" :class="`is-after-${index}`" aria-hidden="true" />
        <div class="nh-bar-group" :class="[`is-group-${index}`, { 'is-stacked': group[0]?.size === 'twoOne' }]">
          <Ui3BarButton
            v-for="item in group"
            :key="item.id"
            :item="item"
            :active="activeId === item.id"
            :progress="progress"
            :paused="paused"
            :controls="controls"
            @activate="emit('activate', $event)"
            @complete="emit('complete')"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.nh-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  width: max-content;
}

.nh-main-btn {
  position: relative;
  flex: none;
  width: 80px;
  height: 80px;
  padding: 0;
  border: 0;
  border-radius: 32%;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.4s var(--nh-ease-back);
}

.nh-main-btn:active {
  transform: scale(0.95);
  transition-duration: 0.12s;
  transition-timing-function: var(--nh-ease-out);
}

.nh-main-shadow {
  position: absolute;
  inset: 0;
  border-radius: 32%;
  box-shadow: 0 18px 40px -18px rgba(0, 0, 0, 0.35);
}

.nh-main-glass {
  position: absolute;
  inset: 0;
  background: var(--nh-bar-surface);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  transition: background-color 0.24s var(--nh-ease-out);
}

.nh-main-btn:hover .nh-main-glass,
.nh-main-btn.is-active .nh-main-glass {
  background: var(--nh-bar-surface-solid);
}

.nh-main-shape {
  position: absolute;
  inset: 0;
  width: 80px;
  height: 80px;
  overflow: visible;
}

.nh-main-shape path {
  fill: none;
  stroke: var(--nh-bar-frame);
  stroke-width: 1;
  transition: stroke 0.24s var(--nh-ease-out);
}

.nh-main-btn.is-active .nh-main-shape path {
  stroke: rgba(var(--nh-accent-rgb), 0.55);
}

.nh-main-logo {
  position: absolute;
  inset: 0;
  width: 80px;
  height: 80px;
  color: var(--nh-bar-text);
}

.nh-logo-frame {
  fill: currentColor;
  fill-opacity: 0.2;
}

.nh-logo-pen {
  fill: var(--nh-ink);
}

.nh-main-progress {
  position: absolute;
  right: 26px;
  bottom: 9px;
  left: 26px;
  height: 2px;
  border-radius: 2px;
  background: var(--nh-accent);
  box-shadow: 0 0 8px rgba(var(--nh-accent-rgb), 0.7);
  transform: scaleX(0);
  transform-origin: left center;
  animation: nh-main-progress 5s linear forwards;
}

.nh-main-progress.is-paused {
  animation-play-state: paused;
}

@keyframes nh-main-progress {
  to {
    transform: scaleX(1);
  }
}

.nh-main-bar {
  --lx: 50%;
  --ly: 50%;

  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
  height: 80px;
  padding: 5px;
  border: 1px solid var(--nh-bar-frame);
  border-radius: 8px;
  background: var(--nh-bar-surface);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  box-shadow: 0 18px 40px -18px rgba(0, 0, 0, 0.35);
}

.nh-bar-spot,
.nh-bar-edge {
  position: absolute;
  pointer-events: none;
  opacity: 0;
  transition: opacity 1.2s var(--nh-ease-out);
}

.nh-bar-spot {
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(140px circle at var(--lx) var(--ly), rgba(var(--nh-bar-light-rgb), 0.09), transparent 70%);
}

.nh-bar-edge {
  inset: -1px;
  padding: 1px;
  border-radius: 8px;
  background: radial-gradient(120px circle at var(--lx) var(--ly), rgba(var(--nh-bar-light-rgb), 0.85), transparent 72%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
}

.nh-main-bar.is-lit .nh-bar-spot,
.nh-main-bar.is-lit .nh-bar-edge {
  opacity: 1;
  transition-duration: 0.24s;
}

.nh-bar-group {
  position: relative;
  display: flex;
  gap: 5px;
}

.nh-bar-group.is-stacked {
  flex-direction: column;
}

.nh-bar-divider {
  flex: none;
  width: 1px;
  height: 46px;
  background: var(--nh-bar-frame);
  opacity: 0.7;
}

@media (max-width: 840px) {
  .nh-bar-group.is-group-1,
  .nh-bar-group.is-group-2,
  .nh-bar-divider {
    display: none;
  }
}

@media (hover: none) {
  .nh-bar-spot,
  .nh-bar-edge {
    display: none;
  }
}
</style>
