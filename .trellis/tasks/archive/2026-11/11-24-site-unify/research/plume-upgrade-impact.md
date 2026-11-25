# 调查：全站换色后 Plume 还能否升级（2026-11-24）

## 现状

- 已装：`vuepress-theme-plume@1.0.0-rc.204`、`vuepress@2.0.0-rc.30`、`@vuepress/bundler-vite@2.0.0-rc.30`、`@vuepress/plugin-redirect@2.0.0-rc.131`。
- npm 最新：Plume `1.0.0-rc.219`，其 peer 要求 `vuepress@2.0.0-rc.32`，自带插件为 `2.0.0-rc.138`（redirect 插件需同步到 rc.138）。
- Trellis CLI 已是 npm `latest`（0.6.17），无需升级；`.trellis/.template-hashes.json` 的未提交改动只是 `__pycache__` 哈希变化。

## 首页 / UInk 首页是怎么换色的

两处都没有 fork Plume 组件，只用了两类手段：

1. **覆盖 Plume 的 CSS 变量**（`--vp-c-bg`、`--vp-c-text-*`、`--vp-c-brand-1`、`--vp-nav-bg-color`、`--vp-local-nav-bg-color` 等），限定在 `pageClass`（`.new-home3-page` / `.uink-home`）下。
2. **按 Plume 内部类名改外观或隐藏**（`.vp-navbar .content-body .search/.social-links/.appearance/...`、`.navbar-menu-link`、`.vp-navbar-title` 等），以及 `Layout.vue` 里用公开插槽 `#nav-bar-content-after` 注入 `NavActions.vue`。

## 推广到全站对升级的影响

| 手段 | 升级风险 | 说明 |
| --- | --- | --- |
| 在 `:root` / `[data-theme='dark']` 覆盖 `--vp-c-*` 变量 | 低 | Plume 官方支持的定制方式；rc.219 变量名未变（仅调整了 `--vp-c-bg-soft` 深色值、`--vp-c-text-3` 透明度、中文字体栈） |
| 公开插槽 `nav-bar-content-after` / `aside-outline-after` / `doc-title-after` | 低 | rc.219 中三个插槽均存在 |
| 按内部类名隐藏 / 改样式 | 中 | 类名不属于公开 API，可能随 RC 改名。逐一核对：本项目用到的 `.vp-navbar`、`.content-body`、`.navbar-menu-link`、`.vp-navbar-title`、`.social-links`、`.appearance`、`.translations`、`.vp-menu-badge`、`.screen-open`、`.vp-breadcrumb`、`.vp-doc-title`、`.vp-doc-meta`、`.content-container`、`.vp-doc-container`、`.posts-container`、`.vp-posts-nav`、`.vp-sidebar` 在 rc.219 中都还在 |
| 直接导入 `vuepress-theme-plume/features/PageContextMenu.vue` | 中 | rc.219 仍导出该文件 |

**结论**：只要坚持“改变量 + 公开插槽 + 少量类名选择器”、不复制 / 覆盖 Plume 组件文件（不用 `alias` 替换 `@theme/*`），换色后仍可正常升级。代价是每次升级后要做一次顶栏与页面的回归检查。

## rc.204 → rc.219 需要留意的变化

- 顶栏新增 `VPNavBarReader`（`.reader`，阅读偏好弹层）。仅在配置了 reader 选项时显示；本站未配置，默认不出现。若以后启用，首页顶栏的隐藏规则需要补上 `.reader`。
- `VPDocBreadcrumbs.vue` 改名为 `VPDocBreadcrumb.vue`，但输出类名 `.vp-breadcrumb` 未变。
- 中文字体栈从 `Inter4CJK` 改为 `Inter Core` + 系统中文字体；`--vp-c-text-3` 对比度提高。全站换色时应以升级后的效果为准。
- `VPDoc`、`VPLocalNav`、`Layout`、`VPPostsNav`、`content.css` 等有改动，升级后需回归文档页、版本列表页、手机菜单。
- 新增 `print.css`。
