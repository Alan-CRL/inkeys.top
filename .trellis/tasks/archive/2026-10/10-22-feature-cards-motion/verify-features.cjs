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

const tsCache = new Map()
function loadTs(file) {
  if (tsCache.has(file)) return tsCache.get(file)
  const mod = new Module(file, module)
  mod.filename = file
  mod.paths = module.paths
  mod.require = name => name.startsWith('./') ? loadTs(path.resolve(path.dirname(file), `${name}.ts`)) : require(name)
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file)
  tsCache.set(file, mod.exports)
  return mod.exports
}
const motion = loadTs(path.join(path.dirname(filename), 'featureMotion.ts'))
const permutations = new Set()
for (const seed of [0, 0.2, 0.4, 0.6, 0.8, 0.999]) {
  const choices = motion.shuffleEntrances(() => seed)
  assert.equal(new Set(choices).size, 3)
  permutations.add(choices.join(','))
}
assert.ok(permutations.size >= 3, 'random source changes per-mount choreography')
for (let preset = 0; preset < 3; preset++) {
  assert.equal(motion.featureEntrance(0, preset).opacity, 0)
  assert.deepEqual(motion.featureEntrance(1.05, preset, 3), { opacity: 1, transform: 'none' })
}
assert.equal(new Set([0, 1, 2].map(preset => motion.featureEntrance(0.2, preset).transform)).size, 3)
assert.ok(motion.featureEntrance(0.2, 0, 0).opacity > motion.featureEntrance(0.2, 0, 3).opacity, 'parts stagger')

