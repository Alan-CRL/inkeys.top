const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { load, canvasRuntime } = require('./harness.cjs')
const { createCanvas, Path2D } = canvasRuntime()
global.Path2D = Path2D
global.document = { createElement: () => createCanvas(1, 1) }
const { createScene, createPainter, BASE_WIDTH } = load('softPen')
const { PEN_ORDER, SIZE_SCALE } = load('styles')
const state = { phase: 'static', rawTime: -1, inkTime: 4.2, opacity: 1 }
const pixel = (canvas, x, y) => [...canvas.getContext('2d').getImageData(x, y, 1, 1).data]
const hash = canvas => createHash('sha256').update(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data).digest('hex')
function stroke(retrace = false) {
  const points = retrace ? [[40, 50], [140, 50], [40, 50]] : [[40, 50], [140, 50]]
  return { name: 'test', raw: [], start: 0, end: 1, ink: points.map(([x, y], i) => ({ x, y, s: i * 100, t: i / (points.length - 1), width: BASE_WIDTH, speed: 100 })) }
}
function synthetic(strokes, pen) {
  const canvas = createCanvas(180, 100)
  const scene = { strokes, bounds: { minX: 0, minY: 0, maxX: 180, maxY: 100 }, aspect: 1.8, duration: 4.2, length: 300 }
  createPainter(scene, canvas).render(state, 180, 100, 1, 'light', { pen, size: 'medium', color: 'red' })
  return canvas
}
const high = synthetic([stroke()], 'highlighter')
assert.ok(Math.abs(pixel(high, 90, 50)[3] - 0.35 * 255) <= 1)
const retraced = synthetic([stroke(true)], 'highlighter')
for (let y = 30; y < 70; y++) for (let x = 30; x < 150; x++) {
  assert.ok(Math.abs(pixel(high, x, y)[3] - pixel(retraced, x, y)[3]) <= 1, 'same-stroke overlap must not darken beyond AA quantization')
}
assert.ok(Math.abs(pixel(synthetic([stroke(), stroke()], 'highlighter'), 90, 50)[3] - 0.5775 * 255) <= 1)
assert.equal(pixel(synthetic([stroke()], 'brush'), 90, 50)[3], 255)
const laser = synthetic([stroke()], 'laser')
assert.equal(hash(laser), hash(synthetic([stroke(true)], 'laser')), 'laser coverage must use MAX before resolve')
assert.deepEqual(pixel(laser, 90, 50), [255, 255, 255, 255])
assert.ok(pixel(laser, 90, 65)[3] > 0 && pixel(laser, 90, 65)[3] < 255)
assert.equal(pixel(laser, 90, 76)[3], 0)

// 用实际栅格结果验证：软笔起笔/主体与硬笔相同，只有最后一段连续变细。
const straight = stroke()
straight.ink = Array.from({ length: 201 }, (_, i) => ({
  x: 40 + i / 2, y: 50, s: i / 2, t: i / 200, width: BASE_WIDTH, speed: 100,
}))
const hardLine = synthetic([straight], 'hard')
const softLine = synthetic([straight], 'soft')
for (let y = 35; y < 65; y++) for (let x = 30; x < 108; x++) {
  assert.deepEqual(pixel(softLine, x, y), pixel(hardLine, x, y), 'soft start/body must retain full hard width and round cap')
}
const columnWidth = (canvas, x) => {
  let sum = 0
  for (let y = 30; y < 70; y++) sum += pixel(canvas, x, y)[3] / 255
  return sum
}
let previousWidth = columnWidth(softLine, 117)
const tailWidths = []
for (let x = 118; x <= 139; x++) {
  const currentWidth = columnWidth(softLine, x)
  assert.ok(currentWidth <= previousWidth + 0.06, 'tail must not swell during taper')
  assert.ok(previousWidth - currentWidth < 1.8, 'tail must not have an abrupt width step')
  tailWidths.push(currentWidth)
  previousWidth = currentWidth
}
assert.ok(tailWidths[0] > BASE_WIDTH * 0.9 && tailWidths.at(-1) < BASE_WIDTH * 0.2)
assert.ok(tailWidths.filter(width => width > BASE_WIDTH * 0.25 && width < BASE_WIDTH * 0.85).length >= 7, 'tail needs an extended gradual transition')

