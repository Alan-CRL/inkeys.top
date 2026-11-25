// 一次性脚本：把 UInk 1.0 Beta（version 10）的规范页面拼成单文件存档，
// 写入 docs/.vuepress/public/dist-standard/uink-v10/spec.md。存档生成后不再更新。
//
// 页面从 git 提交中读取，而不是工作区：docs/standard/ 已经改写为 1.1。
// 默认提交 afc6765 是改写开始前 1.0 规范的最后版本；可以用第一个参数指定其他提交。
//
// 运行：node scripts/uink-archive-v10.mjs [commit]
// 需要 Node.js 22.18+（直接导入 .ts 依赖内置的类型擦除）。
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { UINK_V10_PAGES, bundleSpec } from '../docs/.vuepress/plugins/uinkSpecBundle.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const commit = process.argv[2] ?? 'afc6765'
const out = resolve(root, 'docs/.vuepress/public/dist-standard/uink-v10/spec.md')

const pages = UINK_V10_PAGES.map(path => ({
  path,
  markdown: execFileSync('git', ['show', `${commit}:docs/standard/${path}.md`], {
    cwd: root,
    encoding: 'utf-8',
  }),
}))

const spec = bundleSpec(pages, {
  title: 'UInk 1.0 Beta 规范（单文件存档）',
  notes: [
    '版本：UInk 1.0 Beta（`Header.version = 10`）。',
    '这是 version 10 规范的冻结存档，不再更新。当前版本见 https://www.inkeys.top/standard/ ，1.0 → 1.1 的变化与 1.0 勘误见 https://www.inkeys.top/standard/version.html',
    '文中的页面链接指向网站当前页面，内容可能已经是新版本；1.0 的公开样例位于 https://www.inkeys.top/dist-standard/uink-v10/',
  ],
})

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, spec, 'utf-8')
console.log(`已写入 ${out}（${pages.length} 页，基于 ${commit}）`)
