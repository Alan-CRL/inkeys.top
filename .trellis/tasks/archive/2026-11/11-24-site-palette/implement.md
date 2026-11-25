# 执行计划：全站配色与顶栏统一

前置：`11-24-plume-upgrade` 已完成并通过构建。

1. 令牌上移：`--nh3-*` 颜色 / 圆角 / 动效令牌改为全局可用；确认首页截图与改动前一致。
2. Plume 变量映射：在全局样式里覆盖 `--vp-c-bg*`、`--vp-c-text-*`、`--vp-c-brand-*`、侧边栏 / 顶栏 / 页内导航底色；删除 `custom.css` 里旧的蓝色品牌色。
3. 去除外框分割线：顶栏底边与 `.divider`、侧边栏边线、页内导航边线、页脚上边。
4. 顶栏：`Layout.vue` 全站渲染 `NavActions`；顶栏外观规则从首页限定改为全站，搜索隐藏仍只限首页。
5. 搜索按钮外观统一。
6. 清理 `uink.css` 中已冗余的深色背景覆盖。
7. 检查正文内组件在新底色上的可读性：提示块、代码块、表格、标签页、搜索弹窗、版本列表卡片、`DownloadCard`。

## 验证

- `pnpm docs:build`（不在 `pnpm start` 运行时执行）。
- 用 dist + Playwright 无头 Edge 截图（见记忆 `inkeys-website-headless-shots`）：首页、`/standard/`、`/standard/` 子页、`/download`、`/wiki/wiki`、`/version/`、`/community`，浅 / 深色 × 桌面 1440 / 手机 390。
- 首页截图与改动前对比无变化。

## 回滚点

- 每一步只改样式文件，出问题直接还原对应文件。
