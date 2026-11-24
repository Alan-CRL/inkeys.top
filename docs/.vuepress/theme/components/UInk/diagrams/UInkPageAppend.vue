<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UInkFigure from '../UInkFigure.vue'

type Page = 'P1' | 'P2' | 'P2′' | 'P3'

interface Chip {
  name: string
  index?: number
  tag?: '被替代' | '追加'
}

interface Step {
  title: string
  text: string
  file: Chip[]
  // null：这一步还没有读取
  view: Page[] | null
}

const HEADER: Chip = { name: 'Header' }

// SAVE-10、FILE-8：相同 Canvas 唯一键以最后出现的为准；SAVE-14：按 pageIndex 排序；SAVE-16：整理
const STEPS: Step[] = [
  {
    title: '写入三页',
    text: '完整保存后，文件中依次是 P1、P2、P3，各自是一个 Canvas 及其内容块。',
    file: [HEADER, { name: 'P1', index: 0 }, { name: 'P2', index: 1 }, { name: 'P3', index: 2 }],
    view: ['P1', 'P2', 'P3'],
  },
  {
    title: '按页追加 P2′',
    text: '第 2 页改动后，把它的完整新版本 P2′ 追加到文件末尾，其他页不用重写。P2′ 与 P2 的 Canvas 唯一键相同。',
    file: [HEADER, { name: 'P1', index: 0 }, { name: 'P2', index: 1, tag: '被替代' }, { name: 'P3', index: 2 }, { name: 'P2′', index: 1, tag: '追加' }],
    view: null,
  },
  {
    title: '读取',
    text: '读取器遇到相同的唯一键时以最后出现的为准，旧的 P2 不再显示；页面按 pageIndex 排序，显示 P1、P2′、P3。',
    file: [HEADER, { name: 'P1', index: 0 }, { name: 'P2', index: 1, tag: '被替代' }, { name: 'P3', index: 2 }, { name: 'P2′', index: 1 }],
    view: ['P1', 'P2′', 'P3'],
  },
  {
    title: '整理',
    text: '整理就是一次完整保存：只保留每个唯一键的最后一个版本，文件重新变成紧凑的 P1、P2′、P3。',
    file: [HEADER, { name: 'P1', index: 0 }, { name: 'P2′', index: 1 }, { name: 'P3', index: 2 }],
    view: ['P1', 'P2′', 'P3'],
  },
]

// 每页的缩略内容：只有墨迹是彩色的；P2′ 在 P2 的基础上多了一个红圈
const PAGES: Record<Page, { d: string, cls: string }[]> = {
  'P1': [{ d: 'M18 46 C30 26 44 26 50 42 C56 58 72 58 82 38', cls: 'uf-stroke-green' }],
  'P2': [{ d: 'M20 30 L20 52 Q20 60 30 60 Q40 60 40 52 L40 30 M54 30 L54 60 M66 60 L66 44 Q66 38 74 38 Q82 38 82 46 L82 60', cls: 'uf-stroke-blue' }],
  'P2′': [
    { d: 'M20 30 L20 52 Q20 60 30 60 Q40 60 40 52 L40 30 M54 30 L54 60 M66 60 L66 44 Q66 38 74 38 Q82 38 82 46 L82 60', cls: 'uf-stroke-blue' },
    { d: 'M92 30 C104 26 106 50 96 56 C88 60 84 46 90 38', cls: 'uf-stroke-red' },
  ],
  'P3': [{ d: 'M18 34 H70 M18 48 H86 M18 62 H58', cls: 'uf-stroke-blue upa-thin' }],
}

const step = ref(0)
const current = computed(() => STEPS[step.value])

const go = (i: number) => {
  step.value = Math.min(STEPS.length - 1, Math.max(0, i))
}

// 自动播放：默认关闭；打开后只在进入视口时推进，离开视口暂停
const root = ref<HTMLElement | null>(null)
const autoplay = ref(false)
const inView = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
let observer: IntersectionObserver | null = null

const stopTimer = () => {
  if (timer) clearInterval(timer)
  timer = null
}

watch([autoplay, inView], ([on, visible]) => {
  stopTimer()
  if (on && visible) {
    timer = setInterval(() => {
      step.value = (step.value + 1) % STEPS.length
    }, 2800)
  }
})

onMounted(() => {
  if ('IntersectionObserver' in window && root.value) {
    observer = new IntersectionObserver(entries => {
      inView.value = entries[entries.length - 1].isIntersecting
    }, { threshold: 0.3 })
    observer.observe(root.value)
  } else {
    inView.value = true
  }
})

onBeforeUnmount(() => {
  stopTimer()
  observer?.disconnect()
  observer = null
})

const playState = computed(() => (!autoplay.value ? 'off' : inView.value ? 'playing' : 'paused'))
</script>

