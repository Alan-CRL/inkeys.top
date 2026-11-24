const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { load, sourceRoot } = require('./harness.cjs')
const source = fs.readFileSync(path.join(sourceRoot, 'eraser.ts'), 'utf8')
// 只还原本次4处索引替换，旧代码在缺失at时必须失败，防止未执行到冷几何的假通过。
const oldSource = source.replaceAll('guide[guide.length - 1]', 'guide.at(-1)')
assert.equal((oldSource.match(/guide\.at\(-1\)/g) || []).length, 4)
const previousModule = new Module(path.join(sourceRoot, 'eraser-before-at.ts'), module)
previousModule.filename = path.join(sourceRoot, 'eraser-before-at.ts')
previousModule._compile(ts.transpileModule(oldSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, previousModule.filename)
const previous = previousModule.exports
const current = load('eraser')
const sizes = [[320, 144], [900, 406], [1920, 866]]
const progress = [0, 0.001, 0.13, 0.333, 0.51, 0.875, 1]
const expected = sizes.map(([width, height]) => ({
  route: previous.createEraserRoute(width, height),
  frames: progress.map(time => previous.getEraserFrame(time, width, height)),
}))
const descriptor = Object.getOwnPropertyDescriptor(Array.prototype, 'at')
try {
  Object.defineProperty(Array.prototype, 'at', { value: undefined, configurable: true, writable: true })
  assert.throws(() => previous.getEraserFrame(0.41, 901, 406), TypeError, 'old cold geometry must fail when Array.at is absent')
  for (const [index, [width, height]] of sizes.entries()) {
    assert.deepEqual(current.createEraserRoute(width, height), expected[index].route, 'index fallback must preserve all route coordinates and timings')
    for (const [frame, time] of progress.entries()) {
      assert.deepEqual(current.getEraserFrame(time, width, height), expected[index].frames[frame], 'index fallback must preserve exact cursor/path blocks')
    }
  }
}
finally {
  if (descriptor) Object.defineProperty(Array.prototype, 'at', descriptor)
}
console.log('PASS: Array.at absent, old implementation fails, current 3 routes / 21 frames exactly match original geometry and paths.')
