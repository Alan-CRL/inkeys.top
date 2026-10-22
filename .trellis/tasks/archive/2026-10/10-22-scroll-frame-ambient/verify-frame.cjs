// 无窗口验证滚动状态与 SFC 编译；实际圆角、菜单与焦点由浏览器回归覆盖。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { parse, compileScript, compileTemplate, compileStyle } = require('@vue/compiler-sfc')
const { load, sourceRoot } = require(path.resolve('.trellis/tasks/10-04-new-index3-wordmark/harness.cjs'))
const { frameRanges, initialFrameState, advanceFrame, frameView } = load('scrollFrame')

for (const maximum of [0, 10, 16, 32, 33, 50, 100, 400, 2000]) {
  for (const viewport of [1, 320, 900, 1600]) {
    const ranges = frameRanges(viewport, maximum)
    assert.ok(ranges.enter >= 17)
    assert.ok(ranges.exit >= ranges.enter)
    assert.ok(ranges.end >= ranges.exit)
    if (!ranges.short) assert.ok(ranges.end <= maximum)
    for (const y of [0, 8, 16, 17, maximum / 2, maximum]) {
      const view = frameView(initialFrameState(y), ranges)
      for (const key of ['amount', 'visible', 'fill']) {
        assert.ok(Number.isFinite(view[key]) && view[key] >= 0 && view[key] <= 1)
      }
      if (y <= 16) assert.deepEqual([view.amount, view.fill, view.visible], [0, 0, 1])
      if (ranges.short) assert.equal(view.visible, 1)
    }
  }
}

const ranges = frameRanges(1000, 2000)
assert.deepEqual(ranges, { enter: 140, exit: 380, end: 560, short: false })
assert.equal(frameView(initialFrameState(78), ranges).amount, 0.5)
assert.equal(frameView(initialFrameState(240), ranges).amount, 1)
assert.equal(frameView(initialFrameState(470), ranges).amount, 0.5)
assert.equal(frameView(initialFrameState(900), ranges).visible, 0, 'deep restore starts hidden')
let state = initialFrameState(900)
state = advanceFrame(state, 877, ranges)
assert.equal(state.recalled, false)
state = advanceFrame(state, 876, ranges)
assert.equal(state.recalled, true)
assert.equal(frameView(state, ranges).visible, 1)
state = advanceFrame(state, 911, ranges)
assert.equal(state.recalled, true)
state = advanceFrame(state, 912, ranges)
assert.equal(state.recalled, false)
state = advanceFrame(state, 911.6, ranges)
assert.equal(state.y, 912)
assert.equal(state.direction, 1, 'subpixel jitter does not reset direction')
state = advanceFrame(state, 890, ranges)
assert.equal(state.travel, 22, 'direction reversal starts a new accumulation')
state = advanceFrame(state, 891, ranges)
state = advanceFrame(state, 868, ranges)
assert.equal(state.recalled, false)
state = advanceFrame(state, 867, ranges)
assert.equal(state.recalled, true)
state = advanceFrame(state, 0, ranges)
assert.deepEqual(state, initialFrameState(0))
assert.equal(frameView(state, ranges).fill, 0)
const pinned = frameView(initialFrameState(900), ranges, true)
assert.deepEqual([pinned.amount, pinned.visible, pinned.fill], [1, 1, 1])
assert.equal(frameView(initialFrameState(0), ranges, true).fill, 1, 'open menu stays readable at the top')

for (const filename of ['ScrollFrame.vue', 'NewHome3.vue']) {
  const source = fs.readFileSync(path.join(sourceRoot, filename), 'utf8')
  const { descriptor, errors } = parse(source)
  assert.deepEqual(errors, [])
  const script = compileScript(descriptor, { id: 'frame-test' })
  const template = compileTemplate({ source: descriptor.template.content, filename, id: 'frame-test', compilerOptions: { bindingMetadata: script.bindings } })
  assert.deepEqual(template.errors, [])
  for (const style of descriptor.styles) {
    assert.deepEqual(compileStyle({ source: style.content, filename, id: 'frame-test' }).errors, [])
  }
}
console.log('PASS: frame thresholds, short pages, deep restore, jitter, direction hysteresis, focus/menu pinning, SFC compilation')

