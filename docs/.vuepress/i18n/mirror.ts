import type { App, Page } from 'vuepress/core'
import { createPage, renderPageToVue } from 'vuepress/core'
import { fs, path } from 'vuepress/utils'
import type { Locale } from './locales'
import { LOCALE_PREFIX, LOCALES, normalizePathKey } from './locales'

/**
 * 未翻译页面的语言镜像（任务 11-25-site-i18n）。
 *
 * 繁中 / 英文访客从顶栏、侧栏点进还没有译文的页面时，若直接去简体页面，界面语言会掉回简体，
 * 之后的导航也回不到原来的语言。所以构建时为每个只有简体版本的页面，在 /zh-tw/、/en-us/ 下生成一份镜像：
 * - 正文仍是简体原文，最上方加一条“暂未翻译”的提示；源文件只有简体一份，不复制 .md，改原文后镜像自动更新；
 * - 虚拟文件路径放在对应语言目录下，正文里的相对链接会解析到同一语言的页面；
 *   指向站内页面的绝对链接（/tutorial/… 等）也改写到同一语言下；
 * - 镜像不算译文：不参与整页加载时的自动语言跳转（见 plugin.ts），
 *   并设置 canonical 指向简体原页、noindex，且不进入 sitemap 与 llms.txt。
 */

/** 镜像页的 frontmatter 标记 */
export const MIRROR_FLAG = 'i18nMirror'

/** 镜像页最上方的提示（Plume 提示容器） */
const NOTICE: Record<Exclude<Locale, 'zh-CN'>, string> = {
  'zh-TW': '::: tip 本頁尚未翻譯\n本頁目前還沒有繁體中文版本，以下為簡體中文原文。造成不便，敬請見諒。\n:::',
  'en-US': '::: tip Not translated yet\nThis page has not been translated into English yet, so the original Simplified Chinese version is shown below. We apologize for the inconvenience.\n:::',
}

export function isMirrorPage(page: Page): boolean {
  return page.frontmatter[MIRROR_FLAG] === true
}

/** 页面路径的比较形式；额外去掉 .md 与 README，便于匹配 Markdown 里的链接写法。 */
function linkKey(link: string): string {
  return normalizePathKey(link.replace(/\.md$/i, '').replace(/\/README$/i, '/'))
}

/** 在 frontmatter 之后插入提示；没有 frontmatter 时放在最前面。 */
function insertNotice(raw: string, notice: string): string {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/)
  if (!match)
    return `${notice}\n\n${raw}`
  return `${match[0]}\n${notice}\n\n${raw.slice(match[0].length)}`
}

/**
 * 把指向站内页面的绝对链接改到对应语言下（Markdown 链接与 href="..." 两种写法）。
 * 只改写确实存在于简体站点的页面路径，资源文件（/dist-download/ink/…、/dist-standard/uink-v11/spec.md 等）保持不变。
 */
function localizeLinks(content: string, prefix: string, pageKeys: Set<string>): string {
  return content.replace(/(\]\(|href=")(\/(?!\/)[^)"#?\s]*)/g, (whole, lead: string, link: string) =>
    pageKeys.has(linkKey(link)) ? `${lead}${prefix}${link.slice(1)}` : whole)
}

/** 为每个只有简体版本的页面生成繁中、英文镜像，加入 app.pages；返回各语言生成的数量。 */
export async function createMirrorPages(app: App): Promise<Record<string, number>> {
  const hostname = 'https://www.inkeys.top'
  const base = app.siteData.base.replace(/\/$/, '')
  // 只镜像来自 .md 文件的简体页面；Plume 生成的列表页、404 不镜像。
  const sources = app.pages.filter(page => page.pathLocale === '/' && page.filePath && page.filePathRelative && page.frontmatter.layout !== 'NotFound')
  const pageKeys = new Set(sources.map(page => normalizePathKey(page.path)))
  const counts: Record<string, number> = {}

  for (const locale of LOCALES) {
    if (locale === 'zh-CN')
      continue
    const prefix = LOCALE_PREFIX[locale]
    // 已有译文的页面不镜像。
    const existing = new Set(app.pages
      .filter(page => page.pathLocale === prefix)
      .map(page => normalizePathKey(page.path.slice(prefix.length - 1))))
    const mirrors = await Promise.all(sources
      .filter(page => !existing.has(normalizePathKey(page.path)))
      .map(async (page) => {
        const raw = await fs.readFile(page.filePath!, 'utf-8')
        const content = localizeLinks(insertNotice(raw, NOTICE[locale]), prefix, pageKeys)
        const mirror = await createPage(app, {
          path: prefix + page.path.slice(1),
          // 虚拟路径：文件并不存在，只用于解析相对链接与集合归属（如 zh-tw/version/…）。
          filePath: app.dir.source(prefix.slice(1), page.filePathRelative!),
          content,
          frontmatter: {
            [MIRROR_FLAG]: true,
            sitemap: false,
            llmstxt: false,
            head: [
              ['link', { rel: 'canonical', href: `${hostname}${base}${page.path}` }],
              ['meta', { name: 'robots', content: 'noindex, follow' }],
            ],
          },
        })
        // 路由不能去导入不存在的 .md：把页面块改成临时目录里的 .vue，由 writeMirrorChunks 在 onPrepared 写出。
        // filePath 保留虚拟路径，Plume 统计集合文章（如繁中 / 英文的版本列表）时需要它。
        const chunkFilePathRelative = path.join('pages', `${mirror.htmlFilePathRelative}.vue`)
        Object.assign(mirror, {
          chunkFilePath: app.dir.temp(chunkFilePathRelative),
          chunkFilePathRelative,
        })
        return mirror
      }))
    app.pages.push(...mirrors)
    counts[locale] = mirrors.length
  }
  return counts
}

/** 写出镜像页的 .vue 页面块（VuePress 只会为 filePath 为空的页面自动写出）。 */
export async function writeMirrorChunks(app: App): Promise<void> {
  await Promise.all(app.pages.filter(isMirrorPage).map(page =>
    app.writeTemp(page.chunkFilePathRelative, renderPageToVue(app, page))))
}
