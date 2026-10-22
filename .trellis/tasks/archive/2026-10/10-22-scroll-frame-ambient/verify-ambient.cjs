// 纯轨迹/调度与真实 SFC 生命周期验证；不替代实际浏览器像素检查。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { parse, compileScript, compileTemplate, compileStyle } = require('@vue/compiler-sfc')
const { load, sourceRoot } = require(path.resolve('.trellis/tasks/10-04-new-index3-wordmark/harness.cjs'))
const { createAmbientScheduler, ambientFrame, ambientEnd, placeAmbient } = load('ambientScene')
function seeded(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) }

const families = new Set()
const pens = new Set()
let pairs = 0
for (const mobile of [false, true]) {
  const scheduler = createAmbientScheduler(seeded(71))
  let now = 0
  let state = scheduler.update(now, mobile)
  assert.ok(state.wait >= 2 && state.wait <= 4)
  assert.equal(state.scenes.length, 0)
  for (let round = 0; round < 200; round++) {
    now += state.wait + 1e-8
    state = scheduler.update(now, mobile)
    assert.ok(state.scenes.length >= 1 && state.scenes.length <= (mobile ? 1 : 2))
    if (state.scenes.length === 2) {
      pairs++
      assert.notEqual(state.scenes[0].side, state.scenes[1].side)
      assert.equal(state.scenes[1].start, state.scenes[0].start + 0.9)
    }
    for (const scene of state.scenes) {
      families.add(scene.kind)
      pens.add(scene.pen)
      assert.ok(scene.draw >= 1 && scene.draw <= 2)
      assert.ok(scene.hold >= 2 && scene.hold <= 4)
      assert.ok(scene.erase >= 1 && scene.erase <= 2)
      assert.equal(ambientFrame(scene, scene.start - 1).paths.length, 0)
      assert.ok(ambientFrame(scene, scene.start + scene.draw * 0.4).paths.length)
      const full = ambientFrame(scene, scene.start + scene.draw + scene.hold * 0.9)
      const erasing = ambientFrame(scene, scene.start + scene.draw + scene.hold + scene.erase * 0.6)
      if (scene.kind !== 'laser') assert.ok(erasing.cursor)
      else assert.equal(erasing.cursor, undefined)
      assert.equal(ambientFrame(scene, ambientEnd(scene) + 1e-6).paths.length, 0)
      if (scene.kind === 'shape') {
        assert.notEqual(ambientFrame(scene, scene.start + scene.draw).paths[0].d, full.paths[0].d)
        const points = scene.strokes[0].regular
        if (points[0].x === 180) {
          const dx = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x))
          const dy = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y))
          assert.equal(dx, dy, 'recognized circle is not an ellipse')
        }
      }
      if (scene.kind === 'digits') assert.ok(full.paths.some(p => p.highlight))
    }
    now = Math.max(...state.scenes.map(ambientEnd)) + 1e-8
    state = scheduler.update(now, mobile)
    assert.equal(state.scenes.length, 0)
    assert.ok(state.wait >= (mobile ? 12 : 8) - 1e-6 && state.wait <= (mobile ? 20 : 14))
  }
}
assert.equal(families.size, 4)
assert.equal(pens.size, 3, 'normal scenes sample hard/soft/brush independently')
const { smoothAmbientPoints } = load('ambientScene')
const curve = smoothAmbientPoints([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }])
assert.equal(curve.length, 321)
assert.ok(curve.some(p => p.y < -0.1), 'curve interpolation actually rounds the control polygon rather than densifying straight segments')
assert.ok(pairs >= 10 && pairs <= 50, `rare overlap count: ${pairs}`)
assert.deepEqual(createAmbientScheduler(seeded(12)).update(4, false), createAmbientScheduler(seeded(12)).update(4, false))
for (const width of [320, 390, 768, 900, 1280, 1920]) {
  const heading = { x: 48, y: 88, width: width < 900 ? width - 96 : 320, height: 140 }
  for (const side of [0, 1]) {
    const box = placeAmbient(width, 600, 0, 600, side, seeded(2), [heading])
    assert.ok(box.x >= 0 && box.x + box.width <= width)
    assert.ok(box.y >= 0 && box.y + box.height <= 600)
    assert.ok(box.x + box.width < heading.x || box.x > heading.x + heading.width || box.y + box.height < heading.y || box.y > heading.y + heading.height)
  }
}

