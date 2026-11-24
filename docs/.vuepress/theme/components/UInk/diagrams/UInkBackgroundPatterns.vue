<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'

// 页面尺寸与图案间距（CANVAS-9：间距、线色由软件决定，这里取 16）
const PW = 160
const PH = 104
const GAP = 16

const DOTS: { x: number, y: number }[] = []
for (let y = GAP; y < PH; y += GAP) {
  for (let x = GAP; x < PW; x += GAP) DOTS.push({ x, y })
}

let grid = ''
for (let x = GAP; x < PW; x += GAP) grid += `M${x} 0 V${PH} `
for (let y = GAP; y < PH; y += GAP) grid += `M0 ${y} H${PW} `
const GRID = grid.trim()

// 三张图共用的页面内容：一行手写字和一条红色下划线
const WORD = 'M28 54 C32 36 42 36 43 50 C44 64 54 64 57 48 C60 34 70 36 70 50 C70 64 82 64 86 48 C89 38 98 40 100 52 C102 64 112 62 118 50 C122 42 130 42 132 52'
const UNDERLINE = 'M30 74 C62 70 96 72 134 68'

const PATTERNS = [
  { value: 0, name: 'Blank', label: '空白（缺省）' },
  { value: 1, name: 'Dots', label: '点阵' },
  { value: 2, name: 'Grid', label: '方格' },
]
</script>

<template>
  <UInkFigure
    title="页面背景图案"
    desc="同一页内容换用三种 pattern。背景颜色由 background.color 决定；点阵与方格的间距、线色由软件决定，不认识的取值按 Blank 显示（CANVAS-9）。"
  >
    <div class="ubp">
      <figure v-for="p in PATTERNS" :key="p.value" class="uf-panel">
        <svg :viewBox="`0 0 ${PW} ${PH}`" role="img" :aria-label="`pattern ${p.value}（${p.name}，${p.label}）的页面`">
          <rect x="0" y="0" :width="PW" :height="PH" class="ubp-page" />
          <template v-if="p.value === 1">
            <circle v-for="(d, i) in DOTS" :key="i" :cx="d.x" :cy="d.y" r="1.4" class="ubp-dot" />
          </template>
          <path v-else-if="p.value === 2" :d="GRID" class="ubp-grid" />
          <path :d="WORD" class="ubp-ink uf-stroke-blue" />
          <path :d="UNDERLINE" class="ubp-ink uf-stroke-red" />
        </svg>
        <figcaption class="uf-panel__cap">
          <span class="uf-panel__name">{{ p.name }}</span>
          <span>{{ p.label }}</span>
          <code class="uf-code">pattern: {{ p.value }}</code>
        </figcaption>
      </figure>
    </div>
  </UInkFigure>
</template>

<style scoped>
.ubp {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 12px;
}

.ubp svg {
  overflow: hidden;
  border-radius: 8px;
}

.ubp-page {
  fill: var(--uink-paper);
  stroke: var(--uink-line);
  stroke-width: 2;
}

.ubp-dot {
  fill: var(--uink-stroke);
}

.ubp-grid {
  fill: none;
  stroke: var(--uink-stroke);
  stroke-opacity: 0.45;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.ubp-ink {
  fill: none;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 主题会给 figure 内的 figcaption 加居中与字号，这里还原 */
.uink-fig .uf-panel .uf-panel__cap {
  display: grid;
  gap: 3px;
  justify-items: center;
  margin: 0;
  font-size: 13px;
}
</style>
