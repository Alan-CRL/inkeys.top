const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { parse, compileScript, compileTemplate, compileStyle } = require('@vue/compiler-sfc')

let repoRoot = __dirname
while (!fs.existsSync(path.join(repoRoot, 'package.json'))) repoRoot = path.dirname(repoRoot)
const componentRoot = path.join(repoRoot, 'docs/.vuepress/theme/components/NewHome3')
const ids = ['screen-dynamic', 'screen-through', 'screen-freeze', 'slides-ink', 'slides-binding', 'slides-ready', 'board-backgrounds', 'board-pages']
const fixture = { schemaVersion: 1, scenes: ids.map(id => ({ id, video: `/feature-media/${id}.mp4`, poster: `/feature-media/${id}.webp`, durationMs: 8000, mobileVideo: `/feature-media/${id}-mobile.mp4`, mobilePoster: `/feature-media/${id}-mobile.webp` })) }

function loader(vue, manifest = fixture, inline = false) {
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    let source = fs.readFileSync(file, 'utf8')
    if (file.endsWith('.vue')) {
      const { descriptor } = parse(source)
      const script = compileScript(descriptor, { id: 'feature-media-test', inlineTemplate: inline })
      assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: file, id: 'feature-media-test', compilerOptions: { bindingMetadata: script.bindings } }).errors, [])
      assert.deepEqual(compileStyle({ source: descriptor.styles[0].content, filename: file, id: 'feature-media-test', scoped: true }).errors, [])
      source = script.content
    }
    const mod = new Module(file, module)
    mod.filename = file
    mod.paths = module.paths
    mod.require = name => {
      if (name === 'vue') return vue || require('vue')
      if (name.endsWith('/feature-media/manifest.json')) return manifest
      if (name.startsWith('./')) return load(path.resolve(path.dirname(file), name.endsWith('.vue') ? name : `${name}.ts`))
      return require(name)
    }
    mod._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file)
    cache.set(file, mod.exports)
    return mod.exports
  }
  return load
}

