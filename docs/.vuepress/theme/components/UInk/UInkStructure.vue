<script setup lang="ts">
import './uink.css'

interface Node {
  name: string
  tag: string
  desc: string
  icon: string
}

// 图标是静态的线稿，只有“内容”一项带墨迹颜色；字符串为本文件内的常量。
const NODES: Node[] = [
  {
    name: '一个文件',
    tag: '.uink',
    desc: '全部页面与笔迹',
    icon: '<path class="art" d="M10 4 H26 L34 12 V36 Q34 38 32 38 H10 Q8 38 8 36 V6 Q8 4 10 4 Z M26 4 V12 H34" />',
  },
  {
    name: '场景',
    tag: 'Workspace',
    desc: '白板、PPT、屏幕批注',
    icon: '<rect class="art" x="4" y="8" width="24" height="17" rx="2" /><rect class="art" x="14" y="17" width="24" height="17" rx="2" /><path class="art" d="M18 22 H30 M18 27 H26" />',
  },
  {
    name: '页面',
    tag: 'pageGuid',
    desc: '白板的每一页、PPT 的每张幻灯片',
    icon: '<rect class="art" x="12" y="4" width="22" height="28" rx="2" /><path class="art" d="M8 9 V34 Q8 36 10 36 H28" /><path class="art" d="M4 14 V38 Q4 40 6 40 H22" />',
  },
  {
    name: '屏幕',
    tag: 'Device',
    desc: '每块屏幕各存一份',
    icon: '<rect class="art" x="3" y="8" width="20" height="14" rx="1.5" /><rect class="art" x="21" y="14" width="18" height="13" rx="1.5" /><path class="art" d="M10 27 H16 M13 22 V27 M27 32 H33 M30 27 V32" />',
  },
  {
    name: '图层',
    tag: 'layerIndex',
    desc: '从下往上叠加',
    icon: '<path class="art" d="M21 6 L37 14 L21 22 L5 14 Z" /><path class="art" d="M5 21 L21 29 L37 21" /><path class="art" d="M5 28 L21 36 L37 28" />',
  },
  {
    name: '内容',
    tag: 'Ink · Shape · Media',
    desc: '笔迹、图形、图片与 PDF',
    icon: '<rect class="art" x="22" y="6" width="16" height="12" rx="1.5" /><path class="art" d="M24 16 L29 11 L32 14 L34 12 L38 16" /><path class="ink ink--blue" d="M4 30 C8 20 12 20 12 28 C12 34 18 34 20 26" /><rect class="ink ink--green" x="24" y="25" width="13" height="11" rx="2" /><path class="ink ink--yellow" d="M3 38 H20" />',
  },
]
</script>

<template>
  <figure class="uink-c uink-structure">
    <ol class="uink-structure__list" aria-label="一个 .uink 文件的结构：文件、场景、页面、屏幕、图层、内容，逐层展开">
      <li v-for="node in NODES" :key="node.name" class="uink-structure__node">
        <svg class="uink-structure__icon" viewBox="0 0 42 42" aria-hidden="true" v-html="node.icon" />
        <span class="uink-structure__text">
          <span class="uink-structure__name">{{ node.name }}</span>
          <code class="uink-structure__tag">{{ node.tag }}</code>
          <span class="uink-structure__desc">{{ node.desc }}</span>
        </span>
      </li>
    </ol>
  </figure>
</template>

<style scoped>
.uink-structure {
  container-type: inline-size;
  margin: 24px 0;
}

/* 窄栏：纵向排列，图标在左，用竖线连接 */
.uink-structure__list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 20px;
  border: 1px solid var(--uink-line);
  border-radius: var(--uink-r-media);
  background: var(--uink-paper);
  list-style: none;
}

.uink-structure__node {
  position: relative;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin: 0;
  padding: 0 0 18px;
}

.uink-structure__node:last-child {
  padding-bottom: 0;
}

.uink-structure__node + .uink-structure__node {
  margin-top: 0;
}

/* 连接线：从图标下方连到下一项 */
.uink-structure__node:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 48px;
  bottom: 4px;
  left: 21px;
  border-left: 1.5px solid var(--uink-line);
}

.uink-structure__icon {
  flex: none;
  width: 42px;
  height: 42px;
  overflow: visible;
}

.uink-structure__text {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  align-items: baseline;
  padding-top: 2px;
}

.uink-structure__name {
  color: var(--uink-text);
  font-size: 15px;
  font-weight: 600;
}

.uink-structure__tag.uink-structure__tag {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--uink-surface);
  color: var(--uink-text2);
  font-size: 12px;
}

.uink-structure__desc {
  flex-basis: 100%;
  color: var(--uink-text2);
  font-size: 14px;
  line-height: 1.6;
}

/* 宽栏：六项横排，箭头连接 */
@container (min-width: 640px) {
  .uink-structure__list {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
    padding: 28px 20px;
  }

  .uink-structure__node {
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 0;
    text-align: center;
  }

  .uink-structure__node:not(:last-child)::after {
    top: 21px;
    bottom: auto;
    left: calc(50% + 30px);
    width: calc(100% - 48px);
    height: 0;
    border-left: 0;
    border-top: 1.5px solid var(--uink-line);
  }

  /* 横排时改用网格：flex 纵向排列里 flex-basis 会变成高度，说明文字无法换行 */
  .uink-structure__text {
    display: grid;
    justify-items: center;
    gap: 4px;
    width: 100%;
    padding-top: 0;
  }

  .uink-structure__desc {
    max-width: 100%;
  }
}

.uink-structure__icon :deep(.art) {
  fill: none;
  stroke: var(--uink-stroke);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.uink-structure__icon :deep(.ink) {
  fill: none;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.uink-structure__icon :deep(.ink--blue) {
  stroke: var(--uink-ink-blue);
}

.uink-structure__icon :deep(.ink--green) {
  stroke: var(--uink-ink-green);
}

.uink-structure__icon :deep(.ink--yellow) {
  stroke: var(--uink-ink-yellow);
  stroke-width: 5;
  stroke-linecap: butt;
  opacity: 0.6;
}
</style>
