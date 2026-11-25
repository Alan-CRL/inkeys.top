<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { VPLink } from 'vuepress-theme-plume/client'
import { useLocale } from '../../../i18n/useLocale'
import type { Locale } from '../../../i18n/locales'
import { LOCALE_PREFIX } from '../../../i18n/locales'
import './uink.css'

// 文案按语言取值；规范正文只有简体中文，繁中 / 英文按钮指向同语言的镜像页（见 i18n/mirror.ts）。
const COPY: Record<Locale, {
  title: [string, string]
  leadBefore: string
  leadAfter: string
  read: string
  samples: string
  scene: string
  whiteboard: string
  slide: string
  image: string
  play: string
  pause: string
}> = {
  'zh-CN': {
    title: ['一份墨迹，', '处处可读。'],
    leadBefore: 'UInk 是开放的墨迹文件规范。一整块白板、一整份 PPT 的批注，只需要一个 ',
    leadAfter: '：多页、多屏、图片与 PDF 都收在里面。换一款软件打开，每一笔都在原处。',
    read: '阅读规范',
    samples: '下载样例',
    scene: '一个 .uink 文件展开成四页：白板页、带批注的 PPT 幻灯片、图片和 PDF 讲义页，随后又收回成一个文件。',
    whiteboard: '白板页',
    slide: 'PPT 幻灯片',
    image: '图片',
    play: '播放动画',
    pause: '暂停动画',
  },
  'zh-TW': {
    title: ['一份墨跡，', '處處可讀。'],
    leadBefore: 'UInk 是開放的墨跡檔案規範。一整塊白板、一整份 PPT 的批註，只需要一個 ',
    leadAfter: '：多頁、多螢幕、圖片與 PDF 都收在裡面。換一款軟體開啟，每一筆都在原處。',
    read: '閱讀規範',
    samples: '下載範例',
    scene: '一個 .uink 檔案展開成四頁：白板頁、帶批註的 PPT 投影片、圖片和 PDF 講義頁，隨後又收回成一個檔案。',
    whiteboard: '白板頁',
    slide: 'PPT 投影片',
    image: '圖片',
    play: '播放動畫',
    pause: '暫停動畫',
  },
  'en-US': {
    title: ['One ink file,', 'readable anywhere.'],
    leadBefore: 'UInk is an open file format for digital ink. All the pages of a whiteboard, or all the annotations on a PowerPoint deck, fit in a single ',
    leadAfter: ' file, with multiple pages, multiple screens, images and PDFs all inside. Open it in another app and every stroke is right where you left it.',
    read: 'Read the spec',
    samples: 'Get samples',
    scene: 'A .uink file unfolds into four pages: a whiteboard page, an annotated PowerPoint slide, an image and a PDF handout page, then folds back into one file.',
    whiteboard: 'Whiteboard',
    slide: 'PowerPoint slide',
    image: 'Image',
    play: 'Play animation',
    pause: 'Pause animation',
  },
}

const locale = useLocale()
const t = computed(() => COPY[locale.value])
const prefix = computed(() => LOCALE_PREFIX[locale.value])

const uid = useId()
const stage = ref<HTMLElement | null>(null)
const mounted = ref(false)
const inView = ref(false)
const userPaused = ref(false)
const reduced = ref(false)

// static：服务端渲染、无 JS 或减少动态效果时，固定显示展开后的画面（也是动画第 0 帧）。
const state = computed(() => {
  if (!mounted.value || reduced.value) return 'static'
  return inView.value && !userPaused.value ? 'playing' : 'paused'
})

let observer: IntersectionObserver | null = null
let motionQuery: MediaQueryList | null = null
const onMotionChange = () => {
  reduced.value = !!motionQuery?.matches
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  onMotionChange()
  motionQuery.addEventListener('change', onMotionChange)

  // 只按时间播放：进入视口开始，离开视口暂停；不读取滚动进度。
  if ('IntersectionObserver' in window && stage.value) {
    observer = new IntersectionObserver(entries => {
      inView.value = entries[entries.length - 1].isIntersecting
    }, { threshold: 0.25 })
    observer.observe(stage.value)
  } else {
    inView.value = true
  }
  mounted.value = true
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  motionQuery?.removeEventListener('change', onMotionChange)
})

