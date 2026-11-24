<script setup lang="ts">
import { computed, ref } from 'vue'
import UInkFigure from '../UInkFigure.vue'
import { polylinePath, type Point } from '../geometry'

interface Item {
  key: 'P' | 'O' | 'R'
  name: string
  block: 'Ink' | 'Shape'
  marked: boolean
  ink: 'blue' | 'red'
  undoId: number
}

// 内容流：已有笔迹（未标记）→ 手绘原稿（标记 true）→ 修正后的椭圆（未标记）
const STREAM: Item[] = [
  { key: 'P', name: '已有笔迹', block: 'Ink', marked: false, ink: 'blue', undoId: 0 },
  { key: 'O', name: '手绘原稿', block: 'Ink', marked: true, ink: 'red', undoId: 1 },
  { key: 'R', name: '修正结果', block: 'Shape', marked: false, ink: 'red', undoId: 2 },
]

interface Step {
  title: string
  // 已写入的块数；undone：其中从尾部撤回的组数
  count: number
  undone: number
  text: string
}

const STEPS: Step[] = [
  {
    title: '写下原稿',
    count: 2,
    undone: 0,
    text: '手绘的圈保存为 Ink，标记 renderOnlyWhenLatest: true。从末尾向前扫描，它是最后一个块，进入末尾最新组，正常显示。',
  },
  {
    title: '保存修正结果',
    count: 3,
    undone: 0,
    text: '软件把手绘圈修正成椭圆，作为未标记的 Shape 追加在后面。扫描遇到它就停止，末尾最新组为空，原稿隐藏，但仍保存在文件中。',
  },
  {
    title: '撤回修正结果',
    count: 3,
    undone: 1,
    text: '撤回修正结果后，原稿重新成为最后一个有效块，回到末尾最新组，再次显示。',
  },
]

// 已有笔迹：一行手写字
const WORD = 'M96 80 C100 58 112 58 113 76 C114 92 126 92 130 72 C134 54 146 56 146 74 C146 90 160 92 166 72 C170 58 182 60 184 76 C186 90 198 90 206 72'

// 手绘原稿：在椭圆上加入起伏，起点与终点略有错开，像手画的圈
const ROUGH: Point[] = []
for (let i = 0; i <= 64; i++) {
  const t = -0.5 + (i / 64) * (2 * Math.PI + 0.75)
  const k = 1 + 0.06 * Math.sin(3 * t) + 0.035 * Math.cos(5 * t + 1)
  ROUGH.push({ x: 150 + 88 * k * Math.cos(t) + 4 * Math.sin(t / 2), y: 72 + 40 * k * Math.sin(t) - i * 0.06 })
}
const ROUGH_D = polylinePath(ROUGH)

const step = ref(0)
const current = computed(() => STEPS[step.value])

const go = (i: number) => {
  step.value = Math.min(STEPS.length - 1, Math.max(0, i))
}

// INK-15：从最后一个有效块向前扫描，标记为 true 的进入末尾最新组，遇到第一个未标记的块停止
const state = computed(() => {
  const s = current.value
  const written = STREAM.slice(0, s.count)
  const activeCount = s.count - s.undone
  const latest = new Set<string>()
  for (let i = activeCount - 1; i >= 0; i--) {
    if (!written[i].marked) break
    latest.add(written[i].key)
  }
  return written.map((item, i) => {
    const undone = i >= activeCount
    const visible = !undone && (!item.marked || latest.has(item.key))
    let status: string
    if (undone) status = '已撤回'
    else if (!item.marked) status = '未标记：正常显示'
    else if (visible) status = '在末尾最新组：显示'
    else status = '不在末尾最新组：隐藏'
    return { ...item, undone, visible, inLatest: latest.has(item.key), status }
  })
})

const visibleOf = (key: string) => state.value.find(i => i.key === key)
const canvasLabel = computed(() => {
  const shown = state.value.filter(i => i.visible).map(i => i.name)
  return `当前画面：${shown.join('、')}`
})
</script>

<template>
  <UInkFigure
    title="末尾最新组"
    desc="形状修正时，原稿标记 renderOnlyWhenLatest，修正结果不标记：有修正结果时只显示修正结果，撤回它后原稿重新出现（INK-15）。"
  >
    <div class="url">
      <ol class="url-steps" aria-label="步骤">
        <li v-for="(s, i) in STEPS" :key="i">
          <button
            type="button"
            class="url-step"
            :class="{ 'is-current': i === step, 'is-done': i < step }"
            :aria-current="i === step ? 'step' : undefined"
            @click="go(i)"
          >
            <span class="url-step__num">{{ i + 1 }}</span>{{ s.title }}
          </button>
        </li>
      </ol>

      <div class="url-main">
        <ol class="url-stream" aria-label="Canvas 的内容流（从上到下为写入顺序）">
          <li
            v-for="item in state"
            :key="item.key"
            class="url-chip"
            :class="{ 'is-undone': item.undone, 'is-hidden': !item.undone && !item.visible, 'is-latest': item.inLatest }"
            :data-ink="item.ink"
          >
            <span class="url-chip__name">{{ item.name }}<span class="url-chip__block">{{ item.block }}</span></span>
            <code v-if="item.marked" class="uf-code">renderOnlyWhenLatest: true</code>
            <!-- 未标记的块不写该字段（缺省 false），避免读者误以为必须写出 false -->
            <span v-else>不写 <code class="uf-code">renderOnlyWhenLatest</code></span>
            <span class="url-chip__status">{{ item.status }}</span>
          </li>
        </ol>

        <svg class="url-canvas" viewBox="0 0 300 144" role="img" :aria-label="canvasLabel">
          <path :d="WORD" class="url-ink uf-stroke-blue" />
          <!-- 隐藏的原稿画成灰色虚线，提示它仍在文件中 -->
          <path
            v-if="visibleOf('O')"
            :d="ROUGH_D"
            class="url-ink"
            :class="visibleOf('O')?.visible ? 'uf-stroke-red' : 'url-ghost'"
          />
          <ellipse
            v-if="visibleOf('R') && !visibleOf('R')?.undone"
            cx="150"
            cy="70"
            rx="90"
            ry="42"
            class="url-ink url-shape uf-stroke-red"
          />
        </svg>
      </div>

      <p class="uf-readout url-readout" aria-live="polite">
        <strong>{{ step + 1 }}. {{ current.title }}</strong>{{ current.text }}
      </p>
    </div>

    <template #controls>
      <!-- 用 aria-disabled 而不是 disabled：到达尽头时按钮保持焦点 -->
      <button type="button" class="uf-btn" :aria-disabled="step === 0" @click="go(step - 1)">上一步</button>
      <button type="button" class="uf-btn" :aria-disabled="step === STEPS.length - 1" @click="go(step + 1)">下一步</button>
      <span class="url-legend">
        <span class="url-key is-latest">末尾最新组</span>
        <span class="url-key is-hidden">隐藏，仍在文件中</span>
        <span class="url-key is-undone">已撤回</span>
      </span>
    </template>
  </UInkFigure>