let now = 0
let counter = 0
let mount
let unmount
let watchers = []
const timers = new Map()
const frames = new Map()
const events = new Map()
const observers = []
global.performance = { now: () => now }
global.requestAnimationFrame = callback => { frames.set(++counter, callback); return counter }
global.cancelAnimationFrame = id => frames.delete(id)
global.setTimeout = (callback, delay) => { timers.set(++counter, { callback, at: now + delay }); return counter }
global.clearTimeout = id => timers.delete(id)
global.document = { hidden: false, addEventListener: (name, callback) => events.set(name, callback), removeEventListener: name => events.delete(name) }
class Observer {
  constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this) }
  observe() {}
  disconnect() { this.disconnected = true }
}
global.IntersectionObserver = Observer
const vue = {
  defineComponent: value => value, ref: value => ({ value }), useId: () => 'test',
  onMounted: callback => { mount = callback }, onBeforeUnmount: callback => { unmount = callback },
  watch: (_, callback) => { watchers.push(callback) },
}
const load = loader(vue)
const media = load(path.join(componentRoot, 'featureMedia.ts'))
assert.equal(media.readFeatureMedia(fixture).size, 8)
assert.equal(media.readFeatureMedia({ schemaVersion: 2, scenes: fixture.scenes }).size, 0)
assert.equal(media.readFeatureMedia({ schemaVersion: 1, scenes: [{ ...fixture.scenes[0], video: 'https://other/video.mp4' }, { ...fixture.scenes[1], durationMs: -1 }, { ...fixture.scenes[2], poster: '/feature-media/../oops.webp' }] }).size, 0)
const sections = load(path.join(componentRoot, 'FeatureSections.vue')).default
const state = sections.setup({}, { expose() {} })
state.root.value = { querySelectorAll: () => [] }
assert.ok(state.entrances.value.every(value => value === 1.05))
mount()
assert.equal(new Set(state.presets.value).size, 3)
const visibleObserver = observers.find(value => Array.isArray(value.options.threshold))
const nearObserver = observers.find(value => value.options.rootMargin)
function visible(values) {
  visibleObserver.callback(values.map((ratio, index) => ({ target: { dataset: { featureIndex: index } }, isIntersecting: ratio > 0, intersectionRatio: ratio, intersectionRect: { height: ratio * 600 }, rootBounds: { height: 800 } })))
}
function advance(ms) {
  now += ms
  const callbacks = [...frames.values()]
  frames.clear()
  callbacks.forEach(callback => callback(now))
  for (const [id, entry] of [...timers]) if (entry.at <= now) { timers.delete(id); entry.callback() }
}
function event(index, extra = {}) {
  return { id: state.currentMedia(index).id, revision: state.mediaRevisions.value[index], ...extra }
}
nearObserver.callback([{ isIntersecting: true, target: { dataset: { featureIndex: '0' } } }])
assert.equal(state.near.value[0], true)
assert.equal(state.running.value, -1, 'nearby loads without playing')
visible([0.8, 0.3, 0])
advance(300)
visible([0, 0, 0])
advance(60000)
assert.equal(state.entrances.value[0], 0.3)
assert.equal(frames.size, 0)
visible([0.8, 0.3, 0])
advance(750)
assert.equal(state.running.value, 0)
assert.equal(timers.size, 0, 'video owns time; no fixed carousel timeout')
assert.equal(frames.size, 0, 'entrance leaves no idle RAF')
state.mediaProgress(0, event(0, { elapsedMs: 2300, durationMs: 8100 }))
state.mediaStatus(0, event(0, { playing: true }))
assert.equal(state.sceneDuration(0), 8100, 'actual metadata wins over nominal duration')
advance(16000)
assert.equal(state.selected.value[0], 0, 'buffering or long media cannot be cut by wall time')
visible([0, 0, 0])
assert.equal(state.elapsed.value[0], 2300, 'pause preserves media time, not wall time')
state.mediaEnded(0, event(0))
assert.equal(state.selected.value[0], 0, 'queued ended does not advance offscreen')
visible([0.8, 0.3, 0])
assert.equal(state.selected.value[0], 1, 'completed scene advances when visible again')
assert.equal(state.elapsed.value[0], 0)
assert.equal(frames.size, 0, 'reentry does not replay entrance')
const stale = event(0)
state.select(0, 1)
state.mediaEnded(0, stale)
state.mediaError(0, stale)
state.mediaProgress(0, { ...stale, elapsedMs: 6000, durationMs: 8000 })
assert.equal(state.selected.value[0], 1)
assert.equal(state.elapsed.value[0], 0, 'same-scene manual replay rejects old instance events')
assert.equal(state.mediaFailed.value[0], false)
state.mediaEnded(0, event(0))
assert.equal(state.selected.value[0], 2)
state.focusIn(0)
state.mediaEnded(0, event(0))
assert.equal(state.selected.value[0], 2, 'focused card waits even if ended was queued')
state.focusOut(0, { currentTarget: { contains: () => false }, relatedTarget: null })
assert.equal(state.selected.value[0], 0, 'last scene wraps after focus exit')
state.togglePause(0)
assert.equal(state.running.value, -1)
state.togglePause(0)
assert.equal(state.running.value, 0)
document.hidden = true
events.get('visibilitychange')()
state.mediaEnded(0, event(0))
assert.equal(state.selected.value[0], 0)
document.hidden = false
events.get('visibilitychange')()
assert.equal(state.selected.value[0], 1)
visible([0.5, 0.8, 0])
assert.equal(state.running.value, 1)
visible([0.8, 0.8, 0])
assert.equal(state.running.value, 1, 'visibility tie retains playing card')
state.mediaEnded(0, event(0))
assert.equal(state.selected.value[0], 1, 'non-owner ending cannot advance its scene')
state.mediaProgress(1, event(1, { elapsedMs: 2000, durationMs: 8000 }))
state.mediaError(1, event(1))
assert.equal(timers.size, 1, 'failed current media gets a poster fallback timer')
advance(2500)
visible([0, 0, 0])
assert.equal(state.elapsed.value[1], 4500)
advance(60000)
visible([0, 0.8, 0])
advance(3499)
assert.equal(state.selected.value[1], 0)
advance(1)
assert.equal(state.selected.value[1], 1, 'fallback preserves remaining duration without catch-up')
assert.equal(timers.size, 0, 'next valid media returns to video-driven time')
unmount()
assert.equal(frames.size, 0)
assert.equal(timers.size, 0)
assert.equal(events.size, 0)
assert.ok(observers.every(value => value.disconnected))
delete global.IntersectionObserver
const noObserver = sections.setup({}, { expose() {} })
mount()
noObserver.select(0, 2)
assert.equal(noObserver.running.value, -1)
assert.equal(noObserver.near.value[0], false, 'no observer stays on complete posters without video requests')
assert.equal(noObserver.selected.value[0], 2)
unmount()

