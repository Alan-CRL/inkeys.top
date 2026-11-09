<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDarkMode } from 'vuepress-theme-plume/client'
import { buildRibbon, paintRibbon } from './inkRibbon'
import type { Ribbon } from './inkRibbon'

const root = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
const isDark = useDarkMode()
// SSR 与无脚本时直接显示文字终态；笔画只在客户端绘制。
const reveal = ref(1)

let ribbon: Ribbon | undefined
let ribbonKey = ''
let frame = 0
let shown = -1
let current = 0
let visible = false
let reduced = false
let observer: IntersectionObserver | undefined
let motionQuery: MediaQueryList | undefined

function progressTarget() {
  const node = root.value
  if (!node) return 0
  const rect = node.getBoundingClientRect()
  const vh = window.innerHeight
  // 区块顶边升到视口 55% 处起笔，粘性区间走完约四分之三时收笔。
  const start = vh * 0.55
  const end = -(rect.height - vh) * 0.75
  return Math.max(0, Math.min(1, (start - rect.top) / (start - end)))
}

const revealAt = (progress: number) => Math.max(0, Math.min(1, (progress - 0.72) / 0.2))

function draw() {
  const node = canvas.value
  if (!node || node.clientWidth < 1 || node.clientHeight < 1) return
  const key = `${node.clientWidth}x${node.clientHeight}`
  if (key !== ribbonKey || !ribbon) {
    ribbon = buildRibbon(node.clientWidth, node.clientHeight)
    ribbonKey = key
  }
  paintRibbon(node, ribbon, current, isDark.value ? 'dark' : 'light')
  shown = current
}

function tick() {
  frame = 0
  const target = reduced ? 1 : progressTarget()
  // 轻微跟随让滚轮的阶梯式滚动也写得顺滑；接近目标后停帧。
  current += (target - current) * (reduced ? 1 : 0.22)
  if (Math.abs(target - current) < 0.001) current = target
  reveal.value = revealAt(current)
  if (Math.abs(current - shown) > 0.0005) draw()
  if (current !== target) request()
}

function request() {
  if (!frame && visible) frame = requestAnimationFrame(tick)
}

function redraw() {
  shown = -1
  request()
}

function onResize() {
  ribbonKey = ''
  redraw()
}

function onMotion() {
  reduced = !!motionQuery?.matches
  redraw()
}

watch(isDark, redraw)

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduced = motionQuery.matches
  motionQuery.addEventListener('change', onMotion)
  current = reduced ? 1 : progressTarget()
  reveal.value = revealAt(current)
  observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) redraw()
  })
  if (root.value) observer.observe(root.value)
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
})

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame)
  observer?.disconnect()
  motionQuery?.removeEventListener('change', onMotion)
  window.removeEventListener('scroll', request)
  window.removeEventListener('resize', onResize)
  // 主动释放整屏像素缓冲。
  if (canvas.value) canvas.value.width = canvas.value.height = 1
})
</script>

<template>
  <section ref="root" class="nh3-stroke" aria-labelledby="nh3-stroke-title">
    <div class="nh3-stroke-sticky">
      <canvas ref="canvas" class="nh3-stroke-canvas" aria-hidden="true" />
      <div class="nh3-stroke-copy" :style="{ opacity: reveal, transform: `translate3d(0, ${(1 - reveal) * 24}px, 0)` }">
        <h2 id="nh3-stroke-title">落笔，即是表达。</h2>
        <p>这一笔由网页软笔实时写出：越快越细，收笔自然出锋。</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.nh3-stroke {
  position: relative;
  height: 220vh;
  height: 220svh;
}

.nh3-stroke-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100svh;
  overflow: hidden;
}

.nh3-stroke-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* 文字落在笔画留出的左下空白里，左对齐于全页统一的 8vw 栏线。 */
.nh3-stroke-copy {
  position: absolute;
  left: var(--nh3-gutter);
  bottom: 12vh;
  max-width: calc(100vw - 2 * var(--nh3-gutter));
  will-change: opacity, transform;
}

.nh3-stroke-copy h2 {
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--vp-c-text-1);
  font-family: var(--nh3-serif);
  font-size: var(--nh3-display);
  font-weight: 600;
  line-height: 1.12;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.nh3-stroke-copy p {
  margin: 0.9em 0 0;
  color: var(--vp-c-text-2);
  font-size: var(--nh3-body);
  line-height: 1.8;
}

@media (max-width: 767px) {
  .nh3-stroke { height: 170vh; height: 170svh; }
  .nh3-stroke-copy { bottom: 8vh; }
  .nh3-stroke-copy h2 { white-space: normal; }
}
</style>
