<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'
import { num, rotatePoint, shapePath, type Point, type ShapeGeometry } from '../geometry'

interface Label {
  x: number
  y: number
  text: string
  anchor?: 'start' | 'middle' | 'end'
  rotate?: number
  field?: boolean
}

interface Panel {
  type: number
  name: string
  fields: string
  d: string
  // 标注用的线稿（尺寸线、半径、旋转弧）
  guides: string
  dashed?: string
  dots: Point[]
  labels: Label[]
}

const deg = (rad: number) => (rad * 180) / Math.PI
const P = (p: Point) => `${num(p.x)} ${num(p.y)}`
// 从水平方向顺时针转到 rot 的圆弧（Y 向下，正值为顺时针）
const arc = (c: Point, r: number, rot: number) => {
  const end = rotatePoint({ x: c.x + r, y: c.y }, c, rot)
  return `M${num(c.x + r)} ${num(c.y)} A${r} ${r} 0 0 1 ${P(end)}`
}

const pointLabels = (pts: Point[], offsets: Point[]): Label[] =>
  pts.map((p, i) => ({ x: p.x + offsets[i].x, y: p.y + offsets[i].y, text: `[${i}]`, anchor: 'middle' }))

const PANELS: Panel[] = []

// Line：两个端点
{
  const g: ShapeGeometry = { points: [{ x: 44, y: 124 }, { x: 178, y: 46 }] }
  PANELS.push({
    type: 0, name: 'Line', fields: 'points：2 个点', d: shapePath(0, g), guides: '',
    dots: g.points!, labels: [{ x: 14, y: 26, text: 'points', field: true }, ...pointLabels(g.points!, [{ x: -4, y: 22 }, { x: 4, y: -12 }])],
  })
}

// Polyline：至少两个点
{
  const g: ShapeGeometry = { points: [{ x: 30, y: 118 }, { x: 80, y: 56 }, { x: 132, y: 116 }, { x: 188, y: 54 }] }
  PANELS.push({
    type: 1, name: 'Polyline', fields: 'points：至少 2 个点', d: shapePath(1, g), guides: '',
    dots: g.points!, labels: [{ x: 14, y: 26, text: 'points', field: true }, ...pointLabels(g.points!, [{ x: 0, y: 22 }, { x: 0, y: -12 }, { x: 0, y: 22 }, { x: 0, y: -12 }])],
  })
}

// Polygon：至少三个点，最后一点自动连回第一点
{
  const g: ShapeGeometry = { points: [{ x: 48, y: 124 }, { x: 108, y: 40 }, { x: 178, y: 118 }] }
  PANELS.push({
    type: 6, name: 'Polygon', fields: 'points：至少 3 个点，自动闭合', d: shapePath(6, g), guides: '',
    dots: g.points!,
    labels: [
      { x: 14, y: 26, text: 'points', field: true },
      ...pointLabels(g.points!, [{ x: -12, y: 16 }, { x: 0, y: -12 }, { x: 14, y: 14 }]),
      { x: 113, y: 142, text: '自动闭合', anchor: 'middle' },
    ],
  })
}

// Rectangle：中心、宽高与圆角半径
{
  const g: ShapeGeometry = { centerX: 120, centerY: 80, width: 160, height: 72, cornerRadiusX: 26, cornerRadiusY: 16 }
  const l = 120 - 80
  const r = 120 + 80
  const t = 80 - 36
  const b = 80 + 36
  PANELS.push({
    type: 2, name: 'Rectangle', fields: 'centerX/Y、width、height、rotation、圆角', d: shapePath(2, g),
    guides: `M${l} ${t - 12} H${r} M${l} ${t - 16} v8 M${r} ${t - 16} v8 M${l - 12} ${t} V${b} M${l - 16} ${t} h8 M${l - 16} ${b} h8`,
    // 右下角的圆角半径：横向 cornerRadiusX、纵向 cornerRadiusY
    dashed: `M${r - 26} ${b} V${b - 16} H${r}`,
    dots: [{ x: 120, y: 80 }],
    labels: [
      { x: 120, y: t - 18, text: 'width', anchor: 'middle', field: true },
      { x: l - 18, y: 80, text: 'height', anchor: 'middle', rotate: -90, field: true },
      { x: 120, y: 72, text: '(centerX, centerY)', anchor: 'middle', field: true },
      { x: r, y: b + 20, text: 'cornerRadiusX/Y', anchor: 'end', field: true },
    ],
  })
}

// Square：中心、边长与旋转
{
  const c = { x: 112, y: 84 }
  const rot = 0.3
  const g: ShapeGeometry = { centerX: c.x, centerY: c.y, size: 76, rotation: rot }
  const bl = rotatePoint({ x: c.x - 38, y: c.y + 38 }, c, rot)
  const br = rotatePoint({ x: c.x + 38, y: c.y + 38 }, c, rot)
  const mid = rotatePoint({ x: c.x, y: c.y + 56 }, c, rot)
  PANELS.push({
    type: 3, name: 'Square', fields: 'centerX/Y、size、rotation', d: shapePath(3, g),
    guides: `${arc(c, 66, rot)} M${c.x} ${c.y} L${P(rotatePoint({ x: c.x + 66, y: c.y }, c, rot))}`,
    dashed: `M${c.x} ${c.y} H${c.x + 72}`,
    dots: [c, bl, br],
    labels: [
      { x: mid.x, y: mid.y + 6, text: 'size', anchor: 'middle', rotate: deg(rot), field: true },
      { x: 216, y: 122, text: 'rotation', anchor: 'end', field: true },
    ],
  })
}

