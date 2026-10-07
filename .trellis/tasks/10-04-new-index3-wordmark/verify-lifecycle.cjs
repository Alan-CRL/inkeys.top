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
let paintCalls = 0
let disposeCalls = 0
let nextId = 0
let themeChanged
const darkMode = { value: false }
const scheduled = new Map()
const observers = []
class Observer {
  constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this) }
  observe(target) { this.target = target }
  disconnect() { this.disconnected = true }
}
const motion = Object.assign(new Events(), { matches: true })
// 能力媒体查询为 false，但真实 mouse 事件仍有效（混合输入设备场景）。
const pointer = Object.assign(new Events(), { matches: false })
global.window = Object.assign(new Events(), {
  devicePixelRatio: 1,
  location: { search: '' },
  matchMedia: query => query.includes('reduced-motion') ? motion : query.includes('any-pointer') ? pointer : { ...pointer, matches: false },
  IntersectionObserver: Observer,
})
global.document = Object.assign(new Events(), { hidden: false, documentElement: new Events(), createElementNS: () => ({ setAttribute() {} }) })
global.performance = { now: () => now }
global.ResizeObserver = Observer
global.IntersectionObserver = Observer
global.requestAnimationFrame = callback => { const id = nextFrame++; scheduled.set(id, callback); return id }
global.cancelAnimationFrame = id => scheduled.delete(id)

const softPen = load('softPen')
const filename = path.join(sourceRoot, 'NewHome3.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'))
global.__nh3IconCalls = 0
const script = compileScript(descriptor, { id: 'lifecycle-test' }).content.replaceAll('import.meta.env.DEV', 'true')
  .replace('function iconPaths(progress: number) {', 'function iconPaths(progress: number) { globalThis.__nh3IconCalls++')