function compile(code, vue) {
  const mod = new Module(filename, module)
  mod.filename = filename
  mod.paths = module.paths
  mod.require = name => {
    if (name === 'vue' && vue) return vue
    if (name.startsWith('./')) return loadTs(path.resolve(path.dirname(filename), `${name}.ts`))
    return require(name)
  }
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
const frames = new Map()
global.requestAnimationFrame = callback => { frames.set(++counter, callback); return counter }
global.cancelAnimationFrame = id => frames.delete(id)
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
const originalRandom = Math.random
let randomCalls = 0
Math.random = () => { randomCalls++; return 0.4 }
const state = component.setup({}, { expose() {} })
assert.equal(randomCalls, 0, 'setup does not randomize SSR/hydration state')
assert.ok(state.entrances.value.every(time => time === 1.05), 'initial client state matches complete SSR')
state.root.value = { querySelectorAll: () => [] }
mount()
assert.equal(randomCalls, 2, 'shuffle only runs after mount')
Math.random = originalRandom
assert.equal(timers.size, 0)
assert.equal(observer.options.threshold.length, 101)
function visible(values, rootHeight = 800) {
  observer.callback(values.map((ratio, index) => ({ target: { dataset: { featureIndex: index } }, intersectionRatio: ratio, isIntersecting: ratio > 0, intersectionRect: { height: ratio * 600 }, rootBounds: { height: rootHeight } })))
}
function animate(ms) {
  now += ms
  const callbacks = [...frames.values()]
  frames.clear()
  callbacks.forEach(callback => callback(now))
}
function advance(ms) {
  now += ms
  for (const [id, entry] of [...timers]) if (entry.at <= now) { timers.delete(id); entry.callback() }
}
assert.equal(new Set(state.presets.value).size, 3)
visible([0.01, 0, 0])
assert.equal(frames.size, 0, 'tiny visible sliver does not consume entrance')
visible([0.8, 0.3, 0])
assert.equal(state.running.value, -1, 'carousel waits for entrance')
assert.equal(frames.size, 1, 'all visible cards share one RAF')
animate(300)
visible([0, 0, 0])
assert.equal(frames.size, 0, 'offscreen cancels entrance RAF')
assert.equal(state.entrances.value[0], 0.3)
advance(60000)
visible([0.8, 0.3, 0])
assert.equal(state.entrances.value[0], 0.3, 'offscreen time is not counted')
animate(200)
document.hidden = true
events.get('visibilitychange')()
assert.equal(frames.size, 0)
advance(60000)
document.hidden = false
events.get('visibilitychange')()
assert.equal(state.entrances.value[0], 0.5, 'hidden time is not counted')
animate(550)
assert.equal(state.running.value, 0)
assert.equal(frames.size, 0, 'completed entrances leave no idle RAF')
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
assert.equal(frames.size, 0, 'reentry does not replay entrance')
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
visible([0, 0, 0.05], 100)
assert.equal(frames.size, 1, 'short viewports can trigger entrance')
animate(100)
assert.ok(state.entrances.value[2] > 0)
unmount()
assert.equal(frames.size, 0, 'unmount cancels unfinished entrance')
assert.equal(timers.size, 0)
assert.equal(events.size, 0)
assert.equal(observer.disconnected, true)
const keyboard = component.setup({}, { expose() {} })
mount()
keyboard.focusIn(0)
assert.equal(keyboard.entrances.value[0], 1.05, 'keyboard focus reveals an unplayed card immediately')
visible([0.8, 0, 0])
assert.equal(frames.size, 0)
assert.equal(timers.size, 0, 'focused controls keep autoplay suspended')
keyboard.focusOut(0, { currentTarget: { contains: () => false }, relatedTarget: null })
assert.equal(timers.size, 1)
visible([0, 0.8, 0])
animate(200)
assert.ok(keyboard.entrances.value[1] > 0 && keyboard.entrances.value[1] < 1.05)
assert.equal(frames.size, 1)
keyboard.focusIn(1)
assert.equal(keyboard.entrances.value[1], 1.05, 'focus completes an entrance already in progress')
assert.equal(frames.size, 0, 'focus cancels the last unfinished entrance RAF')
assert.equal(timers.size, 0, 'focus completion does not start autoplay')
keyboard.focusOut(1, { currentTarget: { contains: () => false }, relatedTarget: null })
assert.equal(keyboard.running.value, 1)
assert.equal(timers.size, 1)
visible([0, 0, 0])
advance(60000)
visible([0, 0.8, 0])
assert.equal(keyboard.entrances.value[1], 1.05, 'focused entrance remains complete on reentry')
assert.equal(frames.size, 0)
unmount()
assert.equal(timers.size, 0)
assert.equal(frames.size, 0)
delete global.IntersectionObserver
const fallback = component.setup({}, { expose() {} })
mount()
fallback.select(0, 2)
assert.equal(fallback.selected.value[0], 2)
assert.equal(timers.size, 0, 'no observer supports manual selection without autoplay')
assert.ok(fallback.entrances.value.every(time => time === 1.05))
assert.equal(frames.size, 0)
unmount()
assert.doesNotMatch(source, /matchMedia|<video|<img|fetch\(/)

// 使用真实 Vue SSR 渲染，确认无 DOM 也能输出完整首项和辅助按钮。
delete global.document
const vue = require('vue')
const { renderToString } = require('vue/server-renderer')
const ssrComponent = compile(compileScript(descriptor, { id: 'features-ssr', inlineTemplate: true }).content)
renderToString(vue.createSSRApp(ssrComponent)).then(html => {
  for (const label of ['屏幕批注', '课件联动', '多页白板', '边播放，边讲清楚。', '演示素材待加入']) assert.ok(html.includes(label))
  assert.equal((html.match(/aria-roledescription="轮播"/g) || []).length, 3)
  assert.equal((html.match(/class="feature-selector is-selected"/g) || []).length, 3)
  assert.ok(html.includes('heading-right'), 'second heading mirrors the first')
  assert.equal((html.match(/class="feature-card" style="opacity:1;transform:none;/g) || []).length, 3, 'SSR cards are fully visible')
  assert.ok(source.includes("grid-template-areas: 'heading' 'controls' 'stage' 'caption'"), 'mobile preserves reading order')
  assert.ok(source.includes('height: clamp(230px, 58vw, 280px)'), 'phone stage remains large')
  assert.doesNotMatch(source, /feature-eyebrow|feature-scene-number|feature-stage-word|feature-stage-note/)
  console.log('PASS: SFC compile/style, real Vue SSR; highest visibility/ties, 7s wrap, manual reset, focus/manual/hidden/offscreen pause, no catch-up, no observer fallback, timer/listener/observer cleanup; random unique entrances, stagger, short viewport trigger, once-only, active-clock pause, autoplay gate, RAF cleanup, SSR visible cards, responsive CSS; no media')
}).catch(error => { console.error(error); process.exitCode = 1 })