const filename = path.join(sourceRoot, 'AmbientInk.vue')
const { descriptor, errors } = parse(fs.readFileSync(filename, 'utf8'))
assert.deepEqual(errors, [])
const script = compileScript(descriptor, { id: 'ambient-test' })
assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename, id: 'ambient-test', compilerOptions: { bindingMetadata: script.bindings } }).errors, [])
assert.deepEqual(compileStyle({ source: descriptor.styles[0].content, filename, id: 'ambient-test', scoped: true }).errors, [])
class Events {
  listeners = new Map()
  addEventListener(name, callback) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(callback) }
  removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback) }
  emit(name) { this.listeners.get(name)?.forEach(fn => fn()) }
  count() { return [...this.listeners.values()].reduce((n, group) => n + group.size, 0) }
}
let now = 0
let serial = 0
let mount
let unmount
const frames = new Map()
const timers = new Map()
const observers = []
const theme = { value: false }
class Observer {
  constructor(callback) { this.callback = callback; observers.push(this) }
  observe() {}
  disconnect() { this.disconnected = true }
}
global.window = Object.assign(new Events(), { innerWidth: 1280, innerHeight: 800 })
global.document = Object.assign(new Events(), { hidden: false })
global.performance = { now: () => now }
global.IntersectionObserver = Observer
global.ResizeObserver = Observer
global.requestAnimationFrame = callback => { frames.set(++serial, callback); return serial }
global.cancelAnimationFrame = id => frames.delete(id)
global.setTimeout = (callback, delay) => { timers.set(++serial, { callback, at: now + delay }); return serial }
global.clearTimeout = id => timers.delete(id)
let themeWatch
let renderArgs
let disposed = 0
const vue = { onUpdated() {}, watch: (_, fn) => { themeWatch = fn }, defineComponent: options => options, ref: value => ({ value }), shallowRef: value => ({ value }),
  computed: callback => ({ get value() { return callback() } }), onMounted: fn => { mount = fn }, onBeforeUnmount: fn => { unmount = fn } }
const component = new Module(filename, module)
component.filename = filename
component.require = name => name === './ambientPainter' ? { createAmbientPainter: () => ({ render: (...args) => { renderArgs = args }, dispose: () => { disposed++ } }) } : name === 'vue' ? vue : name === 'vuepress-theme-plume/client' ? { useDarkMode: () => theme } : name.startsWith('./') ? load(name.slice(2)) : require(name)
component._compile(ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
const state = component.exports.default.setup({}, { expose() {} })
let top = 0
state.root.value = { getBoundingClientRect: () => ({ left: 0, top, bottom: top + 600, width: 1280, height: 600 }), parentElement: { querySelectorAll: () => [] } }
assert.equal(state.tiles.value.length, 0, 'SSR is blank and does not consume random')
mount()
assert.equal(timers.size + frames.size, 0, 'offscreen starts no loop')
observers[0].callback([{ isIntersecting: true }])
assert.equal(timers.size, 1)
assert.equal(frames.size, 0, 'initial wait has no RAF')
function advance(ms) {
  now += ms
  const callbacks = [...frames.values()]
  frames.clear()
  for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); callbacks.push(timer.callback) }
  callbacks.forEach(callback => callback(now))
}
advance(4500)
assert.ok(state.tiles.value.length)
assert.equal(frames.size, 1)
advance(500)
const heldTime = state.clock.read(now)
document.hidden = true
document.emit('visibilitychange')
assert.equal(timers.size + frames.size, 0)
advance(60000)
document.hidden = false
document.emit('visibilitychange')
assert.equal(state.clock.read(now), heldTime, 'hidden time does not advance or accumulate rounds')
const boxes = state.tiles.value.map(tile => tile.box)
top = -100
window.emit('scroll')
assert.deepEqual(state.tiles.value.map(tile => tile.box), boxes, 'scroll keeps document coordinates')
top = -900
window.emit('scroll')
const offscreenTime = state.clock.read(now)
assert.equal(timers.size + frames.size, 0)
advance(60000)
top = 0
window.emit('scroll')
assert.equal(state.clock.read(now), offscreenTime)
state.bindCanvas(state.tiles.value[0].scene.id, {})
const beforeThemeTime = state.time.value
theme.value = true
themeWatch()
assert.equal(renderArgs[5], 'dark', 'theme change repaints the actual Canvas adapter')
assert.equal(state.time.value, beforeThemeTime, 'theme repaint does not restart scene')
for (let i = 0; i < 12; i++) advance(1000)
assert.equal(state.tiles.value.length, 0)
assert.equal(frames.size, 0, 'between rounds no RAF remains')
assert.equal(timers.size, 1)
for (let i = 0; i < 5; i++) window.emit('scroll')
assert.equal(timers.size, 1, 'repeated activity synchronizations never stack timers')
unmount()
assert.equal(frames.size + timers.size, 0)
assert.ok(disposed > 0, 'unmount releases painter buffers')
assert.ok(observers.every(item => item.disconnected))
assert.equal(window.count() + document.count(), 0)
console.log('ambient: 400 seeded rounds, four families, placement, SFC compilation and lifecycle passed')
