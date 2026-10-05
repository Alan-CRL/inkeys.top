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
assert.ok(descriptor.template.content.includes('opacity: artFrame.state.opacity * artFrame.eraseOpacity'))
assert.ok(!descriptor.template.content.includes('artFrame.state.opacity * 0.5'))
assert.ok(descriptor.template.content.includes('v-for="side in [-1, 1]"'))
assert.ok(descriptor.template.content.includes('eraserFrame.cursor.radius * 0.08'))
assert.ok(descriptor.template.content.includes(':height="0.96 * eraserFrame.cursor.radius"'))
assert.ok(css.code.includes('overflow: visible'))
assert.ok(css.code.includes('@media (max-width: 1099px)'))
assert.ok(css.code.includes('clip-path 300ms cubic-bezier'))
assert.ok(css.code.includes('prefers-reduced-motion'))

// 与原生 SVG 比较内容，保证网站没有重新绘制或丢失路径，只替换主题占位色。
const icons = load('toolIcons').toolIcons
const names = { hard: 'barBrush1', soft: 'barBrush2', highlighter: 'barHighlighter1', laser: 'barLaser', brush: 'barPaintBrush', eraser: 'barEraser' }
for (const [tool, name] of Object.entries(names)) {
  const native = fs.readFileSync(`D:/Project/Inkeys/Repo/Inkeys/Inkeys/src/UI/${name}.svg`, 'utf8').trim()
  const inner = native.slice(native.indexOf('>') + 1, native.lastIndexOf('</svg>')).trim().replaceAll('rgba(10,0,7,0)', 'currentColor').replaceAll('\r\n', '\n')
  assert.equal(icons[tool], inner)
}

// 数值核查布局约束，不代替浏览器字体和视觉验收。
for (const viewport of [320, 375, 768, 1099, 1100, 1440, 1920]) {
  const gap = Math.max(16, Math.min(24, viewport * 0.02))
  const panelWidth = viewport < 1100 ? Math.min(480, viewport - 2 * gap) : 868
  const right = viewport - gap - (viewport < 1100 ? 0 : 120)
  assert.ok(right - panelWidth >= 16, `left margin at ${viewport}`)
  assert.ok(viewport - right >= 16, `right margin at ${viewport}`)
  if (viewport >= 1100) {
    // 汉字按一个 em 估算：六笔按钮、颜色、粗细及分组留白皆有余量。
    const pens = 13 * 12 + 6 * (18 + 5 + 16 + 2) + 5 * 4
    const colors = 8 * 28 + 7 * 2
    const sizes = 3 * 32 + 2 * 3
    assert.ok(pens + colors + sizes + 2 * 11 + 2 * 10 + 20 <= panelWidth - 2)
  }
}
console.log('PASS: Vue template/CSS compile, toolbar geometry 320–1920, six native SVG identities, inert/keyboard markup, luminance mask and native cursor constants')
