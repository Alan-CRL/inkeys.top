const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { parse, compileScript, compileTemplate, compileStyle } = require('@vue/compiler-sfc')

let repoRoot = __dirname
while (!fs.existsSync(path.join(repoRoot, 'package.json'))) {
  const parent = path.dirname(repoRoot)
  assert.notEqual(parent, repoRoot, 'repository package.json must exist')
  repoRoot = parent
}
const filename = path.join(repoRoot, 'docs/.vuepress/theme/components/NewHome3/FeatureSections.vue')
const source = fs.readFileSync(filename, 'utf8')
const { descriptor } = parse(source)
const script = compileScript(descriptor, { id: 'features-test' })
assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename, id: 'features-test', compilerOptions: { bindingMetadata: script.bindings } }).errors, [])
assert.deepEqual(compileStyle({ source: descriptor.styles[0].content, filename, id: 'features-test', scoped: true }).errors, [])

function compile(code, vue) {
  const mod = new Module(filename, module)
  mod.filename = filename
  mod.paths = module.paths
  mod.require = name => name === 'vue' && vue ? vue : require(name)
  mod._compile(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
  return mod.exports.default
}

let now = 0
let mount
let unmount
let observer
let counter = 0
const timers = new Map()
const events = new Map()
global.performance = { now: () => now }
global.setTimeout = (callback, wait) => { timers.set(++counter, { callback, at: now + wait }); return counter }
global.clearTimeout = id => timers.delete(id)
global.document = {
  hidden: false,
  addEventListener: (name, callback) => events.set(name, callback),
  removeEventListener: name => events.delete(name),
}
class Observer {
  constructor(callback, options) { this.callback = callback; this.options = options; observer = this }
  observe() {}
  disconnect() { this.disconnected = true }
}
global.IntersectionObserver = Observer
const fakeVue = {
  defineComponent: value => value,
  ref: value => ({ value }),
  useId: () => 'test',
  onMounted: callback => { mount = callback },
  onBeforeUnmount: callback => { unmount = callback },
}
const component = compile(script.content, fakeVue)
const state = component.setup({}, { expose() {} })
state.root.value = { querySelectorAll: () => [] }
mount()
assert.equal(timers.size, 0)
assert.equal(observer.options.threshold.length, 101)
function visible(values) {
  observer.callback(values.map((ratio, index) => ({ target: { dataset: { featureIndex: index } }, intersectionRatio: ratio, isIntersecting: ratio > 0 })))
}
function advance(ms) {
  now += ms
  for (const [id, entry] of [...timers]) if (entry.at <= now) { timers.delete(id); entry.callback() }
}
visible([0.8, 0.3, 0])
assert.equal(state.running.value, 0)
advance(2300)
visible([0, 0, 0])
assert.equal(timers.size, 0)
assert.equal(state.elapsed.value[0], 2300)
advance(60000)
visible([0.8, 0.3, 0])
advance(4699)
assert.equal(state.selected.value[0], 0)
advance(1)
assert.equal(state.selected.value[0], 1)
assert.equal(timers.size, 1)
visible([0.5, 0.8, 0])
assert.equal(state.running.value, 1)
visible([0.8, 0.8, 0])
assert.equal(state.running.value, 1, 'tie retains current stage')
advance(1000)
state.focusIn(1)
assert.equal(timers.size, 0)
state.select(1, 2)
assert.equal(state.elapsed.value[1], 0)
assert.equal(timers.size, 0)
state.focusOut(1, { currentTarget: { contains: () => true }, relatedTarget: {} })
assert.equal(timers.size, 0, 'internal focus transfer remains paused')
state.togglePause(1)
state.focusOut(1, { currentTarget: { contains: () => false }, relatedTarget: null })
assert.equal(timers.size, 0, 'manual pause survives focus exit')
state.togglePause(1)
advance(2000)
document.hidden = true
events.get('visibilitychange')()
assert.equal(timers.size, 0)
assert.equal(state.elapsed.value[1], 2000)
advance(120000)
document.hidden = false
events.get('visibilitychange')()
advance(5000)
assert.equal(state.selected.value[1], 0, 'last scene wraps without catch-up')
unmount()
assert.equal(timers.size, 0)
assert.equal(events.size, 0)
assert.equal(observer.disconnected, true)
delete global.IntersectionObserver
const fallback = component.setup({}, { expose() {} })
mount()
fallback.select(0, 2)
assert.equal(fallback.selected.value[0], 2)
assert.equal(timers.size, 0, 'no observer supports manual selection without autoplay')
unmount()
assert.doesNotMatch(source, /requestAnimationFrame|matchMedia|<video|<img|fetch\(/)

// 使用真实 Vue SSR 渲染，确认无 DOM 也能输出完整首项和辅助按钮。
delete global.document
const vue = require('vue')
const { renderToString } = require('vue/server-renderer')
const ssrComponent = compile(compileScript(descriptor, { id: 'features-ssr', inlineTemplate: true }).content)
renderToString(vue.createSSRApp(ssrComponent)).then(html => {
  for (const label of ['屏幕批注', '课件联动', '多页白板', '边播放，边讲清楚。', '演示素材待加入']) assert.ok(html.includes(label))
  assert.equal((html.match(/aria-roledescription="轮播"/g) || []).length, 3)
  assert.equal((html.match(/class="feature-selector is-selected"/g) || []).length, 3)
  console.log('PASS: SFC compile/style, real Vue SSR; highest visibility/ties, 7s wrap, manual reset, focus/manual/hidden/offscreen pause, no catch-up, no observer fallback, timer/listener/observer cleanup; no media/RAF')
}).catch(error => { console.error(error); process.exitCode = 1 })
