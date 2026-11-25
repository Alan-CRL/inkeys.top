<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import { useLocale } from '../../../i18n/useLocale'
import type { Locale } from '../../../i18n/locales'
import './uink.css'

interface LevelText {
  label: string
  name: string
  text: string
}

const LEVELS = [{ key: 'core' }, { key: 'basic' }, { key: 'standard' }, { key: 'full' }, { key: 'inkeys' }] as const
type LevelKey = typeof LEVELS[number]['key']

// 每级的显示效果按 compatibility.md 的读取回退表与 media.md 的回退规则；等级英文名与 levels.md 一致。
const COPY: Record<Locale, { group: string, describe: (name: string, text: string) => string, levels: Record<LevelKey, LevelText> }> = {
  'zh-CN': {
    group: '读取器等级',
    describe: (name, text) => `同一页课堂板书在${name}读取器中的显示效果：${text}`,
    levels: {
      core: {
        label: '核心',
        name: '核心级',
        text: '多页的笔迹和基础图形都画在原处。荧光笔按普通笔画成不透明的圆头线，虚线变成实线，箭头没有端头，圆角变成直角；图片、PDF 和橡皮被跳过。',
      },
      basic: {
        label: '基础',
        name: '基础级',
        text: '笔迹和图形的外观正确：荧光笔半透明、平头，虚线、箭头和圆角都画出来，页面显示点阵背景。',
      },
      standard: {
        label: '标准',
        name: '标准级',
        text: '插入的图片出现在原来的位置。PDF 讲义页保留位置，显示为占位框。',
      },
      full: {
        label: '完整',
        name: '完整级',
        text: 'PDF 讲义页也显示出来。除了 Inkeys 特有的橡皮与 Clear，文件里的内容都能完整呈现。',
      },
      inkeys: {
        label: '+Inkeys',
        name: 'Inkeys 附加级',
        text: '橡皮生效，擦过的笔迹留出空白；不支持时橡皮必须被跳过，笔迹保持原样。附加级可以叠加在任一等级上，这里叠加在完整级上。',
      },
    },
  },
  'zh-TW': {
    group: '讀取器等級',
    describe: (name, text) => `同一頁課堂板書在${name}讀取器中的顯示效果：${text}`,
    levels: {
      core: {
        label: '核心',
        name: '核心級',
        text: '多頁的筆跡和基礎圖形都畫在原處。螢光筆按一般的筆畫成不透明的圓頭線，虛線變成實線，箭頭沒有端頭，圓角變成直角；圖片、PDF 和橡皮擦被略過。',
      },
      basic: {
        label: '基礎',
        name: '基礎級',
        text: '筆跡和圖形的外觀正確：螢光筆半透明、平頭，虛線、箭頭和圓角都畫出來，頁面顯示點陣背景。',
      },
      standard: {
        label: '標準',
        name: '標準級',
        text: '插入的圖片出現在原來的位置。PDF 講義頁保留位置，顯示為預留框。',
      },
      full: {
        label: '完整',
        name: '完整級',
        text: 'PDF 講義頁也顯示出來。除了 Inkeys 特有的橡皮擦與 Clear，檔案裡的內容都能完整呈現。',
      },
      inkeys: {
        label: '+Inkeys',
        name: 'Inkeys 附加級',
        text: '橡皮擦生效，擦過的筆跡留出空白；不支援時必須略過橡皮擦，筆跡保持原樣。附加級可以疊加在任一等級上，這裡疊加在完整級上。',
      },
    },
  },
  'en-US': {
    group: 'Reader level',
    describe: (name, text) => `How the same page of classroom notes is displayed (${name}): ${text}`,
    levels: {
      core: {
        label: 'Core',
        name: 'Core',
        text: 'Strokes and basic shapes on every page are drawn in place. The highlighter is drawn as an opaque, round-capped line like a normal pen, dashed lines become solid, arrows lose their heads and rounded corners become square; images, PDFs and erasers are skipped.',
      },
      basic: {
        label: 'Basic',
        name: 'Basic',
        text: 'Strokes and shapes look right: the highlighter is translucent with flat ends, dashes, arrows and rounded corners are all drawn, and the page shows its dot grid.',
      },
      standard: {
        label: 'Standard',
        name: 'Standard',
        text: 'Inserted images appear where they were placed. PDF handout pages appear as placeholder boxes in their original positions.',
      },
      full: {
        label: 'Full',
        name: 'Full',
        text: 'PDF handout pages are shown too. Everything in the file is displayed, except the Inkeys-specific eraser and Clear.',
      },
      inkeys: {
        label: '+Inkeys',
        name: 'Inkeys extension',
        text: 'The eraser takes effect and erased strokes leave gaps; readers that do not support it must skip the eraser and leave strokes as they are. The extension can be added on top of any level; here it is added to Full.',
      },
    },
  },
}

const locale = useLocale()
const t = computed(() => COPY[locale.value])

const uid = useId()
// 默认显示“完整”，先让读者看到全部内容，再切到低等级对比回退效果
const level = ref(LEVELS.findIndex(l => l.key === 'full'))
const buttons = ref<HTMLButtonElement[]>([])
const current = computed(() => ({ key: LEVELS[level.value].key, ...t.value.levels[LEVELS[level.value].key] }))

