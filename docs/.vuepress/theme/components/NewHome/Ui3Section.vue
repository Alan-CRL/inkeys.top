<script setup lang="ts">
import type { BarButtonItem } from './newHome.data'
import { onBeforeUnmount, ref } from 'vue'
import { barIcons } from './icons'
import MediaSlot from './MediaSlot.vue'
import { ui3Cards, ui3Copy } from './newHome.data'
import Ui3BarButton from './Ui3BarButton.vue'
import { useReveal } from './useReveal'

const blueprintButtons: BarButtonItem[] = [
  { id: 'select', label: '选择', icon: 'select', size: 'twoTwo' },
  { id: 'draw', label: '软笔', icon: 'brush2', size: 'twoTwo', selected: true },
  { id: 'geometry', label: '形状', icon: 'geometry', size: 'twoTwo' },
  { id: 'eraser', label: '橡皮', icon: 'eraser', size: 'twoTwo' },
]

const pressButtons: BarButtonItem[] = [
  { id: 'recall', label: '撤回', icon: 'recall', size: 'twoTwo' },
  { id: 'draw', label: '软笔', icon: 'brush2', size: 'twoTwo', selected: true },
  { id: 'clean', label: '清空', icon: 'clean', size: 'twoTwo' },
]

const themeButtons: BarButtonItem[] = [
  { id: 'select', label: '选择', icon: 'select', size: 'twoTwo' },
  { id: 'draw', label: '软笔', icon: 'brush2', size: 'twoTwo', selected: true },
  { id: 'eraser', label: '橡皮', icon: 'eraser', size: 'twoTwo' },
]

const easingLanes = [
  { name: '线性', curve: 'linear' },
  { name: 'EaseOutCubic · 按下', curve: 'cubic-bezier(0.33, 1, 0.68, 1)' },
  { name: 'EaseOutBack · 松开', curve: 'cubic-bezier(0.34, 1.4, 0.64, 1)' },
]

const root = ref<HTMLElement | null>(null)
useReveal(root)

const lightPanel = ref<HTMLElement | null>(null)
const lightSurface = ref<HTMLElement | null>(null)
let frame = 0
let pointer = { x: 0, y: 0 }

function applyLight() {
  frame = 0
  const el = lightPanel.value
  const surface = lightSurface.value
  if (!el || !surface)
    return
  const rect = surface.getBoundingClientRect()
  el.style.setProperty('--px', `${pointer.x - rect.left}px`)
  el.style.setProperty('--py', `${pointer.y - rect.top}px`)
}

function onLightMove(event: PointerEvent) {
  if (event.pointerType !== 'mouse' && event.pointerType !== 'pen')
    return
  lightPanel.value?.classList.add('is-tracking')
  pointer = { x: event.clientX, y: event.clientY }
  if (!frame)
    frame = requestAnimationFrame(applyLight)
}

function onLightLeave() {
  lightPanel.value?.classList.remove('is-tracking')
}

onBeforeUnmount(() => {
  if (frame)
    cancelAnimationFrame(frame)
})
</script>

