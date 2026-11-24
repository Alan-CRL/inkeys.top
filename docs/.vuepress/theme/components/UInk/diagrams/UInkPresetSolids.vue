<script setup lang="ts">
import { computed, ref } from 'vue'
import UInkFigure from '../UInkFigure.vue'
import { num, polylinePath, solidParts, type SolidConstruction } from '../geometry'

interface Preset {
  id: string
  name: string
  // construction 中与预设有关的参数（不含 baseRotation、mirrored）
  c: Omit<SolidConstruction, 'baseRotation' | 'mirrored'>
  params: string
}

// 局部坐标，start 为底面中心；height 为负表示向上（PRESET-2）
const START = { x: 0, y: 0 }
const PRESETS: Preset[] = [
  { id: 'cuboid', name: '长方体', c: { start: START, height: -110, baseSize: { x: 150, y: 110 } }, params: 'height: -110, baseSize: { x: 150, y: 110 }' },
  { id: 'cylinder', name: '圆柱', c: { start: START, height: -130, radius: 70 }, params: 'height: -130, radius: 70' },
  { id: 'cone', name: '圆锥', c: { start: START, height: -140, radius: 75 }, params: 'height: -140, radius: 75' },
  { id: 'prism', name: '棱柱', c: { start: START, height: -110, radius: 72, sides: 5 }, params: 'height: -110, radius: 72, sides: 5' },
  { id: 'pyramid', name: '棱锥', c: { start: START, height: -140, radius: 80, sides: 4 }, params: 'height: -140, radius: 80, sides: 4' },
]
const ROT_RANGE = [-3.14, 3.14] as const
const DEFAULT_ROT = 0.5
// 部件描边宽度 w；隐藏边按 PRESET-7 的 Dashed 写成 [4w, 6w]，Round 端帽
const W = 2.5

const presetId = ref('cuboid')
const rotation = ref(DEFAULT_ROT)
const mirrored = ref(false)

const preset = computed(() => PRESETS.find(p => p.id === presetId.value)!)
const curved = computed(() => presetId.value === 'cylinder' || presetId.value === 'cone')
const parts = computed(() => solidParts(presetId.value, { ...preset.value.c, baseRotation: rotation.value, mirrored: mirrored.value })
  .map(p => ({ d: polylinePath(p.points), hidden: p.hidden, line: p.shapeType === 0 })))
const hiddenCount = computed(() => parts.value.filter(p => p.hidden).length)
const lineCount = computed(() => parts.value.filter(p => p.line).length)

const f = (v: number) => num(v)
const degrees = computed(() => Math.round((rotation.value * 180) / Math.PI))
const partsText = computed(() => {
  const polys = parts.value.length - lineCount.value
  return polys ? `Line ×${lineCount.value} + Polyline ×${polys}` : `Line ×${lineCount.value}`
})
const label = computed(() => `${preset.value.name}（${presetId.value}）：${parts.value.length} 个部件，其中 ${hiddenCount.value} 个被遮挡，画成虚线。baseRotation ${f(rotation.value)} 弧度，mirrored ${mirrored.value}。`)

// 滑块已选部分的百分比，供 UInkFigure 的 --uf-fill 渐变使用
const fill = computed(() => ({ '--uf-fill': `${((rotation.value - ROT_RANGE[0]) / (ROT_RANGE[1] - ROT_RANGE[0])) * 100}%` }))
</script>

