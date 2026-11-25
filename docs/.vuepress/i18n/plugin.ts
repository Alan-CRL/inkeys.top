import type { App, Page, Plugin } from 'vuepress/core'
import { colors, fs, logger, path } from 'vuepress/utils'
import type { Locale } from './locales'
import { localeFromPrefix, normalizePathKey, SHORTCUTS } from './locales'
import { createMirrorPages, isMirrorPage, writeMirrorChunks } from './mirror'
import type { TranslatedPaths } from './runtime'
import { createLocaleScript, createRedirectPage } from './runtime'

/** 从页面列表收集各语言（简体除外）已有的页面路径，去掉语言前缀并统一形式。镜像页不是译文，不计入。 */
function collectTranslated(app: App): TranslatedPaths {
  const result: Partial<Record<Locale, Set<string>>> = {}
  for (const page of app.pages) {
    if (page.pathLocale === '/' || page.frontmatter.layout === 'NotFound' || isMirrorPage(page))
      continue
    const locale = localeFromPrefix(page.pathLocale)
    if (locale === 'zh-CN')
      continue
    // /zh-tw/download.html → /download.html → /download
    const set = result[locale] ??= new Set()
    set.add(normalizePathKey(page.path.slice(page.pathLocale.length - 1)))
  }
  return Object.fromEntries(Object.entries(result).map(([locale, set]) => [locale, [...set].sort()]))
}

/**
 * sitemap 插件把相同路径的各语言页面互列为 hreflang 对照，镜像页（noindex，canonical 指向简体原页）也会被列进去。
 * 有镜像页的路径改用页面 frontmatter.sitemap.links 覆盖，只保留真正的页面；只剩一种语言时不列对照。
 */
function fixSitemapAlternates(app: App): void {
  const groups = new Map<string, Page[]>()
  for (const page of app.pages) {
    // 与 sitemap 插件相同的分组方式：/zh-tw/download.html → /download.html
    const key = page.path.replace(page.pathLocale, '/')
    groups.set(key, [...(groups.get(key) ?? []), page])
  }
  for (const [key, pages] of groups) {
    if (!pages.some(isMirrorPage))
      continue
    const real = pages.filter(page => !isMirrorPage(page))
    const links = real.length > 1
      ? real.map(page => ({ lang: app.siteData.locales[page.pathLocale]?.lang ?? 'en', url: `${app.siteData.base}${page.pathLocale.slice(1)}${key.slice(1)}` }))
      : []
    for (const page of real) {
      const current = page.frontmatter.sitemap
      if (current === false)
        continue
      page.frontmatter.sitemap = { ...(typeof current === 'object' && current ? current : {}), links }
    }
  }
}

/**
 * 站点语言匹配（任务 11-25-site-i18n）：
 * - onInitialized：按已有页面生成语言脚本，放在 head 最前面（开发与生产都生效，先于 CDN 脚本）；
 * - onGenerated：为快捷入口写出带同一脚本的静态跳转页（取代 redirect 插件里的 /inkeys3、/win7）。
 */
export function i18nPlugin(): Plugin {
  let script = ''
  return {
    name: 'inkeys-i18n',
    async onInitialized(app) {
      // 先生成未翻译页面的镜像（见 mirror.ts），再统计真正的译文。
      const mirrors = await createMirrorPages(app)
      fixSitemapAlternates(app)
      logger.info(`[inkeys-i18n] mirror pages ${colors.cyan(Object.entries(mirrors).map(([locale, count]) => `${locale}: ${count}`).join(', '))}`)
      const translated = collectTranslated(app)
      script = createLocaleScript(app.siteData.base, translated)
      app.siteData.head.unshift(['script', {}, script])
      const summary = Object.entries(translated).map(([locale, list]) => `${locale}: ${list!.join(', ')}`).join('; ')
      logger.info(`[inkeys-i18n] translated pages ${colors.cyan(summary || '(none)')}`)
    },
    async onPrepared(app) {
      await writeMirrorChunks(app)
    },
    async onGenerated(app) {
      const base = app.siteData.base.replace(/\/$/, '')
      // Plume 的“复制页面”组件在挂载时就预取当前页的 .md（即使镜像页因 llmstxt: false 不显示菜单），
      // llms 插件又不为镜像页生成 .md，每个镜像页都会出现一次 404。这里写出镜像页正文（含“暂未翻译”提示）。
      await Promise.all(app.pages.filter(isMirrorPage).map(async (page) => {
        const file = app.dir.dest(page.htmlFilePathRelative.replace(/\.html$/, '.md'))
        const body = page.content.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, '').trimStart()
        await fs.ensureDir(path.dirname(file))
        await fs.writeFile(file, body)
      }))
      await Promise.all(Object.entries(SHORTCUTS).map(async ([source, { target }]) => {
        // /inkeys3 与 /inkeys3.html 都由 inkeys3.html 提供
        const file = app.dir.dest(`${source.slice(1)}.html`)
        if (fs.existsSync(file)) {
          logger.warn(`[inkeys-i18n] ${file} already exists, redirect page skipped`)
          return
        }
        await fs.ensureDir(path.dirname(file))
        await fs.writeFile(file, createRedirectPage(script, base + target))
      }))
    },
  }
}