const compiled = ts.transpileModule(script, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const componentModule = new Module(filename, module)
componentModule.filename = filename
componentModule.require = name => {
  if (name === 'vue') return {
    defineComponent: options => options,
    ref: value => ({ value }),
    shallowRef: value => ({ value }),
    useId: () => `v-${nextId++}`,
    nextTick: callback => callback(),
    onMounted: callback => { mountedHook = callback },
    onBeforeUnmount: callback => { unmountedHook = callback },
    watch: (source, callback) => { assert.equal(source, darkMode); themeChanged = callback },
  }
  if (name === 'vuepress-theme-plume/client') return { useDarkMode: () => darkMode }
  if (name === './softPen') return { ...softPen, createPainter: () => ({ dispose: () => disposeCalls++, render: (state, width, height, dpr, theme, style, eraseProgress) => { paintCalls++; lastPaint = { ...state, width, height, theme, style, eraseProgress } } }) }
  if (name.startsWith('./')) return load(name.slice(2))
  return require(name)
}
componentModule._compile(compiled, filename)
const state = componentModule.exports.default.setup({}, { expose() {} })
state.root.value = { clientWidth: 1440, clientHeight: 836 }
state.plane.value = { getBoundingClientRect: () => ({ left: 320, right: 1120, top: 180, bottom: 500, width: 800, height: 320 }) }
state.canvas.value = { style: {} }
mountedHook()
assert.equal(state.glintRunning.value, true)
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
assert.ok(Number(state.entranceStyles.value[0].opacity) > Number(state.entranceStyles.value[1].opacity))
assert.ok(Number(state.entranceStyles.value[1].opacity) > Number(state.entranceStyles.value[2].opacity))
advance(300)
document.hidden = true
document.emit('visibilitychange')
assert.equal(state.glintRunning.value, false)
window.emit('pointermove', { pointerType: 'mouse', clientX: 1120, clientY: 500 })
assert.equal(state.targetX, 0)
assert.equal(scheduled.size, 0)
const frozen = lastPaint.opacity
const frozenEntrance = state.entranceStyles.value.map(style => ({ ...style }))
now = 10300
document.hidden = false
document.emit('visibilitychange')
assert.equal(state.glintRunning.value, true)
close(lastPaint.opacity, frozen)
assert.deepEqual(state.entranceStyles.value, frozenEntrance)
advance(10500)
close(lastPaint.opacity, 1)
const heldFrame = state.artFrame.value
const heldTilt = state.tiltStyle.value
const heldPaints = paintCalls
const heldTime = state.clock.read(now)
const heldIconCalls = global.__nh3IconCalls
for (let i = 0; i < 30; i++) advance(now + 1000 / 60)
assert.equal(state.artFrame.value, heldFrame)
assert.equal(state.tiltStyle.value, heldTilt)
assert.equal(paintCalls, heldPaints)
assert.equal(global.__nh3IconCalls, heldIconCalls)
advance(now + 100)
assert.ok(state.entranceStyles.value.every(style => style.opacity === '1' && style.transform === 'none'))
const completedEntrance = state.entranceStyles.value
advance(now + 100)
assert.equal(state.entranceStyles.value, completedEntrance, 'finished entrance must not publish new frame objects')
state.clock.seek(heldTime, now)
state.visibleObserver.callback([{ isIntersecting: false }])
assert.equal(state.glintRunning.value, false)
window.emit('pointermove', { pointerType: 'mouse', clientX: 1120, clientY: 500 })
assert.equal(state.targetX, 0)
assert.equal(scheduled.size, 0)
now = 20500
state.visibleObserver.callback([{ isIntersecting: true }])
assert.equal(state.glintRunning.value, true)
close(lastPaint.opacity, 1)
advance(24200)
assert.equal(lastPaint.phase, 'raw')
close(lastPaint.rawTime, 0)

// 面板打开不改变时间轴；键盘打开/关闭焦点、外点关闭、选项延迟生效。
let paletteFocused = 0
let inputFocused = 0
state.paletteButton.value = { focus: () => paletteFocused++ }
state.panel.value = { contains: target => target === 'focused-option', querySelector: selector => { assert.equal(selector, 'button'); return { focus: () => inputFocused++ } } }
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
state.togglePanel({ detail: 0 })
document.activeElement = 'focused-option'
document.emit('pointerdown', { target: 'outside' })
assert.equal(state.panelOpen.value, false)
assert.equal(paletteFocused, 2)
state.togglePanel({ detail: 1 })
state.togglePanel({ detail: 1 })
assert.equal(state.panelOpen.value, false)
assert.equal(paletteFocused, 3)
document.activeElement = undefined
state.toggleTool('eraser')
assert.equal(state.selectedEraser.value, true)
state.toggleTool('eraser')
assert.equal(state.selectedEraser.value, false)
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
// 暂停只冻结书写，混合设备的实际鼠标仍能驱动共同平面的视差。
window.emit('pointermove', { pointerType: 'mouse', clientX: 1120, clientY: 500 })
for (let i = 0; i < 90; i++) advance(now + 1000 / 60)
assert.ok(state.tiltX > 0.9)
assert.equal(state.paused.value, true)
assert.equal(lastPaint.opacity, 1)
window.emit('pointermove', { pointerType: 'mouse', clientX: 2000, clientY: 900 })
for (let i = 0; i < 90; i++) advance(now + 1000 / 60)
assert.ok(Math.abs(state.tiltX) < 0.001)
assert.equal(state.tiltStyle.value.transform, 'none')
assert.equal(state.tiltStyle.value.willChange, 'auto')

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
assert.ok(state.tiltStyle.value.transform.includes('rotateX('))
assert.equal(state.tiltStyle.value.willChange, 'transform')
assert.equal(state.canvas.value.style.transform, undefined)
window.emit('pointermove', { pointerType: 'mouse', clientX: 2000, clientY: 900 })
for (let i = 0; i < 90; i++) advance(now + 1000 / 60)
assert.ok(Math.abs(state.tiltX) < 0.001)
assert.equal(state.tiltStyle.value.transform, 'none')
assert.equal(state.tiltStyle.value.willChange, 'auto')
window.emit('pointermove', { pointerType: 'touch', clientX: 1120, clientY: 500 })
assert.equal(state.targetX, 0)
window.emit('pointermove', { pointerType: 'pen', clientX: 1120, clientY: 500 })
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
// 即使系统偏好减少动态效果，动画与视差仍运行，暂停按钮也仍可继续。
assert.equal(motion.matches, true)
window.emit('pointermove', { pointerType: 'mouse', clientX: 1120, clientY: 500 })
assert.equal(state.targetX, 1)
state.togglePlayback()
assert.equal(state.paused.value, false)
advance(now + 1000)
assert.equal(state.artFrame.value.view, 'art')
assert.ok(state.artFrame.value.shimmer >= 0)
const activeTime = state.clock.read(now)
motion.matches = false
motion.emit('change')
motion.matches = true
motion.emit('change')
advance(now + 1000)
close(state.clock.read(now), activeTime + 1)

// 艺术字仅橡皮：共享几何、无扫光，暂停保留擦除进度，主题/缩放不重置。
state.selectedPens.value = []
state.selectedEraser.value = true
let maskAppends = 0
let maskClears = 0
const maskChildren = []
state.artMaskPaths.value = { replaceChildren() { maskClears++; maskChildren.length = 0 }, appendChild(path) { maskAppends++; maskChildren.push(path) } }
state.updateSettings()
for (let i = 0; i < 200 && (state.artFrame.value.view !== 'art' || state.artFrame.value.eraseProgress <= 0); i++) advance(now + 100)
assert.equal(state.artFrame.value.view, 'art')
assert.ok(state.artFrame.value.eraseProgress > 0)
assert.ok(state.artFrame.value.eraseOpacity > 0 && state.artFrame.value.eraseOpacity <= 1)
assert.equal(state.artFrame.value.shimmer, -1)
assert.ok(state.eraserFrame.value.path.length > 0)
assert.equal(maskChildren.length, state.eraserFrame.value.paths.length)
const previousAppends = maskAppends
const previousPaths = state.eraserFrame.value.paths.length
const artPaintCalls = paintCalls
advance(now + 100)
assert.equal(paintCalls, artPaintCalls, 'art must not repaint hidden ink Canvas')
assert.equal(maskAppends - previousAppends, state.eraserFrame.value.paths.length - previousPaths)
const stableAppends = maskAppends
const stableClears = maskClears
state.paint(now)
assert.equal(maskAppends, stableAppends)
assert.equal(maskClears, stableClears)

// 开发定格回退和 SVG 重新挂载不能保留旧擦除节点；恢复后仍只追加缺失片段。
const savedEraserFrame = state.eraserFrame.value
const rewindCount = Math.max(1, Math.floor(savedEraserFrame.paths.length / 2))
state.eraserFrame.value = { ...savedEraserFrame, paths: savedEraserFrame.paths.slice(0, rewindCount) }
state.syncArtMask()
assert.equal(maskChildren.length, rewindCount)
assert.equal(maskClears, stableClears + 1)
state.eraserFrame.value = savedEraserFrame
state.syncArtMask()
assert.equal(maskChildren.length, savedEraserFrame.paths.length)
const previousMaskNode = state.artMaskPaths.value
const remountedChildren = [{ stale: true }]
state.artMaskPaths.value = { get firstChild() { return remountedChildren[0] }, removeChild(child) { remountedChildren.splice(remountedChildren.indexOf(child), 1) }, appendChild(path) { remountedChildren.push(path) } }
state.syncArtMask()
assert.equal(remountedChildren.length, savedEraserFrame.paths.length)
state.artMaskPaths.value = previousMaskNode
state.syncArtMask()
assert.equal(maskChildren.length, savedEraserFrame.paths.length)

const eraseOpacity = state.artFrame.value.eraseOpacity
const eraseProgress = state.artFrame.value.eraseProgress
const erasePath = state.eraserFrame.value.path
themeChanged()
state.resizeObserver.callback()
assert.equal(state.artFrame.value.eraseProgress, eraseProgress)
assert.equal(state.artFrame.value.eraseOpacity, eraseOpacity)
assert.ok(state.artFrame.value.eraseOpacity > 0 && state.artFrame.value.eraseOpacity <= 1)
assert.equal(state.eraserFrame.value.path, erasePath)
state.root.value.clientWidth = 375
state.resizeObserver.callback()
assert.equal(state.artFrame.value.eraseProgress, eraseProgress)
assert.equal(state.artFrame.value.eraseOpacity, eraseOpacity)
assert.deepEqual(state.eraserFrame.value, load('eraser').getEraserFrame(eraseProgress,
  parseFloat(state.planeStyle.value.width), parseFloat(state.planeStyle.value.height)))
state.root.value.clientWidth = 1440
state.resizeObserver.callback()
assert.equal(state.eraserFrame.value.path, erasePath)
state.togglePlayback()
advance(now + 100)
assert.equal(state.artFrame.value.eraseProgress, eraseProgress)
assert.equal(state.artFrame.value.eraseOpacity, eraseOpacity)
assert.equal(state.eraserFrame.value.path, erasePath)
assert.ok(state.artFrame.value.state.opacity > 0 && state.artFrame.value.state.opacity < 1)
assert.ok(state.artFrame.value.eraseOpacity > 0 && state.artFrame.value.eraseOpacity <= 1)
advance(now + 500)
assert.equal(state.eraserFrame.value, undefined)
assert.equal(lastPaint.eraseProgress, -1)
assert.equal(state.artFrame.value.eraseOpacity, 0)

unmountedHook()
// 卸载前排队的 nextTick 即使随后抵达，也不得再写已经离开的 SVG。
const beforeUnmountAppends = maskAppends
state.artFrame.value = { ...state.artFrame.value, view: 'art' }
state.eraserFrame.value = savedEraserFrame
state.syncArtMask()
assert.equal(maskAppends, beforeUnmountAppends)
assert.equal(scheduled.size, 0)
assert.ok(observers.every(observer => observer.disconnected))
assert.equal(window.count() + document.count() + document.documentElement.count() + motion.count() + pointer.count(), 0)
assert.ok(!descriptor.template.content.includes('type="checkbox"'))
assert.ok(descriptor.template.content.includes(':aria-pressed="tool'))
assert.ok(descriptor.template.content.includes(':inert="!panelOpen"'))
assert.ok(descriptor.template.content.includes('type="radio"'))
assert.ok(!descriptor.template.content.includes('title='))
// 较旧引擎没有 ResizeObserver/matchMedia 时仍能初始化，并沿用 window.resize 更新尺寸。
global.ResizeObserver = undefined
window.matchMedia = undefined
const legacyState = componentModule.exports.default.setup({}, { expose() {} })
legacyState.root.value = { clientWidth: 375, clientHeight: 700 }
legacyState.canvas.value = { style: {} }
mountedHook()
assert.equal(legacyState.resizeObserver, undefined)
assert.ok(parseFloat(legacyState.planeStyle.value.width) > 0)
const legacyWidth = legacyState.planeStyle.value.width
legacyState.root.value.clientWidth = 768
window.emit('resize')
assert.notEqual(legacyState.planeStyle.value.width, legacyWidth)
// 预热只消费闲时，不改变帧/时钟；隐藏、取消选择和卸载都撤销尚未运行的任务。
const idleJobs = new Map()
let nextIdle = 1
window.requestIdleCallback = callback => { const id = nextIdle++; idleJobs.set(id, callback); return id }
window.cancelIdleCallback = id => idleJobs.delete(id)
legacyState.selectedEraser.value = true
advance(now + 500)
assert.equal(idleJobs.size, 1)
const warmFrame = legacyState.artFrame.value
const warmTime = legacyState.clock.read(now)
const [idleId, idleJob] = [...idleJobs.entries()][0]
idleJobs.delete(idleId)
idleJob()
assert.equal(legacyState.artFrame.value, warmFrame)
assert.equal(legacyState.clock.read(now), warmTime)
legacyState.root.value.clientWidth = 1024
window.emit('resize')
assert.equal(idleJobs.size, 1)
document.hidden = true
document.emit('visibilitychange')
assert.equal(idleJobs.size, 0)
document.hidden = false
document.emit('visibilitychange')
assert.equal(idleJobs.size, 1)
legacyState.selectedEraser.value = false
legacyState.updateSettings()
assert.equal(idleJobs.size, 0)
delete window.requestIdleCallback
delete window.cancelIdleCallback
const nativeSetTimeout = global.setTimeout
const nativeClearTimeout = global.clearTimeout
const delayedJobs = new Map()
global.setTimeout = (callback, delay) => { assert.equal(delay, 48); delayedJobs.set(1, callback); return 1 }
global.clearTimeout = id => delayedJobs.delete(id)
legacyState.selectedEraser.value = true
legacyState.warmEraserAtRest()
assert.equal(delayedJobs.size, 1)
unmountedHook()
assert.equal(delayedJobs.size, 0)
global.setTimeout = nativeSetTimeout
global.clearTimeout = nativeClearTimeout
assert.equal(scheduled.size, 0)
assert.equal(window.count() + document.count() + document.documentElement.count(), 0)

// WebKit named CSS Canvas 使用真实 alpha 像素验证：只追加新块，暂停/主题不重放，缩放/回退重建。
const { createCanvas, Path2D } = require('./harness.cjs').canvasRuntime()
global.Path2D = Path2D
const namedBuffers = new Map()
let cssMaskFills = 0
let cssMaskGets = 0
document.getCSSCanvasContext = (kind, name, width, height) => {
  assert.equal(kind, '2d')
  cssMaskGets++
  let context = namedBuffers.get(name)
  if (!context) {
    context = createCanvas(width, height).getContext('2d')
    const fill = context.fill.bind(context)
    context.fill = (...args) => { cssMaskFills++; fill(...args) }
    namedBuffers.set(name, context)
  }
  if (context.canvas.width !== width) context.canvas.width = width
  if (context.canvas.height !== height) context.canvas.height = height
  return context
}
global.CSS = {}
const unsupportedState = componentModule.exports.default.setup({}, { expose() {} })
unsupportedState.root.value = { clientWidth: 768, clientHeight: 700 }
unsupportedState.canvas.value = { style: {} }
mountedHook()
assert.equal(unsupportedState.cssCanvasMask.value, false, 'a missing CSS.supports method must fall back safely')
unmountedHook()
CSS.supports = () => false
const rejectedState = componentModule.exports.default.setup({}, { expose() {} })
rejectedState.root.value = { clientWidth: 768, clientHeight: 700 }
rejectedState.canvas.value = { style: {} }
mountedHook()
assert.equal(rejectedState.cssCanvasMask.value, false, 'API alone does not prove CSS syntax support')
unmountedHook()
CSS.supports = (property, value) => property === '-webkit-mask-image' && /^-webkit-canvas\(nh3-mask-/.test(value)
window.devicePixelRatio = 2
const cssState = componentModule.exports.default.setup({}, { expose() {} })
cssState.root.value = { clientWidth: 768, clientHeight: 700 }
cssState.canvas.value = { style: {} }
mountedHook()
assert.equal(cssState.cssCanvasMask.value, true)
assert.notEqual(cssState.cssMaskName, unsupportedState.cssMaskName)
const maskWidth = parseFloat(cssState.planeStyle.value.width)
const maskHeight = parseFloat(cssState.planeStyle.value.height)
const left = `M0 0H${maskWidth / 2}V${maskHeight}H0Z`
const right = `M${maskWidth / 2} 0H${maskWidth}V${maskHeight}H${maskWidth / 2}Z`
cssState.artFrame.value = { ...cssState.artFrame.value, view: 'art' }
cssState.eraserFrame.value = { paths: [left] }
cssState.syncArtMask()
const cssContext = namedBuffers.get(cssState.cssMaskName)
const alpha = (x, y) => cssContext.getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3]
assert.equal(alpha(cssContext.canvas.width * 0.25, 20), 0)
assert.equal(alpha(cssContext.canvas.width * 0.75, 20), 255)
const firstFills = cssMaskFills
const firstGets = cssMaskGets
cssState.artFrame.value = { ...cssState.artFrame.value, state: { opacity: 0.5 } }
darkMode.value = !darkMode.value
cssState.syncArtMask()
assert.equal(cssMaskFills, firstFills)
assert.equal(cssMaskGets, firstGets)
cssState.eraserFrame.value = { paths: [left, right] }
cssState.syncArtMask()
assert.equal(cssMaskFills, firstFills + 1)
assert.equal(alpha(cssContext.canvas.width * 0.75, 20), 0)
cssState.eraserFrame.value = { paths: [left] }
cssState.syncArtMask()
assert.equal(cssMaskGets, firstGets + 1)
assert.equal(alpha(cssContext.canvas.width * 0.75, 20), 255)
cssState.root.value.clientWidth = 375
window.emit('resize')
cssState.artFrame.value = { ...cssState.artFrame.value, view: 'art' }
cssState.eraserFrame.value = { paths: [] }
cssState.syncArtMask()
assert.equal(cssContext.canvas.width, Math.ceil(parseFloat(cssState.planeStyle.value.width) * 2))
assert.equal(alpha(20, 20), 255)
unmountedHook()
assert.equal(cssContext.canvas.width, 1)
assert.equal(cssContext.canvas.height, 1)
assert.equal(disposeCalls, 5)
assert.equal(scheduled.size, 0)
delete global.CSS
delete document.getCSSCanvasContext

// 首屏文案使用实际高度预算，含橡皮外延；仅极矮屏缩小字区，所有尺寸下不撞底部控件。
const entryState = componentModule.exports.default.setup({}, { expose() {} })
entryState.root.value = { clientWidth: 320, clientHeight: 504 }
entryState.heroCopy.value = { offsetHeight: 134 }
entryState.canvas.value = { style: {} }
mountedHook()
for (const [viewportWidth, viewportHeight] of [[320, 568], [375, 667], [768, 1024], [1440, 900], [1440, 500], [1440, 320], [320, 360]]) {
  const available = viewportHeight - 64
  entryState.root.value.clientWidth = viewportWidth
  entryState.root.value.clientHeight = available
  const copyHeight = viewportHeight <= 500 ? (viewportWidth <= 640 ? 113 : 87) : (viewportWidth <= 640 ? 134 : 111)
  entryState.heroCopy.value.offsetHeight = copyHeight
  entryState.resize()
  const planeHeight = parseFloat(entryState.planeStyle.value.height)
  const center = parseFloat(entryState.planeStyle.value.top)
  const copyTop = parseFloat(entryState.copyStyle.value.top)
  const edge = Math.max(16, Math.min(24, viewportWidth * 0.02))
  assert.ok(planeHeight > 0)
  assert.ok(center - planeHeight * 0.68 >= 18 - 1e-8)
  assert.ok(copyTop >= center + planeHeight * 0.68)
  assert.ok(copyTop + copyHeight <= available - edge - (viewportWidth <= 640 ? 60 : 0) + 1e-8)
}
const entryStart = now
advance(entryStart + 100)
entryState.togglePlayback()
advance(entryStart + 600)
assert.equal(entryState.paused.value, true)
assert.ok(Number(entryState.entranceStyles.value[2].opacity) > 0)
advance(entryStart + 1100)
assert.ok(entryState.entranceStyles.value.every(style => style.opacity === '1' && style.transform === 'none'), 'early manual pause must not freeze copy entrance')
const stableEntrance = entryState.entranceStyles.value
entryState.resize()
assert.equal(entryState.entranceStyles.value, stableEntrance, 'resize must not replay entrance')
unmountedHook()
assert.equal(entryState.glintRunning.value, false)
assert.equal(scheduled.size, 0)
assert.equal(window.count() + document.count() + document.documentElement.count(), 0)

console.log('PASS: compiled Vue lifecycle: opening, visibility, panel keyboard/outside close, deferred settings, material/art pause, theme/resize, parallax, system-motion independence and teardown')
