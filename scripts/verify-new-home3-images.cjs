const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { parse, compileScript, compileStyle } = require('@vue/compiler-sfc')
const { createSSRApp } = require('vue')
const { renderToString } = require('vue/server-renderer')

const root = path.resolve(__dirname, '..')
const component = path.join(root, 'docs/.vuepress/theme/components/NewHome3/FeatureSections.vue')
const source = fs.readFileSync(component, 'utf8')
const ids = [...source.matchAll(/media: '([a-z-]+)'/g)].map(match => match[1])
assert.equal(ids.length, 8)
assert.equal(new Set(ids).size, 8)
assert.doesNotMatch(source, /FeatureMedia|featureMedia|<video\b|\.mp4\b/)

// 校验实际静态文件，避免 SSR 正常但发布后图片缺失。
for (const id of ids) {
  for (const suffix of ['', '-mobile']) {
    const file = path.join(root, `docs/.vuepress/public/feature-media/${id}${suffix}.webp`)
    const bytes = fs.readFileSync(file)
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', file)
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', file)
  }
}

function load(file) {
  let code = fs.readFileSync(file, 'utf8')
  if (file.endsWith('.vue')) {
    const { descriptor, errors } = parse(code, { filename: file })
    assert.deepEqual(errors, [])
    const script = compileScript(descriptor, { id: 'new-home3-images', inlineTemplate: true })
    for (const style of descriptor.styles) {
      assert.deepEqual(compileStyle({ source: style.content, filename: file, id: 'new-home3-images', scoped: style.scoped }).errors, [])
    }
    code = script.content
  }
  const mod = new Module(file, module)
  mod.filename = file
  mod.paths = module.paths
  mod.require = name => name.startsWith('./')
    ? load(path.resolve(path.dirname(file), `${name}.ts`))
    : require(name)
  mod._compile(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file)
  return mod.exports
}

async function verify() {
  const html = await renderToString(createSSRApp(load(component).default))
  assert.equal((html.match(/<picture\b/g) || []).length, 3)
  assert.doesNotMatch(html, /<video\b|\.mp4\b|演示素材待加入/)
  for (const id of ['screen-dynamic', 'slides-ink', 'board-backgrounds']) {
    assert.ok(html.includes(`/feature-media/${id}.webp`), id)
    assert.ok(html.includes(`/feature-media/${id}-mobile.webp`), id)
  }
  assert.equal((html.match(/media="\(max-width: 599px\)"/g) || []).length, 3)
  assert.equal((html.match(/loading="lazy"/g) || []).length, 3)
  assert.equal((html.match(/decoding="async"/g) || []).length, 3)
  assert.ok(html.includes('alt="屏幕批注：动态批注"'))
  assert.ok(html.includes('alt="课件联动：随页墨迹"'))
  assert.ok(html.includes('alt="多页白板：多种背景"'))
  console.log('PASS: NewHome3 image-only SSR, responsive sources, and all 16 WebP assets')
}

verify().catch(error => {
  console.error(error)
  process.exitCode = 1
})