const select = async (index: number, focus = false) => {
  level.value = (index + LEVELS.length) % LEVELS.length
  if (focus) {
    await nextTick()
    buttons.value[level.value]?.focus()
  }
}

// radiogroup 的键盘约定：方向键切换并移动焦点，Home / End 跳到两端。
const onKeydown = (event: KeyboardEvent) => {
  const moves: Record<string, number> = {
    ArrowRight: level.value + 1,
    ArrowDown: level.value + 1,
    ArrowLeft: level.value - 1,
    ArrowUp: level.value - 1,
    Home: 0,
    End: LEVELS.length - 1,
  }
  if (!(event.key in moves)) return
  event.preventDefault()
  void select(moves[event.key], true)
}
</script>

<template>
  <figure class="uink-c uink-tier" :data-level="current.key">
    <div class="uink-tier__control" role="radiogroup" :aria-label="t.group" @keydown="onKeydown">
      <button
        v-for="(item, index) in LEVELS"
        :key="item.key"
        ref="buttons"
        type="button"
        role="radio"
        class="uink-tier__option"
        :class="{ 'is-active': index === level }"
        :aria-checked="index === level"
        :tabindex="index === level ? 0 : -1"
        @click="select(index)"
      >
        {{ t.levels[item.key].label }}
      </button>
    </div>

    <div class="uink-tier__board">
      <svg
        viewBox="0 0 960 540"
        role="img"
        :aria-label="t.describe(current.name, current.text)"
      >
        <defs>
          <pattern :id="`${uid}-dots`" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="1.8" class="dot" />
          </pattern>
          <!-- 矩形橡皮扫过的区域：遮罩里为黑色的部分被擦掉 -->
          <mask :id="`${uid}-erase`" maskUnits="userSpaceOnUse" x="0" y="0" width="960" height="540">
            <rect width="960" height="540" fill="#fff" />
            <rect x="150" y="186" width="58" height="76" fill="#000" />
          </mask>
        </defs>

        <!-- 页面背景：基础级起显示点阵 -->
        <rect class="layer" :class="{ on: level >= 1 }" width="960" height="540" :fill="`url(#${uid}-dots)`" />

        <!-- 图片 Media：标准级起显示 -->
        <g class="layer" :class="{ on: level >= 2 }">
          <rect class="media" x="600" y="56" width="300" height="184" rx="10" />
          <path class="art" d="M600 214 L676 142 L724 186 L774 128 L900 230" />
          <circle class="art" cx="842" cy="100" r="16" />
        </g>

        <!-- PDF：标准级保留占位，完整级起显示讲义页 -->
        <g class="layer" :class="{ on: level === 2 }">
          <rect class="placeholder" x="636" y="282" width="228" height="222" rx="8" />
          <text class="placeholder-text" x="750" y="400" text-anchor="middle">PDF</text>
        </g>
        <g class="layer" :class="{ on: level >= 3 }">
          <rect class="media media--paper" x="636" y="282" width="228" height="222" rx="8" />
          <path class="art art--bold" d="M664 318 H756" />
          <path class="art" d="M664 350 H836 M664 374 H828 M664 398 H836 M664 422 H800 M664 446 H832 M664 470 H770" />
        </g>

        <!-- 基础图形：矩形（基础级起有圆角）与圆 -->
        <rect class="ink ink--shape ink--green layer" :class="{ on: level === 0 }" x="64" y="300" width="212" height="150" />
        <rect class="ink ink--shape ink--green layer" :class="{ on: level >= 1 }" x="64" y="300" width="212" height="150" rx="24" />
        <circle class="ink ink--shape ink--blue" cx="392" cy="378" r="58" />

        <!-- 箭头：核心级是无端头的实线，基础级起为虚线加箭头 -->
        <path class="ink ink--arrow ink--green layer" :class="{ on: level === 0 }" d="M440 330 L585 205" />
        <g class="layer" :class="{ on: level >= 1 }">
          <path class="ink ink--arrow ink--green" stroke-dasharray="16 14" d="M440 330 L585 205" />
          <path class="ink ink--arrow ink--green" d="M563.4 209.1 L585 205 L577.8 225.8" />
        </g>

        <!-- 手写笔迹 UInk -->
        <path
          class="ink ink--pen ink--blue"
          d="M72 92 L71 128 Q71 153 95 152 Q118 151 118 127 L119 92 M143 91 L142 152 M168 152 L168 117 Q169 106 183 106 Q200 107 200 121 L200 152 M227 82 L226 152 M257 107 L230 130 L261 152"
        />

        <!-- 荧光笔：核心级按普通笔画（不透明、圆头），基础级起半透明、平头，整条合成一次 -->
        <path class="ink ink--marker layer" :class="{ on: level === 0 }" d="M54 140 L282 136" />
        <path class="ink ink--marker ink--marker-flat layer" :class="{ on: level >= 1 }" d="M54 140 L282 136" />

        <!-- 被橡皮擦过的手写：Inkeys 附加级之前必须跳过橡皮，笔迹完整 -->
        <path
          class="ink ink--pen ink--red layer"
          :class="{ on: level < 4 }"
          d="M64 236 C72 204 92 204 88 228 C85 248 104 248 110 224 C116 202 134 202 132 226 C130 248 150 248 156 222 C162 200 180 200 178 226 C176 248 196 248 202 222 C208 200 226 200 224 226 C222 248 242 248 248 224 C254 204 272 206 270 228 C268 246 290 246 302 226"
        />
        <path
          class="ink ink--pen ink--red layer"
          :class="{ on: level === 4 }"
          :mask="`url(#${uid}-erase)`"
          d="M64 236 C72 204 92 204 88 228 C85 248 104 248 110 224 C116 202 134 202 132 226 C130 248 150 248 156 222 C162 200 180 200 178 226 C176 248 196 248 202 222 C208 200 226 200 224 226 C222 248 242 248 248 224 C254 204 272 206 270 228 C268 246 290 246 302 226"
        />
      </svg>
    </div>

    <figcaption class="uink-tier__caption" aria-live="polite">
      <strong>{{ current.name }}</strong>{{ current.text }}
    </figcaption>
  </figure>
