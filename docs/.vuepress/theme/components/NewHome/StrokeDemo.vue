<script setup lang="ts">
import type { InkPoint, StrokeMode } from './inkGeometry'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { mulberry32, outline, smoothstep } from './inkGeometry'

const props = defineProps<{ mode: StrokeMode }>()

const DRAW_MS = 2600
const HOLD_MS = 1500
const FADE_MS = 500
const CYCLE_MS = DRAW_MS + HOLD_MS + FADE_MS
const SAMPLES = 320

const wrap = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

let ctx: CanvasRenderingContext2D | null = null
let width = 0
let height = 0
let raw: { x: number, y: number }[] = []
let smooth: InkPoint[] = []
let colors = { ink: '#111', ghost: 'rgba(0,0,0,.2)', accent: '#008c69', accentRgb: '0,140,105' }
let frame = 0
let start = 0
let visible = false
let reducedMotion = false
let resizeObserver: ResizeObserver | undefined
let intersectionObserver: IntersectionObserver | undefined
let themeObserver: MutationObserver | undefined

function readColors() {
  if (!wrap.value)
    return
  const style = getComputedStyle(wrap.value)
  colors = {
    ink: style.getPropertyValue('--nh-text-1').trim() || colors.ink,
    ghost: style.getPropertyValue('--nh-text-3').trim() || colors.ghost,
    accent: style.getPropertyValue('--nh-accent').trim() || colors.accent,
    accentRgb: style.getPropertyValue('--nh-accent-rgb').trim() || colors.accentRgb,
  }
}

function movingAverage<T extends { x: number, y: number }>(points: T[], radius: number) {
  return points.map((point, i) => {
    let x = 0
    let y = 0
    let count = 0
    for (let j = Math.max(0, i - radius); j <= Math.min(points.length - 1, i + radius); j++) {
      x += points[j].x
      y += points[j].y
      count++
    }
    return { ...point, x: x / count, y: y / count }
  })
}

// 手写连笔：长短幅摆线形成连续的圈，速度变化天然产生粗细
function buildStrokes() {
  const loops = 4
  const span = loops * Math.PI * 2
  const b = 1.9
  const scaleX = (width * 0.84) / (span + 2 * b)
  const scaleY = height * 0.15
  const base: { x: number, y: number }[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES
    const theta = -Math.PI / 2 + t * span
    base.push({
      x: width * 0.08 + (theta + Math.PI / 2 - b * Math.sin(theta) + b) * scaleX,
      y: height * 0.54 - b * Math.cos(theta) * scaleY - t * height * 0.08,
    })
  }

  const random = mulberry32(7)
  const jitter = Math.max(1.4, width / 380)
  raw = base
    .filter((_, i) => i % 4 === 0)
    .map((p, i) => ({
      x: p.x + (random() - 0.5) * jitter * 2 + Math.sin(i * 0.9) * jitter * 0.6,
      y: p.y + (random() - 0.5) * jitter * 2 + Math.cos(i * 1.3) * jitter * 0.6,
    }))

  const dense: { x: number, y: number }[] = []
  for (let i = 0; i < raw.length - 1; i++) {
    for (let k = 0; k < 4; k++) {
      const f = k / 4
      dense.push({ x: raw[i].x + (raw[i + 1].x - raw[i].x) * f, y: raw[i].y + (raw[i + 1].y - raw[i].y) * f })
    }
  }
  dense.push(raw[raw.length - 1])
  const smoothed = movingAverage(movingAverage(dense, 5), 4)

  const baseWidth = Math.max(4, Math.min(9, width / 110))
  const speeds = smoothed.map((p, i) => {
    const q = smoothed[Math.min(smoothed.length - 1, i + 1)]
    return Math.hypot(q.x - p.x, q.y - p.y)
  })
  const maxSpeed = Math.max(...speeds) || 1
  const widths = movingAverage(speeds.map((s, i) => ({ x: s, y: i })), 6).map(p => p.x / maxSpeed)
  smooth = smoothed.map((p, i) => ({ ...p, w: baseWidth * Math.min(1.45, Math.max(0.4, 1.5 - widths[i] * 1.1)) }))
}

function resize() {
  const el = wrap.value
  const cv = canvas.value
  if (!el || !cv)
    return
  const rect = el.getBoundingClientRect()
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  width = rect.width
  height = rect.height
  cv.width = Math.round(width * dpr)
  cv.height = Math.round(height * dpr)
  ctx = cv.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  buildStrokes()
  if (!frame)
    draw(reducedMotion || !visible ? DRAW_MS : performance.now() - start)
}