// Ellipse：中心、宽高与旋转
{
  const c = { x: 100, y: 84 }
  const rot = 0.32
  const g: ShapeGeometry = { centerX: c.x, centerY: c.y, width: 150, height: 78, rotation: rot }
  const a0 = rotatePoint({ x: c.x - 75, y: c.y }, c, rot)
  const a1 = rotatePoint({ x: c.x + 75, y: c.y }, c, rot)
  const b0 = rotatePoint({ x: c.x, y: c.y - 39 }, c, rot)
  const b1 = rotatePoint({ x: c.x, y: c.y + 39 }, c, rot)
  const wl = rotatePoint({ x: c.x - 38, y: c.y - 7 }, c, rot)
  const hl = rotatePoint({ x: c.x + 7, y: c.y + 22 }, c, rot)
  PANELS.push({
    type: 4, name: 'Ellipse', fields: 'centerX/Y、width、height、rotation', d: shapePath(4, g),
    guides: `M${P(a0)} L${P(a1)} M${P(b0)} L${P(b1)} ${arc(c, 58, rot)}`,
    dashed: `M${c.x} ${c.y} H${c.x + 92}`,
    dots: [c],
    labels: [
      { x: wl.x, y: wl.y, text: 'width', anchor: 'middle', rotate: deg(rot), field: true },
      { x: hl.x, y: hl.y, text: 'height', anchor: 'start', rotate: deg(rot), field: true },
      { x: 216, y: c.y - 16, text: 'rotation', anchor: 'end', field: true },
    ],
  })
}

// Circle：圆心与半径
{
  const c = { x: 110, y: 72 }
  const g: ShapeGeometry = { centerX: c.x, centerY: c.y, radius: 50 }
  PANELS.push({
    type: 5, name: 'Circle', fields: 'centerX/Y、radius', d: shapePath(5, g),
    guides: `M${c.x} ${c.y} H${c.x + 50}`,
    dots: [c],
    labels: [
      { x: c.x + 25, y: c.y - 7, text: 'radius', anchor: 'middle', field: true },
      { x: c.x, y: c.y + 74, text: '(centerX, centerY)', anchor: 'middle', field: true },
    ],
  })
}

// 按 shapeType 排序：Line、Polyline、Rectangle、Square、Ellipse、Circle、Polygon
PANELS.sort((a, b) => a.type - b.type)
</script>

<template>
  <UInkFigure
    title="七种几何"
    desc="Shape 的坐标都是 Canvas 绝对坐标；rotation 为弧度、顺时针为正，绕中心旋转。"
  >
    <div class="usg">
      <figure v-for="p in PANELS" :key="p.type" class="uf-panel">
        <svg viewBox="0 0 220 156" role="img" :aria-label="`shapeType ${p.type} ${p.name}：${p.fields}`">
          <path :d="p.d" class="usg-shape" />
          <path v-if="p.guides" :d="p.guides" class="uf-art uf-art--thin" />
          <path v-if="p.dashed" :d="p.dashed" class="uf-art uf-art--thin uf-art--dash" />
          <circle v-for="(d, i) in p.dots" :key="i" :cx="d.x" :cy="d.y" r="2.6" class="usg-dot" />
          <text
            v-for="(l, i) in p.labels"
            :key="`l${i}`"
            :x="l.x"
            :y="l.y"
            :text-anchor="l.anchor ?? 'start'"
            :transform="l.rotate ? `rotate(${num(l.rotate)} ${num(l.x)} ${num(l.y)})` : undefined"
            class="uf-text usg-label"
            :class="{ 'uf-mono': l.field }"
          >{{ l.text }}</text>
        </svg>
        <figcaption class="uf-panel__cap">
          <span class="uf-panel__name"><code class="uf-code">{{ p.type }}</code> {{ p.name }}</span>
          <span>{{ p.fields }}</span>
        </figcaption>
      </figure>
    </div>
  </UInkFigure>
</template>

<style scoped>
.usg {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: 22px 16px;
}

.usg .uf-panel {
  width: 100%;
  max-width: 270px;
}

@container (min-width: 600px) {
  .usg {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  /* 宽栏下限制每格宽度，SVG 标注不随栏宽无限放大 */
  .usg .uf-panel {
    max-width: 250px;
  }
}

.usg-shape {
  fill: none;
  stroke: var(--uink-ink-blue);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.usg-dot {
  fill: var(--uink-text);
}

.usg-label {
  font-size: 13.5px;
}

.uink-fig .uf-panel .uf-panel__cap {
  display: grid;
  gap: 2px;
  justify-items: center;
  margin: 0;
  font-size: 13px;
}
</style>