async function testMedia() {
  const child = load(path.join(componentRoot, 'FeatureMedia.vue')).default
  let queryChange
  const query = { matches: false, addEventListener: (_, callback) => { queryChange = callback }, removeEventListener: () => { queryChange = undefined } }
  global.window = { matchMedia: expression => { assert.equal(expression, '(max-width: 599px)'); return query } }
  const emitted = []
  const props = { asset: fixture.scenes[0], revision: 1, running: false, load: false }
  watchers = []
  const film = child.setup(props, { expose() {}, emit: (name, value) => emitted.push({ name, value }) })
  let plays = 0
  let loads = 0
  let rejectPlay
  const element = {
    src: '', currentTime: 0, duration: 8, readyState: 0, paused: true, muted: false,
    load() { loads++ }, pause() { this.paused = true }, removeAttribute(name) { if (name === 'src') this.src = '' },
    play() { plays++; this.paused = false; return new Promise((_, reject) => { rejectPlay = reject }) },
  }
  film.video.value = element
  mount()
  assert.equal(element.src, '', 'offscreen initial video has no src')
  props.load = true
  watchers.forEach(callback => callback())
  assert.equal(element.src, props.asset.video)
  assert.equal(plays, 0, 'nearby metadata load does not autoplay')
  film.metadataReady()
  element.readyState = 2
  film.frameReady()
  props.running = true
  watchers.forEach(callback => callback())
  assert.equal(plays, 1)
  assert.equal(element.muted, true)
  film.frameReady()
  assert.equal(plays, 1, 'duplicate readiness events do not duplicate pending play')
  element.currentTime = 2.4
  film.reportProgress()
  props.running = false
  watchers.forEach(callback => callback())
  rejectPlay(new Error('interrupted by pause'))
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(film.failed.value, false, 'interrupted old play request is not a media failure')
  assert.equal(element.currentTime, 2.4)
  query.matches = true
  queryChange()
  assert.equal(element.src, props.asset.mobileVideo)
  element.currentTime = 0
  film.metadataReady()
  assert.equal(element.currentTime, 2.4, 'mobile source resumes same timeline position')
  film.frameReady()
  assert.equal(element.paused, true, 'source switch preserves manual pause')
  props.running = true
  watchers.forEach(callback => callback())
  assert.equal(plays, 2)
  rejectPlay(new Error('autoplay unavailable'))
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(film.failed.value, true)
  assert.equal(film.hasFrame.value, false, 'failed video reveals static poster')
  const failedLoads = loads
  watchers.forEach(callback => callback())
  film.frameReady()
  assert.equal(loads, failedLoads, 'failed source is not retried in a request loop')
  assert.equal(emitted.filter(value => value.name === 'failed').length, 1)
  film.finished()
  assert.equal(emitted.filter(value => value.name === 'ended').length, 0, 'failed media cannot advance via stale ended')
  unmount()
  assert.equal(queryChange, undefined)
  assert.equal(element.src, '')
  assert.equal(element.paused, true)
  const emittedAtUnmount = emitted.length
  film.reportProgress()
  film.finished()
  assert.equal(emitted.length, emittedAtUnmount, 'unmounted element emits no stale events')

  // 正常播放中换横竖版也沿用时间轴；旧播放 Promise 不能污染新源。
  props.running = true
  const successful = child.setup(props, { expose() {}, emit: (name, value) => emitted.push({ name, value }) })
  successful.video.value = element
  element.currentTime = 0
  query.matches = false
  mount()
  successful.metadataReady()
  successful.frameReady()
  const oldReject = rejectPlay
  element.currentTime = 3.6
  query.matches = true
  queryChange()
  oldReject(new Error('source replaced'))
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(successful.failed.value, false)
  element.currentTime = 0
  successful.metadataReady()
  successful.frameReady()
  assert.equal(element.currentTime, 3.6)
  assert.equal(element.paused, false, 'running source resumes after metadata/frame are ready')
  successful.finished()
  successful.finished()
  assert.equal(emitted.filter(value => value.name === 'ended').length, 1, 'one ended notification per media instance')
  const pendingReject = rejectPlay
  unmount()
  pendingReject(new Error('unmounted'))
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(successful.failed.value, false)
}

async function testSsr() {
  delete global.document
  delete global.window
  const realVue = require('vue')
  const { renderToString } = require('vue/server-renderer')
  const ssr = loader(undefined, fixture, true)(path.join(componentRoot, 'FeatureSections.vue')).default
  const html = await renderToString(realVue.createSSRApp(ssr))
  assert.equal((html.match(/aria-roledescription="轮播"/g) || []).length, 3)
  assert.equal((html.match(/<video /g) || []).length, 3)
  assert.equal((html.match(/<img [^>]*loading="lazy"/g) || []).length, 3)
  assert.equal((html.match(/media="\(max-width: 599px\)"/g) || []).length, 3)
  assert.doesNotMatch(html, /<video[^>]*(?: src=| controls(?:=|\s|>))/)
  assert.ok(html.includes('/feature-media/screen-dynamic.webp'))
  assert.equal((html.match(/class="feature-card" style="opacity:1;transform:none;/g) || []).length, 3)
  const missing = loader(undefined, { schemaVersion: 1, scenes: [] }, true)(path.join(componentRoot, 'FeatureSections.vue')).default
  const fallback = await renderToString(realVue.createSSRApp(missing))
  assert.equal((fallback.match(/演示素材待加入/g) || []).length, 3)
  assert.ok(fallback.includes('board-surfaces'))
  assert.doesNotMatch(fallback, /<video/)
  const childSource = fs.readFileSync(path.join(componentRoot, 'FeatureMedia.vue'), 'utf8')
  assert.doesNotMatch(childSource, /prefers-reduced-motion|\bautoplay\b|\bloop\b/)
}

testMedia().then(testSsr).then(() => {
  console.log('PASS: SFC/style compile; manifest validation; SSR lazy desktop/mobile posters and no video src; missing-media fallback; unique once-only entrances and suspension; video clock/duration, buffering, stale events, deferred ended, visibility/focus/manual pause, failed-media timeout; responsive source seek/pause preservation, rejected play fallback, no retry loop, full cleanup')
}).catch(error => { console.error(error); process.exitCode = 1 })
