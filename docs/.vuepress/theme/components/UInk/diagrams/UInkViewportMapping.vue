<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import UInkFigure from '../UInkFigure.vue'
import { num, viewportMap, viewportMatrix, visibleRect, type Point } from '../geometry'

// Device 尺寸（像素）与左侧画出的 Canvas 范围
const DEVICE = { width: 320, height: 200 }
const WORLD = { x: -120, y: -80, width: 640, height: 420 }
const RANGE = { x: [-120, 400], y: [-80, 300], scale: [0.5, 3] } as const
const DEFAULT = { x: 60, y: 40, scale: 1.25 }
const P: Point = { x: 240, y: 150 }

// Canvas 上的内容（Canvas 坐标）；两侧画同一份，右侧经 viewport 映射
const INKS = [
  { d: 'M40 124 C58 62 92 62 100 110 S140 164 160 104 S204 52 222 112', cls: 'uf-stroke-blue', w: 6 },
  { d: 'M30 184 L290 178', cls: 'uf-stroke-green', w: 5 },
  { d: 'M414 110 A44 44 0 1 1 326 110 A44 44 0 1 1 414 110 Z', cls: 'uf-stroke-red', w: 5 },
  { d: 'M400 262 L452 300 M452 262 L400 300', cls: 'uf-stroke-blue', w: 6 },
]
const GRID = (() => {
  const parts: string[] = []
  for (let x = -120; x <= 520; x += 40) parts.push(`M${x} ${WORLD.y} V${WORLD.y + WORLD.height}`)
  for (let y = -80; y <= 340; y += 40) parts.push(`M${WORLD.x} ${y} H${WORLD.x + WORLD.width}`)
  return parts.join(' ')
})()

const uid = useId()
const vx = ref(DEFAULT.x)
const vy = ref(DEFAULT.y)
const vs = ref(DEFAULT.scale)
const vp = computed(() => ({ x: vx.value, y: vy.value, scale: vs.value }))

const frame = computed(() => visibleRect(DEVICE, vp.value))
const matrix = computed(() => `matrix(${viewportMatrix(vp.value).map(num).join(' ')})`)
const device = computed(() => viewportMap(P, vp.value))
const pInside = computed(() => device.value.x >= 0 && device.value.x <= DEVICE.width && device.value.y >= 0 && device.value.y <= DEVICE.height)

// 读数：负数加括号，避免出现“240 − -60”
const f = (v: number) => num(v)
const term = (v: number) => (v < 0 ? `(${f(v)})` : f(v))
// 滑块已选部分的百分比，供 UInkFigure 的 --uf-fill 渐变使用
const fill = (v: number, [min, max]: readonly [number, number]) => ({ '--uf-fill': `${((v - min) / (max - min)) * 100}%` })
const readout = computed(() => ({
  vp: `{ x: ${f(vx.value)}, y: ${f(vy.value)}, scale: ${f(vs.value)} }`,
  dx: `(${P.x} − ${term(vx.value)}) × ${f(vs.value)} = ${f(device.value.x)}`,
  dy: `(${P.y} − ${term(vy.value)}) × ${f(vs.value)} = ${f(device.value.y)}`,
  range: `宽 ${DEVICE.width} / ${f(vs.value)} = ${f(frame.value.width)}，高 ${DEVICE.height} / ${f(vs.value)} = ${f(frame.value.height)}`,
}))

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v))

// 拖动取景框：指针位置换算到左侧 SVG 的 Canvas 坐标，平移 viewport.x / y
const world = ref<SVGSVGElement | null>(null)
let drag: { id: number, start: Point, x: number, y: number } | null = null

const toWorld = (e: PointerEvent): Point | null => {
  const m = world.value?.getScreenCTM()
  if (!m) return null
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
  return { x: p.x, y: p.y }
}

const onDown = (e: PointerEvent) => {
  const p = toWorld(e)
  if (!p) return
  drag = { id: e.pointerId, start: p, x: vx.value, y: vy.value }
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  e.preventDefault()
}

const onMove = (e: PointerEvent) => {
  if (!drag || e.pointerId !== drag.id) return
  const p = toWorld(e)
  if (!p) return
  vx.value = clamp(Math.round(drag.x + p.x - drag.start.x), RANGE.x)
  vy.value = clamp(Math.round(drag.y + p.y - drag.start.y), RANGE.y)
}

