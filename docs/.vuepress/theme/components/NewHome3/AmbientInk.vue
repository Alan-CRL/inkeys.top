<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, onUpdated, watch } from 'vue'
import { useDarkMode } from 'vuepress-theme-plume/client'
import { createActiveClock } from './softPen'
import { createAmbientPainter } from './ambientPainter'
import { ambientFrame, createAmbientScheduler, placeAmbient } from './ambientScene'
import type { AmbientBox, AmbientScene } from './ambientScene'

interface Tile { scene: AmbientScene, box: AmbientBox }
const root = ref<HTMLElement>()
const isDark = useDarkMode()
const time = ref(0)
const mobile = ref(false)
const tiles = shallowRef<Tile[]>([])
const clock = createActiveClock()
// 随机种子仅在客户端挂载后消费，SSR 不生成装饰内容。
let scheduler: ReturnType<typeof createAmbientScheduler> | undefined
let observer: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined
let mounted = false
let visible = false
let frame = 0
let timer: ReturnType<typeof setTimeout> | undefined
const rendered = computed(() => tiles.value.map(tile => ({ ...tile,
  frame: ambientFrame(tile.scene, time.value),
})))

const painters = new Map<number, ReturnType<typeof createAmbientPainter>>()
function bindCanvas(id: number, element: unknown) {
  if (!element) { painters.get(id)?.dispose(); painters.delete(id); return }
  if (!painters.has(id)) painters.set(id, createAmbientPainter(element as HTMLCanvasElement))
}
function paint() {
  for (const tile of tiles.value) painters.get(tile.scene.id)?.render(tile.scene, time.value,
    tile.box.width, tile.box.height, mobile.value, isDark.value ? 'dark' : 'light', window.devicePixelRatio || 1)
}
onUpdated(paint)
watch(isDark, paint)

function stopWork() {
  if (frame) cancelAnimationFrame(frame)
  if (timer !== undefined) clearTimeout(timer)
  frame = 0
  timer = undefined
}

function canAnimate() {
  if (!mounted || !visible || document.hidden || !root.value) return false
  const bounds = root.value.getBoundingClientRect()
  if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return false
  // 已生成的笔迹离开视口后冻结；它的位置仍留在文档原处。
  return !tiles.value.length || tiles.value.some(tile => bounds.top + tile.box.y < window.innerHeight
    && bounds.top + tile.box.y + tile.box.height > 0)
}

function position(scene: AmbientScene): AmbientBox {
  const bounds = root.value!.getBoundingClientRect()
  const exclusions = Array.from(root.value!.parentElement?.querySelectorAll('.nh3-release-heading, .nh3-release-desktop') ?? []).map(node => {
    const box = node.getBoundingClientRect()
    return { x: box.left - bounds.left, y: box.top - bounds.top, width: box.width, height: box.height }
  })
  const points = scene.strokes.flatMap(stroke => [...stroke.points, ...(stroke.regular ?? [])])
  const left = Math.min(...points.map(p => p.x)) / 300
  const right = Math.max(...points.map(p => p.x)) / 300
  const top = Math.min(...points.map(p => p.y)) / 90
  const bottom = Math.max(...points.map(p => p.y)) / 90
  const padding = (mobile.value ? 7 : 10) / Math.min(520, Math.max(104, bounds.width / 3))
  const inkBounds = { x: left - padding, y: top - padding / 0.3, width: right - left + padding * 2, height: bottom - top + padding / 0.3 * 2 }
  return placeAmbient(bounds.width, bounds.height, Math.max(0, -bounds.top), Math.min(bounds.height, window.innerHeight - bounds.top), scene.side, Math.random, exclusions, inkBounds)
}

function tick() {
  frame = 0
  timer = undefined
  if (!canAnimate() || !scheduler) {
    clock.setRunning(false, performance.now())
    return
  }
  const now = performance.now()
  time.value = clock.read(now)
  const state = scheduler.update(time.value, mobile.value)
  const previous = tiles.value
  const next = state.scenes.map(scene => previous.find(tile => tile.scene.id === scene.id) ?? { scene, box: position(scene) })
  if (next.length !== previous.length || next.some((tile, index) => tile !== previous[index])) tiles.value = next
  // 等 Vue 完成 Canvas 绑定后统一绘制，避免 tick 与 onUpdated 同帧重复合成。
  if (state.scenes.length) frame = requestAnimationFrame(tick)
  else timer = setTimeout(tick, Math.max(16, state.wait * 1000))
}

function syncActivity() {
  const now = performance.now()
  const active = canAnimate()
  clock.setRunning(active, now)
  stopWork()
  if (active) tick()
}

function resize() {
  mobile.value = window.innerWidth < 900
  // 只在布局尺寸变化时重算，滚动本身不会改写笔迹的文档坐标。
  tiles.value = tiles.value.map(tile => ({ ...tile, box: position(tile.scene) }))
  syncActivity()
}

onMounted(() => {
  if (!root.value) return
  mounted = true
  scheduler = createAmbientScheduler()
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting)
      syncActivity()
    })
    observer.observe(root.value)
  }
  else visible = true
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(root.value)
  }
  document.addEventListener('visibilitychange', syncActivity)
  window.addEventListener('scroll', syncActivity, { passive: true })
  window.addEventListener('resize', resize, { passive: true })
  resize()
})

onBeforeUnmount(() => {
  mounted = false
  clock.setRunning(false, performance.now())
  stopWork()
  observer?.disconnect()
  resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', syncActivity)
  window.removeEventListener('scroll', syncActivity)
  window.removeEventListener('resize', resize)
  tiles.value = []
  painters.forEach(painter => painter.dispose())
  painters.clear()
})
</script>

<template>
  <div ref="root" class="nh3-ambient" aria-hidden="true">
    <div v-for="tile in rendered" :key="tile.scene.id" class="nh3-ambient-tile" :data-kind="tile.scene.kind" :data-pen="tile.scene.pen"
      :style="{ left: `${tile.box.x}px`, top: `${tile.box.y}px`, width: `${tile.box.width}px`, height: `${tile.box.height}px` }">
      <canvas :ref="element => bindCanvas(tile.scene.id, element)" class="nh3-ambient-canvas" />
      <svg class="nh3-ambient-cursor" viewBox="0 0 300 90">
      <g v-if="tile.frame.cursor" class="nh3-ambient-eraser" :transform="`translate(${tile.frame.cursor.x} ${tile.frame.cursor.y}) scale(${(mobile ? 6 : 9) * 300 / tile.box.width})`">
        <circle r="1" fill="white" stroke="#cfcfcf" stroke-width="0.08" />
        <rect v-for="side in [-1, 1]" :key="side" :x="side * 0.24 - 0.1" y="-0.48" width="0.2" height="0.96" rx="0.1" fill="#cfcfcf" />
      </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.nh3-ambient {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}

.nh3-ambient-tile {
  position: absolute;
  overflow: visible;
  pointer-events: none;
}

.nh3-ambient-canvas,
.nh3-ambient-cursor { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }

.nh3-ambient-eraser { opacity: 0.75; }
</style>
