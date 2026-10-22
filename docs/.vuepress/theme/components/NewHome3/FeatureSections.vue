<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { createActiveClock } from './softPen'
import { FEATURE_ENTRANCE_SECONDS, featureEntrance, shuffleEntrances } from './featureMotion'

interface FeatureSlide {
  label: string
  title: string
  description: string
}

interface FeatureSection {
  id: string
  label: string
  description: string
  slides: FeatureSlide[]
}

const sections: FeatureSection[] = [
  {
    id: 'screen', label: '屏幕批注',
    description: '在眼前的画面上圈画，随时切回操作或定格讲解。',
    slides: [
      { label: '动态批注', title: '边播放，边讲清楚。', description: '在视频、网页与应用上直接圈画。视频与动画继续播放，重点就在眼前。' },
      { label: '穿透操作', title: '批注留着，操作继续。', description: '保留屏幕上的圈画，点击和触摸仍能操作下方窗口。需要时，随时回来接着写。' },
      { label: '定格讲解', title: '留住这一刻，慢慢讲。', description: '捕获并定格当前画面，圈出值得注意的细节，为复杂的瞬间留出讲解时间。' },
    ],
  },
  {
    id: 'slides', label: '课件联动',
    description: '跟随 PowerPoint 与 WPS，把批注留在对应的那一页。',
    slides: [
      { label: '随页墨迹', title: '翻过一页，批注各归其位。', description: '每页圈画留在对应的幻灯片上。翻到新页继续讲，返回前页，接上刚才的思路。' },
      { label: '动态绑定', title: '切到哪份，就跟到哪份。', description: '跟随当前使用的放映，在多份课件与 PowerPoint、WPS 之间自然切换，减少手动选择联动目标的操作。' },
      { label: '开箱即用', title: '少一些配置，多一些开讲。', description: '针对部分 COM 注册异常、Office 与 WPS 混装环境提供兼容处理。下载解压即可开始，无需额外安装 Office 加载项。' },
    ],
  },
  {
    id: 'board', label: '多页白板',
    description: '选一张合适的背景，把课件之外的思路接着写下去。',
    slides: [
      { label: '多种背景', title: '空白、点阵、网格，各有所长。', description: '自由书写、整理结构或展开推导，为不同的讲解选择合适的底色与纹理。' },
      { label: '多页书写', title: '写满一页，思路还有下一页。', description: '翻到新页继续展开，也能回到上一页查看。讲解告一段落，再回到课件。' },
    ],
  },
]

const uid = `nh3-feature-${useId()}`
const duration = 7000
const root = ref<HTMLElement>()
const selected = ref(sections.map(() => 0))
const paused = ref(sections.map(() => false))
const elapsed = ref(sections.map(() => 0))
const progressKeys = ref(sections.map(() => 0))
const running = ref(-1)
const ratios = sections.map(() => 0)
const focused = sections.map(() => false)
const entrances = ref(sections.map(() => FEATURE_ENTRANCE_SECONDS))
const presets = ref([0, 1, 2])
const clocks = sections.map(() => createActiveClock())
const armed = sections.map(() => false)
let frame: number | undefined
let preferred = -1
let startedAt = 0
let timer: ReturnType<typeof setTimeout> | undefined
let observer: IntersectionObserver | undefined
let mounted = false

function stop() {
  if (timer !== undefined) clearTimeout(timer)
  timer = undefined
  const index = running.value
  if (index < 0) return
  elapsed.value[index] = Math.min(duration, elapsed.value[index] + performance.now() - startedAt)
  progressKeys.value[index]++
  running.value = -1
}

function sync() {
  stop()
  if (!mounted || document.hidden) return
  const index = preferred
  if (index < 0 || ratios[index] <= 0 || entrances.value[index] < FEATURE_ENTRANCE_SECONDS || focused[index] || paused.value[index]) return
  running.value = index
  startedAt = performance.now()
  // 只安排下一次换幕；暂停时冻结剩余时间，返回页面不追赶后台错过的场景。
  timer = setTimeout(() => {
    timer = undefined
    running.value = -1
    selected.value[index] = (selected.value[index] + 1) % sections[index].slides.length
    elapsed.value[index] = 0
    progressKeys.value[index]++
    sync()
  }, Math.max(0, duration - elapsed.value[index]))
}

function select(index: number, slide: number) {
  stop()
  selected.value[index] = slide
  elapsed.value[index] = 0
  progressKeys.value[index]++
  sync()
}

function togglePause(index: number) {
  paused.value[index] = !paused.value[index]
  sync()
}