const onUp = (e: PointerEvent) => {
  if (drag && e.pointerId === drag.id) drag = null
}

const reset = () => {
  vx.value = DEFAULT.x
  vy.value = DEFAULT.y
  vs.value = DEFAULT.scale
}
</script>

<template>
  <UInkFigure
    title="viewport 映射"
    desc="viewport 决定 Device 左上角对着 Canvas 的哪个位置、放大多少倍。拖动左图中的取景框，或用下方滑块调整。"
  >
    <div class="uvm">
      <div class="uvm-pane">
        <div class="uvm-pane__title">Canvas<span>Canvas 坐标，网格间距 40</span></div>
        <svg
          ref="world"
          :viewBox="`${WORLD.x} ${WORLD.y} ${WORLD.width} ${WORLD.height}`"
          role="img"
          :aria-label="`Canvas 上的笔迹与图形，取景框从 (${f(vx)}, ${f(vy)}) 开始，宽 ${f(frame.width)}、高 ${f(frame.height)}，表示 Device 当前能看到的范围。`"
        >
          <path :d="GRID" class="uvm-grid" />
          <path :d="`M0 ${WORLD.y} V${WORLD.y + WORLD.height} M${WORLD.x} 0 H${WORLD.x + WORLD.width}`" class="uvm-axis" />
          <text x="8" y="-10" class="uf-text uf-mono uvm-world-label">(0, 0)</text>
          <path v-for="(ink, i) in INKS" :key="i" :d="ink.d" :class="ink.cls" :stroke-width="ink.w" class="uvm-ink" />
          <circle :cx="P.x" :cy="P.y" r="6" class="uvm-p" />
          <text :x="P.x + 12" :y="P.y + 26" class="uf-text uvm-world-label uvm-p-label">P</text>

          <!-- 取景框：Device 看到的 Canvas 范围（CANVAS-18） -->
          <rect
            :x="frame.x"
            :y="frame.y"
            :width="frame.width"
            :height="frame.height"
            class="uvm-frame"
            @pointerdown="onDown"
            @pointermove="onMove"
            @pointerup="onUp"
            @pointercancel="onUp"
          />
          <circle :cx="frame.x" :cy="frame.y" r="6" class="uvm-corner" />
          <text :x="frame.x + 10" :y="frame.y - 12" class="uf-text uf-mono uvm-world-label uvm-frame-label">(x, y)</text>
        </svg>
      </div>

      <div class="uvm-pane">
        <div class="uvm-pane__title">Device 显示<span>{{ DEVICE.width }} × {{ DEVICE.height }} 像素</span></div>
        <svg
          class="uvm-device"
          :viewBox="`0 0 ${DEVICE.width} ${DEVICE.height}`"
          role="img"
          :aria-label="`Device 上显示的内容：Canvas 按 scale ${f(vs)} 放大，P 点位于 Device 坐标 (${f(device.x)}, ${f(device.y)})${pInside ? '' : '，在屏幕之外'}。`"
        >
          <defs>
            <clipPath :id="`${uid}-clip`">
              <rect :width="DEVICE.width" :height="DEVICE.height" />
            </clipPath>
          </defs>
          <g :clip-path="`url(#${uid}-clip)`">
            <!-- 内容按 viewport 映射，笔迹宽度同样乘以 scale（CANVAS-17） -->
            <g :transform="matrix">
              <path :d="GRID" class="uvm-grid" />
              <path :d="`M0 ${WORLD.y} V${WORLD.y + WORLD.height} M${WORLD.x} 0 H${WORLD.x + WORLD.width}`" class="uvm-axis" />
              <path v-for="(ink, i) in INKS" :key="i" :d="ink.d" :class="ink.cls" :stroke-width="ink.w" class="uvm-ink" />
            </g>
            <template v-if="pInside">
              <circle :cx="device.x" :cy="device.y" r="4" class="uvm-p" />
              <text
                :x="device.x > DEVICE.width - 120 ? device.x - 8 : device.x + 8"
                :y="device.y > DEVICE.height - 24 ? device.y - 10 : device.y + 20"
                :text-anchor="device.x > DEVICE.width - 120 ? 'end' : 'start'"
                class="uf-text uf-mono uvm-device-label"
              >P ({{ f(device.x) }}, {{ f(device.y) }})</text>
            </template>
          </g>
        </svg>
      </div>
    </div>

    <div class="uvm-readout uf-readout" aria-live="polite">
      <div><strong>viewport</strong> <code class="uf-code">{{ readout.vp }}</code></div>
      <div>
        <strong>P 点</strong>Canvas <code class="uf-code">({{ P.x }}, {{ P.y }})</code> → Device
        <code class="uf-code">deviceX = {{ readout.dx }}</code>
        <code class="uf-code">deviceY = {{ readout.dy }}</code>
        <span v-if="!pInside">（在屏幕之外）</span>
      </div>
      <div><strong>可见范围</strong>{{ readout.range }}</div>
    </div>

    <template #controls>
      <div class="uvm-controls">
        <label class="uf-range">
          <code class="uf-code">x</code>
          <input v-model.number="vx" type="range" :style="fill(vx, RANGE.x)" :min="RANGE.x[0]" :max="RANGE.x[1]" step="1" aria-label="viewport.x">
          <output>{{ f(vx) }}</output>
        </label>
        <label class="uf-range">
          <code class="uf-code">y</code>
          <input v-model.number="vy" type="range" :style="fill(vy, RANGE.y)" :min="RANGE.y[0]" :max="RANGE.y[1]" step="1" aria-label="viewport.y">
          <output>{{ f(vy) }}</output>
        </label>
        <label class="uf-range">
          <code class="uf-code">scale</code>
          <input v-model.number="vs" type="range" :style="fill(vs, RANGE.scale)" :min="RANGE.scale[0]" :max="RANGE.scale[1]" step="0.05" aria-label="viewport.scale">
          <output>{{ f(vs) }}</output>
        </label>
        <button type="button" class="uf-btn" @click="reset">复位</button>
      </div>
    </template>
  </UInkFigure>
