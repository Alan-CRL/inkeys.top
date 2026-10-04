const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { load, canvasRuntime } = require('./harness.cjs')
const { createCanvas, Path2D } = canvasRuntime()
global.Path2D = Path2D
global.window = { devicePixelRatio: 1 }
global.document = { createElement: () => createCanvas(1, 1) }
const { createScene, createPainter, timelineAt } = load('softPen')
const scene = createScene()
const width = 900
const height = Math.ceil(width / scene.aspect)
const shared = createCanvas(width, height)
const painter = createPainter(scene, shared)
const pixels = canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
const hash = canvas => createHash('sha256').update(pixels(canvas)).digest('hex')
let frames = 0
for (const time of [4.2, 7.55, 7.9, 8.2, 10, 12.1, 12.45, 14, 16.65, 20, 20.35, 2, 4.2]) {
  const state = timelineAt(time)
  painter.render(state, width, height, 1)
  const fresh = createCanvas(width, height)
  createPainter(scene, fresh).render(state, width, height, 1)
  assert.equal(hash(shared), hash(fresh), `history-dependent rendering at ${time}`)
  const rgba = pixels(shared)
  for (let x = 0; x < width; x++) {
    assert.equal(rgba[x * 4 + 3], 0, `top clipping at ${time}`)
    assert.equal(rgba[((height - 1) * width + x) * 4 + 3], 0, `bottom clipping at ${time}`)
  }
  for (let y = 0; y < height; y++) {
    assert.equal(rgba[(y * width) * 4 + 3], 0, `left clipping at ${time}`)
    assert.equal(rgba[(y * width + width - 1) * 4 + 3], 0, `right clipping at ${time}`)
  }
  frames++
}
const raw = scene.strokes[0].raw
const midpoint = (raw[2].t + raw[3].t) / 2
painter.render({ phase: 'raw', rawTime: raw[2].t + 1e-6, inkTime: -1, opacity: 1 }, width, height, 1)
const before = hash(shared)
painter.render({ phase: 'raw', rawTime: midpoint, inkTime: -1, opacity: 1 }, width, height, 1)
assert.equal(hash(shared), before, 'raw segment extended before the next event')
painter.render({ phase: 'raw', rawTime: raw[3].t + 1e-6, inkTime: -1, opacity: 1 }, width, height, 1)
assert.notEqual(hash(shared), before, 'new raw point did not add its segment')

// 同一时间缩放与DPR变化只改变像素密度，不保留上个尺寸的缓存。
for (const [w, dpr] of [[272, 1], [327, 2], [900, 2], [900, 1]]) {
  const h = Math.ceil(w / scene.aspect)
  const state = timelineAt(16.65)
  painter.render(state, w, h, dpr)
  const fresh = createCanvas(w, h)
  createPainter(scene, fresh).render(state, w, h, dpr)
  assert.equal(hash(shared), hash(fresh), `resize cache mismatch at ${w}, DPR ${dpr}`)
}

// 灰色输入仅作示意：任意改动其坐标，也不能改变单独彩虹层的像素。
const independentScene = createScene()
const original = createCanvas(1, 1)
createPainter(independentScene, original).render(timelineAt(4.2), width, height, 1)
for (const stroke of independentScene.strokes) for (const point of stroke.raw) { point.x += 35; point.y -= 20 }
const independent = createCanvas(1, 1)
createPainter(independentScene, independent).render(timelineAt(4.2), width, height, 1)
assert.equal(hash(independent), hash(original), 'raw illustration changed rainbow pixels')

// 用直角与折返的极简轨迹验证真实圆接头，避免只为某个字母补洞。
for (const coordinates of [
  [[20, 60], [60, 60], [60, 20]],
  [[20, 60], [60, 60], [30, 60]],
]) {
  let distance = 0
  const points = coordinates.map(([x, y], index) => {
    if (index) distance += Math.hypot(x - coordinates[index - 1][0], y - coordinates[index - 1][1])
    return { x, y, t: index, s: distance, width: 20, speed: 1 }
  })
  const sceneCorner = {
    strokes: [{ name: 'corner', raw: [], ink: points, start: 0, end: 2 }],
    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    aspect: 1, duration: 4.2, length: distance,
  }
  const canvas = createCanvas(1, 1)
  createPainter(sceneCorner, canvas).render(timelineAt(4.2), 100, 100, 1)
  const rgba = pixels(canvas)
  // 半径10圆角的外侧对角位置应被覆盖；折线斜接/缺口常丢失这里。
  assert.ok(rgba[(66 * 100 + 66) * 4 + 3] > 240, 'corner lacks round outer join')
  assert.ok(rgba[(68 * 100 + 68) * 4 + 3] < 20, 'corner extends beyond circular radius')
}

// I、n、s 没有封闭字腔：圆接头内部不应留下透明小洞。
for (const name of ['I', 'n', 's']) {
  const isolated = { ...scene, strokes: scene.strokes.filter(stroke => stroke.name === name) }
  const canvas = createCanvas(1, 1)
  createPainter(isolated, canvas).render(timelineAt(4.2), width, height, 1)
  const rgba = pixels(canvas)
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  const push = index => {
    if (!visited[index] && rgba[index * 4 + 3] < 128) { visited[index] = 1; queue[tail++] = index }
  }
  for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x) }
  for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1) }
  while (head < tail) {
    const i = queue[head++]
    if (i % width) push(i - 1)
    if (i % width < width - 1) push(i + 1)
    if (i >= width) push(i - width)
    if (i < width * (height - 1)) push(i + width)
  }
  let holes = 0
  for (let i = 0; i < visited.length; i++) if (!visited[i] && rgba[i * 4 + 3] < 128) holes++
  assert.equal(holes, 0, `${name} contains ${holes} enclosed transparent seam pixels`)
}
console.log(JSON.stringify({ result: 'PASS', deterministicFrames: frames, rawEventsDiscrete: true, resizeCases: 4 }, null, 2))
