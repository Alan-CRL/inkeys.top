const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { load, canvasRuntime } = require('./harness.cjs')
const { createCanvas, Path2D } = canvasRuntime()
global.Path2D = Path2D
global.document = { createElement: () => createCanvas(1, 1) }
const { getEraserFrame, createEraserRoute, ERASE_SECONDS } = load('eraser')
const revealSteps = ERASE_SECONDS * 120
const { createScene, createPainter, computeLayout } = load('softPen')
const { PEN_ORDER, SIZE_SCALE } = load('styles')
const pixels = canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
const alphaSum = data => {
  let sum = 0
  for (let i = 3; i < data.length; i += 4) sum += data[i]
  return sum
}
const scene = createScene()
const state = { phase: 'static', rawTime: -1, inkTime: 4.2, opacity: 1 }
const dimensions = [320, 375, 768, 1440, 1920].map(width => [width, Math.ceil(width / scene.aspect)])
dimensions.push([202, Math.ceil(202 / scene.aspect)], [900, 400])
let masks = 0
for (const [width, height] of dimensions) {
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  const complete = getEraserFrame(1, width, height)
  assert.equal(getEraserFrame(0, width, height).path, '')
  assert.ok(complete.cursor.x > width / 2 && complete.cursor.y > height / 2)
  let previous = null
  let previousRadius = getEraserFrame(0, width, height).cursor.radius
  for (let step = 0; step <= 168; step++) {
    const frame = getEraserFrame(step / 168, width, height)
    assert.ok(Object.values(frame.cursor).every(Number.isFinite))
    assert.ok(frame.cursor.radius >= height * 0.18)
    assert.ok(frame.cursor.radius <= (height * 0.18 + 1) * 1.35)
    assert.ok(Math.abs(frame.cursor.radius - previousRadius) < height * 0.008, 'growth and turns must remain gradual')
    previousRadius = frame.cursor.radius
  }
  for (const progress of [0, 0.03, 0.19, 0.41, 0.66, 0.83, 0.97, 1]) {
    context.globalCompositeOperation = 'source-over'
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    context.globalCompositeOperation = 'destination-out'
    for (const segment of getEraserFrame(progress, width, height).paths) context.fill(new Path2D(segment))
    const current = pixels(canvas)
    if (previous) for (let i = 3; i < current.length; i += 4) {
      assert.ok(current[i] <= previous[i], 'erased pixels must never reappear, including antialiased edges')
    }
    if (!progress) assert.equal(alphaSum(current), width * height * 255)
    // DOM 艺术字的空角不属于墨迹：90%×88% 的圆角代理仍覆盖宽字体，避免为满矩形加入机械补擦。
    if (progress === 1) for (let y = Math.floor(height * 0.06); y <= Math.ceil(height * 0.94); y++) {
      for (let x = Math.floor(width * 0.05); x <= Math.ceil(width * 0.95); x++) {
        const corner = height * 0.30
        const cx = Math.max(width * 0.05 + corner, Math.min(width * 0.95 - corner, x))
        const cy = Math.max(height * 0.06 + corner, Math.min(height * 0.94 - corner, y))
        if (Math.hypot(x - cx, y - cy) > corner) continue
        assert.equal(current[(y * width + x) * 4 + 3], 0, `sweep must cover conservative art envelope ${width}x${height} at ${x},${y}`)
      }
    }
    previous = current
    masks++
  }
  assert.deepEqual(getEraserFrame(1, width, height), complete, 'seeking must be deterministic')
  // 艺术字包围范围大于实际 DOM 字高，验证相同分段路径的 SVG 亮度遮罩语义。
  context.globalCompositeOperation = 'source-over'
  context.fillStyle = '#fff'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#000'
  for (const segment of complete.paths) context.fill(new Path2D(segment))
  const artMask = pixels(canvas)
  for (let y = Math.floor(height * 0.06); y <= Math.ceil(height * 0.94); y++) {
    for (let x = Math.floor(width * 0.05); x <= Math.ceil(width * 0.95); x++) {
      const corner = height * 0.30
      const cx = Math.max(width * 0.05 + corner, Math.min(width * 0.95 - corner, x))
      const cy = Math.max(height * 0.06 + corner, Math.min(height * 0.94 - corner, y))
      if (Math.hypot(x - cx, y - cy) <= corner) assert.equal(artMask[(y * width + x) * 4], 0)
    }
  }
}