const toggle = () => {
  userPaused.value = !userPaused.value
}
</script>

<template>
  <section class="uink-c uink-hero" :data-state="state">
    <div class="uink-hero__grid">
      <div class="uink-hero__text">
        <h1 class="uink-hero__title">
          <span class="uink-hero__clause">{{ t.title[0] }}</span><span class="uink-hero__clause">{{ t.title[1] }}</span>
        </h1>
        <p class="uink-hero__lead">
          {{ t.leadBefore }}<code>.uink</code>{{ t.leadAfter }}
        </p>
        <div class="uink-hero__actions">
          <VPLink class="uink-btn uink-btn--primary" :href="`${prefix}standard/intro`" no-icon>{{ t.read }}</VPLink>
          <VPLink class="uink-btn uink-btn--secondary" :href="`${prefix}standard/conformance#公开样例`" no-icon>{{ t.samples }}</VPLink>
        </div>
      </div>

      <div ref="stage" class="uink-hero__stage">
        <div
          class="uink-hero__scene"
          role="img"
          :aria-label="t.scene"
        >
          <!-- 白板页：点阵背景与几笔手写 -->
          <div class="uink-page" style="--i: 0; --fx: -22.5cqw; --fy: -17cqw; --r: -5deg">
            <span class="uink-page__label">{{ t.whiteboard }}</span>
            <svg viewBox="0 0 160 120" aria-hidden="true">
              <defs>
                <pattern :id="`${uid}-dots`" width="12" height="12" patternUnits="userSpaceOnUse">
                  <circle cx="6" cy="6" r="0.9" class="uink-dot" />
                </pattern>
              </defs>
              <rect width="160" height="120" :fill="`url(#${uid}-dots)`" />
              <path class="ink ink--blue" d="M26 50 L26 70 Q26 80 36 80 Q46 80 46 70 L46 50 M58 50 L58 80 M72 80 L72 64 Q72 59 78 59 Q86 59 86 66 L86 80 M98 46 L98 80 M114 60 L100 71 L116 80" />
              <path class="ink ink--green" d="M22 92 Q70 86 122 91" />
              <path class="ink ink--blue ink--thin" d="M124 36 L136 24 M130 24 L136 24 L136 30" />
            </svg>
          </div>

          <!-- PPT 幻灯片：标题与要点，红笔圈出重点 -->
          <div class="uink-page" style="--i: 1; --fx: 22.5cqw; --fy: -18cqw; --r: 4deg">
            <span class="uink-page__label uink-page__label--end">{{ t.slide }}</span>
            <svg viewBox="0 0 160 120" aria-hidden="true">
              <path class="art art--bold" d="M20 30 H92" />
              <circle class="art-fill" cx="22" cy="54" r="2" />
              <circle class="art-fill" cx="22" cy="72" r="2" />
              <circle class="art-fill" cx="22" cy="90" r="2" />
              <path class="art" d="M30 54 H84 M30 72 H76 M30 90 H88" />
              <rect class="art" x="102" y="46" width="40" height="48" rx="3" />
              <path class="ink ink--red" d="M28 70 C30 62 62 61 82 64 C92 66 92 78 78 80 C60 83 32 82 27 75 C25 71 30 66 40 65" />
              <path class="ink ink--red" d="M30 98 Q58 95 88 97" />
            </svg>
          </div>

          <!-- 图片：风景线稿，蓝笔箭头批注 -->
          <div class="uink-page" style="--i: 2; --fx: -23cqw; --fy: 17cqw; --r: 3deg">
            <span class="uink-page__label">{{ t.image }}</span>
            <svg viewBox="0 0 160 120" aria-hidden="true">
              <rect class="art" x="16" y="30" width="128" height="78" rx="4" />
              <path class="art" d="M16 98 L54 64 L76 82 L100 58 L144 98" />
              <circle class="art" cx="116" cy="48" r="7" />
              <path class="ink ink--blue" d="M30 48 Q46 40 58 56 M50 56 L58 56 L58 48" />
            </svg>
          </div>

          <!-- PDF 讲义页：文字行与荧光笔 -->
          <div class="uink-page" style="--i: 3; --fx: 22.5cqw; --fy: 17.5cqw; --r: -4deg">
            <span class="uink-page__label uink-page__label--end">PDF</span>
            <svg viewBox="0 0 160 120" aria-hidden="true">
              <path class="art art--bold" d="M22 30 H74" />
              <path class="art" d="M22 48 H138 M22 60 H132 M22 72 H138 M22 84 H110 M22 96 H124" />
              <path class="ink ink--highlighter" d="M20 60 H122" />
            </svg>
          </div>

          <!-- 一个 .uink 文件 -->
          <div class="uink-file">
            <svg viewBox="0 0 120 150" aria-hidden="true">
              <path class="uink-file__body" d="M14 6 H82 L108 32 V138 Q108 144 102 144 H18 Q12 144 12 138 V12 Q12 6 18 6 Z" />
              <path class="art" d="M82 6 V26 Q82 32 88 32 H108" />
              <path class="ink ink--blue" d="M30 70 C38 54 46 54 46 66 C46 78 56 80 62 66 C66 56 74 56 76 66 C78 74 84 76 90 68" />
              <text class="uink-file__ext" x="60" y="118" text-anchor="middle">.uink</text>
            </svg>
          </div>
        </div>

        <button
          v-if="mounted && !reduced"
          type="button"
          class="uink-hero__toggle"
          :aria-label="userPaused ? t.play : t.pause"
          :aria-pressed="userPaused"
          @click="toggle"
        >
          <svg v-if="userPaused" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z" /></svg>
          <svg v-else viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 3h2.5v10H4.5zM9 3h2.5v10H9z" /></svg>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.uink-hero {
  container-type: inline-size;
  margin: 8px 0 72px;
}