function strokePolyline(points: { x: number, y: number }[], lineWidth: number, color: string) {
  if (!ctx || points.length < 2)
    return
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++)
    ctx.lineTo(points[i].x, points[i].y)
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = color
  ctx.stroke()
}

function fillTapered(points: InkPoint[]) {
  if (!ctx || points.length < 2)
    return
  const last = points.length - 1
  const tapered = points.map((p, i) => ({
    ...p,
    w: p.w * Math.max(0.08, Math.min(smoothstep(0, 22, i), smoothstep(0, 30, last - i))),
  }))
  const { left, right } = outline(tapered)
  ctx.beginPath()
  ctx.moveTo(left[0][0], left[0][1])
  for (const [x, y] of left)
    ctx.lineTo(x, y)
  for (let i = right.length - 1; i >= 0; i--)
    ctx.lineTo(right[i][0], right[i][1])
  ctx.closePath()
  ctx.fillStyle = colors.ink
  ctx.fill()
}

function drawTip(point: { x: number, y: number }) {
  if (!ctx)
    return
  const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 18)
  glow.addColorStop(0, `rgba(${colors.accentRgb}, 0.45)`)
  glow.addColorStop(1, `rgba(${colors.accentRgb}, 0)`)
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(point.x, point.y, 18, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = colors.accent
  ctx.beginPath()
  ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2)
  ctx.fill()
}

function draw(elapsed: number) {
  if (!ctx || !width)
    return
  const t = elapsed % CYCLE_MS
  const drawing = t < DRAW_MS
  const progress = drawing ? 0.5 - Math.cos((t / DRAW_MS) * Math.PI) / 2 : 1
  const alpha = t > DRAW_MS + HOLD_MS ? 1 - (t - DRAW_MS - HOLD_MS) / FADE_MS : 1

  ctx.clearRect(0, 0, width, height)
  ctx.globalAlpha = Math.max(0, alpha)

  const rawCount = Math.max(2, Math.ceil(raw.length * progress))
  const smoothCount = Math.max(2, Math.ceil(smooth.length * progress))
  const lineWidth = Math.max(3, Math.min(6, width / 150))

  if (props.mode === 'raw') {
    strokePolyline(raw.slice(0, rawCount), lineWidth, colors.ink)
  }
  else {
    strokePolyline(raw.slice(0, rawCount), 1.2, colors.ghost)
    if (props.mode === 'smooth')
      strokePolyline(smooth.slice(0, smoothCount), lineWidth, colors.ink)
    else
      fillTapered(smooth.slice(0, smoothCount))
  }

  if (drawing) {
    const tip = props.mode === 'raw' ? raw[rawCount - 1] : smooth[smoothCount - 1]
    drawTip(tip)
  }
  ctx.globalAlpha = 1
}

function loop(now: number) {
  draw(now - start)
  frame = requestAnimationFrame(loop)
}

function play() {
  if (frame || reducedMotion || !visible)
    return
  start = performance.now()
  frame = requestAnimationFrame(loop)
}

function stop() {
  if (frame)
    cancelAnimationFrame(frame)
  frame = 0
}

watch(() => props.mode, () => {
  stop()
  if (reducedMotion || !visible)
    draw(DRAW_MS)
  else
    play()
})

onMounted(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  readColors()
  resize()

  resizeObserver = new ResizeObserver(() => resize())
  if (wrap.value)
    resizeObserver.observe(wrap.value)

  intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible)
      play()
    else
      stop()
  }, { threshold: 0.2 })
  if (wrap.value)
    intersectionObserver.observe(wrap.value)

  themeObserver = new MutationObserver(() => {
    readColors()
    if (!frame)
      draw(DRAW_MS)
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

onBeforeUnmount(() => {
  stop()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  themeObserver?.disconnect()
})
</script>

<template>
  <div ref="wrap" class="nh-stroke-demo">
    <canvas ref="canvas" class="nh-stroke-canvas" role="img" aria-label="笔迹处理演示：原始输入、实时平滑与实时笔锋的对比" />
  </div>
</template>

<style scoped>
.nh-stroke-demo {
  position: absolute;
  inset: 0;
}

.nh-stroke-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
