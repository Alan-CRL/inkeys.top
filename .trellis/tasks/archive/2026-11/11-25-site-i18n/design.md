# 技术设计：网站 i18n

## 1. 结构与边界

```
docs/
  index.md  download.md  tos.md                 ← zh-CN（根 locale，网址不变；tos.md 由 tos/zh-cn.md 合并而来）
  standard/README.md  version/inkeys3.md  version/introduction/win7.md
  zh-tw/  index.md download.md tos.md standard/README.md version/inkeys3.md version/introduction/win7.md
  en-us/  同上（tos.md 由 tos/en-us.md 迁入）
  .vuepress/
    i18n/
      locales.ts        ← 唯一的语言表：Locale 类型、前缀、显示名、浏览器语言映射、存储键、快捷入口表
      useLocale.ts      ← 客户端组合式函数：由当前路由的 locale 推出 Locale（SSR / 客户端一致）
      runtime.ts        ← 生成 <head> 内联脚本与快捷入口静态跳转页（纯字符串，参照 cdn/runtime.ts 的写法）
      plugin.ts         ← VuePress 插件：收集已翻译路径、注入 head 脚本、生成静态跳转页
    theme/components/LocaleSwitch.vue           ← 顶栏语言按钮
    navbar.ts / sidebar.ts                      ← 按 locale 导出三套
```

- 不改 Plume 组件文件，只用 `locales` 配置、公开插槽和类名选择器（沿用 `11-24-site-unify` 的约束）。
- 范围外页面不建 `zh-tw/`、`en-us/` 副本。

## 2. 配置

- `config.ts`：`locales: { '/': { lang: 'zh-CN', title: '智绘教Inkeys', description }, '/zh-tw/': { lang: 'zh-TW', title: 'Inkeys', description }, '/en-us/': { lang: 'en-US', title: 'Inkeys', description } }`。
- `plume.config.ts`：`navbar` / `sidebar` / `collections` / `footer` 移入 `locales`，三个 locale 各一套；`selectLanguageName` 设为 简体中文 / 繁體中文 / English（`useLangs()` 依赖它区分当前语言）。
  - zh-TW / en-US 的 `collections` 只为 `standard` 建 doc 集合（让 `/…/standard/` 拿到翻译后的规范侧栏），侧栏条目链接写**绝对的简体路径**（`/standard/intro` 等）。
  - 侧栏键：`/zh-tw/download`、`/zh-tw/tos`、`/zh-tw/version` 等，内容为翻译后的条目；指向未翻译页面的条目用简体绝对路径。
  - 页脚 message / copyright 三语；条款链接指向各自语言的 `tos`。
- `redirectPlugin.config` 去掉 `/inkeys3`、`/win7` 及其 `.html` 键（改由 i18n 插件生成），保留 `pptcom3`、`pptx-video-processing`。

## 3. 自动匹配（R2 / R3 / R5）

### 3.1 head 内联脚本（整页加载时运行）

由 `i18n/plugin.ts` 在 `onInitialized` 中从 `app.pages` 收集各 locale 已有的页面路径（去掉前缀、统一成 `/download` 形式），写进脚本，再 push 到 `app.siteData.head` 最前面（先于 CDN 脚本，跳转越早越好）。脚本逻辑：

```
if (爬虫 UA) return
path = 去掉 base、.html、index 后的路径
target = SHORTCUTS[path]               // /inkeys3、/win7、/tos/zh-cn → 简体目标路径（仅 dev 下会走到，生产由静态页处理）
if (!target) {
  if (path 以 /zh-tw/ 或 /en-us/ 开头) return      // 带前缀网址按原样显示
  target = path
}
locale = 存储的选择（有效值） ?? 由 navigator.languages 推断
if (locale !== 'zh-CN' && TRANSLATED[locale].has(target)) 跳到 前缀 + target
else if (target !== path) 跳到 target
跳转用 location.replace，保留 search 与 hash
```

- 只在整页加载时执行；SPA 站内跳转不重新执行 head 脚本，天然满足“站内不自动切换”。
- 脚本文本在 SSR HTML 与客户端 siteData 中必须一致（VuePress 按文本接管 head 标签），因此路径表在构建期固定、不含随机内容。
- 爬虫判定：`/bot|crawl|spider|slurp|bingpreview|mediapartners/i`，避免搜索引擎把简体页面当作跳转页。

### 3.2 快捷入口静态跳转页（生产）

`onGenerated` 为 `/inkeys3`、`/inkeys3.html`、`/win7`、`/win7.html`、`/tos/zh-cn`、`/tos/zh-cn.html` 写出 HTML：`<meta name="robots" content="noindex">`、内联同一套判定逻辑，`<noscript>` 与 `<meta http-equiv="refresh">` 兜底到简体目标页（`refresh` 放在脚本之后并设 1 秒，保证脚本先跳）。`/tos/en-us(.html)` 生成固定跳到 `/en-us/tos` 的普通跳转页。不覆盖已存在的文件。

### 3.3 站内链接到快捷入口

