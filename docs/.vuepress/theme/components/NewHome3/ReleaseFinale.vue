<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Ui3Bar from '../NewHome/Ui3Bar.vue'
import { downloadContent } from './featureContent'
import { releaseGroups, RELEASE_BAR_HEIGHT, RELEASE_BAR_WIDTH } from './releaseScene'
import { githubContent } from './showcaseContent'

const root = ref<HTMLElement>()
const bar = ref<HTMLElement>()
const scale = ref(1)
// SSR 输出终态；客户端挂载后才武装一次入场，进入视口时播放。
const entered = ref(true)
const active = ref(false)
let observer: IntersectionObserver | undefined

/** 工具栏按视口放大到约 60vw，最大 1.7 倍，窄屏等比缩小完整显示。 */
function resize() {
  const vw = document.documentElement.clientWidth
  const target = vw < 768 ? vw - 40 : Math.min(vw * 0.6, RELEASE_BAR_WIDTH * 1.7)
  scale.value = Math.max(0.4, target / RELEASE_BAR_WIDTH)
}

onMounted(() => {
  // 工具栏仅作视觉展示（读屏已隐藏），保留指针光影但移出 Tab 顺序。
  bar.value?.querySelectorAll('button, a, [tabindex]').forEach(node => node.setAttribute('tabindex', '-1'))
  resize()
  window.addEventListener('resize', resize, { passive: true })
  if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  entered.value = false
  observer = new IntersectionObserver(([entry]) => {
    active.value = entry.isIntersecting
    if (entry.isIntersecting && entry.intersectionRatio > 0.25) entered.value = true
  }, { threshold: [0, 0.25] })
  if (root.value) observer.observe(root.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <section ref="root" class="nh3-finale" :class="{ 'is-entered': entered }" aria-labelledby="nh3-finale-title">
    <h2 id="nh3-finale-title" class="finale-title">
      <span class="finale-brand">Inkeys3</span><span class="finale-dot"> · </span><span>焕新发布</span>
    </h2>
    <p class="finale-lead">下载 Inkeys3，在你的 Windows 设备上开始书写。</p>

    <!-- 产品工具栏本身就是主视觉：原生深色材质，按钮回弹与光影均为真实交互。 -->
    <div ref="bar" class="finale-bar" :style="{ width: `${RELEASE_BAR_WIDTH * scale}px`, height: `${RELEASE_BAR_HEIGHT * scale}px` }" aria-hidden="true">
      <div class="finale-bar-scale" :style="{ width: `${RELEASE_BAR_WIDTH}px`, transform: `scale(${scale})` }">
        <Ui3Bar :groups="releaseGroups" variant="release" :paused="!active" />
      </div>
    </div>

    <!-- 下载控件与工具栏同材质：同色毛玻璃、1px 亮边、8px 圆角、5px 内距。 -->
    <div class="finale-actions">
      <a class="finale-action is-primary no-icon" :href="downloadContent.href" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11m0 0-4.5-4.5M12 14.5l4.5-4.5M5 19.5h14" /></svg>
        下载 Inkeys3
      </a>
      <span class="finale-divider" aria-hidden="true" />
      <a class="finale-action no-icon" :href="githubContent.href" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path class="is-filled" d="M12 2.6a9.6 9.6 0 0 0-3 18.7c.5.1.7-.2.7-.5v-1.7c-2.7.6-3.3-1.2-3.3-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.1-.2-4.4-1.1-4.4-4.8 0-1.1.4-1.9 1-2.6-.1-.2-.4-1.2.1-2.6 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.4.2 2.4.1 2.6.6.7 1 1.5 1 2.6 0 3.7-2.3 4.6-4.4 4.8.3.3.7.9.7 1.8v2.6c0 .3.2.6.7.5A9.6 9.6 0 0 0 12 2.6Z" /></svg>
        为仓库点亮 Star
      </a>
    </div>
  </section>
</template>

<style scoped>
.nh3-finale {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(20px, 3.4vh, 36px);
  min-height: 100vh;
  min-height: 100svh;
  padding: 120px var(--nh3-gutter) 96px;
  /* 白板点阵通栏：与概览图白板同一种画布语言。 */
  background-image: radial-gradient(color-mix(in srgb, var(--vp-c-text-1) 13%, transparent) 1.2px, transparent 1.5px);
  background-position: center top;
  background-size: 28px 28px;
  text-align: center;
}

.finale-title {
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--vp-c-text-1);
  font-family: var(--nh3-serif);
  font-size: clamp(44px, 7.4vw, 120px);
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: 0.02em;
}

.finale-brand { font-family: 'DM Serif Display', Georgia, serif; font-style: italic; font-weight: 400; letter-spacing: 0; }
.finale-dot { color: var(--nh3-accent); white-space: pre; }
.finale-lead { max-width: 30em; margin: 0; color: var(--vp-c-text-2); font-size: var(--nh3-body); line-height: 1.8; }

.finale-bar { position: relative; flex: none; margin-top: clamp(8px, 2vh, 24px); }
.finale-bar-scale { position: absolute; top: 0; left: 0; transform-origin: 0 0; }

.finale-actions {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(24, 24, 24, 0.86);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  box-shadow: 0 18px 40px -18px rgba(0, 0, 0, 0.35);
}

.finale-action {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 22px 0 18px;
  border-radius: 6px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-decoration: none;
  transition: background-color 0.2s ease, transform 0.4s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.finale-action:hover { background: rgba(255, 255, 255, 0.09); color: #fff; text-decoration: none; }
.finale-action:active { transform: scale(0.96); }
.finale-action.is-primary { background: #2a7a80; }
.finale-action.is-primary:hover { background: #33898f; }
.finale-action:focus-visible { outline: 2px solid #9acbc1; outline-offset: 2px; }
.finale-action svg { width: 20px; height: 20px; fill: none; stroke: currentcolor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.finale-action svg .is-filled { fill: currentcolor; stroke: none; }
.finale-divider { width: 1px; height: 32px; background: rgba(255, 255, 255, 0.18); }

/* 单次入场：标题、工具栏、按钮依次落定；只在客户端武装。 */
.nh3-finale > * { transition: opacity 0.7s ease, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1); }
.nh3-finale:not(.is-entered) > * { opacity: 0; transform: translate3d(0, 24px, 0); }
.nh3-finale > :nth-child(2) { transition-delay: 0.08s; }
.nh3-finale > :nth-child(3) { transition-delay: 0.18s; }
.nh3-finale > :nth-child(4) { transition-delay: 0.3s; }

@media (max-width: 767px) {
  .finale-title { font-size: 9.4vw; }
  .finale-actions { flex-direction: column; align-items: stretch; width: min(100%, 320px); }
  .finale-divider { width: auto; height: 1px; }
  .finale-action { justify-content: center; }
}

@media (prefers-reduced-motion: reduce) {
  .nh3-finale > * { transition: none; }
}
</style>