const scene = createScene()
let cases = 0
let laserFullMs = 0
for (const pen of PEN_ORDER) {
  for (const theme of ['light', 'dark']) {
    for (const size of Object.keys(SIZE_SCALE)) {
      const width = 900
      const height = Math.ceil(width / scene.aspect)
      const canvas = createCanvas(width, height)
      const painter = createPainter(scene, canvas)
      const style = { pen, color: pen === 'hard' || pen === 'soft' ? 'rainbow' : 'cyan', size }
      const started = performance.now()
      painter.render(state, width, height, 1, theme, style)
      if (pen === 'laser') laserFullMs = Math.max(laserFullMs, performance.now() - started)
      const image = canvas.getContext('2d').getImageData(0, 0, width, height).data
      for (let x = 0; x < width; x++) {
        assert.equal(image[x * 4 + 3], 0, `${pen}/${size} top clipping`)
        assert.equal(image[((height - 1) * width + x) * 4 + 3], 0, `${pen}/${size} bottom clipping`)
      }
      for (let y = 0; y < height; y++) {
        assert.equal(image[(y * width) * 4 + 3], 0, `${pen}/${size} left clipping`)
        assert.equal(image[(y * width + width - 1) * 4 + 3], 0, `${pen}/${size} right clipping`)
      }
      const full = hash(canvas)
      painter.render({ ...state, opacity: 0.3 }, width, height, 1, theme, style)
      painter.render(state, width, height, 1, theme, style)
      assert.equal(hash(canvas), full, 'fade must reuse material without changing it')
      if (size === 'medium') fs.writeFileSync(path.join(__dirname, 'frames', `material-${pen}-${theme}.png`), canvas.toBuffer('image/png'))
      cases++
    }
  }
}
const activeCanvas = createCanvas(1, 1)
const activePainter = createPainter(scene, activeCanvas)
const durations = []
const laserStyle = { pen: 'laser', color: 'cyan', size: 'thick' }
for (let i = 0; i <= 252; i++) {
  const now = performance.now()
  activePainter.render({ ...state, inkTime: i / 60 }, 900, 900 / scene.aspect, 2, 'dark', laserStyle)
  durations.push(performance.now() - now)
}
for (const [time, width, dpr, theme, color] of [
  [2.31, 900, 2, 'dark', 'cyan'], [2.48, 900, 2, 'dark', 'cyan'],
  [4.2, 900, 2, 'dark', 'cyan'], [0.14, 900, 2, 'dark', 'cyan'],
  [1.97, 900, 2, 'light', 'red'], [2.17, 375, 1, 'light', 'red'],
  ...scene.strokes.slice(0, -1).map(stroke => [stroke.end + 0.03, 600, 1, 'dark', 'blue']),
]) {
  const frame = { ...state, inkTime: time }
  const style = { ...laserStyle, color }
  const fresh = createCanvas(1, 1)
  activePainter.render(frame, width, width / scene.aspect, dpr, theme, style)
  createPainter(scene, fresh).render(frame, width, width / scene.aspect, dpr, theme, style)
  assert.equal(hash(activeCanvas), hash(fresh), `laser incremental mismatch at ${time}, ${width}, ${theme}`)
}
durations.sort((a, b) => a - b)
console.log(JSON.stringify({ result: 'PASS', materialCases: cases, laserFullMs: Math.round(laserFullMs),
  laser900Dpr2: { median: durations[126], p95: durations[240], max: durations.at(-1) },
  highlighterAlpha: 0.35, separateStrokeOverlap: 0.5775 }))