<template>
  <section id="nh-ui3" ref="root" class="nh-section nh-ui3">
    <div class="nh-container">
      <header class="nh-section-head" data-reveal>
        <span class="nh-eyebrow"><span class="nh-dot" />{{ ui3Copy.eyebrow }}</span>
        <h2 class="nh-h2">
          {{ ui3Copy.title }}
        </h2>
        <p class="nh-lead">
          {{ ui3Copy.desc }}
        </p>
      </header>

      <div class="nh-bento">
        <article class="nh-card nh-ui3-card is-design" data-reveal>
          <div class="nh-ui3-visual is-tall">
            <MediaSlot :media="ui3Cards.design.media">
              <div class="nh-blueprint" aria-hidden="true">
                <div class="nh-bp-row">
                  <div class="nh-bp-main">
                    <span class="nh-bp-logo nh-icon" v-html="barIcons.logo" />
                    <span class="nh-bp-tag is-main">80 × 80 · 超椭圆 n = 3</span>
                  </div>
                  <div class="nh-bp-bar">
                    <Ui3BarButton v-for="item in blueprintButtons" :key="item.id" :item="item" tabindex="-1" />
                    <span class="nh-bp-dim is-width"><i />70<i /></span>
                    <span class="nh-bp-tag is-gap">间距 5</span>
                    <span class="nh-bp-tag is-radius">圆角 8</span>
                  </div>
                </div>
              </div>
            </MediaSlot>
          </div>
          <div class="nh-ui3-text">
            <h3 class="nh-h3">
              {{ ui3Cards.design.title }}
            </h3>
            <p class="nh-body">
              {{ ui3Cards.design.desc }}
            </p>
          </div>
        </article>

        <article class="nh-card nh-ui3-card is-interaction" data-reveal style="--nh-delay: 1">
          <div class="nh-ui3-visual">
            <div class="nh-mini-bar">
              <Ui3BarButton v-for="item in pressButtons" :key="item.id" :item="item" />
            </div>
            <span class="nh-ui3-hint">按一下试试</span>
          </div>
          <div class="nh-ui3-text">
            <h3 class="nh-h3">
              {{ ui3Cards.interaction.title }}
            </h3>
            <p class="nh-body">
              {{ ui3Cards.interaction.desc }}
            </p>
          </div>
        </article>

        <article class="nh-card nh-ui3-card is-lighting" data-reveal style="--nh-delay: 2">
          <div
            ref="lightPanel"
            class="nh-ui3-visual nh-light-demo"
            @pointermove="onLightMove"
            @pointerleave="onLightLeave"
          >
            <div ref="lightSurface" class="nh-light-panel">
              <span class="nh-light-edge" aria-hidden="true" />
              <span class="nh-light-spot" aria-hidden="true" />
              <span v-for="n in 4" :key="n" class="nh-light-cell" />
            </div>
          </div>
          <div class="nh-ui3-text">
            <h3 class="nh-h3">
              {{ ui3Cards.lighting.title }}
            </h3>
            <p class="nh-body">
              {{ ui3Cards.lighting.desc }}
            </p>
          </div>
        </article>

        <article class="nh-card nh-ui3-card is-motion" data-reveal>
          <div class="nh-ui3-visual nh-easing" aria-hidden="true">
            <div v-for="lane in easingLanes" :key="lane.name" class="nh-easing-lane">
              <span class="nh-easing-name">{{ lane.name }}</span>
              <span class="nh-easing-track">
                <span class="nh-easing-runner" :style="{ '--curve': lane.curve }">
                  <span class="nh-easing-dot" />
                </span>
              </span>
            </div>
          </div>
          <div class="nh-ui3-text">
            <h3 class="nh-h3">
              {{ ui3Cards.motion.title }}
            </h3>
            <p class="nh-body">
              {{ ui3Cards.motion.desc }}
            </p>
          </div>
        </article>

        <article class="nh-card nh-ui3-card is-theme" data-reveal style="--nh-delay: 1">
          <div class="nh-ui3-visual nh-theme-split" aria-hidden="true">
            <div class="nh-theme-half is-light">
              <div class="nh-mini-bar">
                <Ui3BarButton v-for="item in themeButtons" :key="item.id" :item="item" tabindex="-1" />
              </div>
              <span class="nh-theme-label">浅色</span>
            </div>
            <div class="nh-theme-half is-dark">
              <div class="nh-mini-bar">
                <Ui3BarButton v-for="item in themeButtons" :key="item.id" :item="item" tabindex="-1" />
              </div>
              <span class="nh-theme-label">深色</span>
            </div>
          </div>
          <div class="nh-ui3-text">
            <h3 class="nh-h3">
              {{ ui3Cards.theme.title }}
            </h3>
            <p class="nh-body">
              {{ ui3Cards.theme.desc }}
            </p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.nh-ui3-card {
  display: flex;
  flex-direction: column;
}

.nh-ui3-card.is-design {
  grid-column: span 7;
  grid-row: span 2;
}

