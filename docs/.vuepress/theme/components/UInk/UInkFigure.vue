<script setup lang="ts">
import './uink.css'

// 规范图示的外框：标题、一句说明、内容区，以及可选的控件区与读数区。
defineProps<{
  title: string
  desc?: string
}>()
</script>

<template>
  <figure class="uink-c uink-fig">
    <figcaption class="uink-fig__head">
      <span class="uink-fig__title">{{ title }}</span>
      <span v-if="desc" class="uink-fig__desc">{{ desc }}</span>
    </figcaption>
    <div class="uink-fig__body">
      <slot />
    </div>
    <div v-if="$slots.controls" class="uink-fig__controls">
      <slot name="controls" />
    </div>
  </figure>
</template>

<style>
/*
 * 图示共用样式（不加 scoped：图示内容写在各自组件的插槽里）。
 * 全部挂在 .uink-fig 下，并提高选择器优先级，盖过主题对 figure、figcaption、code、列表的文档样式。
 */
.uink-c.uink-fig {
  display: block;
  width: auto;
  margin: 24px 0;
  text-align: left;
  container-type: inline-size;
}

.uink-fig .uink-fig__head {
  display: block;
  width: auto;
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.6;
  text-align: left;
}

.uink-fig__title {
  margin-right: 0.6em;
  color: var(--uink-text);
  font-size: 15px;
  font-weight: 600;
}

.uink-fig__desc {
  color: var(--uink-text2);
}

.uink-fig__body {
  overflow: hidden;
  padding: 20px;
  border: 1px solid var(--uink-line);
  border-radius: var(--uink-r-media);
  background: var(--uink-paper);
}

@container (max-width: 520px) {
  .uink-fig__body {
    padding: 14px 12px;
  }
}

.uink-fig__body svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.uink-fig__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  align-items: center;
  margin-top: 12px;
}

/* ---------- 线稿与墨迹 ---------- */

.uink-fig .uf-art {
  fill: none;
  stroke: var(--uink-stroke);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.uink-fig .uf-art--thin {
  stroke-width: 1;
}

.uink-fig .uf-art--dash {
  stroke-dasharray: 4 4;
}

.uink-fig .uf-text {
  fill: var(--uink-text2);
  font-family: inherit;
  font-size: 14px;
}

.uink-fig .uf-mono {
  font-family: var(--vp-font-family-mono, ui-monospace, 'Cascadia Code', Consolas, monospace);
}

.uink-fig .uf-fill-blue { fill: var(--uink-ink-blue); }
.uink-fig .uf-fill-red { fill: var(--uink-ink-red); }
.uink-fig .uf-fill-green { fill: var(--uink-ink-green); }
.uink-fig .uf-fill-yellow { fill: var(--uink-ink-yellow); }
.uink-fig .uf-stroke-blue { stroke: var(--uink-ink-blue); }
.uink-fig .uf-stroke-red { stroke: var(--uink-ink-red); }
.uink-fig .uf-stroke-green { stroke: var(--uink-ink-green); }

/* 橡皮扫过的区域：中性灰，不是墨迹 */
.uink-fig .uf-fill-eraser {
  fill: var(--uink-text3);
  fill-opacity: 0.35;
}

/* ---------- 面板（小图 + 说明） ---------- */

.uink-fig .uf-panel {
  display: grid;
  gap: 8px;
  align-content: start;
  min-width: 0;
  margin: 0;
}

.uink-fig .uf-panel__cap {
  color: var(--uink-text2);
  font-size: 13px;
  line-height: 1.55;
  text-align: center;
}

.uink-fig .uf-panel__name {
  display: block;
  color: var(--uink-text);
  font-weight: 600;
}

/* 行内代码：字段名与取值 */
.uink-fig code.uf-code {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--uink-surface);
  color: var(--uink-text2);
  font-family: var(--vp-font-family-mono, ui-monospace, 'Cascadia Code', Consolas, monospace);
  font-size: 12.5px;
  white-space: nowrap;
}

