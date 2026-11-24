<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'

// 取 common/color.md 示例：fallback 0xFFCC00，scrgb [1.8, 0.65, 0.1]
const FALLBACK = 0xffcc00
const HEX = `0x${FALLBACK.toString(16).toUpperCase().padStart(6, '0')}`
const RGB = [(FALLBACK >> 16) & 255, (FALLBACK >> 8) & 255, FALLBACK & 255]
const COMPONENTS = [1.8, 0.65, 0.1]

// 分量柱状图：基线 y = 104，每 1.0 高 40；scRGB 的 1.0 是 SDR 白
const BASE = 104
const UNIT = 40
const SDR_Y = BASE - UNIT
const BARS = COMPONENTS.map((v, i) => {
  const x = 36 + i * 52
  const top = BASE - v * UNIT
  return {
    name: 'RGB'[i],
    v,
    x,
    // 1.0 以下与超出 1.0 的部分分开画，超出部分是 HDR 高亮
    low: { y: Math.max(top, SDR_Y), h: BASE - Math.max(top, SDR_Y) },
    high: v > 1 ? { y: top, h: SDR_Y - top } : null,
  }
})
</script>

<template>
  <UInkFigure
    title="HDR 颜色与回退"
    :desc="`同一个 Color Map：完整级读取器在 HDR 屏幕上使用 scrgb 分量，红色分量 1.8 比 SDR 白更亮；其他情况一律使用 fallback ${HEX}（COLOR-2）。`"
  >
    <div class="ucf">
      <div class="uf-panel ucf-panel">
        <span class="uf-panel__name">HDR 屏幕 · 完整级读取器</span>
        <div class="ucf-swatch is-hdr" role="img" aria-label="HDR 黄色的示意色块">
          <span class="ucf-badge">示意</span>
        </div>
        <span class="ucf-fields">
          <code class="uf-code">space: "scrgb"</code>
          <code class="uf-code">components: [{{ COMPONENTS.join(', ') }}]</code>
        </span>
        <svg
          viewBox="0 0 200 128"
          role="img"
          :aria-label="`三个线性分量：R ${COMPONENTS[0]}、G ${COMPONENTS[1]}、B ${COMPONENTS[2]}；虚线是 1.0，即 SDR 白，R 超出这条线的部分是 HDR 高亮`"
        >
          <path :d="`M16 ${BASE} H192`" class="uf-art uf-art--thin" />
          <template v-for="b in BARS" :key="b.name">
            <rect :x="b.x" :y="b.low.y" width="28" :height="b.low.h" class="ucf-bar" />
            <rect v-if="b.high" :x="b.x" :y="b.high.y" width="28" :height="b.high.h" class="ucf-bar is-high" />
            <text :x="b.x + 14" :y="BASE + 18" class="uf-text uf-mono ucf-label" text-anchor="middle">{{ b.name }} {{ b.v }}</text>
          </template>
          <path :d="`M16 ${SDR_Y} H192`" class="uf-art uf-art--thin uf-art--dash" />
          <text x="192" :y="SDR_Y - 7" class="uf-text ucf-label" text-anchor="end">1.0 = SDR 白</text>
        </svg>
        <p class="ucf-note">分量是线性值，超过 1 的部分比 SDR 白更亮；具体怎样映射到屏幕由软件决定（COLOR-4）。网页无法可靠显示 HDR，上面的色块只是示意。</p>
      </div>

      <div class="uf-panel ucf-panel">
        <span class="uf-panel__name">SDR 屏幕 · 完整级以下</span>
        <div class="ucf-swatch" role="img" :aria-label="`回退色 ${HEX}`" />
        <span class="ucf-fields">
          <code class="uf-code">fallback: {{ HEX }}</code>
        </span>
        <p class="ucf-rgb">R {{ RGB[0] }} · G {{ RGB[1] }} · B {{ RGB[2] }}</p>
        <p class="ucf-note">写入器让 <code class="uf-code">fallback</code> 代表这个颜色在 SDR 屏幕上应有的样子（COLOR-1）。缺少 HDR 能力、扩展颜色无效时都用它。</p>
      </div>
    </div>
  </UInkFigure>
</template>

<style scoped>
.ucf {
  /* 示例中 fallback 的取值，是数据本身而不是主题色 */
  --ucf-yellow: #ffcc00;
  display: grid;
  gap: 24px;
}

@container (min-width: 560px) {
  .ucf {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.uink-fig .ucf-panel {
  gap: 10px;
}

.ucf-swatch {
  position: relative;
  height: 72px;
  border: 1px solid var(--uink-line);
  border-radius: 10px;
  background: var(--ucf-yellow);
}

/* HDR 色块：用外发光暗示“更亮”，颜色本身与 fallback 相同 */
.ucf-swatch.is-hdr {
  box-shadow: 0 0 0 3px rgba(255, 204, 0, 0.28), 0 0 22px 4px rgba(255, 204, 0, 0.5);
}

.ucf-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  color: #121212;
  font-size: 12px;
}

.ucf-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 柱状图不随栏宽无限放大；最窄时（约 250px）标签仍不小于 12px */
.ucf svg {
  max-width: 280px;
}

.ucf-bar {
  fill: var(--uink-text3);
  fill-opacity: 0.3;
}

.ucf-bar.is-high {
  fill: var(--uink-accent);
  fill-opacity: 0.55;
}

.ucf-label {
  font-size: 12px;
}

.uink-fig .ucf-rgb {
  margin: 0;
  color: var(--uink-text);
  font-family: var(--vp-font-family-mono, ui-monospace, Consolas, monospace);
  font-size: 13px;
}

.uink-fig .ucf-note {
  margin: 0;
  color: var(--uink-text2);
  font-size: 13px;
  line-height: 1.6;
}
</style>
