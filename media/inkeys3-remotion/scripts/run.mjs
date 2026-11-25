import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [mode, ...args] = process.argv.slice(2)
const commands = {
  studio: ['node_modules/@remotion/cli/remotion-cli.js', 'studio', 'src/index.ts', '--no-open'],
  render: ['scripts/render.mjs'],
}
if (!commands[mode]) throw new Error('Use studio or render')
// Remotion 的 Windows compositor 是 x64；便携运行时仅存在制作目录，不改系统 PATH。
const executable = process.platform === 'win32' && process.arch === 'arm64'
  ? path.join(root, '.cache/node-v24.16.0-win-x64/node.exe') : process.execPath
if (!existsSync(executable)) throw new Error('Windows ARM64: run ./scripts/setup-runtime.ps1 first (see README).')
const temporary = path.join(root, 'build/tmp')
mkdirSync(temporary, { recursive: true })
const result = spawnSync(executable, [...commands[mode], ...args], { cwd: root, stdio: 'inherit', windowsHide: true, env: { ...process.env, TEMP: temporary, TMP: temporary } })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