function focusIn(index: number) {
  // 键盘直接进入卡片时立即呈现完整内容，不让焦点落在尚未入场的控件上。
  entrances.value[index] = FEATURE_ENTRANCE_SECONDS
  syncMotion()
  focused[index] = true
  sync()
}

function focusOut(index: number, event: FocusEvent) {
  if ((event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) return
  focused[index] = false
  sync()
}

function paintEntrances(now: number) {
  let completed = false
  sections.forEach((_, index) => {
    if (entrances.value[index] >= FEATURE_ENTRANCE_SECONDS || !armed[index]) return
    entrances.value[index] = Math.min(FEATURE_ENTRANCE_SECONDS, clocks[index].read(now))
    if (entrances.value[index] >= FEATURE_ENTRANCE_SECONDS) {
      clocks[index].setRunning(false, now)
      completed = true
    }
  })
  if (completed) sync()
}

function needsFrame() {
  return mounted && !document.hidden && sections.some((_, index) => armed[index] && ratios[index] > 0 && entrances.value[index] < FEATURE_ENTRANCE_SECONDS)
}

function tick(now: number) {
  frame = undefined
  paintEntrances(now)
  if (needsFrame()) frame = requestAnimationFrame(tick)
}

function syncMotion() {
  const now = performance.now()
  sections.forEach((_, index) => clocks[index].setRunning(mounted && !document.hidden && ratios[index] > 0 && armed[index] && entrances.value[index] < FEATURE_ENTRANCE_SECONDS, now))
  paintEntrances(now)
  if (!needsFrame() && frame !== undefined) {
    cancelAnimationFrame(frame)
    frame = undefined
  }
  if (needsFrame() && frame === undefined) frame = requestAnimationFrame(tick)
}

function visibilityChanged() {
  syncMotion()
  sync()
}

onMounted(() => {
  mounted = true
  document.addEventListener('visibilitychange', visibilityChanged)
  // 没有观察器时保留完整静态首帧和手动切换，不猜测可见性并启动后台轮播。
  if (typeof IntersectionObserver === 'undefined') return
  presets.value = shuffleEntrances()
  entrances.value = sections.map(() => 0)
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const index = Number((entry.target as HTMLElement).dataset.featureIndex)
      ratios[index] = entry.isIntersecting ? entry.intersectionRatio : 0
      // 至少露出约 80px 再起演；矮视口按可用高度降阈值，长卡片也能触发。
      const visibleHeight = entry.intersectionRect.height
      const triggerHeight = Math.min(80, (entry.rootBounds?.height ?? 320) * 0.2)
      if (ratios[index] > 0 && visibleHeight >= triggerHeight) armed[index] = true
    }
    const highest = Math.max(...ratios)
    // 可见比例相同时保留原舞台，避免相邻板块来回抢占播放。
    if (highest <= 0) preferred = -1
    else if (preferred < 0 || ratios[preferred] < highest) preferred = ratios.indexOf(highest)
    syncMotion()
    sync()
  }, { threshold: Array.from({ length: 101 }, (_, index) => index / 100) })
  root.value?.querySelectorAll<HTMLElement>('[data-feature-index]').forEach(node => observer?.observe(node))
})

