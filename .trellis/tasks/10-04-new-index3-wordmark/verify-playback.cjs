const assert = require('node:assert/strict')
const { load } = require('./harness.cjs')
const { createPlayback } = load('playback')
const { PEN_ORDER, DEFAULT_STYLE } = load('styles')
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`)
const settings = (pens, color = 'rainbow', size = 'medium') => ({ pens, color, size })

const intro = createPlayback()
assert.deepEqual(intro.read(0).style, DEFAULT_STYLE)
close(intro.read(0).state.opacity, 0)
close(intro.read(0.25).state.opacity, 0.5)
close(intro.read(0.5).state.opacity, 1)
assert.equal(intro.read(3.5).state.phase, 'fade')
close(intro.read(3.85).state.opacity, 0.5)
assert.equal(intro.read(4.2).state.phase, 'raw')

// 全部 32 种勾选组合与两轮笔顺；随机色只在不支持彩虹的笔出场时抽取一次。
for (let mask = 0; mask < 32; mask++) {
  let draws = 0
  const p = createPlayback(() => { draws++; return 0.6 })
  const pens = PEN_ORDER.filter((_, index) => mask & (1 << index))
  p.configure(settings(pens), 0)
  if (!pens.length) {
    assert.equal(p.read(4.2).view, 'art')
    close(p.read(4.2).state.opacity, 0)
    close(p.read(4.35).state.opacity, 0.5)
    close(p.read(4.5).state.opacity, 1)
    for (const t of [5, 6.4, 100, 900]) assert.equal(p.read(t).state.opacity, 1)
    assert.equal(draws, 0)
    continue
  }
  let at = 4.2
  let expectedDraws = 0
  const raw = pens.length === 1 && ['hard', 'soft'].includes(pens[0])
  for (const pen of [...pens, ...pens]) {
    const start = p.read(at)
    assert.equal(start.style.pen, pen)
    assert.equal(start.state.phase, raw ? 'raw' : 'ink')
    if (!['hard', 'soft'].includes(pen)) {
      expectedDraws++
      assert.notEqual(start.style.color, 'rainbow')
    }
    assert.equal(draws, expectedDraws)
    const writeAt = at + (raw ? 4.55 : 0)
    if (raw) {
      assert.equal(p.read(at + 4.2).state.phase, 'raw-hold')
      assert.equal(p.read(writeAt).state.phase, 'ink')
    }
    close(p.read(writeAt + 2).state.inkTime, 2)
    assert.deepEqual(p.read(writeAt + 2).style, start.style)
    assert.equal(draws, expectedDraws)
    assert.equal(p.read(writeAt + 4.2).state.rawTime, -1)
    assert.equal(p.read(writeAt + 4.2).state.phase, 'hold')
    assert.equal(p.read(writeAt + 7.2).state.phase, 'fade')
    at = writeAt + 7.9
  }
}

const pending = createPlayback(() => 0)
pending.configure(settings(['hard', 'soft']), 0)
assert.equal(pending.read(5).style.pen, 'hard')
pending.configure(settings(['hard', 'soft'], 'red', 'thick'), 6)
assert.deepEqual(pending.read(10).style, DEFAULT_STYLE)
assert.deepEqual(pending.read(12.1).style, { pen: 'soft', color: 'red', size: 'thick' })
pending.configure(settings(['brush', 'hard'], 'green'), 13)
pending.configure(settings(['laser', 'soft'], 'blue', 'thin'), 14)
assert.equal(pending.read(19).style.pen, 'soft')
assert.deepEqual(pending.read(20).style, { pen: 'soft', color: 'blue', size: 'thin' })

// 暂停任何材质/灰线/艺术字均保留旧快照，成品始终是默认样式。
for (const pens of [['hard'], ['soft'], ['highlighter'], ['laser'], ['brush'], []]) {
  const p = createPlayback(() => 0)
  p.configure(settings(pens, 'red', 'thick'), 0)
  const outgoing = p.read(6)
  p.toggle(6)
  assert.equal(p.paused, true)
  assert.deepEqual(p.read(6), outgoing)
  close(p.read(6.11).state.opacity, outgoing.state.opacity * 0.5)
  close(p.read(6.22).state.opacity, 0)
  assert.deepEqual(p.read(6.37).style, DEFAULT_STYLE)
  close(p.read(6.37).state.opacity, 0.5)
  close(p.read(6.52).state.opacity, 1)
  assert.equal(p.read(6.52).view, 'ink')
  assert.equal(p.animating, false)
  p.configure(settings(['brush'], 'purple', 'thin'), 8)
  assert.deepEqual(p.read(100).style, DEFAULT_STYLE)
  p.toggle(100)
  close(p.read(100.35).state.opacity, 0.5)
  assert.deepEqual(p.read(100.7).style, { pen: 'brush', color: 'purple', size: 'thin' })
}

const rapid = createPlayback()
rapid.toggle(0.2)
const outgoing = rapid.read(0.3)
rapid.toggle(0.3)
assert.deepEqual(rapid.read(0.3), outgoing)
rapid.toggle(0.3)
assert.deepEqual(rapid.read(0.3), outgoing)
assert.equal(rapid.read(0.72).state.opacity, 1)
rapid.toggle(1)
assert.equal(rapid.read(1.7).state.phase, 'raw')

const art = createPlayback()
art.configure(settings([]), 0)
assert.equal(art.read(4.5).shimmer, 0)
assert.equal(art.read(6.3).shimmer, -1)
close(art.read(10.5).shimmer, 0)
art.configure(settings([], 'red'), 11)
assert.equal(art.read(11).artColor, 'red')
assert.equal(art.read(11).previousColor, 'rainbow')
close(art.read(11.125).colorMix, 0.5)
art.configure(settings(['laser'], 'blue'), 12)
assert.equal(art.read(12.35).view, 'art')
close(art.read(12.35).state.opacity, 0.5)
assert.equal(art.read(12.7).style.pen, 'laser')

const reduced = createPlayback()
assert.deepEqual(reduced.read(0, true).style, DEFAULT_STYLE)
reduced.configure(settings(['soft'], 'blue', 'thin'), 0, true)
assert.deepEqual(reduced.read(0, true).style, { pen: 'soft', color: 'blue', size: 'thin' })
reduced.configure(settings([], 'green'), 0, true)
assert.equal(reduced.read(0, true).view, 'art')
assert.equal(reduced.read(0, true).shimmer, -1)
assert.equal(reduced.read(0, true).state.opacity, 1)
for (const resumeRequested of [false, true]) {
  const p = createPlayback()
  p.toggle(5)
  if (resumeRequested) p.toggle(5.1)
  p.settleReduced(5.1)
  assert.deepEqual(p.read(5.1, true).style, DEFAULT_STYLE)
  assert.equal(p.read(5.1, true).state.opacity, 1)
  const restored = p.read(5.1)
  assert.deepEqual(restored.style, DEFAULT_STYLE)
  assert.equal(restored.state.inkTime, 4.2)
  assert.equal(restored.state.opacity, 1)
  assert.equal(restored.state.phase, resumeRequested ? 'fade' : 'static')
}
// 减少动态效果已显示完整入场，恢复后不能退回先前的半透明帧。
for (const view of ['ink', 'art']) {
  const p = createPlayback()
  if (view === 'art') p.configure(settings([]), 0)
  const time = view === 'art' ? 4.3 : 0.2
  assert.ok(p.read(time).state.opacity < 1)
  p.settleReduced(time)
  assert.equal(p.read(time, true).view, view)
  assert.equal(p.read(time, true).state.opacity, 1)
  assert.equal(p.read(time).state.opacity, 1)
}
for (const pens of [[], ['hard'], ['soft', 'laser']]) {
  const p = createPlayback()
  p.configure(settings(pens, 'blue', 'thick'), 0.2, true)
  const staticFrame = p.read(0.2, true)
  const restored = p.read(0.2)
  assert.equal(restored.view, staticFrame.view)
  assert.equal(restored.state.opacity, 1)
  assert.equal(restored.state.inkTime, 4.2)
  if (pens.length) {
    assert.deepEqual(restored.style, staticFrame.style)
    assert.equal(p.read(3.2).state.phase, 'fade')
    assert.equal(p.read(3.9).style.pen, pens.length > 1 ? 'laser' : 'hard')
    assert.equal(p.read(3.9).state.phase, pens.length > 1 ? 'ink' : 'raw')
  }
  else assert.equal(p.read(100).view, 'art')
}
console.log('PASS: opening, all 32 pen subsets, ordered loops, pending boundaries, random stability, pause/rapid toggles, art/shimmer and reduced motion')
