# 网站 i18n：zh-CN / zh-TW / en-US

## Goal

让繁体中文和英文访客打开站点时直接看到自己的语言。站点支持 zh-CN（默认）、zh-TW、en-US 三种语言：直接访问时自动匹配语言，站内跳转不再自动切换，顶栏提供与站点风格一致的语言切换按钮。首版翻译主页、UInk 首页、下载页、两个快捷入口的目标页和使用条款，顶栏 / 侧栏 / 页脚全部三语化，并完善、校对译文。

## Background（调研见 `research/i18n-mechanisms.md`）

- VuePress 2 `locales` 以路由前缀区分语言；Plume rc.219 支持按 locale 配置 navbar / sidebar / collections / footer 与界面文字，自带 zh-TW、en-US 界面翻译，并有自带的语言下拉（`VPNavBarTranslations`）与跳转链接计算 `useLangs()`。
- `@vuepress/plugin-redirect` 的 `autoLocale` / `switchLocale` 不适合 zh-CN 放根路径的结构（会拦截站内跳转、不检查目标页是否有译文、选择只记一次会话），自动匹配需自写。
- 现状：首页文案 `NewHome3/copy.ts` 已有三语，繁中 / 英文为临时文案，语言靠 `?lang=` 预览、SSR 固定简体；`DownloadCard.vue`、UInk 首页组件只有简体中文；S5-B 截图与 S5-A 视频三种语言都已就绪（2026-11-25 已核对 CDN）。
- `/inkeys3` → `/version/inkeys3`、`/win7` → `/version/introduction/win7` 是 redirect 插件生成的静态跳转页。
- 使用条款现为 `/tos/zh-cn`、`/tos/en-us` 两个独立页面，被顶栏页脚、下载侧栏、`DownloadCard.vue` 和 6 篇更新日志（绝对地址 `https://www.inkeys.top/tos/zh-cn`）引用；条款第 407–409 行规定“以简体中文版本为准”。

## Requirements

- **R1 网址**：zh-CN 不带前缀（现有网址全部不变），zh-TW 为 `/zh-tw/…`，en-US 为 `/en-us/…`。（用户表示 zh-CN 带前缀也可接受，采用不带前缀以保住现有链接。）
- **R2 自动匹配**：整页加载（直接访问、刷新、外部链接进入）时匹配语言；站内跳转不自动切换。
  - 只改写**无前缀**网址；直接打开 `/zh-tw/…`、`/en-us/…` 按原样显示。
  - 语言来源优先级：访客手动选过的语言 > 浏览器语言。
  - 浏览器语言映射（按 `navigator.languages` 顺序找第一个中文或英文）：`zh-TW` / `zh-HK` / `zh-MO` / `zh-Hant*` → zh-TW；其他 `zh*` → zh-CN；`en*` → en-US；列表里没有中文和英文 → en-US。
  - 目标语言没有该页译文时不跳转，留在简体中文页。
  - 搜索引擎爬虫不做跳转。
- **R3 快捷入口**：`/inkeys3`、`/win7` 进入时同样匹配语言，一次跳到对应语言的目标页（无译文则到简体页）。
- **R4 语言切换按钮**：顶栏一个图标按钮（“文 / A”组合的通用语言图标，类似 Plume 文档站），与深浅色、“更多”按钮同风格；点开列出 简体中文 / 繁體中文 / English，当前语言有标记；窄屏同样可用。切换后跳到目标语言的同一页面，没有译文时去目标语言首页。站内只保留这一个语言入口。
- **R5 记住选择**：手动切换的语言长期保存（localStorage），之后再直接访问无前缀网址时按此选择。
- **R6 翻译范围**：
  - 页面：主页、UInk 首页（`/standard/`）、下载页（`/download`）、`/version/inkeys3`、`/version/introduction/win7`、使用条款。
  - 站点框架：顶栏栏目、全部侧栏条目、页脚、页内侧栏小组件（`AsideNav`）都提供繁中 / 英文；指向未翻译页面的条目文字翻译，链接仍去简体中文页面。
  - 品牌名：繁中与英文都只写 “Inkeys”（站点标题同样）；简体仍为 “智绘教Inkeys”。
  - 繁中使用台湾地区用语（螢幕、軟體、簡報等）；英文面向普通用户，不堆术语和指标（沿用首页文案偏好）。
  - 译文由 Claude 补全并校对，用户统一审阅后定稿。