onBeforeUnmount(() => {
  mounted = false
  stop()
  syncMotion()
  observer?.disconnect()
  document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>

<template>
  <div ref="root" class="nh3-features">
    <!-- 观察静止外层，避免入场位移反过来改变可见比例。 -->
    <section
      v-for="(section, index) in sections" :key="section.id"
      class="nh3-feature" :class="[`feature-${section.id}`, { 'heading-right': index % 2 === 1 }]" :data-feature-index="index"
      :aria-labelledby="`${uid}-${section.id}-heading`"
      @focusin="focusIn(index)" @focusout="focusOut(index, $event)"
    >
      <div class="feature-card" :style="featureEntrance(entrances[index], presets[index])" role="group" aria-roledescription="轮播" :aria-label="`${section.label}介绍`">
        <header class="feature-heading" :style="featureEntrance(entrances[index], presets[index], 1)">
          <h2 :id="`${uid}-${section.id}-heading`">{{ section.label }}</h2>
          <p class="feature-intro">{{ section.description }}</p>
        </header>
        <div class="feature-controls">
          <div class="feature-selectors" :aria-label="`选择${section.label}场景`" role="group">
            <button
              v-for="(slide, slideIndex) in section.slides" :key="slide.label" type="button"
              class="feature-selector" :class="{ 'is-selected': selected[index] === slideIndex }"
              :aria-pressed="selected[index] === slideIndex" :aria-controls="`${uid}-${section.id}-content`"
              @click="select(index, slideIndex)"
            >
              {{ slide.label }}
              <span class="feature-track" aria-hidden="true">
                <span
                  v-if="selected[index] === slideIndex" :key="progressKeys[index]" class="feature-progress"
                  :style="{ '--progress-delay': `${-elapsed[index]}ms`, '--progress-duration': `${duration}ms`, '--progress-play': running === index ? 'running' : 'paused' }"
                />
              </span>
            </button>
          </div>
          <button
            type="button" class="feature-pause" :aria-label="`${paused[index] ? '启用' : '暂停'}${section.label}自动切换`"
            :aria-pressed="paused[index]" :title="paused[index] ? '启用自动切换（焦点离开后继续）' : '暂停自动切换'"
            @click="togglePause(index)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path v-if="paused[index]" d="m9 5 10 7-10 7Z" /><path v-else d="M7 5h3v14H7zM14 5h3v14h-3z" /></svg>
          </button>
        </div>
        <!-- 只裁切底板，未来真实产品素材可以越过舞台边缘。 -->
        <div class="feature-stage" :style="featureEntrance(entrances[index], presets[index], 2)" aria-hidden="true">
          <div class="feature-backplate">
            <div v-if="section.id === 'board'" class="board-surfaces">
              <div class="board-surface board-blank" />
              <div class="board-surface board-dots" />
              <div class="board-surface board-grid" />
            </div>
          </div>
          <div class="feature-media">
            <span class="feature-placeholder">演示素材待加入</span>
          </div>
        </div>
        <div :id="`${uid}-${section.id}-content`" class="feature-caption" :style="featureEntrance(entrances[index], presets[index], 3)" aria-live="off">
          <div v-for="(slide, slideIndex) in section.slides" :key="slide.label" class="feature-caption-copy" :class="{ 'is-current': selected[index] === slideIndex }" :aria-hidden="selected[index] !== slideIndex">
            <h3>{{ slide.title }}</h3>
            <p>{{ slide.description }}</p>
          </div>
        </div>

      </div>
    </section>
  </div>
</template>
<style scoped>
.nh3-features {
  position: relative;
  z-index: 1;
  padding: 0 24px 104px;
  color: var(--vp-c-text-1);
  --feature-muted: var(--vp-c-text-2);
  --feature-line: rgba(79, 109, 122, 0.16);
  --feature-accent: #477f79;
}

.nh3-feature { max-width: 1200px; margin: 0 auto 40px; }
.nh3-feature:last-child { margin-bottom: 0; }
.feature-card {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'heading controls' 'stage stage' 'caption caption';
  align-items: center;
  column-gap: 32px;
  padding: 32px;
  border: 1px solid rgba(73, 99, 120, 0.12);
  border-radius: 28px;
  background: linear-gradient(120deg, #f8fafb, #eef2f5);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.feature-heading { grid-area: heading; min-width: 0; }
.feature-heading h2 { margin: 0; padding: 0; border: 0; font-size: clamp(25px, 2.5vw, 32px); font-weight: 650; line-height: 1.4; letter-spacing: -0.025em; }
.feature-intro { margin: 8px 0 0; color: var(--feature-muted); font-size: 14px; line-height: 1.8; }
.heading-right .feature-card { grid-template-columns: auto minmax(0, 1fr); grid-template-areas: 'controls heading' 'stage stage' 'caption caption'; }
.heading-right .feature-heading { text-align: right; }
.feature-stage { grid-area: stage; position: relative; isolation: isolate; height: clamp(360px, 33vw, 420px); margin-top: 24px; min-width: 0; }
.feature-backplate { position: absolute; inset: 0; overflow: hidden; border-radius: 18px; background: #e5ebe9; box-shadow: inset 0 0 0 1px rgba(73, 99, 120, 0.06); }
.feature-slides .feature-backplate { background: #e7e9ee; }
.feature-media { position: absolute; inset: 0; }
.feature-placeholder { position: absolute; left: 20px; bottom: 16px; font-size: 11px; letter-spacing: 0.04em; color: #536a68; }
.feature-caption { grid-area: caption; display: grid; padding-top: 20px; min-width: 0; }
/* 所有文案共同决定高度，自动切换不会推动下方内容跳动。 */
.feature-caption-copy { grid-area: 1 / 1; visibility: hidden; }
.feature-caption-copy.is-current { visibility: visible; }
.feature-caption h3 { margin: 0 0 8px; font-size: 17px; font-weight: 600; line-height: 1.5; }
.feature-caption p { margin: 0; color: var(--feature-muted); font-size: 14px; line-height: 1.8; }
.feature-controls { grid-area: controls; display: flex; align-items: center; gap: 16px; }
.feature-selectors { display: flex; flex: 1; min-width: 0; gap: clamp(16px, 2vw, 30px); }
.feature-selector { position: relative; min-width: 0; padding: 10px 0 12px; color: var(--feature-muted); border: 0; background: transparent; font: inherit; font-size: 12px; cursor: pointer; }
.feature-selector.is-selected { color: var(--vp-c-text-1); }
.feature-track { position: absolute; right: 0; bottom: 2px; left: 0; height: 2px; overflow: hidden; background: var(--feature-line); border-radius: 2px; }
.feature-progress { display: block; height: 100%; background: var(--feature-accent); transform-origin: left; animation-name: feature-progress !important; animation-timing-function: linear !important; animation-fill-mode: both !important; animation-iteration-count: 1 !important; }
.feature-pause { flex: 0 0 34px; display: grid; place-items: center; width: 34px; height: 34px; padding: 8px; border-radius: 50%; border: 0; color: var(--feature-muted); background: transparent; cursor: pointer; }
.feature-pause svg { width: 16px; height: 16px; fill: currentColor; }
.feature-selector:hover, .feature-pause:hover { color: var(--feature-accent); }
.feature-selector:focus-visible, .feature-pause:focus-visible { outline: 2px solid var(--feature-accent); outline-offset: 4px; }
/* 只保留本舞台的演示进度，不覆盖全站的系统动画偏好。 */
.feature-progress { animation-duration: var(--progress-duration) !important; animation-delay: var(--progress-delay) !important; animation-play-state: var(--progress-play) !important; }
@keyframes feature-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.board-surfaces, .board-surface { position: absolute; inset: 0; }
.board-blank { background: #bfd6ce; }
.board-dots { clip-path: polygon(39% 0, 75% 0, 59% 100%, 23% 100%); background: radial-gradient(#78948c 0.8px, transparent 0.8px) 0 0 / 14px 14px, #e3e9df; }
.board-grid { clip-path: polygon(75% 0, 100% 0, 100% 100%, 59% 100%); background: linear-gradient(#a8b7ae55 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, #a8b7ae55 1px, transparent 1px) 0 0 / 24px 24px, #eeeae0; }
[data-theme='dark'] .nh3-features { --feature-line: rgba(176, 204, 215, 0.17); --feature-accent: #9acbc1; }
[data-theme='dark'] .feature-card { border-color: rgba(177, 205, 220, 0.1); background: linear-gradient(120deg, #202c36, #18232e); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025); }
[data-theme='dark'] .feature-backplate { background: #293b3b; }
[data-theme='dark'] .feature-slides .feature-backplate { background: #303a47; }
[data-theme='dark'] .feature-placeholder { color: #b8c8c6; }
[data-theme='dark'] .board-blank { background: #29453f; }
[data-theme='dark'] .board-dots { background: radial-gradient(#76978d 0.8px, transparent 0.8px) 0 0 / 14px 14px, #35423e; }
[data-theme='dark'] .board-grid { background: linear-gradient(#8ca59933 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, #8ca59933 1px, transparent 1px) 0 0 / 24px 24px, #45483f; }
@media (max-width: 899px) {
  .feature-card, .heading-right .feature-card { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'heading' 'controls' 'stage' 'caption'; padding: 24px; }
  .heading-right .feature-heading { text-align: left; }
  .feature-controls { justify-self: start; margin-top: 12px; max-width: 100%; }
  .feature-stage { height: clamp(280px, 44vw, 380px); margin-top: 16px; }
}
@media (max-width: 479px) {
  .nh3-features { padding: 0 20px 72px; }
  .feature-card, .heading-right .feature-card { padding: 20px 16px; }
  .feature-stage { height: clamp(230px, 58vw, 280px); }
  .feature-backplate { border-radius: 14px; }
  .feature-placeholder { left: 14px; bottom: 12px; }
  .feature-caption { padding-top: 16px; }
  .feature-selectors { gap: 12px; }
  .feature-controls { gap: 10px; }
  .feature-selector { font-size: 11px; }
}
@media (pointer: coarse) {
  .feature-pause { flex-basis: 44px; width: 44px; height: 44px; }
  .feature-selector { min-height: 44px; }
}
</style>