.nh-ui3-card.is-interaction,
.nh-ui3-card.is-lighting {
  grid-column: span 5;
}

.nh-ui3-card.is-motion,
.nh-ui3-card.is-theme {
  grid-column: span 6;
}

.nh-ui3-visual {
  position: relative;
  display: grid;
  place-items: center;
  flex: 1;
  min-height: 200px;
  margin: 8px 8px 0;
  overflow: hidden;
  border-radius: calc(var(--nh-radius-lg) - 8px);
  background:
    linear-gradient(var(--nh-grid) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(90deg, var(--nh-grid) 1px, transparent 1px) 0 0 / 24px 24px,
    var(--nh-surface-2);
}

.nh-ui3-visual.is-tall {
  min-height: 380px;
}

.nh-ui3-text {
  padding: 24px 28px 28px;
}

.nh-mini-bar {
  display: flex;
  gap: 5px;
  padding: 5px;
  border: 1px solid var(--nh-bar-frame);
  border-radius: 8px;
  background: var(--nh-bar-surface);
  box-shadow: 0 18px 40px -20px rgba(0, 0, 0, 0.35);
}

.nh-ui3-hint {
  position: absolute;
  bottom: 16px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--nh-text-3);
}

/* 界面设计：蓝图 */
.nh-blueprint {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

@media (min-width: 1100px) {
  .nh-blueprint {
    zoom: 1.25;
  }
}

.nh-bp-row {
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.nh-bp-main {
  position: relative;
  width: 80px;
  height: 80px;
  border: 1px dashed rgba(var(--nh-accent-rgb), 0.7);
  border-radius: 30%;
  background: var(--nh-bar-surface);
}

.nh-bp-bar {
  position: relative;
  display: flex;
  gap: 5px;
  padding: 5px;
  border: 1px solid var(--nh-bar-frame);
  border-radius: 8px;
  background: var(--nh-bar-surface);
  box-shadow: 0 18px 40px -20px rgba(0, 0, 0, 0.35);
}

.nh-bp-tag {
  position: absolute;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
  color: var(--nh-accent);
}

.nh-bp-tag.is-main {
  top: calc(100% + 16px);
  left: 0;
}

.nh-bp-tag.is-gap {
  bottom: calc(100% + 6px);
  left: 150px;
  transform: translateX(-50%);
}

.nh-bp-tag.is-gap::after {
  content: '';
  position: absolute;
  top: calc(100% + 2px);
  left: 50%;
  width: 1px;
  height: 10px;
  background: currentColor;
  opacity: 0.6;
}

.nh-bp-logo {
  position: absolute;
  inset: 20px;
  color: var(--nh-bar-text);
  opacity: 0.55;
}

.nh-bp-tag.is-radius {
  top: calc(100% + 16px);
  right: 0;
}

.nh-bp-dim {
  position: absolute;
  top: calc(100% + 10px);
  left: 5px;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 70px;
  font-size: 11px;
  font-weight: 600;
  color: var(--nh-accent);
}

.nh-bp-dim.is-width {
  top: auto;
  bottom: calc(100% + 10px);
}

.nh-bp-dim i {
  flex: 1;
  height: 1px;
  background: currentColor;
  opacity: 0.6;
}

/* 光影 */
@property --px {
  syntax: '<length-percentage>';
  inherits: true;
  initial-value: 20%;
}

@property --py {
  syntax: '<length-percentage>';
  inherits: true;
  initial-value: 30%;
}

.nh-light-demo {
  --px: 20%;
  --py: 30%;

  animation: nh-light-orbit 7s var(--nh-ease-in-out) infinite alternate;
}

.nh-light-demo.is-tracking {
  animation: none;
}

@keyframes nh-light-orbit {
  0% {
    --px: 18%;
    --py: 25%;
  }

  50% {
    --px: 70%;
    --py: 80%;
  }

  100% {
    --px: 88%;
    --py: 20%;
  }
}

.nh-light-panel {
  position: relative;
  display: flex;
  gap: 5px;
  padding: 5px;
  border: 1px solid var(--nh-bar-frame);
  border-radius: 8px;
  background: var(--nh-bar-surface);
}

.nh-light-cell {
  width: 56px;
  height: 56px;
  border-radius: 4px;
  background: var(--nh-bar-hover);
}

.nh-light-edge,
.nh-light-spot {
  position: absolute;
  pointer-events: none;
}

.nh-light-spot {
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(160px circle at var(--px) var(--py), rgba(var(--nh-bar-light-rgb), 0.12), transparent 70%);
}

.nh-light-edge {
  inset: -1px;
  padding: 1px;
  border-radius: 8px;
  background: radial-gradient(140px circle at var(--px) var(--py), rgba(var(--nh-bar-light-rgb), 0.95), transparent 72%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
}

/* 动画 */
.nh-easing {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
  padding: 28px;
}

.nh-easing-lane {
  display: grid;
  grid-template-columns: 150px 1fr;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.nh-easing-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--nh-text-2);
}

.nh-easing-track {
  position: relative;
  height: 16px;
  border-radius: 999px;
  background: var(--nh-bar-hover);
}

.nh-easing-runner {
  position: absolute;
  inset: 0 16px 0 0;
  animation: nh-easing 2.8s infinite;
}

.nh-easing-dot {
  position: absolute;
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--nh-accent);
  box-shadow: 0 0 12px rgba(var(--nh-accent-rgb), 0.6);
}

@keyframes nh-easing {
  0%,
  8% {
    transform: translateX(0);
    animation-timing-function: var(--curve);
  }

  46%,
  58% {
    transform: translateX(100%);
    animation-timing-function: var(--curve);
  }

  96%,
  100% {
    transform: translateX(0);
  }
}

/* 深浅主题：局部覆盖 token，复用同一个按钮组件 */
.nh-theme-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  place-items: stretch;
  padding: 0;
  background: none;
}

