const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { load, sourceRoot } = require('./harness.cjs')

class Events {
  listeners = new Map()
  addEventListener(name, callback) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set())
    this.listeners.get(name).add(callback)
  }
  removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback) }
  emit(name, event = {}) { this.listeners.get(name)?.forEach(callback => callback(event)) }
  count() { return [...this.listeners.values()].reduce((sum, entries) => sum + entries.size, 0) }
}

let now = 0
let nextFrame = 1
let mountedHook
let unmountedHook
let lastPaint
let themeChanged
const darkMode = { value: false }
const scheduled = new Map()
const observers = []
class Observer {
  constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this) }
  observe(target) { this.target = target }
  disconnect() { this.disconnected = true }
}
const motion = Object.assign(new Events(), { matches: false })
const pointer = Object.assign(new Events(), { matches: true })
global.window = Object.assign(new Events(), {
  devicePixelRatio: 1,
  location: { search: '' },
  matchMedia: query => query.includes('reduced-motion') ? motion : pointer,
  IntersectionObserver: Observer,
})
global.document = Object.assign(new Events(), { hidden: false, documentElement: new Events() })
global.performance = { now: () => now }
global.ResizeObserver = Observer
global.IntersectionObserver = Observer
global.requestAnimationFrame = callback => { const id = nextFrame++; scheduled.set(id, callback); return id }
global.cancelAnimationFrame = id => scheduled.delete(id)

