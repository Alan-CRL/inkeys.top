const assert = require('node:assert/strict')
const { load } = require('./harness.cjs')
const { createScene, timelineAt, createActiveClock, computeLayout, BASE_WIDTH } = load('softPen')
const scene = createScene()
const close = (actual, expected, epsilon = 1e-7) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`)

assert.deepEqual(scene.strokes.map(stroke => stroke.name), ['I', 'n', 'k-stem', 'ke', 'y', 's'])
assert.ok(scene.strokes.some(stroke => stroke.name === 'y'))
assert.ok(scene.strokes.some(stroke => stroke.name === 's'))
close(scene.duration, 4.2)
const lifts = scene.strokes.slice(1).map((stroke, index) => stroke.start - scene.strokes[index].end)
assert.ok(lifts.every(gap => gap >= 0.1 - 1e-7 && gap <= 0.24 + 1e-7))
assert.ok(Math.max(...lifts) - Math.min(...lifts) > 0.05, 'pen travel should vary with distance')
assert.ok(scene.aspect > 1 && scene.aspect < 6)
assert.ok(scene.length > 0)
const count = scene.strokes.reduce((sum, stroke) => sum + stroke.raw.length, 0)
assert.ok(count > 0 && count < scene.strokes.reduce((sum, stroke) => sum + stroke.ink.length, 0) / 4, `raw illustration unexpectedly dense: ${count}`)
let previousEnd = -1
let previousLength = -1
const gaps = []
for (const stroke of scene.strokes) {
  assert.ok(stroke.start > previousEnd, `overlapping strokes: ${stroke.name}`)
  assert.ok(stroke.end <= scene.duration + 1e-7)
  previousEnd = stroke.end
  for (const points of [stroke.raw, stroke.ink]) {
    let time = -1
    for (const point of points) {
      for (const value of Object.values(point)) assert.ok(Number.isFinite(value))
      assert.ok(point.t > time, `non-increasing ${stroke.name} time ${point.t}`)
      assert.ok(point.t >= stroke.start - 1e-7 && point.t <= stroke.end + 1e-7)
      assert.ok(point.x >= scene.bounds.minX && point.x <= scene.bounds.maxX)
      assert.ok(point.y >= scene.bounds.minY && point.y <= scene.bounds.maxY)
      time = point.t
    }
  }
  for (const point of stroke.ink) {
    assert.ok(point.width > 0 && point.speed >= 0)
    assert.ok(point.s >= previousLength, 'color arc length reset at pen lift')
    previousLength = point.s
    assert.ok(point.x - point.width / 2 >= scene.bounds.minX)
    assert.ok(point.x + point.width / 2 <= scene.bounds.maxX)
    assert.ok(point.y - point.width / 2 >= scene.bounds.minY)
    assert.ok(point.y + point.width / 2 <= scene.bounds.maxY)
  }
  for (let i = 1; i < stroke.raw.length; i++) {
    const a = stroke.raw[i - 1]
    const b = stroke.raw[i]
    // 弯处会提前补点；包含这些真实输入间距，不能只筛出接近固定采样周期的直段。
    gaps.push(Math.hypot(b.x - a.x, b.y - a.y))
  }
}
const widths = scene.strokes.flatMap(stroke => stroke.ink.map(point => point.width))
assert.ok(Math.min(...widths) >= BASE_WIDTH * 0.85 - 1e-7)
assert.ok(Math.max(...widths) <= BASE_WIDTH * 1.15 + 1e-7)
assert.ok(Math.max(...widths) / Math.min(...widths) <= 1.15 / 0.85 + 1e-7)
gaps.sort((a, b) => a - b)
assert.ok(gaps[Math.floor(gaps.length * 0.8)] > gaps[Math.floor(gaps.length * 0.2)] * 1.3, 'raw spacing lacks speed variation')

// 以用户看到的时间节点验证阶段，不绑定内部枚举名称。
for (const [time, rawTime, inkTime, opacity] of [
  [0, -1, 0, 1], [2, -1, 2, 1], [4.2, -1, 4.2, 1],
  [7.2, -1, 4.2, 1], [7.9, 0, -1, 1],
  [9.9, 2, -1, 1], [12.1, 4.2, -1, 1],
  [12.45, 4.2, 0, 1], [14.45, 4.2, 2, 1],
  [16.65, -1, 4.2, 1], [19.65, -1, 4.2, 1],
  [20.35, 0, -1, 1],
]) {
  const state = timelineAt(time)
  close(state.rawTime, rawTime)
  close(state.inkTime, inkTime)
  close(state.opacity, opacity)
}
for (const time of [7.55, 20]) {
  const state = timelineAt(time)
  assert.ok(state.opacity > 0 && state.opacity < 1)
}
close(timelineAt(16.65 - 1e-5).rawTime, 4.2)
close(timelineAt(16.65).rawTime, -1)
close(timelineAt(20).rawTime, -1)
for (let cycle = 0; cycle < 100; cycle++) {
  for (const offset of [0.01, 2, 4.3, 4.8, 9, 12]) {
    const a = timelineAt(7.9 + offset)
    const b = timelineAt(7.9 + cycle * 12.45 + offset)
    assert.equal(a.phase, b.phase)
    close(a.rawTime, b.rawTime)
    close(a.inkTime, b.inkTime)
    close(a.opacity, b.opacity)
  }
}
for (const time of [0, 3, 8, 12, 25, 100]) {
  const reduced = timelineAt(time, true)
  close(reduced.rawTime, -1)
  close(reduced.inkTime, 4.2)
  close(reduced.opacity, 1)
}

const clock = createActiveClock()
close(clock.read(100), 0)
clock.setRunning(true, 100)
close(clock.read(1100), 1)
clock.setRunning(false, 1100)
close(clock.read(101100), 1)
clock.setRunning(true, 101100)
close(clock.read(101600), 1.5)
clock.setRunning(true, 101600)
close(clock.read(102100), 2)
clock.seek(7.2, 102100)
close(clock.read(102100), 7.2)
close(clock.read(102450), 7.55)
clock.setRunning(false, 102450)
clock.seek(7.2, 103000)
close(clock.read(110000), 7.2)
clock.setRunning(true, 110000)
close(clock.read(110700), 7.9)
for (const fps of [30, 60, 120]) {
  const timed = createActiveClock()
  timed.setRunning(true, 0)
  for (let frame = 0; frame <= fps * 5; frame++) timed.read(frame * 1000 / fps)
  close(timed.read(5000), 5)
}

for (const viewportWidth of [320, 375, 768, 1440, 1920]) {
  for (const availableHeight of [216, 400, 700, 1016]) {
    const layout = computeLayout(viewportWidth, availableHeight, scene.aspect)
    assert.ok(layout.width > 0 && layout.height > 0)
    assert.ok(layout.width <= 900)
    close(layout.width / layout.height, scene.aspect)
    close(layout.centerY, availableHeight * 0.42)
    assert.ok(layout.width + 48 <= viewportWidth)
    assert.ok(layout.centerY - layout.height / 2 >= 0)
    assert.ok(layout.centerY + layout.height / 2 <= availableHeight)
    // 与组件 perspective:1200px / rotateX,Y(±4deg) / translate(±6px) 一致。
    for (const rx of [-4, 4]) for (const ry of [-4, 4]) {
      const xAngle = rx * Math.PI / 180
      const yAngle = ry * Math.PI / 180
      for (const x of [-layout.width / 2, layout.width / 2]) {
        for (const y of [-layout.height / 2, layout.height / 2]) {
          const transformedX = x * Math.cos(yAngle)
          const zBeforeX = -x * Math.sin(yAngle)
          const transformedY = y * Math.cos(xAngle) - zBeforeX * Math.sin(xAngle)
          const z = y * Math.sin(xAngle) + zBeforeX * Math.cos(xAngle)
          const perspective = 1200 / (1200 - z)
          assert.ok(viewportWidth / 2 - Math.abs(transformedX) * perspective - 6 >= 24, 'tilted side margin <24px')
          assert.ok(layout.centerY - Math.abs(transformedY) * perspective - 6 >= 0, 'tilted top clips')
          assert.ok(layout.centerY + Math.abs(transformedY) * perspective + 6 <= availableHeight, 'tilted bottom clips')
        }
      }
    }
  }
}

console.log(JSON.stringify({ result: 'PASS', rawPoints: count, inkPoints: scene.strokes.reduce((sum, stroke) => sum + stroke.ink.length, 0), widths: [Math.min(...widths), Math.max(...widths)], aspect: scene.aspect, timelineCyclesChecked: 100, responsiveCases: 20 }, null, 2))
