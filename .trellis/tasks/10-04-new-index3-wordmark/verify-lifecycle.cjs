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
    nextTick: callback => callback(),
    onMounted: callback => { mountedHook = callback },
    onBeforeUnmount: callback => { unmountedHook = callback },
    watch: (source, callback) => { assert.equal(source, darkMode); themeChanged = callback },
  }
  if (name === 'vuepress-theme-plume/client') return { useDarkMode: () => darkMode }
  if (name === './softPen') return { ...softPen, createPainter: () => ({ render: (state, width, height, dpr, theme, style) => { lastPaint = { ...state, width, height, theme, style } } }) }
  if (name.startsWith('./')) return load(name.slice(2))
  return require(name)
}
componentModule._compile(compiled, filename)
const state = componentModule.exports.default.setup({}, { expose() {} })
state.root.value = { clientWidth: 1440, clientHeight: 836 }
state.plane.value = { getBoundingClientRect: () => ({ left: 320, right: 1120, top: 180, bottom: 500, width: 800, height: 320 }) }
state.canvas.value = { style: {} }
mountedHook()
assert.equal(lastPaint.inkTime, 4.2)
assert.equal(lastPaint.opacity, 0)
assert.equal(scheduled.size, 1)
const advance = time => {
  now = time
  const callbacks = [...scheduled.values()]
  scheduled.clear()
  callbacks.forEach(callback => callback(now))
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)
advance(250)
close(lastPaint.opacity, 0.5)
advance(300)
document.hidden = true
document.emit('visibilitychange')
assert.equal(scheduled.size, 0)
const frozen = lastPaint.opacity
now = 10300
document.hidden = false
document.emit('visibilitychange')
close(lastPaint.opacity, frozen)
advance(10500)
close(lastPaint.opacity, 1)
state.visibleObserver.callback([{ isIntersecting: false }])
assert.equal(scheduled.size, 0)
now = 20500
state.visibleObserver.callback([{ isIntersecting: true }])
close(lastPaint.opacity, 1)
advance(24200)
assert.equal(lastPaint.phase, 'raw')
close(lastPaint.rawTime, 0)

// 面板打开不改变时间轴；键盘打开/关闭焦点、外点关闭、选项延迟生效。
let paletteFocused = 0
let inputFocused = 0
state.paletteButton.value = { focus: () => paletteFocused++ }
state.panel.value = { querySelector: () => ({ focus: () => inputFocused++ }) }
state.controls.value = { contains: target => target === 'inside' }
state.togglePanel({ detail: 0 })
assert.equal(state.panelOpen.value, true)
assert.equal(inputFocused, 1)
advance(25200)
close(lastPaint.rawTime, 1)
document.emit('pointerdown', { target: 'inside' })
assert.equal(state.panelOpen.value, true)
document.emit('keydown', { key: 'Escape', preventDefault() {} })
assert.equal(state.panelOpen.value, false)
assert.equal(paletteFocused, 1)
state.togglePanel({ detail: 1 })
document.emit('pointerdown', { target: 'outside' })
assert.equal(state.panelOpen.value, false)
assert.equal(paletteFocused, 1)
state.selectedPens.value = ['laser']
state.selectedColor.value = 'blue'
state.selectedSize.value = 'thick'
state.updateSettings()
assert.equal(lastPaint.style.pen, 'hard')
advance(36650)
assert.equal(lastPaint.style.pen, 'laser')
assert.equal(lastPaint.style.color, 'blue')
assert.equal(lastPaint.style.size, 'thick')
advance(37650)
const outgoing = { ...lastPaint }
state.togglePlayback()
assert.equal(state.paused.value, true)
close(lastPaint.inkTime, outgoing.inkTime)
advance(37760)
close(lastPaint.opacity, outgoing.opacity * 0.5)
assert.equal(lastPaint.style.pen, 'laser')
advance(37870)
close(lastPaint.opacity, 0)
advance(38020)
close(lastPaint.opacity, 0.5)
assert.deepEqual(lastPaint.style, { pen: 'hard', color: 'rainbow', size: 'medium' })
advance(38170)
close(lastPaint.opacity, 1)
for (let i = 0; i < 120; i++) advance(now + 1000 / 60)
assert.equal(scheduled.size, 0)
assert.equal(state.iconPath.value, state.iconPaths(1))
state.selectedPens.value = []
state.updateSettings()
assert.equal(state.artFrame.value.view, 'ink')
darkMode.value = true
themeChanged()
assert.equal(lastPaint.theme, 'dark')
assert.equal(lastPaint.opacity, 1)
state.resizeObserver.callback()
assert.equal(lastPaint.opacity, 1)
state.togglePlayback()
const resumed = now
advance(resumed + 350)
close(lastPaint.opacity, 0.5)
advance(resumed + 700)
assert.equal(state.artFrame.value.view, 'art')
advance(resumed + 1000)
close(state.artFrame.value.state.opacity, 1)
advance(resumed + 2000)
assert.ok(state.artFrame.value.shimmer >= 0)
document.hidden = true
document.emit('visibilitychange')
const sweep = state.artFrame.value.shimmer
now += 10000
document.hidden = false
document.emit('visibilitychange')
close(state.artFrame.value.shimmer, sweep)