</template>

<style scoped>
.uink-tier {
  /* 无大纲的文档栏可达 1100px 以上，限制画板宽度，桌面上一屏能看到画板和说明 */
  max-width: 960px;
  margin: 24px 0;
}

.uink-tier__control {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  width: fit-content;
  max-width: 100%;
  padding: 4px;
  border-radius: 999px;
  background: var(--uink-surface);
}

.uink-tier__option {
  height: 34px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--uink-text2);
  font: inherit;
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 180ms var(--uink-ease), color 180ms var(--uink-ease);
}

.uink-tier__option:hover {
  color: var(--uink-text);
}

.uink-tier__option.is-active {
  border-color: var(--uink-line);
  background: var(--uink-paper);
  color: var(--uink-text);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.uink-tier__option:focus-visible {
  outline: 2px solid var(--uink-accent);
  outline-offset: 2px;
}

/* 手机宽度下五个选项保持一行 */
@media (max-width: 480px) {
  .uink-tier__option {
    padding: 0 11px;
    font-size: 13px;
  }
}

.uink-tier__board {
  margin-top: 16px;
  overflow: hidden;
  border: 1px solid var(--uink-line);
  border-radius: var(--uink-r-media);
  background: var(--uink-paper);
}

.uink-tier__board svg {
  display: block;
  width: 100%;
  height: auto;
}

.uink-tier__caption {
  /* 主题会让 figcaption 按内容收缩并居中，短说明因此居中；这里强制占满整行、左对齐 */
  display: block;
  width: auto;
  margin-right: 0;
  margin-left: 0;
  min-height: 3.6em;
  margin-top: 14px;
  color: var(--uink-text2);
  font-size: 15px;
  line-height: 1.75;
  text-align: left;
}

.uink-tier__caption strong {
  margin-right: 0.6em;
  color: var(--uink-text);
  font-weight: 600;
}

/* 切换等级时快速交叉淡化（≤ 200ms） */
.layer {
  opacity: 0;
  transition: opacity 180ms var(--uink-ease);
}

.layer.on {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .layer,
  .uink-tier__option {
    transition: none;
  }
}

.dot {
  fill: var(--uink-stroke);
  opacity: 0.55;
}

.art {
  fill: none;
  stroke: var(--uink-stroke);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.art--bold {
  stroke: var(--uink-text3);
  stroke-width: 8;
}

.media {
  fill: var(--uink-surface);
  stroke: var(--uink-stroke);
  stroke-width: 1.5;
}

.media--paper {
  fill: var(--uink-paper);
}

.placeholder {
  fill: none;
  stroke: var(--uink-stroke);
  stroke-width: 1.5;
  stroke-dasharray: 8 6;
}

.placeholder-text {
  fill: var(--uink-text3);
  font-family: inherit;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

/* 画板随栏宽缩小（viewBox 宽 960），手机上把 “PDF” 放大，保证实际字号不小于 12px */
@media (max-width: 640px) {
  .placeholder-text {
    font-size: 38px;
  }
}

@media (max-width: 360px) {
  .placeholder-text {
    font-size: 44px;
  }
}

.ink {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ink--pen {
  stroke-width: 7;
}

.ink--shape {
  stroke-width: 5;
}

.ink--arrow {
  stroke-width: 4.5;
}

.ink--blue {
  stroke: var(--uink-ink-blue);
}

.ink--red {
  stroke: var(--uink-ink-red);
}

.ink--green {
  stroke: var(--uink-ink-green);
}

/* 荧光笔：核心级是不透明的圆头普通笔 */
.ink--marker {
  stroke: var(--uink-ink-yellow);
  stroke-width: 28;
}

.ink--marker-flat {
  stroke-linecap: butt;
}

/* 半透明只在显示时生效；整条路径一次合成，重叠处不会加深 */
.ink--marker-flat.on {
  opacity: 0.42;
}
</style>
