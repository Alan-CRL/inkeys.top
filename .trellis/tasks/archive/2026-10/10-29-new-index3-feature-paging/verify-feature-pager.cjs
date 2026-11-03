// 功能翻页纯函数与 SSR 回归：node .trellis/tasks/10-29-new-index3-feature-paging/verify-feature-pager.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { createSSRApp } = require('vue')
const { renderToString } = require('vue/server-renderer')

let root = __dirname
while (!fs.existsSync(path.join(root, 'package.json'))) root = path.dirname(root)
const dir = path.join(root, 'docs/.vuepress/theme/components/NewHome3')

function load(file) {
  let code = fs.readFileSync(file, 'utf8')
  if (file.endsWith('.vue')) {
    const { descriptor } = parse(code, { filename: file })
    code = compileScript(descriptor, { id: 'feature-pager', inlineTemplate: true }).content
  }
  const mod = new Module(file, module)
  mod.filename = file
  mod.paths = module.paths
  mod.require = name => name === 'vuepress/client' ? { withBase: value => value } : name.startsWith('./') ? load(path.resolve(path.dirname(file), name.endsWith('.vue') ? name : `${name}.ts`)) : require(name)
  mod._compile(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file)
  return mod.exports
}

const pager = load(path.join(dir, 'featurePager.ts'))
const layout = pager.pagerLayout(1000, 800, 5)
const { step } = layout
assert.equal(step, 576)
assert.equal(pager.pagerHeight(layout), 800 + 4 * step)
assert.equal(pager.anchorOf(layout, 0), 1000)
assert.equal(pager.anchorOf(layout, 3), 1000 + 3 * step)

// 进入翻页区之前（首屏与过渡区）始终是第 1 页，与末页之后始终是末页对称。
assert.equal(pager.pageAt(layout, 0, 0), 0)
assert.equal(pager.pageAt(layout, 900, 0), 0)
assert.equal(pager.pageAt(layout, 1000, 0), 0)

// 页间切换只与出发页比较，30% 步长内保持原页，跨多页直接落到终点页。
const at = (progress, current) => pager.pageAt(layout, 1000 + progress * step, current)
assert.equal(at(0.29, 0), 0)
assert.equal(at(0.31, 0), 1)
assert.equal(at(0.71, 1), 1)
assert.equal(at(1.29, 1), 1)
assert.equal(at(0.69, 1), 0)
assert.equal(at(1.69, 2), 1)
assert.equal(at(1.71, 2), 2)
assert.equal(at(3.4, 0), 4)
assert.equal(at(0.2, 4), 0)
assert.equal(at(9, 4), 4)

// 停止后的对齐：区间内回到当前页；翻页区之前与末页之后不干预。
const last = 1000 + 4 * step
assert.equal(pager.settleTarget(layout, 1000 + 100, 0), 1000)
assert.equal(pager.settleTarget(layout, 300, 0), null)
assert.equal(pager.settleTarget(layout, 999, 0), null)
assert.equal(pager.settleTarget(layout, last + 2, 4), null)
assert.equal(pager.settleTarget(layout, last - 50, 4), last)

// 翻页目标：已对齐时上下各翻一页；第 1 页向上、末页向下都交还原生滚动，首屏不接管。
assert.equal(pager.wheelTarget(layout, 1000, 0, 1), 1)
assert.equal(pager.wheelTarget(layout, 1000, 0, -1), null)
assert.equal(pager.wheelTarget(layout, last, 4, 1), null)
assert.equal(pager.wheelTarget(layout, last, 4, -1), 3)
assert.equal(pager.wheelTarget(layout, 300, 0, 1), null)
assert.equal(pager.wheelTarget(layout, last + 40, 4, -1), null)

