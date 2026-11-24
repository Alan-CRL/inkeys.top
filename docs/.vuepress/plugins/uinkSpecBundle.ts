import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, posix } from 'node:path'
import type { Plugin } from 'vuepress'

export const SITE_URL = 'https://www.inkeys.top'

// 单文件规范的页面顺序，相对 docs/standard/，不含 .md。
// 必须与 plume.config.ts 中 /standard/ 侧边栏的顺序保持一致；尚未创建的页面会被跳过并给出警告。
export const UINK_V11_PAGES = [
  'README',
  'intro',
  'quick-start',
  'levels',
  'compatibility',
  'file/main',
  'incremental',
  'file/extra',
  'blocks/header',
  'blocks/headerExtension',
  'blocks/device',
  'blocks/canvas',
  'blocks/ink',
  'blocks/shape',
  'blocks/media',
  'blocks/clear',
  'common/color',
  'common/nib',
  'type',
  'appendix/shape-presets',
  'conformance',
  'version',
  'glossary',
]

// 1.0 Beta 的侧边栏顺序，只用于生成一次性的 1.0 存档。
export const UINK_V10_PAGES = [
  'intro',
  'version',
  'type',
  'incremental',
  'conformance',
  'file/main',
  'blocks/header',
  'blocks/headerExtension',
  'blocks/device',
  'blocks/canvas',
  'blocks/clear',
  'blocks/ink',
  'blocks/shape',
  'blocks/media',
  'common/color',
]

export interface SpecPage {
  /** 相对 docs/standard/ 的路径，不含 .md，例如 `blocks/ink` */
  path: string
  markdown: string
}

export interface BundleOptions {
  /** 顶层 `# ` 标题 */
  title: string
  /** 标题下方的说明，每项一行引用 */
  notes?: string[]
}

interface ParsedPage {
  path: string
  /** 纯文本标题，用于目录与 llms.txt */
  title: string
  /** 章节标题原文；页面以 `# ` 标题开头时取该标题（可能带 Badge），否则同 title */
  heading: string
  body: string
}

/** 页面在网站上的路径，例如 `blocks/ink` → `/standard/blocks/ink.html`，`README` → `/standard/` */
export function pageSitePath(page: string): string {
  if (page === 'README' || page === 'index') return '/standard/'
  if (page.endsWith('/README') || page.endsWith('/index')) {
    return `/standard/${page.slice(0, page.lastIndexOf('/') + 1)}`
  }
  return `/standard/${page}.html`
}

/**
 * 拆出 frontmatter 的 title 与正文。
 * 正文以 `# ` 标题开头时（1.1 页面模板），把它移出正文作为章节标题，避免与 frontmatter title 重复；
 * 标题优先取 frontmatter title，其次取该 `# ` 标题去掉标签后的文字，最后退回页面路径。
 */
