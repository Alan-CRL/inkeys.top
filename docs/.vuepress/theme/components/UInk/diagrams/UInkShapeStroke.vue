<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'
import { CAP_ROUND, JOIN_ROUND, dashOutline, strokeOutline, type Point } from '../geometry'

// 描边宽度 w = 4，与 shape.md 示例相同；所有长度单位与坐标相同（SHAPE-6）
const W = 4
const LINE: Point[] = [{ x: 8, y: 14 }, { x: 232, y: 14 }]

interface Row {
  name: string
  code: string
  note: string
  d: string
  /** 对比用的参照线（浅灰），只在 dashOffset 一行使用 */
  ref?: string
}

// dashOffset 对比：上方浅灰为 dashOffset = 0，下方为 dashOffset = 6（SHAPE-26：正值让图案朝起点移动）
const OFFSET = 6
const REF_LINE: Point[] = LINE.map(p => ({ x: p.x, y: 7 }))
const OFF_LINE: Point[] = LINE.map(p => ({ x: p.x, y: 21 }))

// OpenArrow 的具体外形由软件决定（Marker 表）；这里画两条与杆同宽的短线
const head = (() => {
  const end = LINE[1]
  const back = 13
  const spread = 7.5
  return strokeOutline(
    [{ x: end.x - back, y: end.y - spread }, end, { x: end.x - back, y: end.y + spread }],
    W,
    CAP_ROUND,
    JOIN_ROUND,
  )
})()

const ROWS: Row[] = [
  { name: '实线', code: 'dashArray 缺省', note: '缺失或为空时是实线', d: dashOutline(LINE, W) },
  { name: '虚线', code: 'dashArray: [16, 8]', note: '圆头让每段两端各多出 w/2，空隙看起来变窄', d: dashOutline(LINE, W, [16, 8], 0, CAP_ROUND) },
  {
    name: '偏移',
    code: `dashOffset: ${OFFSET}`,
    note: `图案朝起点方向移动 ${OFFSET}：第一段只剩 ${16 - OFFSET}，后面的段整体左移（SHAPE-26）。上方浅灰为 dashOffset = 0`,
    ref: dashOutline(REF_LINE, W, [16, 8], 0, CAP_ROUND),
    d: dashOutline(OFF_LINE, W, [16, 8], OFFSET, CAP_ROUND),
  },
  { name: '点线', code: 'dashArray: [0, 12]', note: '即 {0, 3w}：长度为 0 的段在圆头下画成圆点（NIB-5）', d: dashOutline(LINE, W, [0, 12], 0, CAP_ROUND) },
  { name: '点划线', code: 'dashArray: [16, 8, 0, 8]', note: '线段与圆点交替', d: dashOutline(LINE, W, [16, 8, 0, 8], 0, CAP_ROUND) },
  { name: '箭头', code: 'endMarker: 1', note: 'OpenArrow，外形由软件决定；只用于 Line、Polyline', d: `${dashOutline(LINE, W)} ${head}` },
]
</script>

<template>
  <UInkFigure
    title="线型与端头"
    desc="同一条 Line，描边宽度 w = 4，端帽为缺省的 Round。线型只由 dashArray 表达（SHAPE-7、SHAPE-8）。"
  >
    <div class="uss">
      <div v-for="row in ROWS" :key="row.name" class="uss-row">
        <div class="uss-label">
          <span class="uss-name">{{ row.name }}</span>
          <code class="uf-code">{{ row.code }}</code>
          <span class="uss-note">{{ row.note }}</span>
        </div>
        <svg viewBox="0 0 240 28" role="img" :aria-label="`${row.name}：${row.code}。${row.note}`">
          <template v-if="row.ref">
            <!-- 竖虚线标出路径起点 -->
            <path :d="`M${LINE[0].x} 0 V28`" class="uf-art uf-art--thin uf-art--dash" />
            <path :d="row.ref" class="uss-ref" />
          </template>
          <path :d="row.d" class="uf-fill-blue" />
        </svg>
      </div>
    </div>
  </UInkFigure>
</template>

<style scoped>
.uss {
  display: grid;
}

.uss-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
  padding: 12px 0;
  border-bottom: 1px solid var(--uink-line);
}

.uss-row:first-child {
  padding-top: 0;
}

.uss-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

@container (min-width: 600px) {
  .uss-row {
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1fr);
    gap: 20px;
    align-items: center;
  }
}

.uss-label {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  align-items: baseline;
}

.uss-name {
  color: var(--uink-text);
  font-size: 14px;
  font-weight: 600;
}

.uss-ref {
  fill: var(--uink-text3);
  fill-opacity: 0.35;
}

.uss-note {
  flex-basis: 100%;
  color: var(--uink-text2);
  font-size: 13px;
  line-height: 1.55;
}
</style>
