const assert = require('node:assert/strict')
const { load } = require('./harness.cjs')
const { createPlayback } = load('playback')
const { PEN_ORDER, DEFAULT_STYLE } = load('styles')
const { ERASE_SECONDS } = load('eraser')
assert.equal(ERASE_SECONDS, 4.8)
const eraseLead = 0.28 + 0.22
const eraseTotal = eraseLead + ERASE_SECONDS + 0.2 + 0.3 + 0.35
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`)
const settings = (pens, color = 'rainbow', size = 'medium', eraser = false) => ({ pens, color, size, eraser })

const intro = createPlayback()
assert.deepEqual(intro.read(0).style, DEFAULT_STYLE)
close(intro.read(0).state.opacity, 0)
close(intro.read(0.25).state.opacity, 0.5)
close(intro.read(0.5).state.opacity, 1)
assert.equal(intro.read(3.5).state.phase, 'fade')
close(intro.read(3.85).state.opacity, 0.5)
assert.equal(intro.read(4.2).state.phase, 'raw')

// 全部 64 种工具组合与两轮笔顺；橡皮不影响灰线条件，也不抽取材质颜色。
for (let mask = 0; mask < 64; mask++) {
  let draws = 0
  const p = createPlayback(() => { draws++; return 0.6 })
  const pens = PEN_ORDER.filter((_, index) => mask & (1 << index))
  const eraser = !!(mask & 32)
  p.configure(settings(pens, 'rainbow', 'medium', eraser), 0)
  if (!pens.length) {
    assert.equal(p.read(4.2).view, 'art')
    close(p.read(4.2).state.opacity, 0)
    close(p.read(4.35).state.opacity, 0.5)
    close(p.read(4.5).state.opacity, 1)
    if (eraser) {
      for (const at of [4.5, 4.5 + 3 + eraseTotal + 0.3]) {
        const hold = p.read(at)
        assert.equal(hold.shimmer, -1)
        assert.equal(hold.eraseProgress, -1)
        close(p.read(at + 3).eraseProgress, 0)
        close(p.read(at + 3 + eraseLead + ERASE_SECONDS / 2).eraseProgress, 0.5)
        assert.equal(p.read(at + 3 + eraseLead + ERASE_SECONDS / 2).view, 'art')
        close(p.read(at + 3 + eraseTotal).state.opacity, 0)
        assert.equal(p.read(at + 3 + eraseTotal).eraseProgress, -1)
      }
    }
    else for (const t of [5, 6.4, 100, 900]) assert.equal(p.read(t).state.opacity, 1)
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
    const erase = eraser && pen === pens.at(-1)
    const exit = p.read(writeAt + 7.2)
    if (erase) {
      close(exit.eraseProgress, 0)
      close(p.read(writeAt + 7.2 + eraseLead + ERASE_SECONDS / 2).eraseProgress, 0.5)
      assert.equal(p.read(writeAt + 7.2 + eraseLead + ERASE_SECONDS / 2).state.opacity, 1)
    }
    else {
      assert.equal(exit.state.phase, 'fade')
      assert.equal(exit.eraseProgress, -1)
    }
    at = writeAt + 7.2 + (erase ? eraseTotal : 0.7)
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
assert.deepEqual(pending.read(20).style, { pen: 'laser', color: 'blue', size: 'thin' })

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
// 当前笔取消/新增前项与后项：始终按固定笔顺向后找，只有本轮末尾才擦除。
for (const current of PEN_ORDER) {
  for (let mask = 0; mask < 64; mask++) {
    const p = createPlayback(() => 0)
    p.configure(settings([current], 'red'), 0)
    const writeAt = 4.2 + (['hard', 'soft'].includes(current) ? 4.55 : 0)
    const pens = PEN_ORDER.filter((_, index) => mask & (1 << index))
    const eraser = !!(mask & 32)
    p.configure(settings(pens, 'blue', 'thin', eraser), writeAt + 1)
    const later = pens.find(pen => PEN_ORDER.indexOf(pen) > PEN_ORDER.indexOf(current))
    const exitAt = writeAt + 7.2
    const outgoing = p.read(exitAt)
    assert.deepEqual(outgoing.style, { pen: current, color: 'red', size: 'medium' })
    assert.equal(outgoing.eraseProgress, eraser && !later ? 0 : -1)
    const next = p.read(exitAt + (eraser && !later ? eraseTotal : 0.7))
    if (pens.length) assert.deepEqual(next.style, { pen: later ?? pens[0], color: 'blue', size: 'thin' })
    else assert.equal(next.view, 'art')
  }
}

// 退场一旦开始，后续勾选与颜色不能改写已锁定的下一次出场。
for (const eraser of [false, true]) {
  const p = createPlayback()
  p.configure(settings(['highlighter'], 'red', 'medium', eraser), 0)
  const exitAt = 11.4
  assert.equal(p.read(exitAt).eraseProgress, eraser ? 0 : -1)
  p.configure(settings(['brush'], 'blue', 'thin', !eraser), 11.5)
  const nextAt = exitAt + (eraser ? eraseTotal : 0.7)
  assert.deepEqual(p.read(nextAt).style, { pen: 'highlighter', color: 'red', size: 'medium' })
  // 排队的新刷子在下一次边界生效，不会被旧锁定设置覆盖。
  assert.equal(p.read(nextAt + 7.2).eraseProgress, -1)
  assert.deepEqual(p.read(nextAt + 7.9).style, { pen: 'brush', color: 'blue', size: 'thin' })
}

// 锁定下一项为空时，退场期间的新选择在艺术字渐显后仍有机会应用，不困在无限保持。
for (const pendingSettings of [settings(['soft'], 'blue'), settings([], 'blue', 'medium', true), settings([], 'blue')]) {
  const p = createPlayback()
  p.configure(settings(['highlighter'], 'red'), 0)
  p.configure(settings([], 'red'), 10)
  p.read(11.4)
  p.configure(pendingSettings, 11.5)
  assert.equal(p.read(12.1).view, 'art')
  assert.equal(p.read(12.1).artColor, 'red')
  if (pendingSettings.pens.length) {
    assert.equal(p.read(12.75).view, 'art')
    close(p.read(12.75).state.opacity, 0.5)
    assert.deepEqual(p.read(13.1).style, { pen: 'soft', color: 'blue', size: 'medium' })
  }
  else {
    assert.equal(p.read(12.4).artColor, 'blue')
    close(p.read(12.525).colorMix, 0.5)
    if (pendingSettings.eraser) {
      assert.equal(p.read(12.4).shimmer, -1)
      close(p.read(15.4).eraseProgress, 0)
    }
    else assert.equal(p.read(100).state.opacity, 1)
  }
}

// 仅橡皮的艺术字保持阶段修改仍排队，移除橡皮后平稳留在完整艺术字。
const artErase = createPlayback()
artErase.configure(settings([], 'red', 'medium', true), 0)
artErase.configure(settings([], 'blue'), 5)
assert.equal(artErase.read(6).artColor, 'red')
assert.equal(artErase.read(7.5).eraseProgress, -1)
assert.equal(artErase.read(7.5).artColor, 'blue')
assert.equal(artErase.read(100).state.opacity, 1)

// 持续艺术字新选笔时使用渐隐，即便新集合包括橡皮。
const artToPen = createPlayback()
artToPen.configure(settings([]), 0)
artToPen.configure(settings(['brush'], 'green', 'thick', true), 5)
assert.equal(artToPen.read(5.35).eraseProgress, -1)
close(artToPen.read(5.35).state.opacity, 0.5)
assert.equal(artToPen.read(5.7).style.pen, 'brush')

for (const pens of [[], ['highlighter']]) {
  const p = createPlayback()
  p.configure(settings(pens, 'blue', 'medium', true), 0)
  const at = (pens.length ? 11.4 : 7.5) + eraseLead + ERASE_SECONDS / 2
  const erased = p.read(at)
  close(erased.eraseProgress, 0.5)
  p.toggle(at)
  assert.deepEqual(p.read(at), erased)
  close(p.read(at + 0.11).eraseProgress, 0.5)
  close(p.read(at + 0.11).state.opacity, 0.5)
  p.toggle(at + 0.12)
  p.toggle(at + 0.13)
  assert.equal(p.read(at + 0.52).eraseProgress, -1)
  assert.deepEqual(p.read(at + 0.52).style, DEFAULT_STYLE)
  p.toggle(at + 1)
  assert.equal(p.read(at + 1.7).view, pens.length ? 'ink' : 'art')
}

// 减少动态效果不呈现半擦字；恢复从当前完整内容停留，排队样式不抢占。
for (const pens of [[], ['highlighter']]) {
  const p = createPlayback()
  p.configure(settings(pens, 'green', 'medium', true), 0)
  const at = (pens.length ? 11.4 : 7.5) + eraseLead + ERASE_SECONDS / 2
  p.read(at)
  p.configure(settings(['soft'], 'blue'), at)
  p.settleReduced(at)
  assert.equal(p.read(at, true).view, pens.length ? 'ink' : 'art')
  assert.equal(p.read(at, true).eraseProgress, -1)
  assert.equal(p.read(at).eraseProgress, -1)
  assert.equal(p.read(at).state.opacity, 1)
}

// 光标先出现并停顿、全不透明擦除，再停顿消失，空白间隔后才能消费锁定下一项。
const erasePhases = [
  [0, 0, 0], [0.14, 0, 0.5], [0.28, 0, 1], [0.39, 0, 1], [0.5, 0, 1],
  [2.9, 0.5, 1], [5.3, 1, 1], [5.4, 1, 1], [5.5, 1, 1], [5.65, 1, 0.5],
  [5.8, 1, 0], [6, 1, 0],
]
for (const pens of [[], ['highlighter']]) {
  const p = createPlayback()
  p.configure(settings(pens, 'blue', 'medium', true), 0)
  const exitAt = pens.length ? 11.4 : 7.5
  for (const [offset, progress, opacity] of erasePhases) {
    const frame = p.read(exitAt + offset)
    close(frame.eraseProgress, progress)
    close(frame.eraseOpacity, opacity)
    assert.equal(frame.state.opacity, 1)
    assert.equal(frame.state.inkTime, 4.2)
    assert.equal(frame.shimmer, -1)
    assert.equal(frame.view, pens.length ? 'ink' : 'art')
  }
  assert.equal(p.read(exitAt + eraseTotal).eraseProgress, -1)
  assert.equal(p.read(exitAt + eraseTotal).eraseOpacity, 0)
}

for (const pens of [[], ['highlighter']]) {
  for (const offset of [0.14, 0.39, 2.9, 5.4, 5.65, 6]) {
    const exitAt = pens.length ? 11.4 : 7.5
    const at = exitAt + offset
    const make = () => {
      const p = createPlayback()
      p.configure(settings(pens, 'red', 'medium', true), 0)
      return p
    }
    const paused = make()
    const snapshot = paused.read(at)
    paused.toggle(at)
    assert.deepEqual(paused.read(at), snapshot)
    const half = paused.read(at + 0.11)
    close(half.eraseProgress, snapshot.eraseProgress)
    close(half.eraseOpacity, snapshot.eraseOpacity)
    close(half.state.opacity, 0.5)
    // 快速改意图也不能跳变光标或擦除蒙版。
    paused.toggle(at + 0.11)
    paused.toggle(at + 0.11)
    assert.deepEqual(paused.read(at + 0.11), half)
    assert.equal(paused.read(at + 0.52).eraseOpacity, 0)

    const reduced = make()
    reduced.read(at)
    reduced.settleReduced(at)
    for (const reduce of [false, true]) {
      const frame = reduced.read(at, reduce)
      assert.equal(frame.eraseProgress, -1)
      assert.equal(frame.eraseOpacity, 0)
      assert.equal(frame.state.opacity, 1)
      assert.equal(frame.view, pens.length ? 'ink' : 'art')
    }

    const pending = make()
    pending.configure(settings(['brush'], 'blue'), at)
    const locked = pending.read(exitAt + eraseTotal)
    assert.equal(locked.view, pens.length ? 'ink' : 'art')
    assert.equal(locked.eraseOpacity, 0)
    if (pens.length) {
      assert.equal(locked.style.pen, 'highlighter')
      assert.equal(locked.style.color, 'red')
      assert.equal(pending.read(exitAt + eraseTotal + 7.9).style.pen, 'brush')
    }
    else {
      assert.equal(locked.artColor, 'red')
      assert.equal(pending.read(exitAt + eraseTotal + 0.3 + 3 + 0.7).style.pen, 'brush')
    }
  }
}

console.log('PASS: 64 tool subsets, 320 successor mutations, complete eraser entry/hold/exit/gap, locked settings and per-phase pause/reduced restoration')