.nh-theme-half {
  position: relative;
  display: grid;
  place-items: center;
  height: 100%;
  min-height: 200px;
  padding: 24px 12px;
}

.nh-theme-half.is-light {
  --nh-bar-surface: rgba(247, 248, 250, 0.8);
  --nh-bar-frame: rgba(0, 0, 0, 0.18);
  --nh-bar-text: #1b1b1b;
  --nh-bar-hover: rgba(0, 0, 0, 0.055);
  --nh-accent: #008c69;
  --nh-accent-rgb: 0, 140, 105;

  background: linear-gradient(160deg, #f4f6f8, #e4e8ed);
}

.nh-theme-half.is-dark {
  --nh-bar-surface: rgba(24, 24, 24, 0.8);
  --nh-bar-frame: rgba(255, 255, 255, 0.18);
  --nh-bar-text: #ffffff;
  --nh-bar-hover: rgba(255, 255, 255, 0.08);
  --nh-accent: #58ffec;
  --nh-accent-rgb: 88, 255, 236;

  background: linear-gradient(160deg, #26272b, #0e0f11);
}

.nh-theme-half .nh-mini-bar {
  zoom: 0.78;
  pointer-events: none;
}

.nh-theme-label {
  position: absolute;
  bottom: 14px;
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--nh-bar-text);
  opacity: 0.5;
}

@media (max-width: 1120px) {
  .nh-theme-half .nh-mini-bar {
    zoom: 0.62;
  }
}

@media (max-width: 960px) {
  .nh-ui3-card.is-design,
  .nh-ui3-card.is-motion,
  .nh-ui3-card.is-theme {
    grid-column: span 6;
  }

  .nh-ui3-card.is-design {
    grid-row: auto;
  }

  .nh-ui3-card.is-interaction,
  .nh-ui3-card.is-lighting {
    grid-column: span 3;
  }
}

@media (max-width: 640px) {
  .nh-ui3-visual.is-tall {
    min-height: 300px;
  }

  .nh-blueprint {
    zoom: 0.72;
  }

  .nh-easing-lane {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .nh-ui3-text {
    padding: 20px 22px 24px;
  }
}
</style>
