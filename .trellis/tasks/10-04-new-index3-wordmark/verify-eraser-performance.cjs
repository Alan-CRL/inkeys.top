// 真实离屏 Canvas 的增量工作量和逐帧耗时；不代表浏览器 GPU/FPS 测量。
const assert = require('node:assert/strict')
const { performance } = require('node:perf_hooks')
const { createHash } = require('node:crypto')
const { load, canvasRuntime } = require('./harness.cjs')
const { createCanvas, Path2D } = canvasRuntime()
global.Path2D = Path2D
let eraseFills = 0
global.document = {
  createElement() {
    const canvas = createCanvas(1, 1)
    const context = canvas.getContext('2d')
    const fill = context.fill.bind(context)
    context.fill = (...args) => {
      if (context.globalCompositeOperation === 'destination-out') eraseFills++
      return fill(...args)
    }
    return canvas
  },
}
const { createScene, createPainter } = load('softPen')
const { ERASE_SECONDS, getEraserFrame } = load('eraser')
const scene = createScene()
const state = { phase: 'static', rawTime: -1, inkTime: 4.2, opacity: 1 }
const style = { pen: 'hard', color: 'rainbow', size: 'medium' }
const width = 900
const height = Math.ceil(width / scene.aspect)
const canvas = createCanvas(1, 1)
const painter = createPainter(scene, canvas)
const flush = () => canvas.getContext('2d').getImageData(0, 0, 1, 1)
const pixels = target => target.getContext('2d').getImageData(0, 0, target.width, target.height).data
const hash = target => createHash('sha256').update(pixels(target)).digest('hex')
const percentile = (data, fraction) => [...data].sort((a, b) => a - b)[Math.ceil(data.length * fraction) - 1]
const summarize = data => ({ frames: data.length, medianMs: +percentile(data, 0.5).toFixed(3), p95Ms: +percentile(data, 0.95).toFixed(3) })

// 先预热字形与路径编译，正常前进每帧仅新增约两个120Hz块，工作量不随历史增长。
painter.render(state, width, height, 2, 'light', style, 1)
painter.render(state, width, height, 2, 'light', style, 0)
eraseFills = 0
const sequential = []
let peakAppended = 0
for (let frame = 1; frame <= Math.ceil(ERASE_SECONDS * 60); frame++) {
  const progress = Math.min(1, frame / (ERASE_SECONDS * 60))
  const before = eraseFills
  const start = performance.now()
  painter.render(state, width, height, 2, 'light', style, progress)
  flush()
  sequential.push(performance.now() - start)
  const appended = eraseFills - before
  peakAppended = Math.max(peakAppended, appended)
  assert.ok(appended <= 3, `forward frame ${frame} replayed ${appended} history blocks`)
}
assert.equal(eraseFills, getEraserFrame(1, width, height).paths.length, 'a full forward sweep must rasterize each immutable block exactly once')
assert.ok(pixels(canvas).every((value, index) => index % 4 !== 3 || value === 0), 'completed sweep must leave no material/halo pixels')

// 以淡出强制真实重合成：同一进度、换色/主题/粗细不再栅格化擦除历史。
const frozen = []
for (const progress of [0.1, 0.5, 0.9, 1]) {
  painter.render(state, width, height, 2, 'light', style, progress)
  flush()
  const before = eraseFills
  const samples = []
  for (let frame = 0; frame < 25; frame++) {
    const start = performance.now()
    painter.render({ ...state, opacity: 0.95 + frame * 0.001 }, width, height, 2, 'light', style, progress)
    flush()
    samples.push(performance.now() - start)
  }
  assert.equal(eraseFills, before, `pause fade re-rasterized mask at ${progress}`)
  frozen.push({ progress, ...summarize(samples) })
}
const beforeStyleChange = eraseFills
painter.render(state, width, height, 2, 'dark', { ...style, color: 'red', size: 'thick' }, 1)
assert.equal(eraseFills, beforeStyleChange, 'style/theme refresh re-rasterized unchanged mask')

// 回退、停用/重启、同像素尺寸但CSS/DPR不同均须确定性重建；完整材质缓存不能被擦除污染。
const replayCanvas = createCanvas(1, 1)
const replayPainter = createPainter(scene, replayCanvas)
let deterministicCases = 0
for (const [w, dpr, progress, opacity, theme, pen] of [
  [320, 1, 0.2, 1, 'light', 'hard'],
  [320, 1, 0.9, 1, 'light', 'hard'],
  [320, 1, 0.2, 1, 'light', 'hard'],
  [320, 1, 0.2, 0.4, 'dark', 'highlighter'],
  [320, 1, 0.2, 1, 'light', 'highlighter'],
  [160, 2, 0.2, 1, 'light', 'highlighter'],
  [320, 1, 0.2, 1, 'light', 'highlighter'],
  [320, 1, -1, 1, 'light', 'brush'],
  [320, 1, 0.2, 1, 'light', 'brush'],
  [320, 2, 1, 1, 'dark', 'laser'],
  [320, 2, 0.2, 1, 'dark', 'laser'],
  [320, 2, 0, 1, 'dark', 'laser'],
  [320, 2, 0.2, 1, 'dark', 'laser'],
]) {
  const h = w / scene.aspect
  const appearance = { pen, color: 'cyan', size: 'thick' }
  replayPainter.render({ ...state, opacity }, w, h, dpr, theme, appearance, progress)
  const fresh = createCanvas(1, 1)
  createPainter(scene, fresh).render({ ...state, opacity }, w, h, dpr, theme, appearance, progress)
  assert.equal(hash(replayCanvas), hash(fresh), `mask reset/cache mismatch ${w}/${dpr}/${progress}/${pen}/${theme}/${opacity}`)
  deterministicCases++
}

// 保留最脆弱的抗锯齿边缘单调断言，不能仅比较总alpha掩盖局部像素重现。
const monotonicCanvas = createCanvas(1, 1)
const monotonicPainter = createPainter(scene, monotonicCanvas)
let previous = null
for (let frame = 0; frame <= 60; frame++) {
  monotonicPainter.render(state, 320, 320 / scene.aspect, 1, 'light', style, frame / 60)
  const current = pixels(monotonicCanvas)
  if (previous) for (let index = 3; index < current.length; index += 4) {
    assert.ok(current[index] <= previous[index], `forward erasure restored antialiased edge at frame ${frame}, pixel ${index >> 2}`)
  }
  previous = current
}
console.log(JSON.stringify({
  result: 'PASS', backend: '@napi-rs/canvas, CPU, 900px / DPR2, synchronous pixel flush',
  sequential60Hz: summarize(sequential),
  lateSequential: summarize(sequential.slice(Math.floor(sequential.length * 0.75))),
  peakAppended, immutableBlocks: getEraserFrame(1, width, height).paths.length,
  frozenProgress: frozen, deterministicCases, monotonicFrames: 61,
}, null, 2))
