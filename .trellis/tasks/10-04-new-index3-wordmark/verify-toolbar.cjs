const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { parse, compileScript, compileTemplate, compileStyle } = require('@vue/compiler-sfc')
const { sourceRoot, load } = require('./harness.cjs')
const source = fs.readFileSync(path.join(sourceRoot, 'NewHome3.vue'), 'utf8')
const parsed = parse(source)
assert.equal(parsed.errors.length, 0)
const { descriptor } = parsed
const bindings = compileScript(descriptor, { id: 'toolbar-test' }).bindings
const template = compileTemplate({ source: descriptor.template.content, filename: 'NewHome3.vue', id: 'toolbar-test', compilerOptions: { bindingMetadata: bindings } })
assert.deepEqual(template.errors, [])
const css = compileStyle({ source: descriptor.styles[0].content, filename: 'NewHome3.vue', id: 'toolbar-test' })
assert.deepEqual(css.errors, [])
assert.ok(descriptor.template.content.includes(':inert="!panelOpen"'))
assert.ok(!descriptor.template.content.includes('v-if="panelOpen"'))
assert.ok(!descriptor.template.content.includes('nh3-panel-close'))
assert.ok(descriptor.template.content.includes('maskUnits="userSpaceOnUse"'))
assert.ok(descriptor.template.content.includes('maskContentUnits="userSpaceOnUse"'))
assert.ok(descriptor.template.content.includes('mask-type: luminance'))
assert.ok(!descriptor.template.content.includes('<foreignObject'))
assert.ok(descriptor.template.content.includes('WebkitMaskImage:'))
assert.ok(descriptor.template.content.includes('opacity: artFrame.state.opacity * artFrame.eraseOpacity'))
assert.ok(!descriptor.template.content.includes('artFrame.state.opacity * 0.5'))
assert.ok(descriptor.template.content.includes('v-for="side in [-1, 1]"'))
assert.ok(descriptor.template.content.includes('eraserFrame.cursor.radius * 0.08'))
assert.ok(descriptor.template.content.includes(':height="0.96 * eraserFrame.cursor.radius"'))
assert.ok(css.code.includes('overflow: visible'))
assert.match(css.code, /\.nh3-art\s*\{\s*position: absolute;/)
assert.ok(css.code.includes('-webkit-mask-size: 100% 100%'))
assert.ok(css.code.includes('-webkit-backdrop-filter: blur(24px)'))
assert.ok(css.code.indexOf('min-height: calc(100vh') < css.code.indexOf('min-height: calc(100svh'))
assert.equal((descriptor.template.content.match(/:tabindex="panelOpen \? 0 : -1"/g) || []).length, 3)
assert.ok(css.code.includes('@media (max-width: 1099px)'))
assert.ok(css.code.includes('clip-path 300ms cubic-bezier'))
assert.ok(!css.code.includes('prefers-reduced-motion'))
assert.ok(!descriptor.scriptSetup.content.includes('matchMedia'))
assert.ok(!descriptor.template.content.includes(':disabled="reduced"'))
// Plume 的全局 reduced-motion 重置带 !important；本页的完整时序必须仍胜出。
const cssTree = require('postcss').parse(css.code)
const transitions = []
cssTree.walkDecls(/^transition/, declaration => {
  assert.equal(declaration.important, true)
  assert.ok(declaration.parent.selector.split(',').every(selector => selector.trim().startsWith('.nh3-')))
  transitions.push(declaration)
})
assert.ok(transitions.some(declaration => declaration.parent.selector === '.nh3-style-panel' && declaration.value.includes('visibility 0s 300ms')))
assert.ok(transitions.some(declaration => declaration.parent.selector === '.nh3-style-panel.is-open' && declaration.prop === 'transition-delay' && declaration.value === '0s'))
assert.equal(transitions.filter(declaration => declaration.prop === 'transition-duration' && declaration.value === '120ms').length, 4)
// 微弱高光仍受本页显隐管理，不能被主题的全局 reduced-motion !important 改成一次闪动。
cssTree.walkDecls(/^animation/, declaration => {
  assert.equal(declaration.important, true)
  assert.ok(declaration.parent.selector.startsWith('.nh3-'))
})

// 与原生 SVG 比较内容，保证网站没有重新绘制或丢失路径，只替换主题占位色。
const icons = load('toolIcons').toolIcons
const names = { hard: 'barBrush1', soft: 'barBrush2', highlighter: 'barHighlighter1', laser: 'barLaser', brush: 'barPaintBrush', eraser: 'barEraser' }
for (const [tool, name] of Object.entries(names)) {
  const native = fs.readFileSync(`D:/Project/Inkeys/Repo/Inkeys/Inkeys/src/UI/${name}.svg`, 'utf8').trim()
  const inner = native.slice(native.indexOf('>') + 1, native.lastIndexOf('</svg>')).trim().replaceAll('rgba(10,0,7,0)', 'currentColor').replaceAll('\r\n', '\n')
  assert.equal(icons[tool], inner)
}

// 内容宽度不再额外分配空隙；分割线左右均为10px，矩形揭示不裁掉超椭圆边框。
assert.match(css.code, /\.nh3-style-panel\s*\{[^}]*width: max-content;/)
assert.match(css.code, /\.nh3-style-content\s*\{[^}]*justify-content: flex-start; gap: 10px;/)
assert.ok(css.code.includes('clip-path: inset(0 0 0 100%);'))
assert.ok(css.code.includes('clip-path: inset(0 0 0 0);'))
assert.ok(!css.code.includes('round 16px'))

// 数值核查布局约束，不代替浏览器字体和视觉验收。
const pens = 14 * 12 + 6 * (18 + 5 + 16 + 2) + 5 * 4
const colors = 8 * 28 + 7 * 2
const sizes = 3 * 32 + 2 * 3
const desktopPanelWidth = pens + colors + sizes + 2 * 11 + 2 * 10 + 20 + 2
for (const viewport of [320, 375, 768, 1099, 1100, 1440, 1920]) {
  const gap = Math.max(16, Math.min(24, viewport * 0.02))
  const panelWidth = viewport < 1100 ? Math.min(480, viewport - 2 * gap) : desktopPanelWidth
  const right = viewport - gap - (viewport < 1100 ? 0 : 120)
  assert.ok(right - panelWidth >= 16, `left margin at ${viewport}`)
  assert.ok(viewport - right >= 16, `right margin at ${viewport}`)
}
console.log('PASS: Vue template/CSS compile, toolbar geometry 320–1920, six native SVG identities, inert/keyboard markup, luminance mask and native cursor constants')

// 使用真实 Vue VNode 更新器执行编译模板，验证变换由实际共同父层承载并经后续帧保留。
// 自定义无界面 host 只提供节点操作，不模拟浏览器布局或宣称视觉验收。
async function verifyRenderedParallax() {
  const vue = require('vue')
  const ts = require('typescript')
  const Module = require('node:module')
  const compiled = ts.transpileModule(template.code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const templateModule = new Module(__filename, module)
  templateModule.filename = __filename
  templateModule.paths = module.paths
  templateModule._compile(compiled, __filename)
  const node = (tag, text = '') => ({ tag, text, parent: null, children: [], props: {}, style: {}, tagName: tag.toUpperCase(),
    addEventListener() {}, removeEventListener() {}, setAttribute(key, value) { this.props[key] = value }, removeAttribute(key) { delete this.props[key] },
  })
  const renderer = vue.createRenderer({
    createElement: tag => node(tag), createText: text => node('#text', text), createComment: text => node('#comment', text),
    setText: (el, text) => { el.text = text }, setElementText: (el, text) => { el.text = text; el.children = [] },
    parentNode: el => el.parent, nextSibling: el => el.parent?.children[el.parent.children.indexOf(el) + 1] ?? null,
    patchProp(el, key, previous, next) { el.props[key] = next; if (key === 'style') el.style = { ...(next || {}) } },
    insert(el, parent, anchor = null) { if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1); el.parent = parent; const index = anchor ? parent.children.indexOf(anchor) : -1; parent.children.splice(index < 0 ? parent.children.length : index, 0, el) },
    remove(el) { el.parent?.children.splice(el.parent.children.indexOf(el), 1); el.parent = null },
    insertStaticContent(content, parent, anchor) { const el = node('#static', content); el.parent = parent; const index = anchor ? parent.children.indexOf(anchor) : -1; parent.children.splice(index < 0 ? parent.children.length : index, 0, el); return [el, el] },
  })
  const refs = {
    glintRunning: vue.ref(true),
    entranceStyles: vue.shallowRef([0, 1, 2].map(() => ({ opacity: '1', transform: 'none' }))), copyStyle: vue.ref({ top: '650px' }),
    planeStyle: vue.ref({ width: '900px', height: '406px' }), tiltStyle: vue.ref({ transform: 'translate3d(0px, 0px, 0) rotateX(0deg) rotateY(0deg)' }),
    artFrame: vue.ref({ view: 'ink', state: { opacity: 1 }, previousColor: 'rainbow', artColor: 'rainbow', colorMix: 1, shimmer: -1, eraseOpacity: 1 }),
    eraserFrame: vue.ref(undefined), cssCanvasMask: vue.ref(false), panelOpen: vue.ref(false), selectedPens: vue.ref(['hard']), selectedEraser: vue.ref(false), selectedColor: vue.ref('rainbow'), selectedSize: vue.ref('medium'), paused: vue.ref(false), iconPath: vue.ref(''),
  }
  const state = { ...refs, VPLink: (props, { slots }) => vue.h('a', { href: props.href }, slots.default?.()), width: 900, height: 406, cssMaskName: 'nh3-mask-test', toolChoices: ['hard', 'eraser'], penLabels: { hard: '硬笔', eraser: '橡皮' }, colorChoices: [], sizeChoices: [], toolIcons: load('toolIcons').toolIcons, colorBackground: () => 'linear-gradient(red, blue)', togglePanel() {}, togglePlayback() {}, updateSettings() {}, toggleTool() {} }
  const host = node('root')
  const app = renderer.createApp({ setup() { return state }, render(...args) { return templateModule.exports.render(args[0], args[1], {}, vue.proxyRefs(state), {}, {}) } })
  app.mount(host)
  const find = (className, parent = host) => {
    if ((parent.props.class || '').split(' ').includes(className)) return parent
    for (const child of parent.children) { const found = find(className, child); if (found) return found }
  }
  const outer = find('nh3-plane')
  const surface = find('nh3-surface')
  const entrance = find('nh3-entrance')
  const copy = find('nh3-copy')
  const download = find('nh3-download')
  assert.ok(surface)
  assert.equal(surface.parent, entrance)
  assert.equal(entrance.parent, outer)
  assert.equal(copy.parent, outer.parent, 'copy is outside the parallax plane')
  assert.equal(download.props.href, '/download')
  assert.equal(find('nh3-tool').props['aria-pressed'], true)
  refs.selectedPens.value = []
  refs.panelOpen.value = true
  await vue.nextTick()
  assert.equal(find('nh3-tool').props['aria-pressed'], false, 'control memo must invalidate selection')
  assert.equal(find('nh3-palette').props['aria-expanded'], true)
  assert.equal(find('nh3-tool').props.tabindex, 0)
  refs.panelOpen.value = false
  await vue.nextTick()
  assert.equal(find('nh3-tool').props.tabindex, -1)

  assert.equal(surface.props.role, 'img')
  assert.equal(surface.props['aria-label'], 'Inkeys')
  assert.equal(find('nh3-mark').props['aria-hidden'], 'true')
  assert.equal(find('nh3-mark').parent, surface)
  const transform = 'translate3d(6px, 6px, 0) rotateX(-4deg) rotateY(4deg)'
  refs.tiltStyle.value = { transform }
  refs.artFrame.value = { ...refs.artFrame.value, state: { opacity: 0.7 } }
  await vue.nextTick()
  assert.equal(surface.style.transform, transform)
  assert.equal(entrance.style.transform, 'none', 'entrance never inherits tilt')
  assert.equal(copy.style.transform, undefined)
  assert.equal(download.style.transform, undefined)
  assert.equal(outer.style.transform, undefined, 'stable measurement wrapper is not tilted')
  assert.equal(find('nh3-mask-defs'), undefined, 'Canvas mode must not mount unused SVG mask')
  refs.artFrame.value = { ...refs.artFrame.value, view: 'art' }
  refs.eraserFrame.value = { cursor: { x: 100, y: 100, radius: 40 }, paths: ['M0 0h1v1Z'] }
  await vue.nextTick()
  assert.equal(find('nh3-art').parent, surface)
  assert.equal(find('nh3-art').style.maskImage, 'url(#nh3-art-erasure)')
  assert.equal(surface.props['aria-label'], 'Inkeys', 'art keeps its accessible name when Canvas is hidden')
  assert.equal(find('nh3-eraser-cursor').parent, surface)
  assert.equal(surface.style.transform, transform)
  assert.ok(find('nh3-mask-defs'))
  refs.cssCanvasMask.value = true
  await vue.nextTick()
  assert.equal(find('nh3-mask-defs'), undefined)
  assert.equal(find('nh3-art').style.WebkitMaskImage, '-webkit-canvas(nh3-mask-test)')
  assert.equal(find('nh3-art').style.maskImage, undefined, 'prefixed and unprefixed aliases must not clear each other')
  assert.equal(find('nh3-art').parent, surface)
  refs.paused.value = true
  refs.artFrame.value = { ...refs.artFrame.value, state: { opacity: 0.4 } }
  refs.tiltStyle.value = { transform: 'translate3d(-6px, 0px, 0) rotateX(0deg) rotateY(-4deg)' }
  await vue.nextTick()
  assert.equal(surface.style.transform, refs.tiltStyle.value.transform, 'paused layers retain reactive parallax')
  assert.equal(find('nh3-art').props.style.opacity, 0.4)
  refs.artFrame.value = { ...refs.artFrame.value, view: 'ink' }
  refs.eraserFrame.value = undefined
  await vue.nextTick()
  assert.equal(surface.style.transform, refs.tiltStyle.value.transform)
  assert.equal(find('nh3-mask-defs'), undefined)
  app.unmount()
  console.log('PASS: actual compiled Vue template patches shared ink/art/cursor transform, paused updates, stable outer measurement and conditional mask mount')
}
verifyRenderedParallax().catch(error => { console.error(error); process.exitCode = 1 })
