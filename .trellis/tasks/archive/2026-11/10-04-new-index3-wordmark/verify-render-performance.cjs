// 对已提交基线逐帧像素对照与CPU离屏耗时，不开启浏览器或改变显示质量。
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { performance } = require('node:perf_hooks')
const Module = require('node:module')
const path = require('node:path')
const fs = require('node:fs')
const ts = require('typescript')
const { load, sourceRoot, canvasRuntime } = require('./harness.cjs')
const { createCanvas, Path2D } = canvasRuntime()
global.Path2D = Path2D
global.document = { createElement: () => createCanvas(1, 1) }
const baselineFile = path.join(__dirname, 'before/softPen-b1a68a2.ts')
const baselineSource = fs.existsSync(baselineFile) ? fs.readFileSync(baselineFile, 'utf8')
  : execFileSync('git', ['show', 'b1a68a2:docs/.vuepress/theme/components/NewHome3/softPen.ts'], { encoding: 'utf8' })
const baselineModule = new Module(path.join(sourceRoot, 'softPen-baseline.ts'), module)
baselineModule.filename = path.join(sourceRoot, 'softPen-baseline.ts')
baselineModule.paths = Module._nodeModulePaths(sourceRoot)
baselineModule._compile(ts.transpileModule(baselineSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, baselineModule.filename)
const baseline = baselineModule.exports
const current = load('softPen')
if (process.argv.includes('--cold')) {
  const start = performance.now()
  const scene = current.createScene()
  const sceneMs = performance.now() - start
  const canvas = createCanvas(1, 1)
  const painterStart = performance.now()
  const painter = current.createPainter(scene, canvas)
  const painterMs = performance.now() - painterStart
  const width = 900
  const height = width / scene.aspect
  const state = { phase: 'static', rawTime: -1, inkTime: 4.2, opacity: 0.01 }
  const first = performance.now()
  painter.render(state, width, height, 2)
  canvas.getContext('2d').getImageData(0, 0, 1, 1)
  const initialFullInkMs = performance.now() - first
  const geometryStart = performance.now()
  load('eraser').getEraserFrame(0.001, width, height)
  const eraserGeometryMs = performance.now() - geometryStart
  const erasingStart = performance.now()
  painter.render({ ...state, opacity: 1 }, width, height, 2, 'light', undefined, 0.001)
  canvas.getContext('2d').getImageData(0, 0, 1, 1)
  console.log(JSON.stringify({ result: 'PASS', cold900Dpr2: { sceneMs, painterMs, initialFullInkMs, eraserGeometryMs, firstMaskMs: performance.now() - erasingStart } }, null, 2))
  process.exit(0)
}
const scene = baseline.createScene()
const state = { phase: 'ink', rawTime: -1, inkTime: 0, opacity: 1 }
const hash = canvas => createHash('sha256').update(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data).digest('hex')
const statistics = samples => {
  const sorted = [...samples].sort((a, b) => a - b)
  return { medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(3), p95Ms: +sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(3), maxMs: +sorted.at(-1).toFixed(3) }
}
const benchmark = process.argv.includes('--benchmark')
const baselineOnly = process.argv.includes('--baseline-only')
const benchmarkOnly = process.argv.includes('--benchmark-only')
const requestedPens = process.env.RENDER_PENS ? process.env.RENDER_PENS.split(',') : ['hard', 'soft', 'highlighter', 'laser', 'brush']
const results = []
let comparisons = 0
for (const pen of requestedPens) {
  const style = { pen, color: ['hard', 'soft'].includes(pen) ? 'rainbow' : 'cyan', size: 'medium' }
  const width = 900
  const height = width / scene.aspect
  if (benchmark) {
    const timings = {}
    const renderers = (baselineOnly ? [['before', baseline]] : [['before', baseline], ['after', current]]).map(([label, renderer]) => {
      const canvas = createCanvas(1, 1)
      const painter = renderer.createPainter(scene, canvas)
      const groups = { write: [], hold: [], fade: [], erase: [] }
      return { label, canvas, painter, groups }
    })
    const frames = [
      ...Array.from({ length: 127 }, (_, i) => ['write', { ...state, inkTime: i / 30 }, -1]),
      ...Array.from({ length: 15 }, () => ['hold', { ...state, inkTime: 4.2 }, -1]),
      ...Array.from({ length: 21 }, (_, i) => ['fade', { ...state, inkTime: 4.2, opacity: 1 - i / 21 }, -1]),
      ...Array.from({ length: 73 }, (_, i) => ['erase', { ...state, inkTime: 4.2 }, i / 72]),
    ]
    // 同一帧交错测量且轮换先后，减少CPU温度/后台负载对先测整轮基线的偏差。
    for (const [index, [phase, frame, progress]] of frames.entries()) {
      for (const { canvas, painter, groups } of index % 2 ? [...renderers].reverse() : renderers) {
        const start = performance.now()
        painter.render(frame, width, height, 2, 'light', style, progress)
        canvas.getContext('2d').getImageData(0, 0, 1, 1)
        groups[phase].push(performance.now() - start)
      }
    }
    for (const { label, groups } of renderers) timings[label] = Object.fromEntries(Object.entries(groups).map(([phase, times]) => [phase, statistics(times)]))
    results.push({ pen, ...timings })
  }
  if (baselineOnly || benchmarkOnly) continue
  const actual = createCanvas(1, 1)
  const expected = createCanvas(1, 1)
  const painter = current.createPainter(scene, actual)
  const reference = baseline.createPainter(scene, expected)
  // 连续播放必须复用同一缓存，而不只验证每次换肤后的冷重绘。
  for (let index = 0; index <= 126; index++) {
    const frame = { ...state, inkTime: index / 30 }
    painter.render(frame, 375, 375 / scene.aspect, 1, 'light', style)
    reference.render(frame, 375, 375 / scene.aspect, 1, 'light', style)
    assert.equal(hash(actual), hash(expected), `sequential prefix changed baseline pixels: ${pen}/${index}`)
    comparisons++
  }
  const frames = [0, 0.04, 0.23, 0.48, 0.9, 1.25, 1.7, 2.2, 2.51, 2.98, 3.5, 3.83, 4.2,
    ...scene.strokes.flatMap(stroke => [stroke.end - 1e-5, stroke.end, stroke.end + 0.035]),
    2.31, 0.48, 3.77, 4.2]
  for (const time of frames) {
    const frame = { ...state, inkTime: time }
    for (const [w, dpr, theme, color, opacity, erasure] of [
      [375, 1, 'light', style.color, 1, -1],
      [375, 1, 'light', style.color, 0.37, -1],
      [375, 1, 'dark', 'red', 1, -1],
      [375, 1, 'light', style.color, 1, -1],
    ]) {
      const appearance = { ...style, color }
      const paint = { ...frame, opacity }
      painter.render(paint, w, w / scene.aspect, dpr, theme, appearance, erasure)
      reference.render(paint, w, w / scene.aspect, dpr, theme, appearance, erasure)
      assert.equal(hash(actual), hash(expected), `baseline pixel change: ${pen}/${time}/${w}/${dpr}/${theme}/${opacity}`)
      comparisons++
    }
  }
  for (const [time, w, dpr, theme, size, erase, opacity] of [
    [3.21, 600, 2, 'dark', 'thick', -1, 1], [3.87, 600, 2, 'dark', 'thick', -1, 0.5],
    [4.2, 600, 2, 'dark', 'thick', 0.51, 1], [4.2, 600, 2, 'dark', 'thick', 0.91, 1],
    [4.2, 600, 2, 'dark', 'thick', 0.51, 0.4], [1.11, 300, 1, 'light', 'thin', -1, 1],
    [3.85, 300, 1, 'light', 'thin', -1, 1], [2.77, 375, 2, 'dark', 'medium', -1, 1],
  ]) {
    const appearance = { ...style, size }
    const frame = { ...state, inkTime: time, opacity }
    painter.render(frame, w, w / scene.aspect, dpr, theme, appearance, erase)
    reference.render(frame, w, w / scene.aspect, dpr, theme, appearance, erase)
    assert.equal(hash(actual), hash(expected), `resize/rewind/erasure changed baseline pixels: ${pen}/${time}/${w}/${dpr}/${theme}/${size}/${erase}`)
    comparisons++
  }
  // 负对照：改变真实样式必须使像素变化，防止缓存返回上一帧而假通过。
  painter.render({ ...state, inkTime: 4.2 }, 375, 375 / scene.aspect, 1, 'light', { ...style, color: 'red' })
  const red = hash(actual)
  painter.render({ ...state, inkTime: 4.2 }, 375, 375 / scene.aspect, 1, 'light', { ...style, color: 'blue' })
  assert.notEqual(hash(actual), red, 'style update was swallowed by stale cache')
}
console.log(JSON.stringify({ result: 'PASS', backend: 'native Canvas CPU, 900px DPR2, synchronous 1px flush', baselineCommit: 'b1a68a2', comparisons, results }, null, 2))
