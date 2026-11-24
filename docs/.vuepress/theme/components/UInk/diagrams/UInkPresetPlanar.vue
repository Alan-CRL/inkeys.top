<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'
import { num, planarPreset, polygonPath, shapePath, type Point, type PresetConstruction } from '../geometry'

interface Cell {
  preset: string
  name: string
  note?: string
  c: PresetConstruction
  // 辅助线：外框（由 s、e 张成）或半径（s → e）
  guide?: 'box' | 'radius'
  // s、e 标签相对点的偏移
  sAt?: Point
  eAt?: Point
}

// 每格 120 × 90 的局部坐标；箭头按 style.width = 2.5 计算
const STYLE_WIDTH = 2.5
const CELLS: Cell[] = [
  { preset: 'line', name: '线段', c: { start: { x: 18, y: 70 }, end: { x: 102, y: 22 } }, sAt: { x: -4, y: 16 }, eAt: { x: 4, y: -8 } },
  { preset: 'arrow', name: '箭头', note: '箭头始终为实线', c: { start: { x: 16, y: 70 }, end: { x: 102, y: 24 } }, sAt: { x: -4, y: 16 }, eAt: { x: 6, y: -6 } },
  { preset: 'rectangle', name: '矩形', c: { start: { x: 18, y: 18 }, end: { x: 102, y: 72 } }, sAt: { x: -12, y: -4 }, eAt: { x: 6, y: 14 } },
  { preset: 'rounded-rectangle', name: '圆角矩形', note: '圆角 = 短边 × 0.2', c: { start: { x: 18, y: 18 }, end: { x: 102, y: 72 } }, guide: 'box', sAt: { x: -12, y: -4 }, eAt: { x: 6, y: 14 } },
  { preset: 'circle', name: '圆', note: 'mode 1：s 为圆心', c: { start: { x: 58, y: 46 }, end: { x: 90, y: 46 }, mode: 1 }, guide: 'radius', sAt: { x: -6, y: -8 }, eAt: { x: 8, y: -8 } },
  { preset: 'ellipse', name: '椭圆', note: '外框内切', c: { start: { x: 14, y: 18 }, end: { x: 106, y: 74 } }, guide: 'box', sAt: { x: -10, y: -4 }, eAt: { x: 2, y: 14 } },
  { preset: 'triangle', name: '三角形', c: { start: { x: 18, y: 16 }, end: { x: 102, y: 74 } }, guide: 'box', sAt: { x: -12, y: -2 }, eAt: { x: 6, y: 12 } },
  { preset: 'parallelogram', name: '平行四边形', note: 'k = (e.x − s.x) / 4', c: { start: { x: 14, y: 20 }, end: { x: 106, y: 70 } }, sAt: { x: -4, y: -8 }, eAt: { x: -2, y: 16 } },
  { preset: 'rhombus', name: '菱形', note: '外框四边中点', c: { start: { x: 16, y: 16 }, end: { x: 104, y: 74 } }, guide: 'box', sAt: { x: -12, y: -2 }, eAt: { x: 6, y: 12 } },
  { preset: 'trapezoid', name: '梯形', c: { start: { x: 14, y: 18 }, end: { x: 106, y: 72 } }, guide: 'box', sAt: { x: -10, y: -4 }, eAt: { x: 2, y: 14 } },
  { preset: 'regular-polygon', name: '正多边形', note: 'sides 5，s 为中心', c: { start: { x: 60, y: 48 }, end: { x: 60, y: 14 }, sides: 5 }, guide: 'radius', sAt: { x: 6, y: 14 }, eAt: { x: 8, y: -2 } },
  { preset: 'polyline', name: '折线', note: '依次连接 vertices', c: { vertices: [{ x: 14, y: 66 }, { x: 44, y: 24 }, { x: 76, y: 62 }, { x: 106, y: 22 }] } },
  { preset: 'polygon', name: '多边形', note: 'vertices 自动闭合', c: { vertices: [{ x: 20, y: 26 }, { x: 70, y: 14 }, { x: 104, y: 48 }, { x: 64, y: 76 }, { x: 22, y: 64 }] } },
  { preset: 'arc', name: '圆弧', note: 'sweep −4π/3：s 为圆心，e 为起点', c: { start: { x: 60, y: 48 }, end: { x: 94, y: 48 }, sweep: (-4 * Math.PI) / 3 }, guide: 'radius', sAt: { x: -14, y: -4 }, eAt: { x: 6, y: 14 } },
  { preset: 'sector', name: '扇形', note: 'sweep −3π/2：弧之后连回圆心', c: { start: { x: 60, y: 46 }, end: { x: 94, y: 46 }, sweep: (-3 * Math.PI) / 2 }, sAt: { x: 6, y: -6 }, eAt: { x: 6, y: 14 } },
]

const P = (p: Point) => `${num(p.x)} ${num(p.y)}`
// 派生点画成小菱形
const diamond = (p: Point, r = 4) => polygonPath([{ x: p.x, y: p.y - r }, { x: p.x + r, y: p.y }, { x: p.x, y: p.y + r }, { x: p.x - r, y: p.y }])

