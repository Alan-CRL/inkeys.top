// 仅供任务命令行验证，不进入网站构建或引入运行时依赖。
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const sourceRoot = path.resolve(__dirname, '../../../docs/.vuepress/theme/components/NewHome3')
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  })
  module._compile(outputText, filename)
}

module.exports = {
  sourceRoot,
  load: name => require(path.join(sourceRoot, `${name}.ts`)),
  canvasRuntime: () => require(path.join(process.env.USERPROFILE,
    '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas')),
}