`DownloadCard.vue` 等站内链接 `/win7` 会走 SPA 路由，不经过 head 脚本。在 `client.ts` 的 `router.beforeEach` 中：目标是快捷入口时，按**当前页面的语言**解析（当前语言有该页译文就去译文，否则去简体页），不读浏览器语言，保持“站内不自动切换”。dev 环境整页打开快捷入口时由 head 脚本处理。

### 3.4 记住选择

- 存储键 `inkeys-locale`，值为 `zh-CN` / `zh-TW` / `en-US`；只有语言按钮写入，其他导航（含从英文页点进简体页）不写。
- 读值时校验合法性，非法值忽略；localStorage 不可用时按浏览器语言。

## 4. 语言按钮（R4）

- `LocaleSwitch.vue` 放进 `NavActions.vue`，位于下载按钮与深浅色按钮之间；复用 `nh3-nav-round` 圆按钮和 `nh3-nav-menu` 下拉样式与交互（点外部关闭、Esc 关闭并还焦点、`aria-expanded` / `aria-controls`）。
- 图标：“文 / A”组合的语言 SVG（与 Plume `vpi-languages` 同类），`aria-label` / `title` 随语言变化。
- 菜单项：简体中文 / 繁體中文 / English（各用本语言书写），当前语言带勾并 `aria-current`。
- 链接来自 Plume `useLangs({ removeCurrent: false })`：目标语言有同路径页面去该页，否则去目标语言首页。点击时先写 `inkeys-locale` 再 `router.push`。
- 窄屏：`NavActions` 目前窄屏只留下载按钮，语言按钮同样保留（下载按钮 + 语言按钮 + 主题汉堡菜单）。
- 隐藏 Plume 自带入口：CSS 隐藏 `.vp-navbar-translations` 与手机菜单中的翻译组（类名在实现时以 rc.219 实际 DOM 为准），保证只有一个入口、所有切换都会记住选择。

## 5. 组件与页面文案（R6）

- `useLocale()`：`useRouteLocale()` → `'/' | '/zh-tw/' | '/en-us/'` 映射到 `Locale`；SSR 与客户端结果一致，消除当前首页“先简体后切换”的水合差异。
- `NewHome3/copy.ts`：`locale` 改为由 `useLocale()` 计算，删除 `previewLocaleFromQuery` 及 `NewHome3.vue:431` 的调用；校对繁中 / 英文文案，品牌名改为 “Inkeys”。`NavActions` 的文案同样来自这里；“立即下载”链接按语言指向各自的下载页。
- `DownloadCard.vue`、`UInkHero.vue`、`UInkTierDemo.vue`、`UInkStructure.vue`（及它们在 UInk 首页用到的子组件）：各自就近放一份 `Record<Locale, …>` 文案表，按 `useLocale()` 取值；只翻译在范围内页面上显示的文字。条款链接与锚点按语言区分（锚点由各语言标题生成）。
- `AsideNav.vue`：补 `/zh-tw/`、`/en-us/` 两套文案。
- 页面 Markdown：`zh-tw/`、`en-us/` 副本保持与简体相同的 frontmatter（`pageLayout`、`pageClass` 等）；**指向未翻译页面的链接一律写简体绝对路径**（例如 win7 页的 `../changelog/20261019a` 改为 `/version/changelog/20261019a`），避免相对路径落到不存在的 `/en-us/…`。
- `client.ts` 的首页滚动判定、`SiteVisitTracker.vue` 的首页判定扩展到 `/zh-tw/`、`/en-us/`。

## 6. 使用条款（R7）

- `git mv docs/tos/zh-cn.md docs/tos.md`、`git mv docs/tos/en-us.md docs/en-us/tos.md`，删去页首的手写语言切换行；新增 `docs/zh-tw/tos.md`（由简体版译出，保留“以简体中文版本为准”条款）。
- 引用更新：页脚、下载侧栏（“使用条款”合并为单个条目）、`DownloadCard.vue` 的 `tos` / `tosService`。更新日志里的绝对旧地址不改，靠 3.2 的跳转兼容。

## 7. 兼容与风险

| 风险 | 处理 |
| --- | --- |
| 爬虫被 JS 跳转导致简体页收录异常 | head 脚本跳过爬虫 UA；Plume 的 SEO 插件已按 locales 输出 `hreflang` 备用链接 |
| head 脚本与 CDN 脚本互相影响 | 语言脚本放最前且只做跳转、不改 DOM |
| 旧链接 `/tos/zh-cn#锚点` 跳到繁中 / 英文后锚点不存在 | 锚点仍保留在网址里，页面停在顶部，可接受 |
| Plume 内部类名随升级变化导致自带语言入口重新出现 | 隐藏规则集中写在 `site.css` 一处并注释说明 |
| 未翻译页面切换语言后落在目标语言首页 | 符合 R4，属预期 |

回退：改动集中在 `i18n/`、配置、`zh-tw/`、`en-us/` 和少量组件；整体回退只需还原这些文件并恢复 `tos/` 两个页面与 redirect 配置。
