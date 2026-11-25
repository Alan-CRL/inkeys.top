/**
 * 站点语言表：唯一的来源。配置、客户端组件、head 跳转脚本都从这里取值。
 * zh-CN 是根 locale（网址不带前缀），其余语言用路由前缀区分。
 */

export type Locale = 'zh-CN' | 'zh-TW' | 'en-US'

export const LOCALES: readonly Locale[] = ['zh-CN', 'zh-TW', 'en-US']

/** 语言 → VuePress locale 路由前缀 */
export const LOCALE_PREFIX: Record<Locale, string> = {
  'zh-CN': '/',
  'zh-TW': '/zh-tw/',
  'en-US': '/en-us/',
}

/** 各语言用本语言书写的名称（语言按钮与 Plume selectLanguageName 共用） */
export const LOCALE_NAME: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en-US': 'English',
}

/** 访客手动选择的语言，只由语言按钮写入 */
export const LOCALE_STORAGE_KEY = 'inkeys-locale'

/**
 * 快捷入口（旧网址）→ 简体中文目标路径。
 * match 为 true 时按访客语言跳到对应译文（没有译文就去简体页）；false 时固定跳到 target。
 */
export const SHORTCUTS: Record<string, { target: string, match: boolean }> = {
  '/inkeys3': { target: '/version/inkeys3', match: true },
  '/win7': { target: '/version/introduction/win7', match: true },
  '/tos/zh-cn': { target: '/tos', match: true },
  '/tos/en-us': { target: '/en-us/tos', match: false },
}

/** 搜索引擎爬虫不做语言跳转 */
export const BOT_PATTERN = /bot|crawl|spider|slurp|bingpreview|mediapartners/i

/** 由 locale 路由前缀得到语言；未知前缀按简体中文处理 */
export function localeFromPrefix(prefix: string): Locale {
  return LOCALES.find(locale => LOCALE_PREFIX[locale] === prefix) ?? 'zh-CN'
}

/**
 * 把页面路径统一成比较用的形式：去掉 .html、末尾的 index 和末尾斜杠（根路径保持 /）。
 * 例如 /download.html、/standard/、/standard/index.html 分别得到 /download、/standard、/standard。
 * 注意：i18n/runtime.ts 的内联脚本里有同样的规则，修改时两处一起改。
 */
export function normalizePathKey(path: string): string {
  const key = path.replace(/\.html$/i, '').replace(/\/index$/i, '/').replace(/\/+$/, '')
  return key || '/'
}
