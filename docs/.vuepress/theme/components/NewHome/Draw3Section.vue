<script setup lang="ts">
import type { StrokeMode } from './inkGeometry'
import { computed, defineAsyncComponent, ref } from 'vue'
import { barIcons } from './icons'
import { outlinePath, polylinePath, taperedWave } from './inkGeometry'
import { draw3Beautify, draw3Copy, draw3Stats, penEffects } from './newHome.data'
import { useReveal } from './useReveal'

const StrokeDemo = defineAsyncComponent(() => import('./StrokeDemo.vue'))

const root = ref<HTMLElement | null>(null)
useReveal(root)

const [smoothing, taper, pressure, prediction] = draw3Beautify

const modes: { id: StrokeMode, label: string }[] = [
  { id: 'raw', label: '原始输入' },
  { id: 'smooth', label: '实时平滑' },
  { id: 'taper', label: '平滑 + 笔锋' },
]
const mode = ref<StrokeMode>('taper')
const modeDesc = computed(() => {
  if (mode.value === 'raw')
    return '未经处理的输入：采样稀疏，带着抖动与折角。'
  return mode.value === 'smooth' ? smoothing.desc : taper.desc
})

const pressureShape = outlinePath(taperedWave({
  width: 320,
  height: 120,
  amplitude: 26,
  cycles: 1.5,
  maxWidth: 14,
  minWidth: 1,
  pressure: t => 0.35 + 0.65 * Math.abs(Math.sin(t * Math.PI * 2.2)),
}))

const penSoft = outlinePath(taperedWave({ width: 240, height: 100, amplitude: 18, cycles: 1.25, maxWidth: 9, minWidth: 0.6 }))
const penLine = polylinePath(taperedWave({ width: 240, height: 100, amplitude: 18, cycles: 1.25, maxWidth: 1 }))
const penHighlight = 'M30 58L210 50'
</script>

<template>
  <section id="nh-draw3" ref="root" class="nh-section nh-draw3">
    <div class="nh-container">
      <header class="nh-section-head" data-reveal>
        <span class="nh-eyebrow"><span class="nh-dot" />{{ draw3Copy.eyebrow }}</span>
        <h2 class="nh-h2">
          {{ draw3Copy.title }}
        </h2>
        <p class="nh-lead">
          {{ draw3Copy.desc }}
        </p>
      </header>

      <div class="nh-card nh-stats" data-reveal>
        <div v-for="stat in draw3Stats" :key="stat.label" class="nh-stat">
          <div class="nh-stat-value">
            {{ stat.value }}<span v-if="stat.unit" class="nh-stat-unit">{{ stat.unit }}</span>
          </div>
          <div class="nh-stat-label">
            {{ stat.label }}
          </div>
        </div>
      </div>

      <header class="nh-sub-head" data-reveal>
        <h3 class="nh-sub-title">
          {{ draw3Copy.beautifyTitle }}
        </h3>
        <p class="nh-body">
          {{ draw3Copy.beautifyDesc }}
        </p>
      </header>

      <div class="nh-bento">
        <article class="nh-card nh-draw-card is-demo" data-reveal>
          <div class="nh-demo-tabs" role="tablist" aria-label="笔迹处理方式">
            <button
              v-for="item in modes"
              :key="item.id"
              type="button"
              role="tab"
              class="nh-demo-tab"
              :class="{ 'is-active': mode === item.id }"
              :aria-selected="mode === item.id"
              @click="mode = item.id"
            >
              {{ item.label }}
            </button>
          </div>
          <div class="nh-draw-visual is-demo">
            <StrokeDemo :mode="mode" />
          </div>
          <div class="nh-draw-text">
            <h4 class="nh-h3">
              {{ smoothing.title }}与{{ taper.title }}
            </h4>
            <p class="nh-body">
              {{ modeDesc }}
            </p>
          </div>
        </article>

        <article class="nh-card nh-draw-card is-side" data-reveal style="--nh-delay: 1">
          <div class="nh-draw-visual">
            <svg class="nh-pressure" viewBox="0 0 320 120" aria-hidden="true">
              <path :d="pressureShape" />
            </svg>
            <div class="nh-chips" aria-hidden="true">
              <span class="nh-chip is-accent">数位笔 · 真实压感</span>
              <span class="nh-chip">鼠标 / 触摸 · 模拟压感</span>
            </div>
          </div>
          <div class="nh-draw-text">
            <h4 class="nh-h3">
              {{ pressure.title }}
            </h4>
            <p class="nh-body">
              {{ pressure.desc }}
            </p>
          </div>
        </article>

        <article class="nh-card nh-draw-card is-side" data-reveal style="--nh-delay: 2">
          <div class="nh-draw-visual">
            <svg class="nh-predict" viewBox="0 0 320 120" aria-hidden="true">
              <path class="nh-predict-ink" d="M20 86C70 30 110 30 150 62S210 96 232 70" />
              <path class="nh-predict-ahead" d="M232 70C244 56 262 42 292 38" />
              <circle class="nh-predict-halo" cx="232" cy="70" r="14" />
              <circle class="nh-predict-tip" cx="232" cy="70" r="4.5" />
              <text class="nh-predict-label" x="240" y="100">≈16.7 ms</text>
            </svg>
          </div>
          <div class="nh-draw-text">
            <h4 class="nh-h3">
              {{ prediction.title }}
            </h4>
            <p class="nh-body">
              {{ prediction.desc }}
            </p>
          </div>
        </article>
      </div>

      <header class="nh-sub-head" data-reveal>
        <h3 class="nh-sub-title">
          {{ draw3Copy.effectsTitle }}
        </h3>
        <p class="nh-body">
          {{ draw3Copy.effectsDesc }}
        </p>
      </header>

      <div class="nh-pens">
        <article
          v-for="(pen, index) in penEffects"
          :key="pen.id"
          class="nh-card nh-pen"
          :class="[`is-${pen.id}`, { 'is-soon': pen.comingSoon }]"
          data-reveal
          :style="{ '--nh-delay': index }"
        >
          <div class="nh-pen-visual" aria-hidden="true">
            <svg viewBox="0 0 240 100">
              <defs v-if="pen.id === 'laser'">
                <filter id="nh-laser-glow" x="-20%" y="-50%" width="140%" height="200%">
                  <feGaussianBlur stdDeviation="4" />
                </filter>
              </defs>
              <path v-if="pen.id === 'soft'" class="nh-pen-soft" :d="penSoft" />
              <path v-else-if="pen.id === 'hard'" class="nh-pen-hard" :d="penLine" />
              <g v-else-if="pen.id === 'laser'" class="nh-pen-laser">
                <path class="is-glow" :d="penLine" filter="url(#nh-laser-glow)" />
                <path class="is-body" :d="penLine" />
                <path class="is-core" :d="penLine" />
              </g>
              <g v-else-if="pen.id === 'highlighter'" class="nh-pen-highlighter">
                <text x="120" y="62" text-anchor="middle">划重点，不遮挡</text>
                <path :d="penHighlight" />
              </g>
              <path v-else class="nh-pen-brush" :d="penSoft" />
            </svg>
          </div>
          <div class="nh-pen-text">
            <div class="nh-pen-name">
              <span class="nh-pen-icon nh-icon" v-html="barIcons[pen.icon]" />
              {{ pen.name }}
              <span v-if="pen.comingSoon" class="nh-soon">即将推出</span>
            </div>
            <p class="nh-body">
              {{ pen.desc }}
            </p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.nh-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.nh-stat {
  padding: 32px 28px;
}