// 自首屏下滑：只在将越过翻页区顶部时停靠到第 1 页，其余保持原生滚动。
assert.equal(pager.entryTarget(layout, 500, 100), null)
assert.equal(pager.entryTarget(layout, 920, 100), 1000)
assert.equal(pager.entryTarget(layout, 900, 98), 1000)
assert.equal(pager.entryTarget(layout, 920, -100), null)
assert.equal(pager.entryTarget(layout, 1000, 100), null)

// 滚轮手势：鼠标单格触发；触发后的惯性尾巴被吞掉；停顿、反向或幅度重新上升即新手势。
const feed = (gesture, events, animating = () => false) => events.map(([time, delta]) => pager.feedWheel(gesture, time, delta, animating(time), true))
{
  const mouse = pager.createWheelGesture()
  assert.deepEqual(feed(mouse, [[0, 100], [40, 100], [80, 100], [400, 100]]), ['fire', 'hold', 'hold', 'fire'])
}
{
  // 触控板：小增量累计到门槛才翻页，轻触不触发。
  const pad = pager.createWheelGesture()
  assert.deepEqual(feed(pad, [[0, 3], [16, 5], [32, 9], [48, 12], [64, 14]]), ['hold', 'hold', 'hold', 'hold', 'fire'])
  const light = pager.createWheelGesture()
  assert.deepEqual(feed(light, [[0, 3], [16, 4], [32, 3]]), ['hold', 'hold', 'hold'])
}
{
  // 惯性尾巴在动画前后都被吞掉；动画结束后紧接着的新一轮滑动（幅度重新上升）可以再次翻页。
  const pad = pager.createWheelGesture()
  const tail = [[0, 20], [16, 40], [32, 60], [48, 50], [64, 40], [80, 30], [96, 24], [112, 18], [128, 14], [144, 11], [160, 9], [176, 7], [192, 6]]
  const out = feed(pad, tail, time => time < 100)
  assert.deepEqual(out.slice(0, 2), ['hold', 'fire'])
  assert.ok(out.slice(2).every(item => item === 'hold'), out.join())
  assert.deepEqual(feed(pad, [[208, 12], [224, 20], [240, 32]]), ['hold', 'hold', 'fire'])
}
{
  // 反向滑动是新手势。
  const pad = pager.createWheelGesture()
  assert.equal(feed(pad, [[0, 60]])[0], 'fire')
  assert.deepEqual(feed(pad, [[300, -60]]), ['fire'])
  const reverse = pager.createWheelGesture()
  feed(reverse, [[0, 60]])
  assert.deepEqual(feed(reverse, [[500, 60], [516, -20]]), ['fire', 'hold'])
}
{
  // 无页可翻时交还原生滚动，且不残留累计量。
  const edge = pager.createWheelGesture()
  assert.equal(pager.feedWheel(edge, 0, 30, false, false), 'pass')
  assert.equal(pager.feedWheel(edge, 16, 30, false, true), 'hold')
}
{
  const docked = pager.createWheelGesture()
  pager.lockWheelGesture(docked, 0, 100)
  assert.equal(pager.feedWheel(docked, 30, 100, false, true), 'hold')
  assert.equal(pager.feedWheel(docked, 400, 100, false, true), 'fire')
}

console.log('PASS: page mapping, settle, entry/exit symmetry and wheel gestures')

;(async () => {
  // SSR：纵向完整输出 5 页，不带翻页状态、锚点副本或页码点。
  const html = await renderToString(createSSRApp(load(path.join(dir, 'FeaturePager.vue')).default))
  assert.equal((html.match(/class="feature-page feature-introduction"/g) || []).length, 5)
  assert.doesNotMatch(html, /data-state=|feature-pager-dots|feature-pager-anchor|is-paging/)
  for (const id of ['overview', 'performance', 'tools', 'ui', 'compatibility']) {
    assert.equal((html.match(new RegExp(`id="nh3-feature-${id}"`, 'g')) || []).length, 1, id)
  }
  console.log('PASS: SSR renders all five pages statically')
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