window.emit('pointermove', { pointerType: 'mouse', clientX: 1120, clientY: 500 })
for (let i = 0; i < 90; i++) advance(now + 1000 / 60)
assert.ok(state.tiltX > 0.9 && state.tiltX <= 1)
assert.equal(state.tiltStyle.value.transform, state.canvas.value.style.transform)
window.emit('pointermove', { pointerType: 'mouse', clientX: 2000, clientY: 900 })
for (let i = 0; i < 90; i++) advance(now + 1000 / 60)
assert.ok(Math.abs(state.tiltX) < 0.001)
window.emit('pointermove', { pointerType: 'touch', clientX: 1120, clientY: 500 })
assert.equal(state.targetX, 0)

// 艺术字暂停同样先淡出；快速点击只改变最终状态。
state.togglePlayback()
advance(now + 100)
const artOpacity = state.artFrame.value.state.opacity
state.togglePlayback()
close(state.artFrame.value.state.opacity, artOpacity)
state.togglePlayback()
close(state.artFrame.value.state.opacity, artOpacity)
assert.equal(state.artFrame.value.view, 'art')
advance(now + 1000)
assert.equal(state.artFrame.value.view, 'ink')
close(lastPaint.opacity, 1)
motion.matches = true
motion.emit('change')
state.togglePlayback()
assert.equal(state.paused.value, true)
assert.equal(lastPaint.opacity, 1)
motion.matches = false
motion.emit('change')
state.togglePlayback()
advance(now + 1000)
motion.matches = true
motion.emit('change')
assert.equal(state.artFrame.value.view, 'art')
assert.equal(state.artFrame.value.shimmer, -1)
state.selectedPens.value = ['soft']
state.selectedColor.value = 'purple'
state.updateSettings()
assert.equal(lastPaint.style.pen, 'soft')
assert.equal(lastPaint.style.color, 'purple')
assert.equal(lastPaint.inkTime, 4.2)
assert.equal(lastPaint.opacity, 1)
advance(now + 1000)
assert.equal(scheduled.size, 0)

unmountedHook()
assert.equal(scheduled.size, 0)
assert.ok(observers.every(observer => observer.disconnected))
assert.equal(window.count() + document.count() + document.documentElement.count() + motion.count() + pointer.count(), 0)
assert.ok(descriptor.template.content.includes('type="checkbox"'))
assert.ok(descriptor.template.content.includes('type="radio"'))
assert.ok(!descriptor.template.content.includes('title='))
console.log('PASS: compiled Vue lifecycle: opening, visibility, panel keyboard/outside close, deferred settings, material/art pause, theme/resize, parallax, reduced motion and teardown')
