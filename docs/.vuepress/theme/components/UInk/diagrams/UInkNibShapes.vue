<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'
import { nibSize, num, polylinePath, sweepPath, type InkPoint, type Nib } from '../geometry'

// 同一条路径、同一个 width，只换笔尖：横、斜、竖三段，方便看出 Fixed 矩形不随书写方向转动
const WIDTH = 24
const PATH: InkPoint[] = [
  { x: 24, y: 84, width: WIDTH },
  { x: 80, y: 84, width: WIDTH },
  { x: 126, y: 36, width: WIDTH },
  { x: 126, y: 92, width: WIDTH },
  { x: 160, y: 92, width: WIDTH },
]

interface Item {
  key: string
  name: string
  pen: string
  nib?: Nib
  fill: string
  fields: string[]
}

// 取值见 common/nib.md「Inkeys 的取值」；矩形笔尖缺少 cap 时按 Butt（NIB-3）
const ITEMS: Item[] = [
  { key: 'circle', name: '圆形', pen: '普通笔', fill: 'uf-fill-blue', fields: ['shape: 0', 'cap: Round'] },
  { key: 'hl', name: '1:8 竖直矩形', pen: '荧光笔', nib: { shape: 1, aspect: 0.125, orientation: 0 }, fill: 'uf-fill-yellow unb-hl', fields: ['aspect: 0.125', 'Butt'] },
  { key: 'rect', name: '2:3 矩形', pen: '矩形橡皮', nib: { shape: 1, aspect: 2 / 3, orientation: 0 }, fill: 'uf-fill-eraser', fields: ['aspect: 2/3', 'Butt'] },
  { key: 'square', name: '1:1 方形', pen: '方形橡皮', nib: { shape: 1, aspect: 1, orientation: 0 }, fill: 'uf-fill-eraser', fields: ['aspect: 1', 'Butt'] },
]

const CENTER = polylinePath(PATH)

const PANELS = ITEMS.map(item => {
  const size = nibSize(WIDTH, item.nib)
  const start = PATH[0]
  // 起点处画出笔尖本身的轮廓
  const footprint = size.shape === 'circle'
    ? { circle: true, x: start.x, y: start.y, r: size.width / 2 }
    : { circle: false, x: start.x - size.width / 2, y: start.y - size.height / 2, w: size.width, h: size.height }
  const dims = size.shape === 'circle'
    ? `直径 ${WIDTH}`
    : `${num(size.width)} × ${num(size.height)}`
  return { ...item, d: sweepPath(PATH, item.nib), footprint, dims }
})
</script>

<template>
  <UInkFigure
    title="四种笔尖"
    :desc="`同一条路径、同一个 width = ${WIDTH}，换用不同的笔尖。Fixed 矩形不随书写方向转动，所以荧光笔写横线粗、写竖线细。`"
  >
    <div class="unb">
      <figure v-for="p in PANELS" :key="p.key" class="uf-panel">
        <svg viewBox="0 0 184 124" role="img" :aria-label="`${p.pen}：${p.name}笔尖（${p.dims}）沿同一路径扫过的形状`">
          <path :d="p.d" :class="p.fill" fill-rule="nonzero" />
          <path :d="CENTER" class="uf-art uf-art--thin uf-art--dash" />
          <circle v-if="p.footprint.circle" :cx="p.footprint.x" :cy="p.footprint.y" :r="p.footprint.r" class="unb-nib" />
          <rect v-else :x="p.footprint.x" :y="p.footprint.y" :width="p.footprint.w" :height="p.footprint.h" class="unb-nib" />
        </svg>
        <figcaption class="uf-panel__cap">
          <span class="uf-panel__name">{{ p.pen }} · {{ p.name }}</span>
          <span class="unb-fields">
            <code v-for="f in p.fields" :key="f" class="uf-code">{{ f }}</code>
          </span>
          <span class="unb-dims">笔尖 {{ p.dims }}</span>
        </figcaption>
      </figure>
    </div>
  </UInkFigure>
</template>

<style scoped>
.unb {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 16px;
}

@container (min-width: 600px) {
  .unb {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.unb-hl {
  fill-opacity: 0.6;
}

.unb-nib {
  fill: none;
  stroke: var(--uink-text);
  stroke-width: 1.2;
}

/* 主题会给 figure 内的 figcaption 加居中与字号，这里还原 */
.uink-fig .uf-panel .uf-panel__cap {
  display: grid;
  gap: 4px;
  justify-items: center;
  margin: 0;
  font-size: 13px;
}

.unb-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.unb-dims {
  font-size: 12.5px;
}
</style>
