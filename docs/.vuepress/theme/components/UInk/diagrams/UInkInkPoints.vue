<script setup lang="ts">
import { useId } from 'vue'
import UInkFigure from '../UInkFigure.vue'
import { absolutePoints, num, sweepPath, type InkPoint } from '../geometry'

// 文件里写的点：首点是 Canvas 绝对坐标，之后是相对前一点的位移（INK-4）
const RAW: InkPoint[] = [
  { x: 50, y: 150, width: 10 },
  { x: 50, y: -60, width: 16 },
  { x: 70, y: -10, width: 22 },
  { x: 60, y: 50, width: 14 },
  { x: 60, y: 20, width: 6 },
]
const ABS = absolutePoints(RAW)
// 没有 nib：圆形笔尖，width 为直径（NIB-1）；缺省端帽 Round
const OUTLINE = sweepPath(ABS)

const sign = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0')

// 相对位移箭头：从前一点画到本点的圆边缘，标签放在箭头上方
const ARROWS = ABS.slice(1).map((p, i) => {
  const a = ABS[i]
  const dx = p.x - a.x
  const dy = p.y - a.y
  const l = Math.hypot(dx, dy)
  const ux = dx / l
  const uy = dy / l
  const start = { x: a.x + ux * (a.width / 2 + 3), y: a.y + uy * (a.width / 2 + 3) }
  const end = { x: p.x - ux * (p.width / 2 + 3), y: p.y - uy * (p.width / 2 + 3) }
  // 法向取朝上的一侧
  let nx = uy
  let ny = -ux
  if (ny > 0) {
    nx = -nx
    ny = -ny
  }
  const mid = { x: (a.x + p.x) / 2 + nx * 28, y: (a.y + p.y) / 2 + ny * 28 }
  const raw = RAW[i + 1]
  return {
    d: `M${num(start.x)} ${num(start.y)} L${num(end.x)} ${num(end.y)}`,
    label: `${sign(raw.x)}, ${sign(raw.y)}`,
    mid,
  }
})

const ROWS = ABS.map((p, i) => ({
  name: `P${i}`,
  raw: i === 0 ? `${RAW[0].x}, ${RAW[0].y}` : `${sign(RAW[i].x)}, ${sign(RAW[i].y)}`,
  width: p.width,
  abs: `(${p.x}, ${p.y})`,
}))

const uid = useId()
</script>

<template>
  <UInkFigure
    title="笔迹的点"
    desc="首点是绝对坐标，之后每个点只存相对前一点的位移；每个点带一个宽度，笔尖沿这些点扫过的区域就是笔迹。"
  >
    <div class="uip">
      <svg
        viewBox="20 30 320 170"
        role="img"
        aria-label="一条五个点的笔迹：首点 P0 的绝对坐标是 (50, 150)，之后四个点分别相对前一点位移 +50,−60、+70,−10、+60,+50、+60,+20；每个点的宽度画成一个圆，圆形笔尖沿这些点扫过的区域就是笔迹的轮廓。"
      >
        <defs>
          <marker :id="`${uid}-arrow`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M1 1 L9 5 L1 9" class="uip-arrowhead" />
          </marker>
        </defs>

        <!-- 扫掠轮廓：先描边再用纸色覆盖内部，只留下外轮廓；再铺一层浅色填充 -->
        <path :d="OUTLINE" class="uip-outline" />
        <path :d="OUTLINE" class="uip-cover" />
        <path :d="OUTLINE" class="uip-fill" />

        <!-- 每个点的宽度：直径 = width 的圆 -->
        <circle
          v-for="(p, i) in ABS"
          :key="`c${i}`"
          :cx="p.x"
          :cy="p.y"
          :r="p.width / 2"
          class="uip-width"
        />

        <!-- 相对位移 -->
        <g v-for="(a, i) in ARROWS" :key="`a${i}`">
          <path :d="a.d" class="uip-step" :marker-end="`url(#${uid}-arrow)`" />
          <text :x="a.mid.x" :y="a.mid.y" class="uf-text uf-mono uip-delta" text-anchor="middle" dominant-baseline="middle">{{ a.label }}</text>
        </g>

        <g v-for="(p, i) in ABS" :key="`p${i}`">
          <circle :cx="p.x" :cy="p.y" r="2.6" class="uip-dot" />
          <text :x="p.x" :y="p.y + p.width / 2 + 16" class="uf-text uip-name" text-anchor="middle">P{{ i }}</text>
        </g>

        <!-- 首点的绝对坐标 -->
        <text :x="ABS[0].x" :y="ABS[0].y + 40" class="uf-text uf-mono uip-abs" text-anchor="middle">(50, 150)</text>
      </svg>

      <div class="uip-table" role="table" aria-label="五个点的数据">
        <div class="uip-row uip-row--head" role="row">
          <span role="columnheader">点</span>
          <span role="columnheader">文件中的 <code class="uf-code">x, y</code></span>
          <span role="columnheader"><code class="uf-code">width</code></span>
          <span role="columnheader">绝对坐标</span>
        </div>
        <div v-for="row in ROWS" :key="row.name" class="uip-row" role="row">
          <span role="cell" class="uip-cell-name">{{ row.name }}</span>
          <span role="cell" class="uip-mono">{{ row.raw }}</span>
          <span role="cell" class="uip-mono">{{ row.width }}</span>
          <span role="cell" class="uip-mono">{{ row.abs }}</span>
        </div>
        <p class="uip-note">P0 是绝对坐标，P1 起逐个累加位移（INK-4）。没有 <code class="uf-code">nib</code> 时，<code class="uf-code">width</code> 是该点处笔迹的直径（NIB-1）。</p>
      </div>
    </div>
  </UInkFigure>
</template>

<style scoped>
.uip {
  display: grid;
  gap: 20px;
  align-items: center;
}

/* 文档栏很宽时不再放大，标注保持正文字号 */
.uip svg {
  max-width: 400px;
  justify-self: center;
}

@container (min-width: 640px) {
  .uip {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  }
}

.uip-outline {
  fill: none;
  stroke: var(--uink-ink-blue);
  stroke-width: 3;
  stroke-linejoin: round;
}

.uip-cover {
  fill: var(--uink-paper);
}

.uip-fill {
  fill: var(--uink-ink-blue);
  fill-opacity: 0.14;
}

.uip-width {
  fill: none;
  stroke: var(--uink-ink-blue);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.uip-step {
  fill: none;
  stroke: var(--uink-text2);
  stroke-width: 1.5;
  stroke-linecap: round;
}

.uip-arrowhead {
  fill: none;
  stroke: var(--uink-text2);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.uip-dot {
  fill: var(--uink-text);
}

.uip-delta {
  font-size: 13px;
}

.uip-name {
  fill: var(--uink-text);
  font-size: 13.5px;
  font-weight: 600;
}

.uip-abs {
  fill: var(--uink-text);
  font-size: 13px;
}

.uip-table {
  display: grid;
  gap: 0;
  font-size: 13px;
}

.uip-row {
  display: grid;
  grid-template-columns: 2.6em 1.4fr 0.9fr 1.3fr;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--uink-line);
  color: var(--uink-text);
}

.uip-row--head {
  color: var(--uink-text2);
}

.uip-cell-name {
  font-weight: 600;
}

.uip-mono {
  font-family: var(--vp-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 13px;
}

.uip-note {
  margin: 10px 0 0;
  color: var(--uink-text2);
  font-size: 13px;
  line-height: 1.65;
}
</style>