// 执行实际组件 setup，验证导航属性、事件合并与路由卸载恢复。
const Module = require('node:module')
const ts = require('typescript')
class Events {
  listeners = new Map()
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn) }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn) }
  emit(name) { this.listeners.get(name)?.forEach(fn => fn()) }
  count() { return [...this.listeners.values()].reduce((total, group) => total + group.size, 0) }
}
let mount
let unmount
let serial = 0
const frames = new Map()
const observers = []
class Observer {
  constructor(fn) { this.callback = fn; observers.push(this) }
  observe() {}
  disconnect() { this.disconnected = true }
}
global.window = Object.assign(new Events(), { innerHeight: 1000, scrollY: 900, scrollTo(position) { this.scrollY = position.top } })
global.document = Object.assign(new Events(), { activeElement: null, documentElement: { scrollHeight: 3000 } })
global.requestAnimationFrame = fn => { frames.set(++serial, fn); return serial }
global.cancelAnimationFrame = id => frames.delete(id)
global.MutationObserver = Observer
global.ResizeObserver = Observer
const properties = new Map()
const attributes = new Map([['aria-hidden', 'false']])
let menu = false
const nav = {
  inert: false,
  contains: target => target === nav,
  querySelector: () => menu ? {} : null,
  getAttribute: key => attributes.get(key) ?? null,
  setAttribute: (key, value) => attributes.set(key, value),
  removeAttribute: key => attributes.delete(key),
}
const page = {
  dataset: {},
  style: { setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key) },
  querySelector: () => nav,
  setAttribute() {},
  toggleAttribute() {},
  removeAttribute() {},
}
const filename = path.join(sourceRoot, 'ScrollFrame.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'))
const script = compileScript(descriptor, { id: 'frame-lifecycle' })
const component = new Module(filename, module)
component.filename = filename
component.require = name => name === 'vue' ? {
  defineComponent: options => options, ref: value => ({ value }),
  onMounted: fn => { mount = fn }, onBeforeUnmount: fn => { unmount = fn },
} : name.startsWith('./') ? load(name.slice(2)) : require(name)
component._compile(ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
const instance = component.exports.default.setup({}, { expose() {} })
instance.aperture.value = { closest: () => page }
const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()) }
mount()
assert.equal(window.scrollY, 0, 'entry discards restored scroll position')
assert.equal(nav.inert, false)
assert.equal(properties.get('--nh3-nav-fill'), '0')
window.scrollY = 900
window.emit('scroll')
flush()
assert.equal(frames.size, 0, 'no idle RAF')
window.scrollY = 860
for (let i = 0; i < 10; i++) window.emit('scroll')
assert.equal(frames.size, 1, 'scroll work is coalesced')
flush()
assert.equal(nav.inert, false)
assert.equal(attributes.get('aria-hidden'), 'false')
document.activeElement = nav
window.scrollY = 1000
window.emit('scroll')
flush()
assert.equal(nav.inert, false, 'focused navigation pins the shell')
document.activeElement = null
menu = true
observers[0].callback()
flush()
assert.equal(nav.inert, false, 'native expanded menu pins the shell')
menu = false
observers[0].callback()
flush()
assert.equal(nav.inert, true)
window.scrollY = 900
window.emit('pageshow')
assert.equal(window.scrollY, 0, 'BFCache restoration returns to the hero')
assert.equal(nav.inert, false)
assert.equal(properties.get('--nh3-nav-fill'), '0')
unmount()
assert.equal(frames.size, 0)
assert.equal(window.count() + document.count(), 0)
assert.ok(observers.every(observer => observer.disconnected))
assert.equal(properties.size, 0)
assert.equal(nav.inert, false)
assert.equal(attributes.get('aria-hidden'), 'false', 'route departure restores original navigation attributes')
console.log('PASS: frame SFC deep restore, coalesced RAF, native menu/focus lock and route teardown')

// 检查真正提交滚动的路由入口，确保其他页面仍保留原保存位置/锚点策略。
const clientFilename = path.resolve('docs/.vuepress/client.ts')
const client = new Module(clientFilename, module)
client.require = name => name === 'vuepress/client' ? { defineClientConfig: value => value } : {}
client._compile(ts.transpileModule(fs.readFileSync(clientFilename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, clientFilename)
let delegated
const router = { options: { scrollBehavior: (...args) => { delegated = args; return args[2] } } }
client.exports.default.enhance({ app: { component() {} }, router })
for (const path of ['/new-index3', '/new-index3.html', '/new-index3/']) {
  assert.deepEqual(router.options.scrollBehavior({ path }, {}, { top: 500 }), { top: 0, left: 0, behavior: 'instant' })
}
const position = { top: 420 }
assert.equal(router.options.scrollBehavior({ path: '/guide.html' }, {}, position), position)
assert.equal(delegated[2], position)
assert.ok(descriptor.template.content.includes('hidden aria-hidden="true"'))
assert.ok(!descriptor.styles.some(style => /position:\s*fixed|100vmax/.test(style.content)), 'no aperture mask remains')
console.log('PASS: nav-only rendering and route-specific entry scroll reset')
