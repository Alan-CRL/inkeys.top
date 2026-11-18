// 统一入口：node scripts/run.mjs <studio|still|render> [remotion 的其余参数]
// 本机是 Windows ARM64，Remotion 的合成器只有 x64 版本，这里改用工程内的便携 x64 Node 运行。
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [mode, ...args] = process.argv.slice(2)
const cli = 'node_modules/@remotion/cli/remotion-cli.js'
const commands = {
  studio: [cli, 'studio', 'src/index.ts', '--no-open'],
  still: [cli, 'still', 'src/index.ts'],
  render: [cli, 'render', 'src/index.ts'],
}
if (!commands[mode]) throw new Error('用法：node scripts/run.mjs <studio|still|render> [参数]')

const portable = path.join(root, '.cache/node-x64/node.exe')
const executable = process.platform === 'win32' && process.arch === 'arm64' ? portable : process.execPath
if (!existsSync(executable)) throw new Error('缺少 .cache/node-x64/node.exe，见 README 的“环境”一节')

const result = spawnSync(executable, [...commands[mode], ...args], { cwd: root, stdio: 'inherit', windowsHide: true })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
