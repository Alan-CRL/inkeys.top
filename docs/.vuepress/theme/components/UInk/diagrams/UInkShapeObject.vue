<script setup lang="ts">
import { computed, ref } from 'vue'
import UInkFigure from '../UInkFigure.vue'
import { num, polylinePath, solidParts, type Affine, type SolidConstruction } from '../geometry'

// 与公开样例 full-shape-preset 的长方体相同：部件由 construction 经 transform 计算（SHAPE-12）
const ID = 'eeeeeeee-0009-4000-8000-000000000001'
const CONSTRUCTION: SolidConstruction = { start: { x: 0, y: 0 }, height: -160, baseSize: { x: 200, y: 160 }, baseRotation: 0.5 }
const TRANSFORM: Affine = [1.5, 0, 0, 1.5, 700, 620]
// 部件描边宽度 = style.width × √|det T| = 2 × 1.5；隐藏边为 Dashed [4w, 6w]
const W = 3
const DASH = [4 * W, 6 * W]
const ROLE = { bottom: '底边', top: '顶边', side: '侧棱' } as const

const PARTS = solidParts('cuboid', CONSTRUCTION, TRANSFORM).map((p, i) => ({
  ...p,
  index: i,
  d: polylinePath(p.points),
  mid: { x: (p.points[0].x + p.points[1].x) / 2, y: (p.points[0].y + p.points[1].y) / 2 },
}))

// 整个对象的选择框
const PAD = 16
const xs = PARTS.flatMap(p => p.points.map(q => q.x))
const ys = PARTS.flatMap(p => p.points.map(q => q.y))
const BOX = { x: Math.min(...xs) - PAD, y: Math.min(...ys) - PAD, width: Math.max(...xs) - Math.min(...xs) + 2 * PAD, height: Math.max(...ys) - Math.min(...ys) + 2 * PAD }
const HANDLES = [[BOX.x, BOX.y], [BOX.x + BOX.width, BOX.y], [BOX.x + BOX.width, BOX.y + BOX.height], [BOX.x, BOX.y + BOX.height]]

const FIRST = [
  '"object": {',
  `  "id": "${ID}",`,
  '  "revision": 3,',
  '  "preset": "cuboid",',
  '  "partCount": 12,',
  `  "transform": [${TRANSFORM.join(', ')}],`,
  '  "construction": {',
  '    "start": { "x": 0, "y": 0 },',
  '    "height": -160,',
  '    "baseSize": { "x": 200, "y": 160 },',
  '    "baseRotation": 0.5',
  '  },',
  '  "style": { "width": 2, "linePattern": 0 },  // 其余样式省略',
  '  "aux": 0',
  '}',
].join('\n')

const current = ref(0)
const hovered = ref(false)
const focused = ref(false)
// 悬停或聚焦任一部件，整个对象都被选中
const engaged = computed(() => hovered.value || focused.value)
const part = computed(() => PARTS[current.value])
const objectText = computed(() => current.value === 0
  ? FIRST
  : ['"object": {', `  "ref": "${ID}",`, `  "partIndex": ${current.value}`, '}'].join('\n'))
const partText = computed(() => {
  const p = part.value
  return `${ROLE[p.role]} · Line · ${p.hidden ? `被遮挡，dashArray [${DASH.join(', ')}]` : '实线'}`
})

// 键盘：部件之间只占一个 Tab 位置，方向键切换（roving tabindex）
const hits: Array<SVGPathElement | null> = []
const setHit = (i: number) => (el: unknown) => {
  hits[i] = el as SVGPathElement | null
}
const focusPart = (i: number) => {
  current.value = (i + PARTS.length) % PARTS.length
  hits[current.value]?.focus()
}
const onKey = (e: KeyboardEvent, i: number) => {
  const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: PARTS.length - 1 }[e.key]
  if (next === undefined) return
  e.preventDefault()
  focusPart(next)
}
const onEnter = (i: number) => {
  current.value = i
  hovered.value = true
}
</script>

