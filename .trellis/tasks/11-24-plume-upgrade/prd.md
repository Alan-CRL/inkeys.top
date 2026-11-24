# 升级 Plume 与 VuePress

## Goal

把 `vuepress-theme-plume` 从 `1.0.0-rc.204` 升到 `1.0.0-rc.219`，作为全站换色的基准版本。

## Requirements

- 同步升级 peer 依赖：`vuepress`、`@vuepress/bundler-vite` → `2.0.0-rc.32`；`@vuepress/plugin-redirect` → 与 Plume 自带插件一致的 `2.0.0-rc.138`。
- 优先使用项目已有的 `pnpm vp-update`，不改动其他依赖版本。
- 不改业务代码；如因主题改动必须调整自定义样式，限于 `docs/.vuepress/theme/` 下的选择器。

## Acceptance Criteria

- [ ] `pnpm docs:build` 通过（不在 `pnpm start` 运行时执行）。
- [ ] 首页顶栏：右侧仍只有文字链接、下载按钮、深浅色按钮、更多菜单，没有多出新控件（rc.219 新增的 `.reader`）。
- [ ] UInk 首页、UInk 图示页、文档页（面包屑、大纲、`PageContextMenu`）、版本列表页、下载页在浅 / 深色下与升级前一致或仅有字体栈的预期差异。
- [ ] 手机宽度下汉堡菜单正常。

## Notes

- 变化清单与风险见父任务 `research/plume-upgrade-impact.md`。
