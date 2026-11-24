<script setup lang="ts">
import { computed, ref } from 'vue'
import UInkFigure from '../UInkFigure.vue'
import { num, polylinePath, type Point } from '../geometry'

// 与公开样例 core-shape-curves 相同的双曲线：x²/120² − y²/90² = 1，t ∈ [−1.9, 1.9]
const A = 120
const B = 90
const T = 1.9
// 图中按 0.4 倍绘制，中心放在 (180, 130)
const K = 0.4
const CX = 180
const CY = 130
const N_RANGE = [3, 49] as const
const N_DEFAULT = 7
const TOL = 0.25

// 文件坐标（相对中心）：右支 x = a·cosh t，左支取负；Canvas 的 y 向下，所以 y = −b·sinh t
const branch = (side: 1 | -1, t: number): Point => ({ x: side * A * Math.cosh(t), y: -B * Math.sinh(t) })
const toView = (p: Point): Point => ({ x: CX + p.x * K, y: CY + p.y * K })

// 均匀取 n 个参数值（含两端）
const params = (n: number) => Array.from({ length: n }, (_, i) => -T + (2 * T * i) / (n - 1))

// 点到线段的距离
function segDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  const s = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2))
  return Math.hypot(p.x - a.x - s * dx, p.y - a.y - s * dy)
}

// 真实曲线：取很密的点，既用来画参照线，也用来估算折线的最大偏差
const DENSE = params(241)
const TRUE_L = polylinePath(DENSE.map(t => toView(branch(-1, t))))
const TRUE_R = polylinePath(DENSE.map(t => toView(branch(1, t))))

// 渐近线 y = ±(b / a)·x，截到双曲线的范围
const XE = A * Math.cosh(T)
const ASYMPTOTES = [
  [{ x: -XE, y: (B / A) * XE }, { x: XE, y: -(B / A) * XE }],
  [{ x: -XE, y: -(B / A) * XE }, { x: XE, y: (B / A) * XE }],
].map(seg => polylinePath(seg.map(toView)))

const n = ref(N_DEFAULT)
const fill = (v: number) => ({ '--uf-fill': `${((v - N_RANGE[0]) / (N_RANGE[1] - N_RANGE[0])) * 100}%` })

const sample = computed(() => {
  const ts = params(n.value)
  const right = ts.map(t => branch(1, t))
  // 两支对称，偏差只算右支（文件坐标，单位与样例相同）
  let err = 0
  for (const t of DENSE) {
    const p = branch(1, t)
    let d = Infinity
    for (let i = 0; i < right.length - 1; i++) d = Math.min(d, segDist(p, right[i], right[i + 1]))
    err = Math.max(err, d)
  }
  const left = ts.map(t => toView(branch(-1, t)))
  const rightView = right.map(toView)
  return { left, right: rightView, dLeft: polylinePath(left), dRight: polylinePath(rightView), err }
})

const ok = computed(() => sample.value.err <= TOL)

const PARTS = [
  { index: 0, name: '左支', type: 'Polyline', note: '首个部件，带完整的 object' },
  { index: 1, name: '右支', type: 'Polyline', note: 'ref + partIndex' },
  { index: 2, name: '渐近线', type: 'Line', note: '虚线 [12, 8]' },
  { index: 3, name: '渐近线', type: 'Line', note: '虚线 [12, 8]' },
]
</script>

<template>
  <UInkFigure
    title="曲线写成折线"
    desc="UInk 不保存曲线方程。双曲线在曲线上按顺序取点，两支各写成一条 Polyline；点取得越密，折线越贴近真实曲线。"
  >
    <div class="usc">
      <svg viewBox="0 0 360 260" role="img" :aria-label="`双曲线的两支各用 ${n} 个点连成折线，与真实曲线的最大偏差约 ${num(sample.err)} 个单位`">
        <!-- 渐近线：两条虚线 Line 部件 -->
        <path v-for="(d, i) in ASYMPTOTES" :key="i" :d="d" class="uf-art uf-art--thin uf-art--dash" />
        <!-- 真实曲线（参照，不写入文件） -->
        <path :d="TRUE_L" class="usc-true" />
        <path :d="TRUE_R" class="usc-true" />
        <!-- 写入文件的折线与采样点 -->
        <path :d="sample.dLeft" class="usc-poly" />
        <path :d="sample.dRight" class="usc-poly" />
        <g class="uf-fill-blue">
          <circle v-for="(p, i) in sample.left" :key="`l${i}`" :cx="num(p.x)" :cy="num(p.y)" r="2.2" />
          <circle v-for="(p, i) in sample.right" :key="`r${i}`" :cx="num(p.x)" :cy="num(p.y)" r="2.2" />
        </g>
        <!-- 标签放在两支的开口内侧，离顶点留出距离，不压在曲线上 -->
        <text :x="CX - 66" :y="CY + 5" class="uf-text usc-label" text-anchor="end">左支</text>
        <text :x="CX + 66" :y="CY + 5" class="uf-text usc-label">右支</text>
      </svg>

      <ol class="usc-parts" aria-label="对象的 4 个部件">
        <li v-for="p in PARTS" :key="p.index">
          <span class="usc-idx uf-mono">{{ p.index }}</span>
          <span class="usc-name">{{ p.name }} <code class="uf-code">{{ p.type }}</code></span>
          <span class="usc-note">{{ p.note }}</span>
        </li>
      </ol>
    </div>

    <template #controls>
      <div class="usc-controls">
        <label class="uf-range">
          <span>每支点数</span>
          <input v-model.number="n" type="range" :style="fill(n)" :min="N_RANGE[0]" :max="N_RANGE[1]" step="1" aria-label="每支的采样点数">
          <output>{{ n }}</output>
        </label>
        <p class="uf-readout" aria-live="polite">
          折线与真实曲线的最大偏差约 <strong class="uf-mono">{{ num(sample.err) }}</strong> 个单位，
          <template v-if="ok">已不超过 0.25，看不出棱角（SHAPE-24）。</template>
          <template v-else>大于 0.25，还需要更多点。</template>
          <br>
          图中按 <code class="uf-code">t</code> 均匀取点；按弯曲程度自适应取点，点数可以更少（公开样例每支 29 个点）。
        </p>
      </div>
    </template>
  </UInkFigure>
</template>

<style scoped>
.usc {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}

@container (min-width: 600px) {
  .usc {
    grid-template-columns: minmax(0, 1fr) 13.5em;
  }
}

.usc svg {
  max-width: 480px;
  justify-self: center;
}

.usc-true {
  fill: none;
  stroke: var(--uink-stroke);
  stroke-width: 6;
  stroke-opacity: 0.35;
  stroke-linecap: round;
}

.usc-poly {
  fill: none;
  stroke: var(--uink-ink-blue);
  stroke-width: 1.6;
  stroke-linejoin: round;
}

.usc-label {
  fill: var(--uink-text);
  font-size: 14px;
}

.usc-parts {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.usc-parts li {
  display: grid;
  grid-template-columns: 1.6em minmax(0, 1fr);
  gap: 0 8px;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid var(--uink-line);
  border-radius: var(--uink-r-control);
  font-size: 13px;
  line-height: 1.5;
}

.usc-idx {
  grid-row: span 2;
  color: var(--uink-text3);
  font-size: 13px;
}

.usc-name {
  color: var(--uink-text);
}

.usc-note {
  color: var(--uink-text2);
}

.usc-controls {
  display: grid;
  gap: 8px;
  width: 100%;
}

@container (min-width: 600px) {
  .usc-controls .uf-range {
    max-width: 26em;
  }
}
</style>
