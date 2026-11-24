<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'
import { directionAt, nibSize, num, polygonPath, polylinePath, sweepPath, type InkPoint, type Nib, type Point } from '../geometry'

// 1:4 矩形笔尖，width = 28：H = 28，W = 7（common/nib.md「笔尖尺寸」）
const WIDTH = 28
const ASPECT = 0.25
// 先横、再竖、再横：Fixed 时横线粗、竖线细；FollowDirection 时粗细不变
const PATH: InkPoint[] = [
  { x: 24, y: 112, width: WIDTH },
  { x: 100, y: 112, width: WIDTH },
  { x: 100, y: 40, width: WIDTH },
  { x: 196, y: 40, width: WIDTH },
]
const CENTER = polylinePath(PATH)
const SIZE = nibSize(WIDTH, { shape: 1, aspect: ASPECT })

// 矩形笔尖在某点的四个角：宽 W 沿方向 u，高 H 沿 u 的法向
function footprint(c: Point, u: Point): string {
  const v = { x: -u.y, y: u.x }
  const hw = SIZE.width / 2
  const hh = SIZE.height / 2
  const corner = (sw: number, sh: number): Point => ({ x: c.x + u.x * hw * sw + v.x * hh * sh, y: c.y + u.y * hw * sw + v.y * hh * sh })
  return polygonPath([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)])
}

// 拐点处的方向箭头（NIB-8：进入与离开方向的平分方向）
function arrow(c: Point, u: Point, length = 26): string {
  const tip = { x: c.x + u.x * length, y: c.y + u.y * length }
  const n = { x: -u.y, y: u.x }
  const back = (s: number): Point => ({ x: tip.x - u.x * 6 + n.x * 4 * s, y: tip.y - u.y * 6 + n.y * 4 * s })
  const a = back(1)
  const b = back(-1)
  return `M${num(c.x)} ${num(c.y)} L${num(tip.x)} ${num(tip.y)} M${num(a.x)} ${num(a.y)} L${num(tip.x)} ${num(tip.y)} L${num(b.x)} ${num(b.y)}`
}

interface Panel {
  key: string
  name: string
  code: string
  note: string
  nib: Nib
  follow: boolean
}

const PANELS = ([
  { key: 'fixed', name: 'Fixed', code: 'orientation: 0', note: '笔尖不随书写方向转动：横着写粗、竖着写细。', nib: { shape: 1, aspect: ASPECT, orientation: 0 }, follow: false },
  { key: 'follow', name: 'FollowDirection', code: 'orientation: 1', note: '笔尖的宽沿书写方向，粗细基本不变；拐点处取进入与离开方向的平分方向（箭头）。', nib: { shape: 1, aspect: ASPECT, orientation: 1 }, follow: true },
] as Panel[]).map(p => {
  const dirs = PATH.map((_, i) => p.follow ? directionAt(PATH, i) : { x: 1, y: 0 })
  return {
    ...p,
    d: sweepPath(PATH, p.nib),
    feet: PATH.map((pt, i) => footprint(pt, dirs[i])),
    // 只在两个拐点画方向箭头
    arrows: p.follow ? [1, 2].map(i => arrow(PATH[i], dirs[i])) : [],
  }
})
</script>

<template>
  <UInkFigure
    title="笔尖方向"
    :desc="`同一条折线，用 1:4 的矩形笔尖书写（w = ${WIDTH}，笔尖 ${num(SIZE.width)} × ${num(SIZE.height)}）。细线框是笔尖在每个点的位置。`"
  >
    <div class="uno">
      <figure v-for="p in PANELS" :key="p.key" class="uf-panel">
        <svg viewBox="0 0 220 150" role="img" :aria-label="`${p.name}：${p.note}`">
          <path :d="p.d" class="uf-fill-blue uno-ink" fill-rule="nonzero" />
          <path :d="CENTER" class="uf-art uf-art--thin uf-art--dash" />
          <path v-for="(f, i) in p.feet" :key="i" :d="f" class="uno-foot" />
          <path v-for="(a, i) in p.arrows" :key="`a${i}`" :d="a" class="uno-arrow" />
        </svg>
        <figcaption class="uf-panel__cap">
          <span class="uf-panel__name">{{ p.name }}</span>
          <code class="uf-code">{{ p.code }}</code>
          <span>{{ p.note }}</span>
        </figcaption>
      </figure>
    </div>
  </UInkFigure>
</template>

<style scoped>
.uno {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
}

@container (min-width: 520px) {
  .uno {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.uno svg {
  max-width: 340px;
  margin: 0 auto;
}

.uno-ink {
  fill-opacity: 0.55;
}

.uno-foot {
  fill: none;
  stroke: var(--uink-text);
  stroke-width: 1;
}

.uno-arrow {
  fill: none;
  stroke: var(--uink-accent);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 主题会给 figure 内的 figcaption 加居中与字号，这里还原 */
.uink-fig .uf-panel .uf-panel__cap {
  display: grid;
  gap: 4px;
  justify-items: center;
  margin: 0;
  font-size: 13px;
}
</style>