.nh-stat + .nh-stat {
  border-left: 1px solid var(--nh-border);
}

.nh-stat-value {
  font-size: clamp(30px, 3.4vw, 44px);
  font-weight: 650;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--nh-text-1);
  white-space: nowrap;
}

.nh-stat-unit {
  margin-left: 4px;
  font-size: 0.42em;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--nh-accent);
}

.nh-stat-label {
  margin-top: 10px;
  font-size: 14px;
  color: var(--nh-text-2);
}

.nh-sub-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 20px;
  margin: clamp(64px, 8vw, 96px) 0 28px;
}

.nh-sub-title {
  margin: 0;
  font-size: clamp(24px, 2.6vw, 32px);
  font-weight: 650;
  letter-spacing: -0.015em;
  color: var(--nh-text-1);
}

.nh-draw-card {
  display: flex;
  flex-direction: column;
}

.nh-draw-card.is-demo {
  grid-column: span 7;
  grid-row: span 2;
}

.nh-draw-card.is-side {
  grid-column: span 5;
}

.nh-draw-visual {
  position: relative;
  display: grid;
  place-items: center;
  flex: 1;
  min-height: 190px;
  margin: 8px 8px 0;
  overflow: hidden;
  border-radius: calc(var(--nh-radius-lg) - 8px);
  background: var(--nh-surface-2);
}

.nh-draw-visual.is-demo {
  min-height: 340px;
  margin-top: 0;
}

.nh-draw-text {
  padding: 22px 28px 28px;
}

.nh-demo-tabs {
  display: flex;
  gap: 4px;
  margin: 8px 8px 8px;
  padding: 4px;
  border-radius: calc(var(--nh-radius-lg) - 8px);
  background: var(--nh-surface-2);
}

.nh-demo-tab {
  flex: 1;
  height: 36px;
  border: 0;
  border-radius: 10px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--nh-text-2);
  background: transparent;
  cursor: pointer;
  transition: background-color 0.24s var(--nh-ease-out), color 0.24s var(--nh-ease-out), box-shadow 0.24s var(--nh-ease-out);
}

.nh-demo-tab:hover {
  color: var(--nh-text-1);
}

.nh-demo-tab.is-active {
  color: var(--nh-text-1);
  background: var(--nh-surface-solid);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 4px 12px -4px rgba(0, 0, 0, 0.12);
}