// 投影真实光标圆周，包含 rotateY → rotateX → translate 和父级透视；不缩小已认可字形。
let minimumClearance = Infinity
let minimumVerticalClearance = Infinity
for (const viewport of [320, 375, 640, 768, 1100, 1440, 1920]) for (const available of [180, 300, 402, 505, 555, 700]) {
  const { width, height, centerY } = computeLayout(viewport, available, scene.aspect)
  for (let step = 0; step <= revealSteps; step++) {
    const cursor = getEraserFrame(step / revealSteps, width, height).cursor
    for (const tx of [-1, 1]) for (const ty of [-1, 1]) for (let i = 0; i < 32; i++) {
      const angle = i * Math.PI / 16
      const x = cursor.x + Math.cos(angle) * cursor.radius - width / 2
      const y = cursor.y + Math.sin(angle) * cursor.radius - height / 2
      const ry = tx * 4 * Math.PI / 180
      const rx = -ty * 4 * Math.PI / 180
      const rotatedX = x * Math.cos(ry)
      const rotatedY = y * Math.cos(rx) + x * Math.sin(ry) * Math.sin(rx)
      const rotatedZ = y * Math.sin(rx) - x * Math.sin(ry) * Math.cos(rx)
      const screenX = viewport / 2 + (rotatedX + tx * 6) / (1 - rotatedZ / 1200)
      const screenY = centerY + (rotatedY + ty * 6) / (1 - rotatedZ / 1200)
      minimumClearance = Math.min(minimumClearance, screenX, viewport - screenX)
      minimumVerticalClearance = Math.min(minimumVerticalClearance, screenY, available - screenY)
      assert.ok(screenX >= 16 && viewport - screenX >= 16, `cursor viewport clearance at ${viewport}/${available}`)
      assert.ok(screenY >= 0 && available - screenY >= 0, `cursor vertical clearance at ${viewport}/${available}`)
    }
  }
}

const route = createEraserRoute(900, 406)
const evaluate = (points, t) => {
  let work = points.map(p => ({ ...p }))
  while (work.length > 1) work = work.slice(1).map((p, i) => ({ x: work[i].x * (1 - t) + p.x * t, y: work[i].y * (1 - t) + p.y * t }))
  return work[0]
}
const derivative = points => points.slice(1).map((p, i) => ({ x: (p.x - points[i].x) * (points.length - 1), y: (p.y - points[i].y) * (points.length - 1) }))
const endpoint = (points, t) => {
  const first = derivative(points)
  const d = evaluate(first, t)
  const a = evaluate(derivative(first), t)
  const speed = Math.hypot(d.x, d.y)
  const tangent = { x: d.x / speed, y: d.y / speed }
  const along = tangent.x * a.x + tangent.y * a.y
  return { tangent, curvature: { x: (a.x - tangent.x * along) / speed ** 2, y: (a.y - tangent.y * along) / speed ** 2 } }
}
let bowedPasses = 0
let smoothJoins = 0
for (const [index, curve] of route.curves.entries()) {
  const a = curve.points[0]
  const b = curve.points.at(-1)
  if (curve.kind === 'sweep' && Math.hypot(b.x - a.x, b.y - a.y) > 150) {
    assert.ok((b.x - a.x) * (b.y - a.y) < 0, 'long swipes must follow the diagonal / direction')
    for (const t of [0.2, 0.5, 0.8]) {
      const p = evaluate(curve.points, t)
      assert.ok(p.y < a.y * (1 - t) + b.y * t - 406 * 0.01, 'every long swipe must bow above its chord in either direction')
    }
    assert.equal(curve.points.length, 3, 'single quadratic curvature cannot introduce an S-shaped inflection')
    bowedPasses++
  }
  if (!index) continue
  const previous = route.curves[index - 1]
  assert.deepEqual(previous.points.at(-1), curve.points[0], 'route joins must coincide')
  const before = endpoint(previous.points, 1)
  const after = endpoint(curve.points, 0)
  assert.ok(Math.hypot(before.tangent.x - after.tangent.x, before.tangent.y - after.tangent.y) < 1e-9, 'joined curves must share actual tangent, not straight-chord tangent')
  // 整个回身而非只看接头：宽弯半径至少是平面高度的 5%，杜绝近尖点。
  if (curve.kind === 'turn') for (let step = 0; step <= 256; step++) {
    const at = endpoint(curve.points, step / 256)
    assert.ok(Math.hypot(at.curvature.x, at.curvature.y) <= 1 / (406 * 0.05), 'reversal interior must retain a broad turning radius')
  }
  smoothJoins++
}
assert.ok(bowedPasses >= 6)
let offset = 0
const meanSpeeds = route.curves.map(curve => {
  const count = (curve.kind === 'turn' ? 96 : 128) + (offset === 0 ? 1 : 0)
  const points = route.guide.slice(offset, offset + count)
  offset += count
  return points.reduce((sum, p) => sum + p.speed, 0) / count
})
let acceleratingPasses = 0
for (let i = 1; i < route.curves.length - 1; i++) {
  if (route.curves[i].kind === 'sweep' && meanSpeeds[i] > Math.max(meanSpeeds[i - 1], meanSpeeds[i + 1]) * 1.1) acceleratingPasses++
}
assert.ok(acceleratingPasses >= 6, 'low-curvature swipes must be faster than neighboring reversals')
assert.ok(route.guide[0].speed < 0.04 && route.guide.at(-1).speed < 0.04, 'start and end near rest')
assert.equal(ERASE_SECONDS, 4.8)
assert.equal(getEraserFrame(1, 900, 406).paths.length, revealSteps + 1, '120Hz reveal must track shared duration')

