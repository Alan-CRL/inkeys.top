<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'

interface Block {
  name: string
  type: number
  sub?: string
  ink?: 'blue' | 'green' | 'yellow' | 'red'
}

// 两个 Canvas 作用域；内容块的颜色只用于区分块类型（Ink 蓝、Shape 绿、Media 黄、Clear 红）
const SCOPES: { canvas: string, blocks: Block[] }[] = [
  {
    canvas: '第 1 页',
    blocks: [
      { name: 'Ink', type: 3, ink: 'blue' },
      { name: 'Shape', type: 5, ink: 'green' },
      { name: 'Media', type: 4, ink: 'yellow' },
    ],
  },
  {
    canvas: '第 2 页',
    blocks: [
      { name: 'Ink', type: 3, ink: 'blue' },
      { name: 'Clear', type: 6, ink: 'red' },
      { name: 'Ink', type: 3, ink: 'blue' },
    ],
  },
]
</script>

<template>
  <UInkFigure
    title="对象流"
    desc="对象一个接一个排列，没有外层数组；内容块属于它前面最近的 Canvas。"
  >
    <ol class="ufs" aria-label="一个 .uink 文件的对象流：Header（Type 0）、Header Extension（Type 1，可选），然后是 Canvas（Type 2）与它后面的内容块 Ink、Shape、Media、Clear（Type 3 至 6），每个 Canvas 的作用域到下一个 Canvas 为止，最后是文件结尾。">
      <li class="ufs-item">
        <span class="ufs-block">
          <span class="ufs-name">Header</span>
          <code class="uf-code">Type 0</code>
          <span class="ufs-sub">身份与版本</span>
        </span>
      </li>
      <li class="ufs-item">
        <span class="ufs-arrow" aria-hidden="true"><svg viewBox="0 0 20 12"><path d="M1 6 H18 M13 1.5 L18 6 L13 10.5" /></svg></span>
        <span class="ufs-block ufs-block--optional">
          <span class="ufs-name">Header Extension</span>
          <code class="uf-code">Type 1</code>
          <span class="ufs-sub">屏幕、场景 · 可选</span>
        </span>
      </li>
      <li v-for="(scope, i) in SCOPES" :key="i" class="ufs-item ufs-item--scope">
        <span class="ufs-arrow" aria-hidden="true"><svg viewBox="0 0 20 12"><path d="M1 6 H18 M13 1.5 L18 6 L13 10.5" /></svg></span>
        <div class="ufs-scope">
          <ol class="ufs-scope__list">
            <li class="ufs-scope__item">
              <span class="ufs-block ufs-block--canvas">
                <span class="ufs-name">Canvas</span>
                <code class="uf-code">Type 2</code>
                <span class="ufs-sub">{{ scope.canvas }}</span>
              </span>
            </li>
            <li v-for="(block, j) in scope.blocks" :key="j" class="ufs-scope__item">
              <span class="ufs-block ufs-block--content" :data-ink="block.ink">
                <span class="ufs-name">{{ block.name }}</span>
                <code class="uf-code">Type {{ block.type }}</code>
              </span>
            </li>
          </ol>
          <span class="ufs-scope__label">{{ scope.canvas }}的作用域：到下一个 Canvas 为止</span>
        </div>
      </li>
      <li class="ufs-item">
        <span class="ufs-arrow" aria-hidden="true"><svg viewBox="0 0 20 12"><path d="M1 6 H18 M13 1.5 L18 6 L13 10.5" /></svg></span>
        <span class="ufs-more" aria-label="更多 Canvas 与内容块">……</span>
      </li>
      <li class="ufs-item">
        <span class="ufs-arrow" aria-hidden="true"><svg viewBox="0 0 20 12"><path d="M1 6 H18 M13 1.5 L18 6 L13 10.5" /></svg></span>
        <span class="ufs-block ufs-block--eof">
          <span class="ufs-name">文件结尾</span>
          <span class="ufs-sub">EOF</span>
        </span>
      </li>
    </ol>
  </UInkFigure>
</template>

<style scoped>
.ufs,
.ufs-scope__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 宽栏：横向排列，自动换行，项与项之间用箭头连接 */
.ufs {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 0;
  align-items: flex-start;
}

.uink-fig .ufs-item {
  display: flex;
  align-items: flex-start;
  margin: 0;
}

.ufs-arrow {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 52px;
}

.ufs-arrow svg {
  width: 20px;
  height: 12px;
}

.ufs-arrow path {
  fill: none;
  stroke: var(--uink-stroke);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ufs-block {
  display: grid;
  gap: 2px;
  justify-items: start;
  min-height: 52px;
  padding: 7px 11px;
  border: 1.5px solid var(--uink-stroke);
  border-radius: 10px;
  background: var(--uink-paper);
}

.ufs-block--optional {
  border-style: dashed;
}

.ufs-block--canvas {
  border-color: var(--uink-text3);
  background: var(--uink-surface);
}

.ufs-block--content {
  min-height: 0;
  padding-left: 14px;
  border-width: 1px;
  border-color: var(--uink-line);
  /* 左侧色条区分块类型 */
  background:
    linear-gradient(var(--ufs-ink), var(--ufs-ink)) left / 4px 100% no-repeat,
    var(--uink-paper);
}

.ufs-block--content[data-ink='blue'] { --ufs-ink: var(--uink-ink-blue); }
.ufs-block--content[data-ink='green'] { --ufs-ink: var(--uink-ink-green); }
.ufs-block--content[data-ink='yellow'] { --ufs-ink: var(--uink-ink-yellow); }
.ufs-block--content[data-ink='red'] { --ufs-ink: var(--uink-ink-red); }

.ufs-block--eof {
  border-style: dotted;
  background: transparent;
}

.ufs-name {
  color: var(--uink-text);
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
}

.ufs-sub {
  color: var(--uink-text2);
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
}

.ufs-more {
  display: flex;
  align-items: center;
  height: 52px;
  color: var(--uink-text3);
  font-size: 15px;
  letter-spacing: 0.1em;
}

/* Canvas 作用域：底部的括号与说明 */
.ufs-scope {
  display: grid;
  gap: 4px;
}

.ufs-scope__list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: stretch;
}

.uink-fig .ufs-scope__item {
  display: flex;
  margin: 0;
}

.ufs-scope__label {
  position: relative;
  padding-top: 12px;
  color: var(--uink-text2);
  font-size: 12px;
  line-height: 1.4;
}

.ufs-scope__label::before {
  content: '';
  position: absolute;
  top: 2px;
  right: 0;
  left: 0;
  height: 7px;
  border: 1.5px solid var(--uink-stroke);
  border-top: 0;
  border-radius: 0 0 6px 6px;
}

/* 窄栏：纵向排列，箭头朝下 */
@container (max-width: 560px) {
  .ufs {
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 0;
  }

  .uink-fig .ufs-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .ufs-arrow {
    width: 24px;
    height: 22px;
    transform: rotate(90deg);
  }

  .ufs-more {
    height: auto;
    padding-left: 6px;
  }
}
</style>