const VIEWS = CELLS.map((cell) => {
  const r = planarPreset(cell.preset, cell.c, STYLE_WIDTH)!
  const { start: s, end: e } = cell.c
  let guide = ''
  if (s && e && cell.guide === 'box') guide = `M${P(s)} H${num(e.x)} V${num(e.y)} H${num(s.x)} Z`
  if (s && e && cell.guide === 'radius') guide = `M${P(s)} L${P(e)}`
  // 圆弧的终点半径也画出来，说明 sweep
  if (s && cell.preset === 'arc') guide += ` M${P(s)} L${P(r.derived[0])}`
  return {
    ...cell,
    d: r.parts.map(p => shapePath(p.shapeType, p.geometry)).join(' '),
    guide,
    // 折线与多边形的顶点是给定参数，不是派生点；与 s、e 重合的点不再标成派生点
    given: cell.c.vertices ?? [],
    derived: cell.c.vertices ? [] : r.derived.filter(p => ![s, e].some(q => q && Math.hypot(p.x - q.x, p.y - q.y) < 0.5)),
  }
})
</script>

<template>
  <UInkFigure
    title="平面预设"
    desc="每个预设只保存少量参数，其余顶点按公式算出。s 是 start，e 是 end；同一对 s、e 在不同预设里含义不同。"
  >
    <div class="upp">
      <figure v-for="v in VIEWS" :key="v.preset" class="uf-panel">
        <svg viewBox="0 0 120 90" role="img" :aria-label="`${v.preset}（${v.name}）${v.note ? `：${v.note}` : ''}`">
          <path v-if="v.guide" :d="v.guide" class="uf-art uf-art--thin uf-art--dash" />
          <path :d="v.d" class="upp-shape" />
          <path v-for="(p, i) in v.derived" :key="`d${i}`" :d="diamond(p)" class="upp-derived" />
          <circle v-for="(p, i) in v.given" :key="`g${i}`" :cx="p.x" :cy="p.y" r="3" class="upp-start" />
          <template v-if="v.c.start && v.c.end">
            <circle :cx="v.c.start.x" :cy="v.c.start.y" r="3.2" class="upp-start" />
            <circle :cx="v.c.end.x" :cy="v.c.end.y" r="3.2" class="upp-end" />
            <text :x="v.c.start.x + (v.sAt?.x ?? 0)" :y="v.c.start.y + (v.sAt?.y ?? 0)" class="uf-text uf-mono upp-label">s</text>
            <text :x="v.c.end.x + (v.eAt?.x ?? 0)" :y="v.c.end.y + (v.eAt?.y ?? 0)" class="uf-text uf-mono upp-label">e</text>
          </template>
        </svg>
        <figcaption class="uf-panel__cap">
          <span class="uf-panel__name"><code class="uf-code">{{ v.preset }}</code></span>
          <span>{{ v.name }}<template v-if="v.note">，{{ v.note }}</template></span>
        </figcaption>
      </figure>
    </div>

    <div class="upp-legend">
      <span><svg viewBox="-6 -6 12 12" aria-hidden="true"><circle r="3.2" class="upp-start" /></svg><code class="uf-code">start</code> 或 <code class="uf-code">vertices</code></span>
      <span><svg viewBox="-6 -6 12 12" aria-hidden="true"><circle r="3.2" class="upp-end" /></svg><code class="uf-code">end</code></span>
      <span><svg viewBox="-6 -6 12 12" aria-hidden="true"><path :d="diamond({ x: 0, y: 0 })" class="upp-derived" /></svg>由参数算出的顶点</span>
      <span><svg class="upp-legend__line" viewBox="0 0 24 12" aria-hidden="true"><path d="M2 6 H22" class="uf-art uf-art--thin uf-art--dash" /></svg>外框或半径（辅助线，不是部件）</span>
    </div>
  </UInkFigure>
</template>

<style scoped>
.upp {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  justify-items: center;
  gap: 18px 12px;
}

.upp .uf-panel {
  width: 100%;
  max-width: 220px;
}

@container (min-width: 560px) {
  .upp {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container (min-width: 820px) {
  .upp {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 20px 14px;
  }
}

.upp-shape {
  fill: none;
  stroke: var(--uink-ink-blue);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.upp-start {
  fill: var(--uink-text);
}

.upp-end {
  fill: var(--uink-paper);
  stroke: var(--uink-text);
  stroke-width: 1.5;
}

.upp-derived {
  fill: var(--uink-accent);
}

.upp-label {
  fill: var(--uink-text);
  font-size: 12px;
  font-weight: 600;
}

.uink-fig .upp .uf-panel__cap {
  display: grid;
  gap: 2px;
  justify-items: center;
  margin: 0;
  font-size: 13px;
}

.upp-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 18px;
  color: var(--uink-text2);
  font-size: 13px;
}

.upp-legend span {
  display: flex;
  gap: 6px;
  align-items: center;
}

.upp-legend svg {
  flex: none;
  width: 14px;
  height: 14px;
}

.upp-legend .upp-legend__line {
  width: 24px;
  height: 12px;
}
</style>