- **R7 使用条款**：合并为一个页面 `/tos`，提供 zh-CN（`/tos`）、zh-TW（新增，`/zh-tw/tos`）、en-US（`/en-us/tos`，沿用现有英文译文）三个版本并接入 i18n；旧网址保持可用：`/tos/zh-cn` 视同无前缀入口（跳 `/tos` 并参与语言匹配），`/tos/en-us` 跳 `/en-us/tos`，原锚点保留。
- **R8 未翻译页面的语言镜像**（用户追加，2026-11-25）：繁中 / 英文访客点进“知识库”“社区”“链接”等没有译文的页面后，界面语言不能掉回简体。每个只有简体版本的页面在 `/zh-tw/`、`/en-us/` 下都有一份镜像：正文保持简体原文，最上方显示“暂未翻译、敬请见谅”的提示块；繁中 / 英文的顶栏、侧栏、正文链接都指向同语言的页面。镜像不算译文，不参与整页加载时的自动语言跳转；R4 中“没有译文时去目标语言首页”改为“去目标语言的镜像页”。

## Acceptance Criteria

- [ ] AC1（R1）`/zh-tw/`、`/en-us/` 下范围内页面可访问，`<html lang>` 分别为 `zh-TW`、`en-US`；所有现有简体中文网址不变。
- [ ] AC2（R2）浏览器语言为 zh-TW / zh-HK 时直接打开 `/download` 落在 `/zh-tw/download`；en-US、ja-JP 时落在 `/en-us/download`；zh-CN 时停在 `/download`。查询参数与锚点保留。
- [ ] AC3（R2）浏览器语言为 en-US 时直接打开未翻译页面（如 `/tutorial/tutorial`）不跳转；直接打开 `/zh-tw/download`、`/en-us/` 时任何浏览器语言都不跳转。
- [ ] AC4（R2）在 `/en-us/` 页面通过顶栏或侧栏点进简体中文页面（如知识库），页面不被跳回英文。
- [ ] AC5（R3）英文浏览器打开 `/inkeys3`、`/win7` 分别直接落在 `/en-us/version/inkeys3`、`/en-us/version/introduction/win7`；繁中浏览器落在 `/zh-tw/…`；简体浏览器落在原简体页。
- [ ] AC6（R4）顶栏语言按钮在宽屏与窄屏都可用，键盘可操作（Esc 关闭、焦点回到按钮）；在已翻译页面切换后进入目标语言的同一页，在未翻译页面切换后进入目标语言首页；不出现 Plume 自带的第二个语言入口。
- [ ] AC7（R5）用英文浏览器手动切到简体中文后，关闭再打开 `/download` 仍为简体中文。
- [ ] AC8（R6）范围内页面、顶栏、侧栏、页脚在繁中 / 英文下没有残留简体中文（指向未翻译页面的目标页本身除外）；繁中、英文的品牌名为 “Inkeys”。
- [ ] AC9（R6）首页在繁中 / 英文下由服务端直接输出对应语言（无先简体后切换的闪烁），S5-A 视频与 S5-B 截图使用对应语言版本；`?lang=` 预览入口移除。
- [ ] AC10（R7）`/tos`、`/zh-tw/tos`、`/en-us/tos` 可访问；`/tos/zh-cn`、`/tos/zh-cn#一、服务说明`、`/tos/en-us` 旧地址按 R7 跳转；站内引用条款的位置改为对应语言的新地址。
- [ ] AC11 用户审阅并认可全部繁中 / 英文译文。
- [ ] AC12 `pnpm docs:build` 通过；浅色 / 深色、桌面 / 手机下范围内页面无错位。
- [ ] AC13（R8）英文首页点顶栏 Knowledge Base / Community 后停在 `/en-us/…`，页面顶部有提示块，正文链接与侧栏仍在英文下；在简体未翻译页切到英文进入同一页的英文镜像；繁中浏览器直接打开 `/standard/intro` 不跳转；镜像页带 canonical（指向简体原页）与 noindex，不进 sitemap。

## Out of Scope

- 其他页面（UInk 规范正文子页面、版本列表与更新日志、知识库、社区、链接、碎碎念等）的正文翻译。
- UInk 单文件规范（`/standard/uink-v11/spec.md`）、`llms.txt` 的多语言版本。
- 更新日志里指向 `https://www.inkeys.top/tos/zh-cn` 的旧链接（由旧地址跳转兼容，不改动）。
- 新的媒体素材制作（三语素材都已就绪）。