<template>
  <UInkFigure
    title="立体预设"
    desc="底面按斜二测投影画成平行四边形或椭圆，再沿竖直方向拉出高度；两侧的面都背对读者的边被遮挡，画成虚线（PRESET-17、PRESET-18）。"
  >
    <div class="ups">
      <svg viewBox="-130 -172 260 230" role="img" :aria-label="label">
        <path
          v-for="(p, i) in parts"
          :key="`${presetId}-${i}`"
          :d="p.d"
          class="ups-edge"
          :class="{ 'is-hidden': p.hidden }"
          :stroke-width="W"
          :stroke-dasharray="p.hidden ? `${4 * W} ${6 * W}` : undefined"
        />
        <circle :cx="START.x" :cy="START.y" r="3.5" class="ups-start" />
        <!-- 标签放在起点左侧，避开前方的底边 -->
        <text :x="START.x - 8" :y="START.y + 5" class="uf-text uf-mono ups-label" text-anchor="end">start</text>
      </svg>

      <div class="ups-side">
        <div class="ups-readout uf-readout" aria-live="polite">
          <div><strong>{{ preset.name }}</strong><code class="uf-code">preset: '{{ presetId }}'</code></div>
          <div><strong>部件</strong>{{ partsText }}，其中 <strong>{{ hiddenCount }}</strong> 个被遮挡</div>
          <div>
            <strong>construction</strong>
            <code class="uf-code">{{ preset.params }}</code>
            <code class="uf-code">baseRotation: {{ f(rotation) }}</code>（约 {{ degrees }}°）
            <code class="uf-code">mirrored: {{ mirrored }}</code>
          </div>
          <div v-if="curved" class="ups-note">圆柱、圆锥的投影系数固定为 (0, −1/3)，不受 <code class="uf-code">mirrored</code> 影响；底面是圆，旋转后外观不变。</div>
        </div>
        <div class="ups-legend">
          <span><svg viewBox="0 0 36 8" aria-hidden="true"><path d="M3 4 H33" class="ups-edge" :stroke-width="W" /></svg>看得见的边</span>
          <span><svg viewBox="0 0 36 8" aria-hidden="true"><path d="M3 4 H33" class="ups-edge" :stroke-width="W" :stroke-dasharray="`${4 * W} ${6 * W}`" /></svg>被遮挡的边：<code class="uf-code">linePattern</code> Dashed</span>
        </div>
      </div>
    </div>

    <template #controls>
      <div class="ups-controls">
        <div class="ups-presets" role="group" aria-label="选择立体预设">
          <button
            v-for="p in PRESETS"
            :key="p.id"
            type="button"
            class="uf-btn"
            :aria-pressed="presetId === p.id"
            @click="presetId = p.id"
          >{{ p.name }}</button>
        </div>
        <label class="uf-range">
          <code class="uf-code">baseRotation</code>
          <input v-model.number="rotation" type="range" :style="fill" :min="ROT_RANGE[0]" :max="ROT_RANGE[1]" step="0.01" aria-label="baseRotation，弧度">
          <output>{{ f(rotation) }}</output>
        </label>
        <button type="button" class="uf-btn ups-toggle" :aria-pressed="mirrored" @click="mirrored = !mirrored">
          <span class="uf-mono">mirrored</span>：{{ mirrored ? 'true，斜轴向左上' : 'false，斜轴向右上' }}
        </button>
      </div>
    </template>
  </UInkFigure>
</template>

<style scoped>
.ups {
  display: grid;
  gap: 16px;
}

.ups > svg {
  width: 100%;
  max-width: 380px;
  justify-self: center;
}

@container (min-width: 600px) {
  .ups {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: center;
  }
}

.ups-edge {
  fill: none;
  stroke: var(--uink-ink-blue);
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ups-start {
  fill: var(--uink-text);
}

/* 文字加纸色描边，压在边线上时仍可读 */
.ups-label {
  fill: var(--uink-text);
  font-size: 13px;
  paint-order: stroke;
  stroke: var(--uink-paper);
  stroke-width: 4px;
  stroke-linejoin: round;
}

.ups-side {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.ups-readout {
  display: grid;
  gap: 4px;
}

.ups-readout strong {
  margin-right: 0.5em;
}

.ups-readout .uf-code {
  white-space: normal;
  overflow-wrap: anywhere;
}

.ups-note {
  font-size: 13px;
}

.ups-legend {
  display: grid;
  gap: 6px;
  color: var(--uink-text2);
  font-size: 13px;
}

.ups-legend span {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: center;
}

.ups-legend svg {
  flex: none;
  width: 36px;
  height: 8px;
}

.ups-controls {
  display: grid;
  gap: 12px;
  width: 100%;
}

.ups-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ups-toggle {
  justify-self: start;
}

@container (min-width: 600px) {
  .ups-controls {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .ups-presets {
    grid-column: 1 / -1;
  }
}
</style>
