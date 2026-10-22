const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { parse, compileScript, compileTemplate, compileStyle } = require('@vue/compiler-sfc')
const { load, sourceRoot } = require('../10-04-new-index3-wordmark/harness.cjs')
const { createWallpaperSchedule, initialWallpaper } = load('wallpaper')
const { createActiveClock } = load('softPen')

assert.deepEqual(initialWallpaper(), { palettes: [0, 0], current: 0, fading: false })
let seed = 71
const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32)
const schedule = createWallpaperSchedule(random)
let now = 0
let previousPalette = 0
const seen = new Set([0])
for (let round = 0; round < 400; round++) {
  const wait = schedule.remaining(now)
  assert.ok(wait >= (round ? 14 : 20) && wait <= (round ? 24 : 30))
  const waiting = schedule.advance(now + wait - 0.001)
  assert.equal(waiting.fading, false)
  now += wait
  const entering = schedule.advance(now)
  assert.equal(entering.fading, true)
  assert.equal(entering.palettes[entering.current], previousPalette)
  const next = entering.palettes[1 - entering.current]
  assert.notEqual(next, previousPalette)
  seen.add(next)
  assert.equal(schedule.remaining(now), 6)
  assert.equal(schedule.advance(now + 5.999).fading, true)
  now += 6
  const settled = schedule.advance(now)
  assert.equal(settled.fading, false)
  assert.equal(settled.palettes[settled.current], next)
  previousPalette = next
}
assert.equal(seen.size, 3)

// 暂停等待和暂停淡化都不消耗剩余秒数，也不会补播多个状态。
const paused = createWallpaperSchedule(() => 0)
const clock = createActiveClock()
clock.setRunning(true, 0)
clock.setRunning(false, 10000)
assert.equal(paused.remaining(clock.read(90000)), 10)
clock.setRunning(true, 90000)
assert.equal(paused.advance(clock.read(100000)).fading, true)
clock.setRunning(false, 102000)
assert.equal(paused.remaining(clock.read(900000)), 4)
clock.setRunning(true, 900000)
assert.equal(paused.advance(clock.read(904000)).fading, false)
const delayed = createWallpaperSchedule(() => 0)
assert.equal(delayed.advance(99999).fading, true)
assert.equal(delayed.remaining(99999), 6)

const filename = path.join(sourceRoot, 'ReleaseSection.vue')
const source = fs.readFileSync(filename, 'utf8')
const { descriptor } = parse(source)
const script = compileScript(descriptor, { id: 'wallpaper' })
assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename, id: 'wallpaper', compilerOptions: { bindingMetadata: script.bindings } }).errors, [])
const css = descriptor.styles[0].content
assert.deepEqual(compileStyle({ source: css, filename, id: 'wallpaper', scoped: true }).errors, [])
assert.match(css, /font-display: swap/)
assert.doesNotMatch(css, /Zhi Mang Xing|transform: rotate\(-5deg\)/)
assert.match(css, /font-size: clamp\(20px, 1\.8vw, 24px\)/)
assert.match(css, /animation-play-state: var\(--wallpaper-play, paused\)/)
assert.match(source, /clearTimeout\(wallpaperTimer\)/)
assert.match(source, /syncWallpaper\(performance\.now\(\)\)/)
console.log('PASS: 400 wallpaper cycles, all three palettes, non-repeating 20–30s starts, 6s fades, paused wait/fade clocks, no catch-up; ReleaseSection SFC compiles')
