<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'
import { nibSize, num, type Nib } from '../geometry'

// 四种笔尖取同一个 width = 24（common/nib.md「笔尖尺寸」），图中按 3 倍绘制
const W = 24
const K = 3
const CX = 74
const CY = 60

interface Item {
  key: string
  name: string
  pen: string
  nib?: Nib
  formula: string
}

// 矩形笔尖：width 就是高度 H，W = aspect × H（D20）
const ITEMS: Item[] = [
  { key: 'circle', name: '圆形', pen: '普通笔', formula: '直径 = w' },
  { key: 'hl', name: '矩形 1:8', pen: '荧光笔', nib: { shape: 1, aspect: 0.125 }, formula: 'H = w，W = a × H' },
  { key: 'rect', name: '矩形 2:3', pen: '矩形橡皮', nib: { shape: 1, aspect: 2 / 3 }, formula: 'H = w，W = a × H' },
  { key: 'square', name: '方形 1:1', pen: '方形橡皮', nib: { shape: 1, aspect: 1 }, formula: 'H = w，W = a × H' },
]

const PANELS = ITEMS.map(item => {
  const s = nibSize(W, item.nib)
  const w = s.width * K
  const h = s.height * K
  const x = CX - w / 2
  const y = CY - h / 2
  const value = s.shape === 'circle'
    ? `直径 = ${W}`
    : `W × H = ${num(s.width)} × ${num(s.height)}`
  return { ...item, circle: s.shape === 'circle', x, y, w, h, right: CX + w / 2 + 8, bottom: CY + h / 2 + 8, value }
})
</script>

<template>
  <UInkFigure
    title="笔尖尺寸"
    :desc="`四种笔尖都取 w = ${W}。圆形笔尖 w 是直径；矩形笔尖 w 是高度 H，宽度 W 由 aspect（a = 宽 ÷ 高）算出。`"
  >
    <div class="unz">
      <figure v-for="p in PANELS" :key="p.key" class="uf-panel">
        <svg viewBox="0 0 148 136" role="img" :aria-label="`${p.pen}，${p.name}：${p.value}`">
          <circle v-if="p.circle" :cx="CX" :cy="CY" :r="(W / 2) * K" class="unz-nib" />
          <rect v-else :x="p.x" :y="p.y" :width="p.w" :height="p.h" class="unz-nib" />

          <!-- 尺寸线：圆标直径 w；矩形标 W（下方）与 H（右侧） -->
          <template v-if="p.circle">
            <path :d="`M${CX - (W / 2) * K} ${CY} H${CX + (W / 2) * K}`" class="uf-art uf-art--thin" />
            <text :x="CX" :y="CY - 6" class="uf-text uf-mono unz-label" text-anchor="middle">w</text>
          </template>
          <template v-else>
            <path :d="`M${num(p.x)} ${num(p.bottom)} H${num(p.x + p.w)} M${num(p.x)} ${num(p.bottom - 4)} v8 M${num(p.x + p.w)} ${num(p.bottom - 4)} v8`" class="uf-art uf-art--thin" />
            <text :x="CX" :y="p.bottom + 17" class="uf-text uf-mono unz-label" text-anchor="middle">W</text>
            <path :d="`M${num(p.right)} ${num(p.y)} V${num(p.y + p.h)} M${num(p.right - 4)} ${num(p.y)} h8 M${num(p.right - 4)} ${num(p.y + p.h)} h8`" class="uf-art uf-art--thin" />
            <text :x="p.right + 7" :y="CY + 5" class="uf-text uf-mono unz-label">H</text>
          </template>
        </svg>
        <figcaption class="uf-panel__cap">
          <span class="uf-panel__name">{{ p.pen }} · {{ p.name }}</span>
          <span>{{ p.formula }}</span>
          <span class="unz-value">{{ p.value }}</span>
        </figcaption>
      </figure>
    </div>
  </UInkFigure>
</template>

<style scoped>
.unz {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 16px;
}

@container (min-width: 600px) {
  .unz {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.unz-nib {
  fill: var(--uink-text3);
  fill-opacity: 0.18;
  stroke: var(--uink-text);
  stroke-width: 1.5;
}

.unz-label {
  fill: var(--uink-text);
  font-size: 14px;
}

/* 主题会给 figure 内的 figcaption 加居中与字号，这里还原 */
.uink-fig .uf-panel .uf-panel__cap {
  display: grid;
  gap: 3px;
  justify-items: center;
  margin: 0;
  font-size: 13px;
}

.unz-value {
  color: var(--uink-text);
  font-family: var(--vp-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 12.5px;
}
</style>
