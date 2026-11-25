import type { Locale } from './locales'
import { BOT_PATTERN, LOCALE_PREFIX, LOCALE_STORAGE_KEY, LOCALES, SHORTCUTS } from './locales'

/** 各语言已有的页面（normalizePathKey 形式，不含语言前缀），简体中文不需要列出。 */
export type TranslatedPaths = Partial<Record<Locale, string[]>>

/**
 * 生成插入 <head> 最前面的语言匹配脚本，只在整页加载（直接访问、刷新、外部链接进入）时运行：
 *
 * - 快捷入口（/inkeys3、/win7、/tos/zh-cn）按访客语言一次跳到目标页的译文，没有译文就去简体页；
 *   /tos/en-us 固定跳到 /en-us/tos。
 * - 其余只处理不带语言前缀的网址：语言取手动选择（localStorage）> 浏览器语言，目标语言有该页译文才跳转。
 * - 带 /zh-tw/、/en-us/ 前缀的网址按原样显示；爬虫不做语言跳转（快捷入口仍去简体页）。
 * - 跳转用 location.replace，保留查询串与锚点。
 *
 * 与 cdn/runtime.ts 一样写成纯字符串：脚本文本必须在 SSR HTML 与客户端 siteData 中完全一致，
 * 所以只能包含构建期固定的数据（路径表已排序）。
 */
export function createLocaleScript(siteBase: string, translated: TranslatedPaths): string {
  // zh-CN 前缀为空串，其余如 /zh-tw（不带末尾斜杠，便于拼接）
  const prefixes = Object.fromEntries(LOCALES.map(locale => [locale, LOCALE_PREFIX[locale].replace(/\/$/, '')]))
  const paths = Object.fromEntries(LOCALES.filter(locale => translated[locale]?.length).map(locale => [locale, [...translated[locale]!].sort()]))
  return `
;(() => {
  // 每个文档只运行一次：站内跳转不会再次执行，因此不会自动切换语言。
  if (window.__INKEYS_LOCALE__)
    return
  window.__INKEYS_LOCALE__ = true
  const base = ${JSON.stringify(siteBase.replace(/\/$/, ''))}
  const prefixes = ${JSON.stringify(prefixes)}
  const translated = ${JSON.stringify(paths)}
  const shortcuts = ${JSON.stringify(SHORTCUTS)}
  const storageKey = ${JSON.stringify(LOCALE_STORAGE_KEY)}
  const botPattern = ${BOT_PATTERN.toString()}
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key)

  const pathname = location.pathname
  if (base && pathname !== base && !pathname.startsWith(base + '/'))
    return
  const rel = pathname.slice(base.length) || '/'
  let decoded = rel
  try {
    decoded = decodeURI(rel)
  }
  catch {}
  // 与 i18n/locales.ts 的 normalizePathKey 规则相同。
  const key = decoded.replace(/\\.html$/i, '').replace(/\\/index$/i, '/').replace(/\\/+$/, '') || '/'
  const suffix = /\\.html$/i.test(rel) ? '.html' : ''
  const go = path => location.replace(base + path + location.search + location.hash)

  const shortcut = has(shortcuts, key) ? shortcuts[key] : undefined
  if (shortcut && !shortcut.match)
    return go(shortcut.target + suffix)
  // 带语言前缀的网址按原样显示。
  if (!shortcut && Object.values(prefixes).some(prefix => prefix && (key === prefix || key.startsWith(prefix + '/'))))
    return

  // 手动选择 > 浏览器语言（按顺序找第一个中文或英文，都没有则英文，列表为空则简体）。
  const pick = () => {
    if (botPattern.test(navigator.userAgent))
      return 'zh-CN'
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved && has(prefixes, saved))
        return saved
    }
    catch {}
    const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).filter(Boolean)
    if (!list.length)
      return 'zh-CN'
    for (const item of list) {
      const tag = String(item).toLowerCase().replace(/_/g, '-')
      if (/^zh(-|$)/.test(tag))
        return /^zh-(tw|hk|mo|hant)(-|$)/.test(tag) ? 'zh-TW' : 'zh-CN'
      if (/^en(-|$)/.test(tag))
        return 'en-US'
    }
    return 'en-US'
  }

  const locale = pick()
  const target = shortcut ? shortcut.target : key
  // 目标语言没有该页译文时不跳转（快捷入口则去简体目标页）。
  if (locale !== 'zh-CN' && has(translated, locale) && translated[locale].includes(target))
    return go(prefixes[locale] + (shortcut ? shortcut.target + suffix : rel))
  if (shortcut)
    go(shortcut.target + suffix)
})()
`.trim()
}

/**
 * 快捷入口的静态跳转页（生产环境）：内联同一段语言脚本；
 * 没有脚本或爬虫时由 1 秒的 meta refresh 兜底到简体目标页（放在脚本之后，保证脚本先跳）。
 */
export function createRedirectPage(script: string, fallback: string): string {
  const url = fallback.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="robots" content="noindex">
  <title>Redirecting...</title>
  <script>${script}</script>
  <meta http-equiv="refresh" content="1; url=${url}">
</head>
<body>
  <p><a href="${url}">${url}</a></p>
</body>
</html>
`
}