<template>
  <UInkFigure
    title="图形对象层"
    desc="一个长方体写成 12 个 Line 部件，每个部件都能单独画出来；对象层把它们标成同一个对象，选中任意一条边就选中整个长方体。悬停或用 Tab 键聚焦任一条边，方向键切换部件。"
  >
    <div class="uso">
      <svg
        viewBox="480 280 440 440"
        role="group"
        aria-label="长方体的 12 个部件，按 partIndex 顺序排列"
      >
        <g v-if="engaged" class="uso-select">
          <rect :x="BOX.x" :y="BOX.y" :width="BOX.width" :height="BOX.height" class="uso-box" />
          <rect v-for="(h, i) in HANDLES" :key="i" :x="h[0] - 5" :y="h[1] - 5" width="10" height="10" class="uso-handle" />
        </g>
        <path v-if="engaged" :d="part.d" class="uso-halo" />
        <path
          v-for="p in PARTS"
          :key="p.index"
          :d="p.d"
          class="uso-edge"
          :stroke-width="W"
          :stroke-dasharray="p.hidden ? DASH.join(' ') : undefined"
        />
        <text v-if="engaged" :x="part.mid.x + 10" :y="part.mid.y - 10" class="uf-text uf-mono uso-index">{{ current }}</text>
        <!-- 加宽的透明命中区：细线也容易悬停 -->
        <path
          v-for="p in PARTS"
          :key="`hit-${p.index}`"
          :ref="setHit(p.index)"
          :d="p.d"
          class="uso-hit"
          role="button"
          :tabindex="current === p.index ? 0 : -1"
          :aria-label="`部件 ${p.index}：${ROLE[p.role]}${p.hidden ? '，被遮挡' : ''}`"
          @pointerenter="onEnter(p.index)"
          @pointerleave="hovered = false"
          @focus="current = p.index; focused = true"
          @blur="focused = false"
          @keydown="onKey($event, p.index)"
        />
      </svg>

      <div class="uso-panel">
        <div class="uso-readout uf-readout" aria-live="polite">
          <div><strong>部件 {{ current }}</strong>（共 12 个）{{ partText }}</div>
          <div v-if="engaged">整个长方体已选中，可以一起移动、删除（SHAPE-13）。</div>
          <div v-else>悬停或聚焦任一条边查看它的 <code class="uf-code">object</code>。</div>
        </div>
        <pre class="uso-code" :aria-label="`部件 ${current} 的 object 字段`"><code>{{ objectText }}</code></pre>
        <p class="uso-note">
          {{ current === 0 ? '首个部件（partIndex 0）带完整的 object。' : `后续部件只写 ref（首个部件的 id）与 partIndex。` }}
        </p>
      </div>
    </div>
  </UInkFigure>
</template>

<style scoped>
.uso {
  display: grid;
  gap: 16px;
}

.uso > svg {
  width: 100%;
  max-width: 400px;
  justify-self: center;
}

@container (min-width: 600px) {
  .uso {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}

.uso-edge {
  fill: none;
  stroke: var(--uink-ink-blue);
  stroke-linecap: round;
  pointer-events: none;
}

.uso-halo {
  fill: none;
  stroke: var(--uink-accent);
  stroke-linecap: round;
  stroke-opacity: 0.28;
  stroke-width: 14;
  pointer-events: none;
}

.uso-box {
  fill: none;
  stroke: var(--uink-accent);
  stroke-width: 2;
  stroke-dasharray: 8 6;
}

.uso-handle {
  fill: var(--uink-paper);
  stroke: var(--uink-accent);
  stroke-width: 2;
}

.uso-select {
  pointer-events: none;
}

.uso-index {
  fill: var(--uink-accent);
  font-size: 20px;
  font-weight: 600;
  paint-order: stroke;
  stroke: var(--uink-paper);
  stroke-width: 5px;
  stroke-linejoin: round;
  pointer-events: none;
}

.uso-hit {
  fill: none;
  stroke: transparent;
  stroke-width: 18;
  stroke-linecap: round;
  pointer-events: stroke;
  cursor: pointer;
}

/* 聚焦时由选择框与光晕表示，不画路径的方形轮廓 */
.uso-hit:focus,
.uso-hit:focus-visible {
  outline: none;
}

.uso-panel {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.uso-readout {
  display: grid;
  gap: 4px;
}

.uso-readout strong {
  margin-right: 0.5em;
}

.uink-fig .uso-code {
  margin: 0;
  padding: 12px 14px;
  overflow: hidden;
  border-radius: var(--uink-r-control);
  background: var(--uink-surface);
  color: var(--uink-text);
  font-family: var(--vp-font-family-mono, ui-monospace, 'Cascadia Code', Consolas, monospace);
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.uink-fig .uso-code code {
  padding: 0;
  background: none;
  color: inherit;
  font: inherit;
}

.uso-note {
  margin: 0;
  color: var(--uink-text2);
  font-size: 13px;
  line-height: 1.6;
}
</style>
