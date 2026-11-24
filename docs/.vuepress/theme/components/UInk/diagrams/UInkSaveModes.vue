<script setup lang="ts">
import UInkFigure from '../UInkFigure.vue'

type Tag = '追加' | '被替代' | '不修改' | '重新计算'

interface Chip {
  name: string
  // block：内容块，画得小一些，跟在它所属的 Canvas 后面
  block?: boolean
  tag?: Tag
}

interface Mode {
  title: string
  rules: string
  text: string
  chips: Chip[]
  // 完整保存：整个文件作为一个整体替换原文件
  whole?: boolean
}

const MODES: Mode[] = [
  {
    title: '完整保存',
    rules: 'SAVE-1、SAVE-2',
    text: '先写一个临时文件，校验后整体替换原文件。新文件是紧凑的，Header 中的统计重新计算。',
    chips: [{ name: 'Header', tag: '重新计算' }, { name: 'P1' }, { name: 'P2′' }, { name: 'P3' }],
    whole: true,
  },
  {
    title: '向最后一个 Canvas 追加',
    rules: 'SAVE-6–SAVE-8',
    text: '每抬一次笔，把这一笔作为完整的块追加到文件末尾，它属于最后一个 Canvas（第 3 页）。前面的内容一个字节都不动。',
    chips: [
      { name: 'Header', tag: '不修改' },
      { name: 'P1' },
      { name: 'P2' },
      { name: 'P3 Canvas' },
      { name: 'Ink', block: true },
      { name: 'Ink', block: true, tag: '追加' },
    ],
  },
  {
    title: '按页追加',
    rules: 'SAVE-10、SAVE-15',
    text: '第 2 页改动后，把它的完整新版本 P2′ 追加到末尾。旧的 P2 仍留在文件里，但不再显示，下次整理时移除。',
    chips: [
      { name: 'Header', tag: '不修改' },
      { name: 'P1' },
      { name: 'P2', tag: '被替代' },
      { name: 'P3' },
      { name: 'P2′', tag: '追加' },
    ],
  },
]

const chipText = (c: Chip) => `${c.name}${c.tag ? `（${c.tag}）` : ''}`
</script>

<template>
  <UInkFigure
    title="三种保存方式"
    desc="完整保存重写整个文件；两种增量写入都只在文件末尾追加完整的块，Header 保持上次完整保存时的样子。"
  >
    <div class="usm">
      <div class="usm-axis" aria-hidden="true">
        <span>文件开头</span>
        <svg viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 H99" /></svg>
        <span>文件末尾</span>
      </div>

      <ol class="usm-list">
        <li v-for="(m, i) in MODES" :key="i" class="usm-mode">
          <div class="usm-info">
            <span class="usm-title">{{ m.title }}</span>
            <span class="usm-rule">{{ m.rules }}</span>
            <span class="usm-text">{{ m.text }}</span>
          </div>

          <div class="usm-file" :class="{ 'is-whole': m.whole }">
            <span v-if="m.whole" class="usm-whole">整个文件替换</span>
            <ol class="usm-chips" :aria-label="`保存后文件中的对象：${m.chips.map(chipText).join('、')}`">
              <li
                v-for="(c, j) in m.chips"
                :key="j"
                class="usm-chip"
                :class="{
                  'is-block': c.block,
                  'is-header': c.name === 'Header',
                  'is-old': c.tag === '被替代',
                  'is-new': c.tag === '追加',
                }"
              >
                <span class="usm-chip__name">{{ c.name }}</span>
                <span v-if="c.tag" class="usm-chip__tag">{{ c.tag }}</span>
              </li>
            </ol>
          </div>
        </li>
      </ol>

      <p class="usm-note">P1、P2、P3 各代表一页：一个 Canvas 及跟在它后面的内容块。</p>
    </div>
  </UInkFigure>
</template>

<style scoped>
.usm {
  display: grid;
  gap: 14px;
}

.usm-list,
.usm-chips {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 文件方向：左边是开头，右边是末尾 */
.usm-axis {
  display: none;
  gap: 8px;
  align-items: center;
  color: var(--uink-text3);
  font-size: 12px;
}

.usm-axis svg {
  flex: 1;
  height: 10px;
}

.usm-axis path {
  fill: none;
  stroke: var(--uink-stroke);
  stroke-width: 1;
  stroke-dasharray: 3 3;
  vector-effect: non-scaling-stroke;
}

.uink-fig .usm-mode {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 14px 0;
  border-top: 1px solid var(--uink-line);
}

.uink-fig .usm-mode:first-child {
  border-top: 0;
  padding-top: 0;
}

.usm-info {
  display: grid;
  gap: 2px;
}

.usm-title {
  color: var(--uink-text);
  font-size: 14px;
  font-weight: 600;
}

.usm-rule {
  color: var(--uink-text3);
  font-size: 12px;
}

.usm-text {
  color: var(--uink-text2);
  font-size: 13px;
  line-height: 1.6;
}

.usm-file {
  display: grid;
  gap: 6px;
  justify-items: start;
}

/* 完整保存：整个新文件框在一起 */
.usm-file.is-whole {
  justify-self: start;
  padding: 8px 10px 10px;
  border: 1.5px solid var(--uink-accent);
  border-radius: 12px;
}

.usm-whole {
  color: var(--uink-accent);
  font-size: 12px;
  font-weight: 600;
}

.usm-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: stretch;
}

.uink-fig .usm-chip {
  display: grid;
  gap: 2px;
  align-content: center;
  justify-items: start;
  min-width: 52px;
  margin: 0;
  padding: 6px 10px;
  border: 1.5px solid var(--uink-stroke);
  border-radius: 10px;
  background: var(--uink-paper);
}

.uink-fig .usm-chip.is-header {
  border-color: var(--uink-line);
  background: var(--uink-surface);
}

/* 内容块：比页面小一号 */
.uink-fig .usm-chip.is-block {
  min-width: 0;
  padding: 4px 8px;
  border-width: 1px;
  border-color: var(--uink-line);
}

.uink-fig .usm-chip.is-old {
  border-style: dashed;
  opacity: 0.5;
}

.usm-chip.is-old .usm-chip__name {
  text-decoration: line-through;
}

.uink-fig .usm-chip.is-new {
  border: 1.5px solid var(--uink-accent);
}

.usm-chip__name {
  color: var(--uink-text);
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
}

.usm-chip.is-block .usm-chip__name {
  font-size: 13px;
  font-weight: 400;
}

.usm-chip__tag {
  color: var(--uink-text2);
  font-size: 12px;
  white-space: nowrap;
}

.usm-chip.is-new .usm-chip__tag {
  color: var(--uink-accent);
  font-weight: 600;
}

.usm-note {
  margin: 0;
  color: var(--uink-text2);
  font-size: 13px;
  line-height: 1.6;
}

/* 宽栏：左边说明，右边是保存后的文件 */
@container (min-width: 640px) {
  .usm-axis {
    display: flex;
    margin-left: calc(210px + 18px);
  }

  .uink-fig .usm-mode {
    grid-template-columns: 210px minmax(0, 1fr);
    gap: 18px;
    align-items: center;
  }
}
</style>