</template>

<style scoped>
.url {
  display: grid;
  gap: 16px;
}

.url-steps,
.url-stream {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.uink-fig .url-steps li,
.uink-fig .url-stream li {
  margin: 0;
}

.url-step {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 32px;
  padding: 0 12px 0 6px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--uink-text2);
  font: inherit;
  font-size: 13.5px;
  cursor: pointer;
}

.url-step:hover {
  color: var(--uink-text);
}

.url-step:focus-visible {
  outline: 2px solid var(--uink-accent);
  outline-offset: 2px;
}

.url-step__num {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--uink-stroke);
  border-radius: 50%;
  font-size: 12px;
}

.url-step.is-done .url-step__num {
  border-color: var(--uink-text3);
  background: var(--uink-surface);
}

.url-step.is-current {
  border-color: var(--uink-line);
  background: var(--uink-surface);
  color: var(--uink-text);
  font-weight: 600;
}

.url-step.is-current .url-step__num {
  border-color: var(--uink-accent);
  background: var(--uink-accent);
  color: var(--uink-paper);
}

.url-main {
  display: grid;
  gap: 14px;
}

/* 宽屏：内容流在左、画面在右 */
@container (min-width: 620px) {
  .url-main {
    grid-template-columns: minmax(0, 16.5rem) minmax(0, 1fr);
    align-items: start;
  }

  .url-stream {
    flex-direction: column;
  }
}

.url-chip {
  display: grid;
  gap: 2px;
  justify-items: start;
  padding: 7px 11px 7px 14px;
  border: 1px solid var(--uink-line);
  border-radius: 10px;
  background:
    linear-gradient(var(--url-ink, transparent), var(--url-ink, transparent)) left / 4px 100% no-repeat,
    var(--uink-paper);
  transition: opacity 160ms var(--uink-ease), border-color 160ms var(--uink-ease);
}

.url-chip[data-ink='blue'] { --url-ink: var(--uink-ink-blue); }
.url-chip[data-ink='red'] { --url-ink: var(--uink-ink-red); }

.url-chip.is-latest {
  border-color: var(--uink-accent);
}

/* 隐藏：仍在文件中，色条变灰 */
.url-chip.is-hidden {
  --url-ink: var(--uink-stroke);
}

.url-chip.is-undone {
  border-style: dashed;
  border-color: var(--uink-stroke);
  background: transparent;
  opacity: 0.55;
}

.url-chip__name {
  display: inline-flex;
  gap: 8px;
  align-items: baseline;
  color: var(--uink-text);
  font-size: 14px;
  font-weight: 600;
}

.url-chip.is-undone .url-chip__name {
  text-decoration: line-through;
}

.url-chip__block {
  color: var(--uink-text3);
  font-size: 12px;
  font-weight: 400;
}

.url-chip__status {
  color: var(--uink-text2);
  font-size: 12px;
}

.url-chip.is-latest .url-chip__status {
  color: var(--uink-accent);
  font-weight: 600;
}

.url-canvas {
  border: 1px solid var(--uink-line);
  border-radius: 10px;
  background: var(--uink-paper);
}

.url-ink {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke 160ms var(--uink-ease), opacity 160ms var(--uink-ease);
}

.url-shape {
  stroke-width: 4.5;
}

.url-ghost {
  stroke: var(--uink-stroke);
  stroke-width: 2;
  stroke-dasharray: 5 5;
  opacity: 0.8;
}

.url-readout {
  min-height: 3.4em;
}

.url-readout strong {
  margin-right: 0.5em;
}

.url-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  color: var(--uink-text2);
  font-size: 12.5px;
}

.url-key {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.url-key::before {
  content: '';
  width: 14px;
  height: 10px;
  border: 1px solid var(--uink-accent);
  border-left: 4px solid var(--uink-ink-red);
  border-radius: 3px;
}

.url-key.is-hidden::before {
  border-color: var(--uink-line);
  border-left-color: var(--uink-stroke);
}

.url-key.is-undone::before {
  border: 1px dashed var(--uink-stroke);
}
</style>
