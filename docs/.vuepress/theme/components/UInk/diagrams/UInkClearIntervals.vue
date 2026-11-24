<script setup lang="ts">
import { computed, ref } from 'vue'
import UInkFigure from '../UInkFigure.vue'

interface Item {
  name: string
  kind: 'ink' | 'clear'
  undoId: number
  ink?: 'blue' | 'red' | 'green'
}

// CLEAR-5 的内容流；每个块独占一个撤回组
const STREAM: Item[] = [
  { name: 'A', kind: 'ink', undoId: 0, ink: 'blue' },
  { name: 'Clear1', kind: 'clear', undoId: 1 },
  { name: 'B', kind: 'ink', undoId: 2, ink: 'red' },
  { name: 'Clear2', kind: 'clear', undoId: 3 },
  { name: 'C', kind: 'ink', undoId: 4, ink: 'green' },
]

// 三段笔迹各画在不同位置，方便看出当前显示的是哪一段
const DRAWINGS: Record<string, string> = {
  A: 'M34 80 C46 40 70 40 74 70 C78 96 100 96 108 64 C114 42 134 44 138 70',
  B: 'M150 52 L210 52 M180 52 L180 96 M156 96 L204 96',
  C: 'M246 74 C246 50 266 40 286 46 C306 52 318 70 306 88 C294 104 262 102 252 88',
}

const undone = ref(0)

// CLEAR-1：按顺序合成，遇到 Clear 重置为透明；撤回从尾部逐组进行
const state = computed(() => {
  const active = STREAM.length - undone.value
  let lastClear = -1
  for (let i = 0; i < active; i++) if (STREAM[i].kind === 'clear') lastClear = i
  const items = STREAM.map((item, i) => {
    let status: 'undone' | 'shown' | 'hidden' | 'clear'
    if (i >= active) status = 'undone'
    else if (item.kind === 'clear') status = 'clear'
    else status = i > lastClear ? 'shown' : 'hidden'
    return { ...item, status }
  })
  const shown = items.filter(i => i.status === 'shown').map(i => i.name)
  return { items, shown }
})

const STATUS_TEXT = { undone: '已撤回', shown: '显示中', hidden: '被 Clear 隐藏', clear: '生效' }

// 画面序列：撤回 0–5 组时依次为 C、空、B、空、A、空
const SEQUENCE = Array.from({ length: STREAM.length + 1 }, (_, k) => {
  const active = STREAM.length - k
  let last = -1
  for (let i = 0; i < active; i++) if (STREAM[i].kind === 'clear') last = i
  const names = STREAM.slice(last + 1, active).filter(i => i.kind === 'ink').map(i => i.name)
  return names.length ? names.join(' ') : '空'
})

const undo = () => {
  if (undone.value < STREAM.length) undone.value++
}
const redo = () => {
  if (undone.value > 0) undone.value--
}

const summary = computed(() => {
  const view = state.value.shown.length ? `显示 ${state.value.shown.join('、')}` : '画布为空'
  const last = STREAM[STREAM.length - undone.value]
  return undone.value === 0 ? `全部内容生效，${view}。` : `已撤回 ${undone.value} 组（最近撤回 ${last.name}），${view}。`
})
</script>