.uink-hero__grid {
  display: grid;
  gap: 40px;
  align-items: center;
}

/* 文档内容栏够宽时左右两栏，否则上下排列。 */
@container (min-width: 720px) {
  .uink-hero__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    gap: 48px;
  }
}

.uink-hero__title {
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--uink-text);
  font-size: clamp(34px, 6cqw, 52px);
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0.01em;
}

/* 只在分句之间换行 */
.uink-hero__clause {
  display: inline-block;
}

.uink-hero__lead {
  margin: 20px 0 0;
  color: var(--uink-text2);
  font-size: 17px;
  line-height: 1.8;
  text-wrap: pretty;
}

.uink-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.uink-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  padding: 0 24px;
  box-sizing: border-box;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  text-decoration: none;
  transition: background-color 200ms var(--uink-ease), transform 120ms var(--uink-ease);
}

/* 主按钮黑白反色；选择器写全，压过 .vp-doc a 的链接样式。 */
.uink-btn.uink-btn--primary,
.uink-btn.uink-btn--primary:hover {
  background-color: var(--uink-text);
  color: var(--uink-bg);
  text-decoration: none;
}

.uink-btn.uink-btn--secondary,
.uink-btn.uink-btn--secondary:hover {
  background-color: var(--uink-surface);
  color: var(--uink-text);
  text-decoration: none;
}

@media (hover: hover) and (pointer: fine) {
  .uink-btn.uink-btn--primary:hover {
    background-color: color-mix(in srgb, var(--uink-text) 84%, var(--uink-bg));
  }

  .uink-btn.uink-btn--secondary:hover {
    background-color: var(--uink-surface-hover);
  }
}

.uink-btn:active {
  transform: scale(0.97);
}

.uink-btn:focus-visible {
  outline: 2px solid var(--uink-accent);
  outline-offset: 3px;
}

/* ---------- 主视觉 ---------- */

.uink-hero__stage {
  position: relative;
  container-type: inline-size;
  border-radius: var(--uink-r-card);
  background: var(--uink-surface);
  aspect-ratio: 1 / 0.84;
  overflow: hidden;
}

