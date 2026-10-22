// 无窗口任务回归：执行真实 SFC setup 与时间轴；不代替浏览器字体/像素验收。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { parse, compileScript, compileTemplate, compileStyle } = require('@vue/compiler-sfc')
const { load, sourceRoot } = require('../10-04-new-index3-wordmark/harness.cjs')
const { releaseFrame, releaseGroups, fitReleaseBar, RELEASE_BAR_WIDTH, RELEASE_SECONDS } = load('releaseScene')
const { pointerTarget } = load('parallax')
const components = path.dirname(sourceRoot)
const href = 'https://1709404.share.123pan.cn/123pan/duk9-Gdr4d'

function readSfc(relative) {
  const filename = path.join(components, relative)
  const source = fs.readFileSync(filename, 'utf8')
  const { descriptor, errors } = parse(source)
  assert.deepEqual(errors, [])
  const script = compileScript(descriptor, { id: 'release-test' })
  const template = compileTemplate({ source: descriptor.template.content, filename, id: 'release-test', compilerOptions: { bindingMetadata: script.bindings } })
  assert.deepEqual(template.errors, [])
  for (const style of descriptor.styles) assert.deepEqual(compileStyle({ source: style.content, filename, id: 'release-test', scoped: !!style.scoped }).errors, [])
  return { filename, source, descriptor, script, template }
}