// 在真实帧率检查位置、方向和加速度，避免只验接头而漏掉弯内近尖点及高刷停帧。
let maximumMove = 0
let maximumHeading = 0
let maximumAcceleration = 0
for (const hz of [60, 120, 144, 240]) for (const offset of [0, 0.37]) {
  let previous = getEraserFrame(offset / hz / ERASE_SECONDS, 900, 406).cursor
  let previousVelocity
  for (let step = 1; step <= Math.floor(ERASE_SECONDS * hz); step++) {
    const cursor = getEraserFrame(Math.min(1, (step + offset) / hz / ERASE_SECONDS), 900, 406).cursor
    const dx = cursor.x - previous.x
    const dy = cursor.y - previous.y
    const distance = Math.hypot(dx, dy)
    assert.ok(distance > 1e-7, 'continuous cursor must not repeat a stationary quantized position on high-refresh frames')
    const velocity = { x: dx * hz, y: dy * hz }
    if (hz === 60) maximumMove = Math.max(maximumMove, distance)
    if (previousVelocity) {
      const delta = Math.atan2(dy, dx) - Math.atan2(previousVelocity.y, previousVelocity.x)
      const heading = Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))) * 180 / Math.PI
      if (hz === 60) maximumHeading = Math.max(maximumHeading, heading)
      maximumAcceleration = Math.max(maximumAcceleration, Math.hypot(velocity.x - previousVelocity.x, velocity.y - previousVelocity.y) * hz)
      assert.ok(heading < 25, 'interior reversal must not snap direction between actual frames')
    }
    previous = cursor
    previousVelocity = velocity
  }
}
assert.ok(maximumMove < 24, '900px plane motion must stay below 24px per 60Hz frame')
assert.ok(maximumAcceleration < 406 * 30, 'time-domain acceleration must remain bounded rather than spike at tight turns')
assert.ok(route.curves.filter(curve => curve.kind === 'sweep').length <= 10, 'use broad swipes rather than filling with dense repeated passes')

let appearances = 0
for (const pen of PEN_ORDER) for (const theme of ['light', 'dark']) for (const size of Object.keys(SIZE_SCALE)) {
  const width = 480
  const height = Math.ceil(width / scene.aspect)
  const canvas = createCanvas(width, height)
  const painter = createPainter(scene, canvas)
  const style = { pen, color: ['hard', 'soft'].includes(pen) ? 'rainbow' : 'cyan', size }
  painter.render(state, width, height, 1, theme, style)
  const original = pixels(canvas)
  painter.render(state, width, height, 1, theme, style, 0)
  assert.deepEqual(pixels(canvas), original)
  painter.render(state, width, height, 1, theme, style, 0.41)
  const partial = pixels(canvas)
  assert.ok(alphaSum(partial) > 0 && alphaSum(partial) < alphaSum(original))
  let untouched = 0
  for (let i = 3; i < partial.length; i += 4) {
    assert.ok(partial[i] <= original[i])
    if (partial[i] && partial[i] === original[i]) {
      assert.deepEqual(partial.subarray(i - 3, i + 1), original.subarray(i - 3, i + 1))
      untouched++
    }
  }
  assert.ok(untouched > 0, 'unwiped material must remain unchanged')
  painter.render({ ...state, opacity: 0.5 }, width, height, 1, theme, style, 0.41)
  assert.ok(Math.abs(alphaSum(pixels(canvas)) / alphaSum(partial) - 0.5) < 0.015, 'pause fade must preserve frozen erasure')
  painter.render(state, width, height, 1, theme, style, 1)
  assert.equal(alphaSum(pixels(canvas)), 0, `${pen}/${theme}/${size} residual`)
  painter.render(state, width, height, 1, theme, style, 0.41)
  assert.deepEqual(pixels(canvas), partial, 'rewind must restore the same mask over intact source')
  painter.render(state, width, height, 1, theme === 'light' ? 'dark' : 'light', style, 0.41)
  painter.render(state, width, height, 1, theme, style, 0.41)
  assert.deepEqual(pixels(canvas), partial, 'theme round trip must preserve progress')
  painter.render(state, width / 2, height / 2, 2, theme, style, 0.41)
  painter.render(state, width, height, 1, theme, style, 0.41)
  assert.deepEqual(pixels(canvas), partial, 'resize must preserve progress and leave material cache intact')
  painter.render(state, width, height, 1, theme, style)
  assert.deepEqual(pixels(canvas), original)
  appearances++
}