</template>

<style scoped>
.uvm {
  display: grid;
  gap: 16px;
}

@container (min-width: 600px) {
  .uvm {
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    align-items: start;
  }
}

.uvm-pane {
  display: grid;
  gap: 8px;
  min-width: 0;
}

/* 缩小时取景框可能超出左图，裁掉，避免压到右侧 */
.uvm-pane svg {
  overflow: hidden;
}

.uvm-pane__title {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  align-items: baseline;
  color: var(--uink-text);
  font-size: 14px;
  font-weight: 600;
}

.uvm-pane__title span {
  color: var(--uink-text2);
  font-size: 12.5px;
  font-weight: 400;
}

.uvm-grid {
  fill: none;
  stroke: var(--uink-line);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.uvm-axis {
  fill: none;
  stroke: var(--uink-stroke);
  stroke-width: 1.2;
  vector-effect: non-scaling-stroke;
}

.uvm-ink {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.uvm-p {
  fill: var(--uink-text);
}

.uvm-world-label {
  font-size: 25px;
}

.uvm-p-label {
  fill: var(--uink-text);
  font-weight: 600;
}

.uvm-frame {
  fill: var(--uink-accent);
  fill-opacity: 0.07;
  stroke: var(--uink-accent);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
  cursor: grab;
  touch-action: none;
}

.uvm-frame:active {
  cursor: grabbing;
}

.uvm-corner {
  fill: var(--uink-accent);
  pointer-events: none;
}

.uvm-frame-label {
  fill: var(--uink-accent);
  pointer-events: none;
}

.uvm-device {
  border: 1.5px solid var(--uink-text3);
  border-radius: 6px;
  background: var(--uink-paper);
}

.uvm-device-label {
  fill: var(--uink-text);
  font-size: 15px;
}

.uvm-readout {
  display: grid;
  gap: 4px;
  margin-top: 14px;
}

.uvm-readout strong {
  margin-right: 0.5em;
}

.uvm-readout .uf-code {
  white-space: normal;
}

.uvm-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px 20px;
  width: 100%;
}

@container (min-width: 600px) {
  .uvm-controls {
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    align-items: center;
  }
}

.uvm-controls .uf-btn {
  justify-self: start;
}
</style>