<template>
  <UInkFigure
    title="按页追加"
    desc="改动过的页面整页追加到文件末尾；读取器以最后出现的版本为准，整理后文件恢复紧凑。"
  >
    <div ref="root" class="upa" :data-step="step" :data-autoplay="playState">
      <ol class="upa-steps" aria-label="步骤">
        <li v-for="(s, i) in STEPS" :key="i">
          <button
            type="button"
            class="upa-step"
            :class="{ 'is-current': i === step, 'is-done': i < step }"
            :aria-current="i === step ? 'step' : undefined"
            @click="go(i)"
          >
            <span class="upa-step__num">{{ i + 1 }}</span>{{ s.title }}
          </button>
        </li>
      </ol>

      <div class="upa-row">
        <div class="upa-row__label">文件（对象流）</div>
        <ol class="upa-file" :aria-label="`文件中的对象：${current.file.map(c => c.name + (c.tag ? `（${c.tag}）` : '')).join('、')}`">
          <li
            v-for="(chip, i) in current.file"
            :key="`${step}-${i}`"
            class="upa-chip"
            :class="{ 'is-header': chip.name === 'Header', 'is-old': chip.tag === '被替代', 'is-new': chip.tag === '追加' }"
          >
            <span class="upa-chip__name">{{ chip.name }}</span>
            <code v-if="chip.index !== undefined" class="uf-code">pageIndex {{ chip.index }}</code>
            <span v-if="chip.tag" class="upa-chip__tag">{{ chip.tag }}</span>
          </li>
        </ol>
      </div>

      <div class="upa-row">
        <div class="upa-row__label">读取器显示（按 pageIndex）</div>
        <div v-if="current.view" class="upa-view">
          <figure v-for="page in current.view" :key="page" class="upa-page">
            <svg viewBox="0 0 120 80" role="img" :aria-label="`页面 ${page}`">
              <path v-for="(ink, i) in PAGES[page]" :key="i" :d="ink.d" class="upa-ink" :class="ink.cls" />
            </svg>
            <figcaption>{{ page }}</figcaption>
          </figure>
        </div>
        <div v-else class="upa-view upa-view--pending">读取器从头读到尾，下一步看它显示什么。</div>
      </div>

      <p class="uf-readout upa-readout" aria-live="polite">
        <strong>{{ step + 1 }}. {{ current.title }}</strong>{{ current.text }}
      </p>
    </div>

    <template #controls>
      <button type="button" class="uf-btn" :aria-disabled="step === 0" @click="go(step - 1)">上一步</button>
      <button type="button" class="uf-btn" :aria-disabled="step === STEPS.length - 1" @click="go(step + 1)">下一步</button>
      <button type="button" class="uf-btn" :aria-pressed="autoplay" @click="autoplay = !autoplay">
        {{ autoplay ? '停止自动播放' : '自动播放' }}
      </button>
    </template>
  </UInkFigure>
</template>

<style scoped>
.upa {
  display: grid;
  gap: 16px;
}

.upa-steps,
.upa-file {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.uink-fig .upa-steps li,
.uink-fig .upa-file li {
  margin: 0;
}

.upa-step {
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

.upa-step:hover {
  color: var(--uink-text);
}

.upa-step:focus-visible {
  outline: 2px solid var(--uink-accent);
  outline-offset: 2px;
}

.upa-step__num {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--uink-stroke);
  border-radius: 50%;
  font-size: 12px;
}

.upa-step.is-done .upa-step__num {
  border-color: var(--uink-text3);
  background: var(--uink-surface);
}

.upa-step.is-current {
  border-color: var(--uink-line);
  background: var(--uink-surface);
  color: var(--uink-text);
  font-weight: 600;
}

.upa-step.is-current .upa-step__num {
  border-color: var(--uink-accent);
  background: var(--uink-accent);
  color: var(--uink-paper);
}

.upa-row {
  display: grid;
  gap: 8px;
}

.upa-row__label {
  color: var(--uink-text2);
  font-size: 13px;
}

.upa-chip {
  display: grid;
  gap: 2px;
  justify-items: start;
  min-width: 76px;
  padding: 7px 11px;
  border: 1.5px solid var(--uink-stroke);
  border-radius: 10px;
  background: var(--uink-paper);
  animation: upa-in 220ms var(--uink-ease);
}

.upa-chip.is-header {
  border-color: var(--uink-line);
  background: var(--uink-surface);
}

.upa-chip.is-old {
  border-style: dashed;
  opacity: 0.5;
}

.upa-chip.is-old .upa-chip__name {
  text-decoration: line-through;
}

.upa-chip.is-new {
  border-color: var(--uink-accent);
}

.upa-chip__name {
  color: var(--uink-text);
  font-size: 14px;
  font-weight: 600;
}

.upa-chip__tag {
  color: var(--uink-text2);
  font-size: 12px;
}

.upa-chip.is-new .upa-chip__tag {
  color: var(--uink-accent);
  font-weight: 600;
}

.upa-view {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 150px));
  gap: 12px;
  min-height: 112px;
}

.upa-view--pending {
  display: flex;
  align-items: center;
  padding: 0 14px;
  border: 1px dashed var(--uink-stroke);
  border-radius: 10px;
  color: var(--uink-text3);
  font-size: 13px;
}

.uink-fig .upa-page {
  display: grid;
  gap: 4px;
  margin: 0;
  animation: upa-in 220ms var(--uink-ease);
}

.upa-page svg {
  border: 1px solid var(--uink-line);
  border-radius: 8px;
  background: var(--uink-paper);
}

.uink-fig .upa-page figcaption {
  display: block;
  margin: 0;
  color: var(--uink-text);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}

.upa-ink {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.upa-thin {
  stroke-width: 3;
}

.upa-readout {
  min-height: 3.4em;
}

.upa-readout strong {
  margin-right: 0.5em;
}

@keyframes upa-in {
  from {
    opacity: 0;
  }
}
</style>