/* ---------- 控件 ---------- */

.uink-fig .uf-btn {
  height: 34px;
  padding: 0 16px;
  border: 1px solid var(--uink-line);
  border-radius: 999px;
  background: var(--uink-surface);
  color: var(--uink-text);
  font: inherit;
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 160ms var(--uink-ease), color 160ms var(--uink-ease);
}

.uink-fig .uf-btn:hover:not(:disabled, [aria-disabled='true']) {
  background: var(--uink-surface-hover);
}

.uink-fig .uf-btn:disabled,
.uink-fig .uf-btn[aria-disabled='true'] {
  color: var(--uink-text3);
  cursor: default;
  opacity: 0.6;
}

.uink-fig .uf-btn[aria-pressed='true'],
.uink-fig .uf-btn.is-active {
  border-color: var(--uink-text3);
  background: var(--uink-paper);
  font-weight: 600;
}

.uink-fig .uf-btn:focus-visible,
.uink-fig .uf-range input:focus-visible,
.uink-fig [tabindex]:focus-visible {
  outline: 2px solid var(--uink-accent);
  outline-offset: 2px;
}

.uink-fig .uf-range {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 4.2em;
  gap: 10px;
  align-items: center;
  min-width: 0;
  color: var(--uink-text2);
  font-size: 13px;
}

/* 滑块：去掉浏览器原生配色，与页面的中性灰和黑色主按钮一致。
   已选部分 = 正文色，空白部分 = 浅灰；Chromium 用 --uf-fill（由组件按当前值传入百分比）画渐变，Firefox 用 ::-moz-range-progress。 */
.uink-fig .uf-range input {
  --uf-fill: 50%;
  width: 100%;
  min-width: 0;
  height: 20px;
  margin: 0;
  background: transparent;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}

.uink-fig .uf-range input::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(to right, var(--uink-text) var(--uf-fill), var(--uink-surface-hover) var(--uf-fill));
}

.uink-fig .uf-range input::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: var(--uink-surface-hover);
}

.uink-fig .uf-range input::-moz-range-progress {
  height: 4px;
  border-radius: 999px;
  background: var(--uink-text);
}

.uink-fig .uf-range input::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border: 2px solid var(--uink-text);
  border-radius: 50%;
  background: var(--uink-bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  transition: transform 120ms var(--uink-ease);
  -webkit-appearance: none;
}

.uink-fig .uf-range input::-moz-range-thumb {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  border: 2px solid var(--uink-text);
  border-radius: 50%;
  background: var(--uink-bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  transition: transform 120ms var(--uink-ease);
}

.uink-fig .uf-range input:hover::-webkit-slider-thumb,
.uink-fig .uf-range input:active::-webkit-slider-thumb {
  transform: scale(1.12);
}

.uink-fig .uf-range input:hover::-moz-range-thumb,
.uink-fig .uf-range input:active::-moz-range-thumb {
  transform: scale(1.12);
}

@media (prefers-reduced-motion: reduce) {
  .uink-fig .uf-range input::-webkit-slider-thumb,
  .uink-fig .uf-range input::-moz-range-thumb {
    transition: none;
  }
}

.uink-fig .uf-range output {
  color: var(--uink-text);
  font-family: var(--vp-font-family-mono, ui-monospace, 'Cascadia Code', Consolas, monospace);
  font-size: 13px;
  text-align: right;
}

/* 读数：交互状态的文字说明，同时供读屏软件播报 */
.uink-fig .uf-readout {
  margin: 0;
  color: var(--uink-text2);
  font-size: 14px;
  line-height: 1.7;
}

.uink-fig .uf-readout strong {
  color: var(--uink-text);
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .uink-fig *,
  .uink-fig *::before,
  .uink-fig *::after {
    transition: none !important;
    animation: none !important;
  }
}
</style>
