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
// 暂停/定格画面换肤也必须刷新；往返切换不可留下上一主题的缓存。
for (const time of [2, 9.9, 14, 16.65, 20]) {
  const state = timelineAt(time)
  painter.render(state, width, height, 1, 'light')
  const light = hash(shared)
  painter.render(state, width, height, 1, 'dark')
  const dark = hash(shared)
  assert.notEqual(dark, light, `theme change ignored at ${time}`)
  const fresh = createCanvas(width, height)
  createPainter(scene, fresh).render(state, width, height, 1, 'dark')
  assert.equal(hash(fresh), dark, `stale theme cache at ${time}`)
  painter.render(state, width, height, 1, 'light')
  assert.equal(hash(shared), light, `theme roundtrip changed pixels at ${time}`)
}
// 抬笔移动期间两层均保持原样，不能画出空中连接轨迹。
for (let index = 0; index < scene.strokes.length - 1; index++) {
  const end = scene.strokes[index].end
  const middle = (end + scene.strokes[index + 1].start) / 2
  for (const layer of ['ink', 'raw']) {
    const stateAt = time => ({ phase: layer, rawTime: layer === 'raw' ? time : -1, inkTime: layer === 'ink' ? time : -1, opacity: 1 })
    painter.render(stateAt(end + 1e-7), width, height, 1)
    const settled = hash(shared)
    painter.render(stateAt(middle), width, height, 1)
    assert.equal(hash(shared), settled, `visible pen travel at ${index}, ${layer}`)
  }
}
for (const [intro, loop] of [[4.2, 16.65], [7.55, 20]]) {
  painter.render(timelineAt(intro), width, height, 1)
  const inkOnly = hash(shared)
  painter.render(timelineAt(loop), width, height, 1)
  assert.equal(hash(shared), inkOnly, 'raw illustration remains after completed rainbow')
}
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

function enclosedTransparentPixels(rgba, width, height) {
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  const push = index => {
    // 半透明抗锯齿边缘仍属于外部边界；不能用同一个50%阈值把细斜缝截断成假孔洞。
    if (!visited[index] && rgba[index * 4 + 3] < 255) { visited[index] = 1; queue[tail++] = index }
  }
  for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x) }
  for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1) }
  while (head < tail) {
    const i = queue[head++]
    if (i % width) push(i - 1)
    if (i % width < width - 1) push(i + 1)
    if (i >= width) push(i - width)
    if (i < width * (height - 1)) push(i + width)
    // 斜向接触同样连接外部，避免像素网格方向影响拓扑判断。
    if (i % width && i >= width) push(i - width - 1)
    if (i % width < width - 1 && i >= width) push(i - width + 1)
    if (i % width && i < width * (height - 1)) push(i + width - 1)
    if (i % width < width - 1 && i < width * (height - 1)) push(i + width + 1)
  }
  let holes = 0
  for (let i = 0; i < visited.length; i++) if (!visited[i] && rgba[i * 4 + 3] < 128) holes++
  return holes
}

// 零容忍真实孔洞：即使只有一个半透明像素，被实心笔画包围也必须检出。
for (const alpha of [0, 51, 127]) {
  const fixture = new Uint8ClampedArray(7 * 7 * 4)
  for (let y = 1; y < 6; y++) for (let x = 1; x < 6; x++) fixture[(y * 7 + x) * 4 + 3] = 255
  fixture[(3 * 7 + 3) * 4 + 3] = alpha
  assert.equal(enclosedTransparentPixels(fixture, 7, 7), 1, `missed enclosed alpha-${alpha} pixel`)
  // 通过半透明对角边缘连接背景后，它是开放边缘，不应再计为封闭孔洞。
  fixture[(2 * 7 + 2) * 4 + 3] = 180
  fixture[(1 * 7 + 1) * 4 + 3] = 230
  assert.equal(enclosedTransparentPixels(fixture, 7, 7), 0, 'misclassified diagonal antialias boundary')
}

// I、n、s 没有封闭字腔。900/901px覆盖已定位的斜向及阈值抗锯齿边缘误报。
for (const w of [900, 901]) for (const name of ['I', 'n', 's']) {
  const isolated = { ...scene, strokes: scene.strokes.filter(stroke => stroke.name === name) }
  const canvas = createCanvas(1, 1)
  createPainter(isolated, canvas).render(timelineAt(4.2), w, Math.ceil(w / scene.aspect), 1)
  const holes = enclosedTransparentPixels(pixels(canvas), canvas.width, canvas.height)
  assert.equal(holes, 0, `${name} at ${w}px contains ${holes} enclosed transparent seam pixels`)
}
console.log(JSON.stringify({ result: 'PASS', deterministicFrames: frames, rawEventsDiscrete: true, resizeCases: 4 }, null, 2))