<template>
  <UInkFigure
    title="Clear 区间与撤回"
    desc="Clear 让此前的内容从画面上消失，但它们仍在文件里。从尾部逐组撤回，画面依次变为 C → 空 → B → 空 → A（CLEAR-5）。"
  >
    <div class="uci">
      <ol class="uci-stream" aria-label="同一个 Canvas 的内容流">
        <li
          v-for="item in state.items"
          :key="item.name"
          class="uci-chip"
          :class="[`is-${item.status}`, `is-${item.kind}`]"
          :data-ink="item.ink"
        >
          <span class="uci-chip__name">{{ item.name }}</span>
          <code class="uf-code">undoId {{ item.undoId }}</code>
          <span class="uci-chip__status">{{ STATUS_TEXT[item.status] }}</span>
        </li>
      </ol>

      <svg class="uci-canvas" viewBox="0 0 340 130" role="img" :aria-label="`当前画面：${state.shown.length ? state.shown.join('、') : '空白画布'}`">
        <template v-for="item in state.items" :key="item.name">
          <path v-if="item.status === 'shown'" :d="DRAWINGS[item.name]" class="uci-ink" :class="`uf-stroke-${item.ink}`" />
        </template>
        <text v-if="!state.shown.length" x="170" y="72" class="uf-text uci-empty" text-anchor="middle">空白画布</text>
      </svg>

      <ol class="uci-seq" aria-label="撤回 0 到 5 组时的画面">
        <li v-for="(s, k) in SEQUENCE" :key="k" :class="{ 'is-current': k === undone }" :aria-current="k === undone ? 'step' : undefined">
          {{ s }}
        </li>
      </ol>

      <p class="uf-readout uci-readout" aria-live="polite">{{ summary }}</p>
    </div>

    <template #controls>
      <!-- 用 aria-disabled 而不是 disabled：到达尽头时按钮保持焦点，键盘用户不会丢失位置 -->
      <button type="button" class="uf-btn" :aria-disabled="undone >= STREAM.length" @click="undo">撤回</button>
      <button type="button" class="uf-btn" :aria-disabled="undone === 0" @click="redo">重做</button>
      <span class="uci-legend">
        <span class="uci-key is-shown">显示中</span>
        <span class="uci-key is-hidden">被 Clear 隐藏，仍在文件中</span>
        <span class="uci-key is-undone">已撤回</span>
      </span>
    </template>
  </UInkFigure>
</template>

<style scoped>
.uci {
  display: grid;
  gap: 16px;
}

.uci-stream,
.uci-seq {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.uink-fig .uci-chip {
  display: grid;
  gap: 2px;
  justify-items: start;
  min-width: 92px;
  margin: 0;
  padding: 7px 11px 7px 14px;
  border: 1px solid var(--uink-line);
  border-radius: 10px;
  background:
    linear-gradient(var(--uci-ink, transparent), var(--uci-ink, transparent)) left / 4px 100% no-repeat,
    var(--uink-paper);
  transition: opacity 160ms var(--uink-ease), border-color 160ms var(--uink-ease);
}

.uci-chip[data-ink='blue'] { --uci-ink: var(--uink-ink-blue); }
.uci-chip[data-ink='red'] { --uci-ink: var(--uink-ink-red); }
.uci-chip[data-ink='green'] { --uci-ink: var(--uink-ink-green); }

.uink-fig .uci-chip.is-clear {
  border: 1.5px solid var(--uink-text3);
  background: var(--uink-surface);
}

/* 被 Clear 隐藏：仍在文件中，色条变灰 */
.uci-chip.is-hidden {
  --uci-ink: var(--uink-stroke);
}

.uink-fig .uci-chip.is-undone {
  border-style: dashed;
  border-color: var(--uink-stroke);
  background: transparent;
  opacity: 0.55;
}

.uci-chip__name {
  color: var(--uink-text);
  font-size: 14px;
  font-weight: 600;
}

.uci-chip.is-undone .uci-chip__name {
  text-decoration: line-through;
}

.uci-chip__status {
  color: var(--uink-text2);
  font-size: 12px;
}

.uci-canvas {
  max-width: 520px;
  border: 1px solid var(--uink-line);
  border-radius: 10px;
  background: var(--uink-paper);
}

.uci-ink {
  fill: none;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.uci-empty {
  fill: var(--uink-text3);
  font-size: 15px;
}

.uci-seq {
  column-gap: 24px;
}

.uink-fig .uci-seq li {
  position: relative;
  margin: 0;
  padding: 2px 10px;
  border-radius: 999px;
  color: var(--uink-text3);
  font-size: 13px;
}

.uink-fig .uci-seq li.is-current {
  background: var(--uink-surface);
  color: var(--uink-text);
  font-weight: 600;
}

.uink-fig .uci-seq li + li::before {
  content: '→';
  position: absolute;
  left: -19px;
  color: var(--uink-text3);
  font-weight: 400;
}

.uci-readout {
  min-height: 1.7em;
}

.uci-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  color: var(--uink-text2);
  font-size: 12.5px;
}

.uci-key {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.uci-key::before {
  content: '';
  width: 14px;
  height: 10px;
  border: 1px solid var(--uink-line);
  border-left: 4px solid var(--uink-ink-blue);
  border-radius: 3px;
}

.uci-key.is-hidden::before {
  border-left-color: var(--uink-stroke);
}

.uci-key.is-undone::before {
  border: 1px dashed var(--uink-stroke);
}
</style>