.uink-hero__scene {
  position: absolute;
  inset: 0;
}

.uink-page,
.uink-file {
  position: absolute;
  left: 50%;
  /* 卡片中心放在舞台高度的 39 / 84 处，底部留出暂停按钮的位置 */
  top: calc(39 / 84 * 100%);
  box-sizing: border-box;
}

.uink-page {
  --home: translate(-50%, -50%) scale(0.5);
  --fan: translate(-50%, -50%) translate(var(--fx), var(--fy)) rotate(var(--r));
  width: 38cqw;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--uink-line);
  border-radius: 1.8cqw;
  background: var(--uink-paper);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 6px 20px rgba(0, 0, 0, 0.06);
  transform: var(--fan);
  z-index: 1;
}

.uink-page svg,
.uink-file svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.uink-page__label {
  position: absolute;
  top: 1.6cqw;
  left: 1.8cqw;
  padding: 0.3cqw 1.2cqw;
  border-radius: 999px;
  background: var(--uink-surface);
  color: var(--uink-text2);
  font-size: max(10px, 2.4cqw);
  line-height: 1.5;
  white-space: nowrap;
}

/* 文件卡片压住四张卡片的内侧角，右侧两张的标签放在外侧（右上角） */
.uink-page__label--end {
  right: 1.8cqw;
  left: auto;
}

.uink-file {
  --fan: translate(-50%, -50%) scale(0.92);
  --home: translate(-50%, -50%) scale(1.04);
  width: 22cqw;
  aspect-ratio: 4 / 5;
  transform: var(--fan);
  z-index: 2;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.08));
}

.uink-file__body {
  fill: var(--uink-paper);
  stroke: var(--uink-stroke);
  stroke-width: 1.5;
}

.uink-file__ext {
  fill: var(--uink-text);
  font-size: 19px;
  font-weight: 600;
  font-family: inherit;
}

/* 线稿与墨迹 */
.art {
  fill: none;
  stroke: var(--uink-stroke);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.art--bold {
  stroke: var(--uink-text3);
  stroke-width: 5;
}

.art-fill {
  fill: var(--uink-stroke);
}

.uink-dot {
  fill: var(--uink-stroke);
  opacity: 0.6;
}

.ink {
  fill: none;
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ink--thin {
  stroke-width: 2.4;
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

/* 荧光笔：矩形笔尖、平头、半透明 */
.ink--highlighter {
  stroke: var(--uink-ink-yellow);
  stroke-width: 11;
  stroke-linecap: butt;
  opacity: 0.45;
}

/*
 * 9 秒一轮：第 0 帧就是展开状态（与静态画面一致），停留后收回文件，再展开。
 * 只动 transform，暂停用 animation-play-state，画面停在当前帧。
 */
@keyframes uink-hero-page {
  0%, 36% {
    transform: var(--fan);
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  50%, 60% {
    transform: var(--home);
    animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
  }
  76%, 100% {
    transform: var(--fan);
  }
}

.uink-hero[data-state='playing'] .uink-page,
.uink-hero[data-state='paused'] .uink-page,
.uink-hero[data-state='playing'] .uink-file,
.uink-hero[data-state='paused'] .uink-file {
  /* 四张卡片依次错开 70ms；文件卡片没有 --i，不延迟 */
  animation: uink-hero-page 9s calc(var(--i, 0) * 70ms) infinite both;
}

.uink-hero[data-state='paused'] .uink-page,
.uink-hero[data-state='paused'] .uink-file {
  animation-play-state: paused;
}

.uink-hero__toggle {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--uink-line);
  border-radius: 999px;
  background: var(--uink-paper);
  color: var(--uink-text2);
  cursor: pointer;
  transition: color 200ms var(--uink-ease);
}

.uink-hero__toggle:hover {
  color: var(--uink-text);
}

.uink-hero__toggle:focus-visible {
  outline: 2px solid var(--uink-accent);
  outline-offset: 2px;
}

.uink-hero__toggle svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}
</style>