const softPen = load('softPen')
const filename = path.join(sourceRoot, 'NewHome3.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'))
const script = compileScript(descriptor, { id: 'lifecycle-test' }).content.replaceAll('import.meta.env.DEV', 'true')
const compiled = ts.transpileModule(script, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const componentModule = new Module(filename, module)
componentModule.filename = filename
componentModule.require = name => {
  if (name === 'vue') return {
    defineComponent: options => options,
    ref: value => ({ value }),
    onMounted: callback => { mountedHook = callback },
    onBeforeUnmount: callback => { unmountedHook = callback },
    watch: (source, callback) => { assert.equal(source, darkMode); themeChanged = callback },
  }
  if (name === 'vuepress-theme-plume/client') return { useDarkMode: () => darkMode }
  if (name === './softPen') return { ...softPen, createPainter: () => ({ render: (state, width, height, dpr, theme) => { lastPaint = { ...state, width, height, theme } } }) }
  return require(name)
}
componentModule._compile(compiled, filename)
const state = componentModule.exports.default.setup({}, { expose() {} })
state.root.value = { clientWidth: 1440, clientHeight: 836 }
state.plane.value = { getBoundingClientRect: () => ({ left: 320, right: 1120, top: 180, bottom: 500, width: 800, height: 320 }) }
state.canvas.value = { style: {} }
mountedHook()
assert.equal(lastPaint.inkTime, 0)
assert.equal(scheduled.size, 1)
const advance = time => {
  now = time
  const callbacks = [...scheduled.values()]
  scheduled.clear()
  callbacks.forEach(callback => callback(now))
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)

advance(1000)
close(lastPaint.inkTime, 1)
now = 1500
document.hidden = true
document.emit('visibilitychange')
assert.equal(scheduled.size, 0)
now = 9500
document.hidden = false
document.emit('visibilitychange')
close(lastPaint.inkTime, 1.5)
advance(10000)
close(lastPaint.inkTime, 2)

state.visibleObserver.callback([{ isIntersecting: false }])
assert.equal(scheduled.size, 0)
now = 20000
state.visibleObserver.callback([{ isIntersecting: true }])
close(lastPaint.inkTime, 2)
motion.matches = true
motion.emit('change')
assert.equal(lastPaint.phase, 'static')
advance(21000)
assert.equal(scheduled.size, 0)
now = 30000
motion.matches = false
motion.emit('change')
close(lastPaint.inkTime, 2)
advance(31000)
close(lastPaint.inkTime, 3)

window.emit('pointermove', { pointerType: 'mouse', clientX: 1120, clientY: 500 })
for (let i = 1; i <= 90; i++) advance(31000 + i * 1000 / 60)
assert.ok(state.tiltX > 0.9 && state.tiltX <= 1)
assert.ok(state.tiltY > 0.9 && state.tiltY <= 1)
window.emit('pointermove', { pointerType: 'mouse', clientX: 2000, clientY: 900 })
for (let i = 1; i <= 90; i++) advance(32500 + i * 1000 / 60)
assert.ok(Math.abs(state.tiltX) < 0.001 && Math.abs(state.tiltY) < 0.001)
window.emit('pointermove', { pointerType: 'touch', clientX: 1120, clientY: 500 })
assert.equal(state.targetX, 0)
assert.equal(state.targetY, 0)
window.emit('pointermove', { pointerType: 'mouse', clientX: 1120, clientY: 500 })
pointer.matches = false
pointer.emit('change')
assert.equal(state.tiltX, 0)
assert.equal(state.tiltY, 0)

// 暂停先淡出冻结帧，再淡入成品；继续渐隐后进入下一轮。
for (const offset of [0.5, 8.5, 13, 17, 20]) {
  state.clock.seek(offset, now)
  state.syncPlayback()
  const outgoing = { ...lastPaint }
  state.togglePlayback()
  assert.equal(state.paused.value, true)
  close(lastPaint.inkTime, outgoing.inkTime)
  close(lastPaint.rawTime, outgoing.rawTime)
  close(lastPaint.opacity, outgoing.opacity)
  const pauseAt = now
  advance(pauseAt + 110)
  assert.ok(lastPaint.opacity < outgoing.opacity && lastPaint.opacity > 0)
  close(lastPaint.inkTime, outgoing.inkTime)
  close(lastPaint.rawTime, outgoing.rawTime)
  advance(pauseAt + 220)
  close(lastPaint.opacity, 0)
  advance(pauseAt + 370)
  assert.ok(lastPaint.opacity > 0 && lastPaint.opacity < 1)
  assert.equal(lastPaint.inkTime, 4.2)
  assert.equal(lastPaint.rawTime, -1)
  advance(pauseAt + 520)
  assert.equal(lastPaint.opacity, 1)
  advance(now + 5000)
  assert.equal(scheduled.size, 0)
  state.resizeObserver.callback()
  assert.equal(lastPaint.opacity, 1)
  const pausedTime = state.clock.read(now)
  darkMode.value = true
  themeChanged()
  assert.equal(lastPaint.theme, 'dark')
  assert.equal(lastPaint.phase, 'static')
  close(state.clock.read(now), pausedTime)
  darkMode.value = false
  themeChanged()
  assert.equal(lastPaint.theme, 'light')
  motion.matches = true
  motion.emit('change')
  state.togglePlayback()
  assert.equal(state.paused.value, true)
  motion.matches = false
  motion.emit('change')
  assert.equal(lastPaint.phase, 'static')
  document.hidden = true
  document.emit('visibilitychange')
  now += 5000
  document.hidden = false
  document.emit('visibilitychange')
  assert.equal(lastPaint.rawTime, -1)
  state.togglePlayback()
  assert.equal(state.paused.value, false)
  assert.equal(lastPaint.phase, 'fade')
  close(lastPaint.opacity, 1)
  const resumedAt = now
  advance(resumedAt + 350)
  close(lastPaint.opacity, 0.5)
  assert.equal(lastPaint.rawTime, -1)
  advance(resumedAt + 700)
  assert.equal(lastPaint.phase, 'raw')
  close(lastPaint.rawTime, 0)
}
// 在暂停过渡中切换主题/隐藏标签页，不消费隐藏时间或突变为完整字。
state.clock.seek(1, now)
state.syncPlayback()
state.togglePlayback()
advance(now + 100)
const fading = { ...lastPaint }
darkMode.value = true
themeChanged()
close(lastPaint.opacity, fading.opacity)
close(lastPaint.inkTime, fading.inkTime)
document.hidden = true
document.emit('visibilitychange')
now += 10000
document.hidden = false
document.emit('visibilitychange')
close(lastPaint.opacity, fading.opacity)
state.togglePlayback()
assert.equal(state.paused.value, false)
close(lastPaint.opacity, fading.opacity)
advance(now + 1000)
assert.equal(state.paused.value, false)
assert.equal(lastPaint.rawTime, -1)
// 中途反复切换只改变目标状态，当前画面保持连续。
state.togglePlayback()
advance(now + 50)
const rapidOpacity = lastPaint.opacity
state.togglePlayback()
close(lastPaint.opacity, rapidOpacity)
state.togglePlayback()
close(lastPaint.opacity, rapidOpacity)
advance(now + 1000)
close(lastPaint.opacity, 1)
assert.equal(lastPaint.inkTime, 4.2)
for (let i = 0; i < 120; i++) advance(now + 1000 / 60)
assert.equal(state.iconPath.value, state.iconPaths(1), 'play icon did not settle')
assert.equal(scheduled.size, 0, 'settled paused control keeps requesting frames')
state.togglePlayback()
for (let i = 0; i < 120; i++) advance(now + 1000 / 60)
assert.equal(state.iconPath.value, state.iconPaths(0), 'pause icon did not settle')
motion.matches = true
motion.emit('change')
state.togglePlayback()
assert.equal(state.paused.value, false)
assert.equal(lastPaint.phase, 'static')

unmountedHook()
assert.equal(scheduled.size, 0)
assert.ok(observers.every(observer => observer.disconnected))
assert.equal(window.count() + document.count() + document.documentElement.count() + motion.count() + pointer.count(), 0)
console.log('PASS: compiled Vue lifecycle: pause/resume, offscreen, live reduced-motion, pointer bounds/return/touch exclusion, complete teardown')