.nh-pressure {
  width: 82%;
  max-width: 360px;
}

.nh-pressure path {
  fill: var(--nh-text-1);
}

.nh-chips {
  position: absolute;
  bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  padding: 0 12px;
}

.nh-chip {
  padding: 5px 12px;
  border: 1px solid var(--nh-border-strong);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--nh-text-2);
  background: var(--nh-surface);
}

.nh-chip.is-accent {
  border-color: rgba(var(--nh-accent-rgb), 0.4);
  color: var(--nh-accent);
}

.nh-predict {
  width: 86%;
  max-width: 380px;
  overflow: visible;
}

.nh-predict-ink {
  fill: none;
  stroke: var(--nh-text-1);
  stroke-width: 6;
  stroke-linecap: round;
}

.nh-predict-ahead {
  fill: none;
  stroke: var(--nh-accent);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 2 9;
  animation: nh-predict-flow 1.2s linear infinite;
}

@keyframes nh-predict-flow {
  to {
    stroke-dashoffset: -22;
  }
}

.nh-predict-tip {
  fill: var(--nh-accent);
}

.nh-predict-halo {
  fill: rgba(var(--nh-accent-rgb), 0.18);
  transform-box: fill-box;
  transform-origin: center;
  animation: nh-predict-pulse 1.8s var(--nh-ease-out) infinite;
}

@keyframes nh-predict-pulse {
  from {
    opacity: 1;
    transform: scale(0.5);
  }

  to {
    opacity: 0;
    transform: scale(1.6);
  }
}

.nh-predict-label {
  font-size: 12px;
  font-weight: 600;
  fill: var(--nh-accent);
}

.nh-pens {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.nh-pen {
  display: flex;
  flex-direction: column;
  transition: transform 0.4s var(--nh-ease-back), box-shadow 0.3s var(--nh-ease-out);
}

.nh-pen:hover {
  transform: translateY(-4px);
}

.nh-pen-visual {
  display: grid;
  place-items: center;
  height: 128px;
  margin: 8px 8px 0;
  border-radius: calc(var(--nh-radius-lg) - 8px);
  background: var(--nh-surface-2);
}

.nh-pen-visual svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.nh-pen-soft {
  fill: var(--nh-text-1);
}

.nh-pen-hard {
  fill: none;
  stroke: var(--nh-text-1);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nh-pen-laser path {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nh-pen-laser {
  animation: nh-laser 3.2s var(--nh-ease-in-out) infinite;
}

.nh-pen-laser .is-glow {
  stroke: #ff1000;
  stroke-width: 12;
  opacity: 0.55;
}

.nh-pen-laser .is-body {
  stroke: #ff1000;
  stroke-width: 5;
}

.nh-pen-laser .is-core {
  stroke: #fff;
  stroke-width: 1.7;
}

@keyframes nh-laser {
  0%,
  55% {
    opacity: 1;
  }

  80%,
  88% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

.nh-pen-highlighter text {
  font-size: 19px;
  font-weight: 650;
  fill: var(--nh-text-1);
}

.nh-pen-highlighter path {
  fill: none;
  stroke: #ffd43b;
  stroke-width: 26;
  stroke-linecap: square;
  opacity: 0.55;
  mix-blend-mode: multiply;
}

[data-theme='dark'] .nh-pen-highlighter path {
  opacity: 0.4;
  mix-blend-mode: normal;
}

.nh-pen-brush {
  fill: none;
  stroke: var(--nh-text-3);
  stroke-width: 1.2;
  stroke-dasharray: 4 5;
}

.nh-pen-text {
  padding: 18px 20px 22px;
}

.nh-pen-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 17px;
  font-weight: 620;
  color: var(--nh-text-1);
}

.nh-pen-icon {
  width: 18px;
  height: 18px;
  color: var(--nh-accent);
}

.nh-pen .nh-body {
  font-size: 14px;
}

.nh-pen.is-soon {
  border-style: dashed;
  background: transparent;
  box-shadow: none;
}

.nh-soon {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--nh-accent);
  background: rgba(var(--nh-accent-rgb), 0.12);
}

@media (max-width: 1100px) {
  .nh-pens {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .nh-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .nh-stat:nth-child(3) {
    border-left: 0;
  }

  .nh-stat:nth-child(n + 3) {
    border-top: 1px solid var(--nh-border);
  }

  .nh-draw-card.is-demo {
    grid-column: span 6;
    grid-row: auto;
  }

  .nh-draw-card.is-side {
    grid-column: span 3;
  }
}

@media (max-width: 640px) {
  .nh-stat {
    padding: 24px 20px;
  }

  .nh-pens {
    grid-template-columns: minmax(0, 1fr);
  }

  .nh-draw-visual.is-demo {
    min-height: 260px;
  }

  .nh-demo-tab {
    font-size: 13px;
  }
}
</style>