let viewportAppearances = 0
for (const viewport of [320, 375, 768, 1440, 1920]) {
  const { width, height } = computeLayout(viewport, 700, scene.aspect)
  const canvas = createCanvas(1, 1)
  const painter = createPainter(scene, canvas)
  for (const pen of PEN_ORDER) for (const theme of ['light', 'dark']) for (const size of Object.keys(SIZE_SCALE)) {
    painter.render(state, width, height, 1, theme, { pen, color: 'cyan', size }, 1)
    assert.equal(alphaSum(pixels(canvas)), 0, `complete ${pen}/${theme}/${size} erasure at viewport ${viewport}, including halo`)
    viewportAppearances++
  }
}

// 无 GUI 的联系表；不用文字字体，避免验证环境的 ICU 字体初始化问题。
const width = 600
const height = Math.ceil(width / scene.aspect)
const padding = 35
const sheet = createCanvas((width + padding * 2) * 2, (height + padding * 2) * 3)
const sheetContext = sheet.getContext('2d')
sheetContext.fillStyle = '#f4f7fa'
sheetContext.fillRect(0, 0, sheet.width, sheet.height)
for (const [index, progress] of [0, 0.2, 0.4, 0.6, 0.8, 1].entries()) {
  const canvas = createCanvas(width, height)
  createPainter(scene, canvas).render(state, width, height, 1, 'light', undefined, progress)
  const x = index % 2 * (width + padding * 2) + padding
  const y = Math.floor(index / 2) * (height + padding * 2) + padding
  sheetContext.drawImage(canvas, x, y)
  const { cursor } = getEraserFrame(progress, width, height)
  const d = cursor.radius * 2
  sheetContext.save()
  sheetContext.translate(x + cursor.x, y + cursor.y)
  sheetContext.globalAlpha = 1
  sheetContext.fillStyle = '#fff'
  sheetContext.beginPath()
  sheetContext.arc(0, 0, cursor.radius, 0, Math.PI * 2)
  sheetContext.fill()
  sheetContext.strokeStyle = '#cfcfcf'
  sheetContext.lineWidth = d * 0.04
  sheetContext.beginPath()
  sheetContext.arc(0, 0, cursor.radius - d * 0.02, 0, Math.PI * 2)
  sheetContext.stroke()
  sheetContext.lineCap = 'round'
  sheetContext.lineWidth = d * 0.1
  for (const offset of [-0.12, 0.12]) {
    sheetContext.beginPath()
    sheetContext.moveTo(d * offset, -d * 0.19)
    sheetContext.lineTo(d * offset, d * 0.19)
    sheetContext.stroke()
  }
  sheetContext.restore()
}
fs.mkdirSync(path.join(__dirname, 'frames'), { recursive: true })
fs.writeFileSync(path.join(__dirname, 'frames/eraser-sweep-contact.png'), sheet.toBuffer('image/png'))
console.log(`Eraser: ${masks} monotonic masks / conservative art envelopes, ${appearances} material rewind cases, ${viewportAppearances} viewport/material/theme/size full-clear cases passed.`)
console.log(`Actual-frame motion: ${maximumMove.toFixed(2)}px / ${maximumHeading.toFixed(2)}deg maximum at60Hz; acceleration ${maximumAcceleration.toFixed(0)}px/s², continuous at60–240Hz.`)
console.log(`Diagonal motion: ${bowedPasses} upward-bowed passes, ${smoothJoins} tangent-continuous joins, ${acceleratingPasses} curvature-paced passes; cursor minimum horizontal/vertical clearance ${minimumClearance.toFixed(2)} / ${minimumVerticalClearance.toFixed(2)}px.`)
