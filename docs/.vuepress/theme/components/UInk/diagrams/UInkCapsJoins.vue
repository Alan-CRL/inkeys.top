<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'
import {
  CAP_BUTT,
  CAP_ROUND,
  CAP_SQUARE,
  JOIN_BEVEL,
  JOIN_MITER,
  JOIN_ROUND,
  polylinePath,
  strokeOutline,
  type Point,
} from '../geometry'

const CAP_W = 28
const CAP_LINE: Point[] = [{ x: 46, y: 48 }, { x: 114, y: 48 }]
const JOIN_W = 22
const JOIN_LINE: Point[] = [{ x: 30, y: 76 }, { x: 80, y: 30 }, { x: 130, y: 76 }]

const CAPS = [
  { value: CAP_ROUND, name: 'Round', text: '端点处加半圆' },
  { value: CAP_SQUARE, name: 'Square', text: '向外延伸半个宽度' },
  { value: CAP_BUTT, name: 'Butt', text: '在端点处截止' },
].map(c => ({ ...c, d: strokeOutline(CAP_LINE, CAP_W, c.value) }))

// 拐角只用于 Shape 描边；端帽用 Butt，让图中只看到拐角的差别
const JOINS = [
  { value: JOIN_ROUND, name: 'Round', text: '圆角' },
  { value: JOIN_MITER, name: 'Miter', text: '尖角' },
  { value: JOIN_BEVEL, name: 'Bevel', text: '斜切角' },
].map(j => ({ ...j, d: strokeOutline(JOIN_LINE, JOIN_W, CAP_BUTT, j.value) }))

const CAP_CENTER = polylinePath(CAP_LINE)
const JOIN_CENTER = polylinePath(JOIN_LINE)
</script>

<template>
  <UInkFigure
    title="端帽与拐角"
    desc="蓝色是描边覆盖的区域，虚线是中心线，竖虚线标出端点的位置。缺省时端帽与拐角都是 Round（NIB-3、NIB-4）；Ink 的端帽只对圆形笔尖有效。Miter 的尖角超过描边宽度的 4 倍时退回斜切（SHAPE-10）。"
  >
    <div class="ucj">
      <div class="ucj-group">
        <div class="ucj-head"><code class="uf-code">cap</code> / <code class="uf-code">lineCap</code> 端帽</div>
        <div class="ucj-grid">
          <figure v-for="c in CAPS" :key="c.name" class="uf-panel">
            <svg viewBox="0 0 160 96" role="img" :aria-label="`端帽 ${c.value} ${c.name}：${c.text}`">
              <path :d="c.d" class="uf-fill-blue ucj-ink" />
              <path :d="`M${CAP_LINE[0].x} 14 V82 M${CAP_LINE[1].x} 14 V82`" class="uf-art uf-art--thin uf-art--dash" />
              <path :d="CAP_CENTER" class="ucj-center" />
              <circle v-for="(p, i) in CAP_LINE" :key="i" :cx="p.x" :cy="p.y" r="2.6" class="ucj-dot" />
            </svg>
            <figcaption class="uf-panel__cap">
              <span class="uf-panel__name"><code class="uf-code">{{ c.value }}</code> {{ c.name }}</span>
              <span>{{ c.text }}</span>
            </figcaption>
          </figure>
        </div>
      </div>

      <div class="ucj-group">
        <div class="ucj-head"><code class="uf-code">lineJoin</code> 拐角（只用于 Shape 描边）</div>
        <div class="ucj-grid">
          <figure v-for="j in JOINS" :key="j.name" class="uf-panel">
            <svg viewBox="0 0 160 96" role="img" :aria-label="`拐角 ${j.value} ${j.name}：${j.text}`">
              <path :d="j.d" class="uf-fill-blue ucj-ink" />
              <path :d="JOIN_CENTER" class="ucj-center" />
              <circle :cx="JOIN_LINE[1].x" :cy="JOIN_LINE[1].y" r="2.6" class="ucj-dot" />
            </svg>
            <figcaption class="uf-panel__cap">
              <span class="uf-panel__name"><code class="uf-code">{{ j.value }}</code> {{ j.name }}</span>
              <span>{{ j.text }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  </UInkFigure>
</template>

<style scoped>
.ucj {
  display: grid;
  gap: 24px;
}

.ucj-group {
  display: grid;
  gap: 12px;
}

.ucj-head {
  color: var(--uink-text);
  font-size: 14px;
  font-weight: 600;
}

.ucj-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 12px;
}

.ucj-ink {
  fill-opacity: 0.8;
}

.ucj-center {
  fill: none;
  stroke: var(--uink-paper);
  stroke-width: 1.2;
  stroke-dasharray: 3 3;
}

.ucj-dot {
  fill: var(--uink-paper);
  stroke: var(--uink-text);
  stroke-width: 1.2;
}

.uink-fig .uf-panel .uf-panel__cap {
  display: grid;
  gap: 2px;
  justify-items: center;
  margin: 0;
  font-size: 13px;
}
</style>
