const assert = require('node:assert/strict')
const { load, canvasRuntime } = require('./harness.cjs')
const { createCanvas, Path2D } = canvasRuntime()
global.Path2D = Path2D
const owned = []
global.document = {
  createElement() {
    const canvas = createCanvas(1, 1)
    owned.push(canvas)
    return canvas
  },
}
const { createScene, createPainter } = load('softPen')
const scene = createScene()
const state = { phase: 'static', rawTime: -1, inkTime: 4.2, opacity: 1 }
let released = 0
for (const pens of [['hard'], ['soft'], ['highlighter'], ['brush'], ['laser'], ['hard', 'soft', 'highlighter', 'brush', 'laser']]) {
  const start = owned.length
  const visible = createCanvas(1, 1)
  const painter = createPainter(scene, visible)
  for (const pen of pens) {
    const style = { pen, color: pen === 'hard' || pen === 'soft' ? 'rainbow' : 'cyan', size: 'thick' }
    painter.render(state, 320, 320 / scene.aspect, 2, 'light', style, 0.51)
    painter.render({ ...state, opacity: 0.4 }, 320, 320 / scene.aspect, 2, 'light', style, 0.51)
  }
  if (pens.includes('laser')) {
    // 换肤、换色、粗细、尺寸和切回硬笔时，失效且已移出map的旧激光层也应主动释放。
    for (const [width, dpr, theme, pen, color, size] of [
      [320, 2, 'dark', 'laser', 'cyan', 'thick'],
      [320, 2, 'dark', 'laser', 'red', 'thick'],
      [320, 2, 'dark', 'laser', 'red', 'thin'],
      [375, 1, 'dark', 'laser', 'red', 'thin'],
      [375, 1, 'dark', 'hard', 'red', 'thin'],
    ]) {
      const oldLaserBuffers = owned.slice(start + 3)
      painter.render(state, width, width / scene.aspect, dpr, theme, { pen, color, size })
      for (const buffer of oldLaserBuffers) {
        assert.equal(buffer.width, 1, 'invalidated laser canvas remains allocated before unmount')
        assert.equal(buffer.height, 1, 'invalidated laser canvas remains allocated before unmount')
      }
    }
  }
  assert.ok(visible.width > 1, 'renderer did not allocate display pixels')
  const buffers = [visible, ...owned.slice(start)]
  assert.ok(buffers.some(canvas => canvas.width > 1), 'test must exercise live caches before release')
  painter.dispose()
  painter.dispose()
  // 清理后晚到的RAF/resize/主题事件不得重新分配画布或恢复旧墨迹。
  painter.render(state, 900, 900 / scene.aspect, 2, 'dark', { pen: 'laser', color: 'blue', size: 'thick' }, 0.77)
  assert.equal(owned.length, start + buffers.length - 1, 'disposed render allocated a new material layer')
  for (const canvas of buffers) {
    assert.equal(canvas.width, 1)
    assert.equal(canvas.height, 1)
    assert.equal(canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3], 0, 'released canvas retains colored pixels')
    released++
  }
}
console.log(`PASS: 6 pen/cache lifetimes released ${released} native Canvas buffers; repeat dispose and late render remain inert.`)