export function parsePage(page: SpecPage): ParsedPage {
  let text = page.markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  let title = ''
  const fm = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(text)
  if (fm) {
    const line = /^title:[ \t]*(.*)$/m.exec(fm[1])
    if (line) title = line[1].trim().replace(/^(['"])(.*)\1$/, '$2')
    text = text.slice(fm[0].length)
  }
  let heading = ''
  const h1 = /^\s*#[ \t]+(.+?)[ \t#]*(?:\n|$)/.exec(text)
  if (h1) {
    heading = h1[1]
    text = text.slice(h1[0].length)
  }
  if (!title) title = heading.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  title ||= page.path
  return { path: page.path, title, heading: heading || title, body: text }
}

/** 把站内链接改写为站点绝对路径：相对路径按页面所在目录解析，无扩展名或 .md 的页面链接补成 .html */
function rewriteTarget(target: string, page: string): string {
  // 外部链接、协议链接与协议相对链接保持不变
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) return target
  const hashAt = target.indexOf('#')
  const pathPart = hashAt === -1 ? target : target.slice(0, hashAt)
  const hash = hashAt === -1 ? '' : target.slice(hashAt)
  // 只有锚点：在单文件里锚点不可靠，指回原页面
  if (!pathPart) return pageSitePath(page) + hash

  const pageDir = posix.dirname(`/standard/${page}`)
  let abs = pathPart.startsWith('/') ? pathPart : posix.join(pageDir, pathPart)
  // 规范发布目录（/standard/uink-v11/spec.md、样例等）是静态文件，保持原扩展名
  if (/^\/standard\/uink-v\d+\//.test(abs)) return abs + hash
  if (pathPart.endsWith('/') && !abs.endsWith('/')) abs += '/'
  if (!abs.endsWith('/')) {
    const base = posix.basename(abs)
    if (/^(README|index)(\.md)?$/.test(base)) abs = abs.slice(0, abs.length - base.length)
    else if (base.endsWith('.md')) abs = `${abs.slice(0, -3)}.html`
    else if (!posix.extname(base)) abs = `${abs}.html`
  }
  return abs + hash
}

/** 改写一行（不在代码块内）中的 Markdown 链接与 Badge；行内代码保持原样 */
function transformInline(line: string, page: string): string {
  return line
    .split(/(`+[^`]*`+)/)
    .map((seg, i) => {
      if (i % 2 === 1) return seg
      return seg
        // <Badge text="X" /> 与 <Badge>X</Badge> → 【X】
        .replace(/<Badge\b([^>]*?)>([^<]*)<\/Badge>/g, (_, attrs: string, inner: string) => `【${badgeText(attrs) || inner.trim()}】`)
        .replace(/<Badge\b([^>]*?)\/?>/g, (_, attrs: string) => `【${badgeText(attrs)}】`)
        // [text](target "title") 与图片 ![alt](target)
        .replace(/(!?\[[^\]]*\]\()(<[^>]*>|[^)\s]+)([^)]*\))/g, (all, head: string, target: string, tail: string) =>
          target.startsWith('<') ? all : head + rewriteTarget(target, page) + tail)
        // 引用式链接定义 [id]: target
        .replace(/^(\s{0,3}\[[^\]]+\]:\s*)(\S+)/, (_, head: string, target: string) => head + rewriteTarget(target, page))
    })
    .join('')
}

function badgeText(attrs: string): string {
  return /\btext=(["'])(.*?)\1/.exec(attrs)?.[2] ?? ''
}

// 整行只有 Vue 组件标签（大写开头），例如 <CardGrid>、</CardGrid>、<UInkHero/>、<LinkCard ... />
const COMPONENT_LINE = /^\s*<\/?[A-Z][\w.-]*(\s[^>]*)?\/?>\s*$/
// 跨行的组件开始标签，例如 `<LinkCard` 后面换行写属性
const COMPONENT_OPEN = /^\s*<[A-Z][\w.-]*(\s[^>]*)?$/

/** 转换单页正文：标题降一级、去掉组件标签行、图示占位转为引用行、改写链接 */
function transformBody(body: string, page: string): string {
  const out: string[] = []
  let fence = ''
  let inComponent = false
  let visual: string[] | null = null

  for (const line of body.split('\n')) {
    // 代码块内容原样保留；结束标记必须与开始标记同字符且不短于开始标记
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line)
    if (fence) {
      out.push(line)
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length
        && !line.trim().slice(fenceMatch[1].length).trim()) fence = ''
      continue
    }
    if (fenceMatch) {
      fence = fenceMatch[1]
      out.push(line)
      continue
    }

    if (inComponent) {
      if (line.includes('>')) inComponent = false
      continue
    }

    // 图示占位：<!-- visual: 名称 — 意图 -->，可能跨行；前后加空行，避免并入相邻段落或引用
    if (visual) {
      const end = line.indexOf('-->')
      visual.push(end === -1 ? line : line.slice(0, end))
      if (end !== -1) {
        out.push('', `> 图示：${visual.join(' ').replace(/\s+/g, ' ').trim()}`, '')
        visual = null
      }
      continue
    }
    const visualStart = /^\s*<!--\s*visual:\s*(.*)$/.exec(line)
    if (visualStart) {
      const end = visualStart[1].indexOf('-->')
      if (end === -1) {
        visual = [visualStart[1]]
      } else {
        out.push('', `> 图示：${visualStart[1].slice(0, end).trim()}`, '')
      }
      continue
    }

    if (/^\s*<Badge\b/.test(line)) {
      // Badge 单独成行时保留为文字，不当作组件删除
      out.push(transformInline(line, page))
      continue
    }
    // 单行的 <LinkCard title href description /> 转为列表项，避免卡片内容在单文件中丢失
    const card = /^\s*<LinkCard\b([^>]*?)\/>\s*$/.exec(line)
    if (card) {
      const attr = (name: string) => new RegExp(`\\b${name}=(["'])(.*?)\\1`).exec(card[1])?.[2] ?? ''
      const desc = attr('description')
      out.push(transformInline(`- [${attr('title')}](${attr('href')})${desc ? `：${desc}` : ''}`, page))
      continue
    }
    if (COMPONENT_LINE.test(line)) continue
    if (COMPONENT_OPEN.test(line)) {
      inComponent = true
      continue
    }

    const heading = /^(#{1,6})([ \t].*)?$/.exec(line)
    if (heading) {
      // 页面标题占用 `##`，页内标题统一降一级（最深到 ######）
      const level = Math.min(heading[1].length + 1, 6)
      out.push('#'.repeat(level) + transformInline(heading[2] ?? '', page))
      continue
    }
    out.push(transformInline(line, page))
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** 把多页规范拼成一个 Markdown 文件 */
export function bundleSpec(pages: SpecPage[], opts: BundleOptions): string {
  const parsed = pages.map(parsePage)
  const parts: string[] = [`# ${opts.title}`]
  if (opts.notes?.length) parts.push(opts.notes.map(n => `> ${n}`).join('\n>\n'))

  parts.push(['## 目录', '', ...parsed.map((p, i) => `${i + 1}. ${p.title}（${pageSitePath(p.path)}）`)].join('\n'))

  for (const p of parsed) {
    parts.push('---')
    parts.push(`## ${transformInline(p.heading, p.path)}`)
    parts.push(`> 网页版：${SITE_URL}${pageSitePath(p.path)}`)
    const body = transformBody(p.body, p.path)
    if (body) parts.push(body)
  }
  return `${parts.join('\n\n')}\n`
}

/** llms.txt（llmstxt.org 格式）：UInk 一句话说明、单文件规范与各页面链接 */
export function buildLlmsTxt(pages: SpecPage[]): string {
  const lines = [
    '# UInk',
    '',
    '> UInk 是开放的墨迹文件规范：一个 `.uink` 文件保存一个白板或一份 PPT 的全部页面、笔迹、图形与媒体，供不同的批注与白板软件互相读写。',
    '',
    '当前版本为 UInk 1.1 Beta（`Header.version = 11`）。实现读取器或写入器时，优先阅读单文件版规范。',
    '',
    '## 规范',
    '',
    `- [UInk 1.1 规范（单文件版）](${SITE_URL}/standard/uink-v11/spec.md): 全部规范页面按目录顺序拼成的单个 Markdown 文件`,
    ...pages.map(page => {
      const { title } = parsePage(page)
      return `- [${title}](${SITE_URL}${pageSitePath(page.path)})`
    }),
    '',
    // 公开样例：实现者用来对照各等级的期望结果
    '## 样例',
    '',
    `- [UInk 1.1 公开样例清单](${SITE_URL}/standard/uink-v11/fixtures.json): 每个样例的用途、覆盖的规则编号、对象内容与各等级下的期望结果；.uink 文件与清单在同一目录`,
    `- [样例校验和](${SITE_URL}/standard/uink-v11/SHA256SUMS.txt): 下载后用 sha256sum -c 校验`,
    '',
    '## 存档',
    '',
    `- [UInk 1.0 Beta 规范（单文件存档）](${SITE_URL}/standard/uink-v10/spec.md): version 10 的冻结存档`,
    '',
  ]
  return lines.join('\n')
}

/** 读取 docs/standard/ 下按顺序存在的页面；缺失的页面给出警告并跳过 */
async function readSourcePages(sourceDir: string, order: string[]): Promise<SpecPage[]> {
  const pages: SpecPage[] = []
  for (const page of order) {
    const file = `${sourceDir}/${page}.md`
    if (!existsSync(file)) {
      // README（概览）由主页子任务创建，缺失属于正常情况，不警告
      if (page !== 'README') console.warn(`[uink-spec-bundle] 跳过不存在的页面 standard/${page}.md`)
      continue
    }
    pages.push({ path: page, markdown: await readFile(file, 'utf-8') })
  }
  return pages
}

async function writeOut(file: string, content: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, content, 'utf-8')
}

/**
 * 构建结束后生成：
 * - /standard/uink-v11/spec.md：当前版本的单文件规范
 * - /standard/llms.txt：UInk 规范索引
 * 根目录 /llms.txt 由主题的 llmstxt 插件生成（全站索引），此处不覆盖它。
 */
export const uinkSpecBundlePlugin = (): Plugin => ({
  name: 'inkeys-uink-spec-bundle',
  onGenerated: async (app) => {
    const pages = await readSourcePages(app.dir.source('standard'), UINK_V11_PAGES)
    const spec = bundleSpec(pages, {
      title: 'UInk 1.1 规范（单文件版）',
      notes: [
        '版本：UInk 1.1 Beta（`Header.version = 11`）。',
        `本文件在网站构建时由 \`docs/standard/\` 的各页面自动拼接生成，内容与网页版一致；如有出入，以网页版为准：${SITE_URL}/standard/`,
        '规范性用词：**必须**、**不得**、**应**、**可以**。',
      ],
    })
    await writeOut(app.dir.dest('standard', 'uink-v11', 'spec.md'), spec)
    await writeOut(app.dir.dest('standard', 'llms.txt'), buildLlmsTxt(pages))
  },
})