const release = readSfc('NewHome3/ReleaseSection.vue')
const bar = readSfc('NewHome/Ui3Bar.vue')
const button = readSfc('NewHome/Ui3BarButton.vue')
const hero = readSfc('NewHome3/NewHome3.vue')
// 发布卡片保留中性主栏；壁纸与前景独立，不恢复旧版墨迹和循环光效。
assert.doesNotMatch(release.source, /nh3-release-ink|<mask|<linearGradient|reflectionStyle|releaseReflection/)
assert.doesNotMatch(bar.source, /nh-release-(?:reflection|light|spot|edge|offset|surface-strength|edge-strength)/)
assert.ok(!('releaseScene' in load('releaseScene')))
assert.ok(!('releaseReflection' in load('releaseScene')))
assert.match(bar.descriptor.template.content, /v-if="variant !== 'release'" class="nh-bar-spot"/)
assert.match(bar.descriptor.template.content, /v-if="variant !== 'release'" class="nh-bar-edge"/)
const releaseCss = require('postcss').parse(release.descriptor.styles.map(style => style.content).join('\n'))
const overflow = new Map()
releaseCss.walkRules(rule => rule.walkDecls('overflow', declaration => overflow.set(rule.selector, declaration.value)))
assert.equal(overflow.get('.nh3-release'), 'hidden', 'the section still clips page boundaries without horizontal overflow')
const barCss = require('postcss').parse(bar.descriptor.styles.map(style => style.content).join('\n'))
assert.doesNotMatch(bar.source, /\.is-release \.nh-main-glass::after/, 'main button has no hover tint layer')
barCss.walkRules('.is-release .nh-main-glass', rule => {
  assert.equal(rule.nodes.find(node => node.prop === 'border-radius')?.value, '9%', 'glass retains native clipping after entrance compositing ends')
  assert.equal(rule.nodes.find(node => node.prop === 'overflow')?.value, 'hidden')
})
assert.doesNotMatch(button.source, /background-color 5s/)
assert.match(button.source, /background-color 0\.24s var\(--nh-ease-out\)/)
// SSR 未测量时由 CSS 缩放整组；挂载后的行内尺寸再接管精确比例。
assert.match(release.descriptor.template.content, /class="nh3-release-position"[^>]*:style="hasMeasured \? /)
assert.match(release.descriptor.template.content, /class="nh3-release-scale" :style="hasMeasured \? /)
function fallbackScale(viewport) {
  let scale
  releaseCss.walkRules('.nh3-release-plane', rule => {
    const query = rule.parent.type === 'atrule' ? rule.parent.params : ''
    const minimum = query.match(/min-width:\s*([\d.]+)px/)
    const maximum = query.match(/max-width:\s*([\d.]+)px/)
    if (minimum && viewport < Number(minimum[1]) || maximum && viewport > Number(maximum[1])) return
    rule.walkDecls('--nh3-release-fallback-scale', declaration => { scale = Number(declaration.value) })
  })
  return scale
}
releaseCss.walkRules('.nh3-release-position', rule => {
  if (rule.parent.type !== 'root') return
  assert.equal(rule.nodes.find(node => node.prop === 'width')?.value, 'calc(551px * var(--nh3-release-fallback-scale))')
  assert.equal(rule.nodes.find(node => node.prop === 'height')?.value, 'calc(80px * var(--nh3-release-fallback-scale))')
})
releaseCss.walkRules('.nh3-release-scale', rule => {
  assert.equal(rule.nodes.find(node => node.prop === 'width')?.value, '551px')
  assert.equal(rule.nodes.find(node => node.prop === 'height')?.value, '80px')
  assert.equal(rule.nodes.find(node => node.prop === 'transform')?.value, 'scale(var(--nh3-release-fallback-scale))')
})
for (const viewport of [320, 374, 375, 479, 480, 639, 640, 679, 680, 768, 899]) {
  const scale = fallbackScale(viewport)
  assert.ok(scale > 0 && scale <= 1)
  assert.ok(RELEASE_BAR_WIDTH * scale <= Math.min(567, viewport - 98) - 16 + 1e-8, `full SSR toolbar fits ${viewport}px without JavaScript`)
}
// 桌面 SSR 在断点附近也必须保留约 40px 裁切，不能等待挂载测量修正。
for (const viewport of [900, 910, 919, 920, 921, 928, 960, 999, 1000, 1280, 1920]) {
  const stageWidth = Math.min(511, (Math.min(1200, viewport - 48) - 98) * 0.65)
  const cropped = RELEASE_BAR_WIDTH * fallbackScale(viewport) - stageWidth
  assert.ok(cropped >= 32 && cropped <= 48, `desktop SSR crop at ${viewport}px is ${cropped}px`)
}
assert.equal((hero.source.match(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1, 'hero retains its download URL')
// 发布区与背景共用下方容器，但仍必须在首屏高度/可见性容器之外。
const heroRoots = hero.descriptor.template.ast.children.filter(node => node.type === 1)
const belowFold = heroRoots.find(node => node.props.some(prop => prop.name === 'class' && prop.value?.content === 'nh3-below-fold'))
assert.ok(belowFold && heroRoots.indexOf(belowFold) > 0)
assert.ok(belowFold.children.some(node => node.tag === 'ReleaseSection'))
assert.ok(belowFold.children.some(node => node.tag === 'AmbientInk'))
assert.ok(heroRoots[0].props.some(prop => prop.name === 'class' && prop.value?.content === 'nh3-root'))
assert.match(hero.descriptor.template.content, /<ReleaseSection \/>/)
assert.doesNotMatch(release.source, /downloadHref|download-href|历经两年|相较于 Inkeys2/)
assert.match(release.descriptor.template.content, />Inkeys3<\/h2>/)
assert.match(release.descriptor.template.content, />焕新发布<\/p>/)
assert.match(release.descriptor.template.content, /crop-last-group/)
assert.match(bar.descriptor.template.content, /class="nh-bar-group is-cropped-preview"[^>]* inert aria-hidden="true"/)
assert.match(bar.source, /cropLastGroup: false/)
assert.match(bar.source, /@media \(min-width: 900px\)[\s\S]*is-crop-interactive \{ display: none; \}/)
assert.ok(!release.source.includes('matchMedia'))
assert.deepEqual(releaseGroups.map(group => group.map(item => [item.label, item.icon, item.size])), [
  [['选择', 'select', 'twoTwo'], ['绘制', 'brush1', 'twoTwo'], ['图形', 'geometry', 'twoTwo'], ['橡皮', 'eraser', 'twoTwo'], ['白板', 'whiteboard', 'twoTwo']],
  [['撤回', 'recall', 'twoOne'], ['定格', 'freeze', 'twoOne']],
])
assert.ok(releaseGroups.flat().every(item => !item.selected))
assert.match(bar.source, /variant: 'default'/)
assert.match(button.source, /variant: 'default'/)
assert.match(bar.source, /rel="noopener noreferrer"/)
assert.match(bar.source, /variant !== 'release' && activeId === 'main' && progress/)
assert.match(button.source, /variant !== 'release' && item.selected/)

const nativeRoot = 'D:/Project/Inkeys/Repo/Inkeys/Inkeys/src/UI'
const clean = value => value.replaceAll('\r\n', '\n').replaceAll('rgba(10,0,7,0)', 'currentColor').trim()
const logo = fs.readFileSync(path.join(components, 'NewHome/icons/logoDark.svg'), 'utf8')
assert.equal(clean(logo), clean(fs.readFileSync(path.join(nativeRoot, 'logo1.svg'), 'utf8')))
assert.equal((logo.match(/fill-opacity="0.22"/g) || []).length, 2)
assert.equal((logo.match(/fill="white"/g) || []).length, 7)
assert.ok(!bar.source.includes('Frame94'))
for (const name of ['Select', 'Brush1', 'Geometry', 'Eraser', 'Recall', 'Whiteboard', 'Freeze']) {
  const local = clean(fs.readFileSync(path.join(components, `NewHome/icons/bar${name}.svg`), 'utf8'))
  const native = clean(fs.readFileSync(path.join(nativeRoot, `bar${name}.svg`), 'utf8'))
  if (name === 'Freeze') assert.deepEqual(local.match(/<path\b[^>]*\/>/g), native.match(/<path\b[^>]*\/>/g))
  else assert.equal(local, native)
}

assert.equal(RELEASE_SECONDS, 1.25)
for (let time = 0; time <= 3; time += 0.05) {
  const frame = releaseFrame(time)
  assert.ok([frame.title, frame.toolbar, frame.card].every(style => Number(style.opacity) >= 0 && Number(style.opacity) <= 1))
}
assert.equal(releaseFrame(0).title.opacity, '0')
assert.equal(releaseFrame(0.3).toolbar.opacity, '0')
assert.equal(releaseFrame(0).card.opacity, '0')
assert.equal(releaseFrame(0.65).title.opacity, '1')
assert.equal(releaseFrame(1.25).toolbar.opacity, '1')
assert.equal(releaseFrame(1.24).complete, false)
const terminal = releaseFrame(1.25)
assert.equal(terminal.complete, true)
assert.deepEqual(terminal, releaseFrame(100))
assert.ok([terminal.title, terminal.toolbar, terminal.card].every(style => style.opacity === '1' && style.transform === 'none'))

const widths = [320, 375, 768, 1440, 1920]
for (const viewport of widths) {
  const size = fitReleaseBar(Math.min(1200, viewport))
  assert.ok(size.width <= viewport - 16 + 1e-8)
  assert.equal(size.height, 80 * size.scale)
  assert.equal(size.width, RELEASE_BAR_WIDTH * size.scale)
  assert.ok(size.scale > 0 && size.scale <= 1)
}
for (const available of [490, 500, 511]) {
  const fitted = fitReleaseBar(available, RELEASE_BAR_WIDTH, true)
  assert.equal(Math.round(fitted.width - available), 40, 'desktop crops only 40px of the final group')
  assert.ok(fitted.scale <= 1)
}
const bounds = { left: 100, right: 700, top: 100, bottom: 180, width: 600, height: 80 }
assert.deepEqual(pointerTarget(bounds, 700, 180), { x: 1, y: 1 })
assert.equal(pointerTarget(bounds, 760, 140).x, 0.5)
assert.equal(pointerTarget(bounds, 820, 140).x, 0)
assert.deepEqual(pointerTarget({ ...bounds, width: 0 }, 600, 130), { x: 0, y: 0 })

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
let nextId = 0
function environment(withObservers = true) {
  let now = 0
  let nextFrame = 1
  let requested = 0
  let executed = 0
  let reads = 0
  let onMount
  let onUnmount
  const scheduled = new Map()
  const observers = []
  const theme = { value: false }
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this) }
    observe(target) { (this.targets ||= []).push(target) }
    disconnect() { this.disconnected = true }
  }
  global.window = Object.assign(new Events(), { innerWidth: 1280, matchMedia: () => ({ matches: false }) })
  global.document = Object.assign(new Events(), { hidden: false, documentElement: new Events() })
  global.performance = { now: () => now }
  global.ResizeObserver = withObservers ? Observer : undefined
  global.IntersectionObserver = withObservers ? Observer : undefined
  global.requestAnimationFrame = callback => { const id = nextFrame++; requested++; scheduled.set(id, callback); return id }
  global.cancelAnimationFrame = id => scheduled.delete(id)
  const valueRef = value => {
    let current = value
    return { writes: 0, get value() { return current }, set value(next) { this.writes++; current = next } }
  }
  const vue = {
    defineComponent: options => options,
    ref: valueRef,
    shallowRef: valueRef,
    computed: callback => ({ get value() { return callback() } }),
    useId: () => `test-${nextId++}`,
    onMounted: callback => { onMount = callback },
    onBeforeUnmount: callback => { onUnmount = callback },
  }
  function setupSfc(sfc, props, emitted = []) {
    const componentModule = new Module(sfc.filename, module)
    componentModule.filename = sfc.filename
    componentModule.require = name => {
      if (name === 'vue') return vue
      if (name === 'vuepress-theme-plume/client') return { useDarkMode: () => theme }
      if (/\.vue$|\.svg$/.test(name)) return name
      if (name === './icons') return { barIcons: {} }
      if (name.startsWith('./')) return load(name.slice(2))
      return require(name)
    }
    const compiled = ts.transpileModule(sfc.script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    componentModule._compile(compiled, sfc.filename)
    return componentModule.exports.default.setup(props, { expose() {}, emit: (...args) => emitted.push(args) })
  }
  const state = setupSfc(release, { downloadHref: href })
  state.root.value = {}
  state.stage.value = { clientWidth: 511 }
  state.toolbar.value = { offsetWidth: RELEASE_BAR_WIDTH }
  state.plane.value = Object.assign(new Events(), { getBoundingClientRect() { reads++; return bounds } })
  return {
    state, scheduled, observers, theme, setupSfc,
    mount: () => onMount(),
    unmount: () => onUnmount(),
    setTime: time => { now = time },
    advance(time) {
      now = time
      const callbacks = [...scheduled.values()]
      scheduled.clear()
      callbacks.forEach(callback => { executed++; callback(now) })
    },
    runFrames(count) { for (let i = 0; i < count; i++) this.advance(now + 1000 / 60) },
    counts: () => ({ requested, executed, measurements: reads, sceneUpdates: state.sceneFrame.writes, tiltUpdates: state.tiltStyle.writes, pending: scheduled.size }),
    assertClean() {
      assert.equal(scheduled.size, 0)
      assert.ok(observers.every(observer => observer.disconnected))
      assert.equal(window.count() + document.count() + document.documentElement.count() + state.plane.value.count(), 0)
    },
  }
}

const env = environment()
const { state } = env
assert.equal(state.sceneFrame.value.complete, true, 'SSR is complete and visible before mount')
assert.equal(state.hasMeasured.value, false, 'SSR leaves sizing to responsive CSS')
const sceneId = state.sceneId
env.mount()
assert.equal(state.hasMeasured.value, true, 'mounted measurements replace the CSS fallback')
assert.equal(state.sceneFrame.value.title.opacity, '0')
assert.equal(state.active.value, false)
assert.equal(env.scheduled.size, 0)
env.setTime(3000)
state.visibleObserver.callback([{ isIntersecting: true }])
assert.equal(state.active.value, true)
for (let i = 1; i <= 24; i++) env.advance(3000 + i * 1000 / 60)
const partial = state.sceneFrame.value
assert.ok(Number(partial.title.opacity) > Number(partial.toolbar.opacity))
assert.ok(Number(partial.card.opacity) > Number(partial.toolbar.opacity))
const partialTime = state.clock.read(3400)
document.hidden = true
document.emit('visibilitychange')
assert.equal(state.active.value, false)
assert.equal(env.scheduled.size, 0)
state.plane.value.emit('pointermove', { pointerType: 'mouse', clientX: 700, clientY: 180 })
assert.equal(state.pendingPointer, undefined)
env.setTime(13400)
document.hidden = false
document.emit('visibilitychange')
env.advance(13400)
assert.equal(state.clock.read(13400), partialTime)
assert.deepEqual(state.sceneFrame.value, partial)
env.runFrames(18)
state.visibleObserver.callback([{ isIntersecting: false }])
const offscreen = state.sceneFrame.value
assert.equal(env.scheduled.size, 0)
env.setTime(23700)
state.visibleObserver.callback([{ isIntersecting: true }])
env.advance(23700)
assert.deepEqual(state.sceneFrame.value, offscreen)
env.runFrames(90)
assert.equal(state.sceneFrame.value.complete, true)
assert.equal(env.scheduled.size, 0)
const entranceCounts = env.counts()
const settledScene = state.sceneFrame.value
env.runFrames(120)
assert.equal(state.sceneFrame.value, settledScene)
assert.deepEqual(env.counts(), entranceCounts, 'idle allocates no new RAF or scene/tilt publications')
state.visibleObserver.callback([{ isIntersecting: false }])
env.setTime(30000)
state.visibleObserver.callback([{ isIntersecting: true }])
assert.equal(env.scheduled.size, 0, 'scrolling back does not replay')
assert.equal(state.sceneFrame.value, settledScene)

for (const pointerType of ['touch', 'pen']) state.plane.value.emit('pointermove', { pointerType, clientX: 700, clientY: 180 })
assert.equal(env.scheduled.size, 0)
assert.equal(state.targetX, 0)
const beforeMovement = env.counts()
for (let i = 0; i < 100; i++) state.plane.value.emit('pointermove', { pointerType: 'mouse', clientX: 700, clientY: 180 })
assert.equal(env.scheduled.size, 1)
assert.equal(env.counts().measurements, beforeMovement.measurements)
env.runFrames(120)
assert.equal(state.targetX, 1, 'actual mouse works even when pointer media query returns false')
assert.equal(state.tiltX, 1)
assert.equal(state.tiltY, 1)
assert.ok(state.tiltStyle.value.transform.includes('rotateX(-2deg) rotateY(2deg)'))
assert.equal(env.counts().measurements, beforeMovement.measurements + 1, 'coalesced 100 events cause one stable layout read')
assert.equal(state.sceneFrame.value, settledScene)
assert.equal(env.scheduled.size, 0)
assert.match(state.tiltStyle.value.transform, /translate3d\(3px, 3px, 0\)/)
const movementCounts = env.counts()
env.runFrames(120)
assert.deepEqual(env.counts(), movementCounts)
state.plane.value.emit('pointerleave')
env.runFrames(120)
assert.equal(state.tiltStyle.value.transform, 'none')
assert.equal(state.tiltStyle.value.willChange, 'auto')
assert.equal(env.scheduled.size, 0)

for (const width of widths) {
  window.innerWidth = width
  state.stage.value.clientWidth = width >= 900 ? 511 : width - 98
  state.resizeObserver.callback()
  assert.ok(state.fit.value.width <= width - 16 + 1e-8)
  assert.equal(state.fit.value.height, state.fit.value.scale * 80)
  assert.equal(state.sceneFrame.value, settledScene)
}
env.theme.value = true
assert.equal(state.sceneFrame.value, settledScene)
assert.equal(env.scheduled.size, 0)
state.plane.value.emit('pointermove', { pointerType: 'mouse', clientX: 700, clientY: 180 })
env.advance(35000)
assert.equal(env.scheduled.size, 1)
document.hidden = true
document.emit('visibilitychange')
assert.equal(state.tiltStyle.value.transform, 'none')
assert.equal(env.scheduled.size, 0)
document.hidden = false
document.emit('visibilitychange')
assert.equal(env.scheduled.size, 0)
state.plane.value.emit('pointermove', { pointerType: 'mouse', clientX: 700, clientY: 180 })
env.unmount()
env.assertClean()

const fallback = environment(false)
assert.notEqual(fallback.state.sceneId, sceneId)
fallback.mount()
assert.equal(fallback.state.hasMeasured.value, true, 'exact mounted fit also works without observers')
assert.equal(fallback.state.sceneFrame.value.complete, true)
assert.equal(fallback.state.active.value, true)
assert.equal(fallback.scheduled.size, 0)
window.innerWidth = 320
fallback.state.stage.value.clientWidth = 222
window.emit('resize')
assert.equal(fallback.state.fit.value.width, 206)
assert.equal(fallback.state.fit.value.scale, 206 / RELEASE_BAR_WIDTH)
fallback.state.plane.value.emit('pointermove', { pointerType: 'mouse', clientX: 700, clientY: 180 })
fallback.runFrames(120)
assert.equal(fallback.state.tiltX, 1)
window.emit('blur')
fallback.runFrames(120)
assert.equal(fallback.state.tiltStyle.value.transform, 'none')
fallback.unmount()
fallback.assertClean()

const visual = environment(false)
const events = []
const defaultBar = visual.setupSfc(bar, { variant: 'default' }, events)
defaultBar.activate('main')
assert.deepEqual(events, [['activate', 'main']])
assert.equal(defaultBar.mainShape.value, defaultBar.superellipsePath(80, 0.5, 3))
const releaseBar = visual.setupSfc(bar, { variant: 'release' }, events)
assert.equal(releaseBar.mainShape.value, releaseBar.superellipsePath(80, 0.5, 10))
releaseBar.activate('select')
releaseBar.onPointerEnter({ pointerType: 'mouse' })
assert.equal(events.length, 1)
assert.equal(visual.scheduled.size, 0, 'release variant adds no unrelated pointer spotlight')
releaseBar.pressMain({})
releaseBar.releaseMain()
assert.equal(releaseBar.mainReleasing.value, true)
releaseBar.pressMain({})
assert.equal(releaseBar.mainReleasing.value, false)
const defaultButton = visual.setupSfc(button, { variant: 'default', item: releaseGroups[0][0] }, events)
defaultButton.activate()
assert.deepEqual(events.at(-1), ['activate', 'select'])
const releaseButton = visual.setupSfc(button, { variant: 'release', item: releaseGroups[0][0] }, events)
releaseButton.activate()
assert.equal(events.length, 2)

console.log('PASS: four SFCs compile; full native Logo and seven icons; default/release activation; expanded n=10; card/title/hero-only download; cropped group SSR focus; no ink or colored reflection; 1.25s entrance; widths 320–1920')
console.log('PASS: compiled release lifecycle covers SSR/fallback, single entrance, hidden/offscreen resume, resize/theme, actual mouse despite false media query, pen/touch ignored, reset and complete teardown')
console.log(JSON.stringify({ entrance: entranceCounts, mouseSettled: movementCounts, idleExtraFrames: 0, idleExtraSceneUpdates: 0, idleExtraTiltUpdates: 0 }, null, 2))
