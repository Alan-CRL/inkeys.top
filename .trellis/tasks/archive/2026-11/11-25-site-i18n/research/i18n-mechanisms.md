# VuePress 2 / Plume / redirect 插件的 i18n 机制调研（2026-11-25）

版本：vuepress 2.0.0-rc.32，vuepress-theme-plume 1.0.0-rc.219，@vuepress/plugin-redirect 2.0.0-rc.138。
证据来自本地 `node_modules` 源码与 Plume 自带的 `skills/vuepress-plume-config/references/locales.md`。

## VuePress 2 核心

- `defineUserConfig({ locales })` 的键就是路由前缀：`'/'` 对应 `docs/`，`'/zh-tw/'` 对应 `docs/zh-tw/`，`'/en-us/'` 对应 `docs/en-us/`。
- 每个 locale 设 `lang`、`title`、`description`；`<html lang>`、`useRouteLocale()`、`usePageLang()` 随之变化，SSR 按页面所在 locale 输出。
- 某个 locale 没有对应 `.md` 时就没有该路由（访问即 404），不会自动回退。
- `.vuepress/` 全站共享，不按语言复制。

## Plume 主题

- `plumeTheme({ locales: { '/': {...}, '/zh-tw/': {...}, '/en-us/': {...} } })`：每个 locale 可单独配置 `navbar`、`sidebar`、`collections`、`footer`、`social` 以及全部界面文字（`selectLanguageName` 等）。
- 内置语言预设含 `zh-CN`、`zh-TW`、`en-US`（主题自带控件文字已有三语翻译）。
- 全局才生效的项（`plugins`、`markdown`、`search`、`llmstxt` 等）放进 locale 会被忽略。
- 自带语言切换：`VPNavBarTranslations.vue`（宽度 ≥1280px 才显示，地球图标下拉）+ 手机菜单里的 `VPNavScreenTranslations.vue`；数据来自 `useLangs()`。
- `useLangs().localeLinks` 的跳转规则（`dist/client/composables/index.js:1038`）：目标语言存在同路径页面 → 跳到该页；否则若在集合列表页 → 集合首页；否则 → 目标语言首页。**可直接复用这套链接计算给自定义切换按钮。**
- 本地搜索按 locale 分索引。

## @vuepress/plugin-redirect

- `autoLocale: true`：只在**当前路由属于根 locale `'/'`** 时触发，按 `navigator.languages` 把根路径整体重定向到其他 locale；设计前提是根路径没有真实内容（多语言都带前缀）。构建时也只为「仅存在于非根 locale」的路径生成跳转 HTML。
  - 与本站“zh-CN 放根路径”冲突：会把所有简体中文页面（含站内导航）都重定向走，无法区分“直接访问”和“站内跳转”，且不检查目标页是否已翻译。
- `switchLocale: 'direct' | 'modal' | 'popup'`：在页面挂载时若首选语言与当前 locale 不同就跳转/弹窗，“已处理”状态存 sessionStorage（`VUEPRESS_REDIRECT_STATUS`）。
  - 不检查目标语言是否有该页（未翻译页面会跳到 404）；记录按会话，用户主动切回后关掉浏览器再来又会被跳走；只认 `zh-TW` / `zh-Hant`，`zh-HK` 等需额外 `localeConfig`。
- 现有 `config` 映射（`/inkeys3` → `/version/inkeys3`、`/win7` → `/version/introduction/win7`）在构建时生成 meta-refresh 静态页，目标固定为简体中文页面。

## 结论

- 用 VuePress `locales` + Plume `locales` 搭三语结构，zh-CN 留在根路径，`docs/zh-tw/`、`docs/en-us/` 只放首版需要的页面。
- 自动语言匹配不用 redirect 插件的 `autoLocale` / `switchLocale`，改为自写：在 `<head>` 内联脚本里于首屏渲染前判断（只在整页加载时运行，SPA 站内跳转天然不触发），并只跳到构建时确认存在的已翻译路径。
- `/inkeys3`、`/win7` 的跳转页需要改成“先判定语言再跳”，否则会多跳一次或落在简体中文页。
- 顶栏切换按钮自写（与 `NavActions` 的圆按钮 + 下拉菜单同风格），链接计算复用 Plume `useLangs()`；同时关掉或隐藏 Plume 自带的翻译下拉，避免两个入口。

## 现状（站内）

- 首页 `NewHome3/copy.ts` 已有 zh-CN / zh-TW / en-US 三套文案，注释标明繁中与英文是“测试版式用的临时文案”；当前 locale 用 `?lang=` 预览（`previewLocaleFromQuery`），SSR 固定输出简体。
- 首页 S5-B 的设置界面 / 主栏截图三种语言都已就绪（`public/new-index3/.../settings-<locale>-*.png`、`toolbar-<locale>-*.png`）；S5-A 视频按 `s5a-<locale>` 拼地址，繁中 / 英文版视频尚未制作（见记忆 s5a-film-status）。
- 下载页 `DownloadCard.vue`（约 119 行含中文）与 UInk 首页组件 `UInkHero` / `UInkTierDemo` / `UInkStructure` / `UInkFigure` 文字全部写死简体中文，尚无翻译。
- `AsideNav.vue` 已按 `useRouteLocale()` 取文案，只有 `'/'` 一套。
- `docs/tos/zh-cn.md`、`docs/tos/en-us.md` 已有中英文使用条款（路径不在 locale 前缀下）。
