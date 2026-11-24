# 设计：全站配色与顶栏统一

## 边界

- 只改 `docs/.vuepress/theme/` 下的样式与 `Layout.vue`；不碰 Plume 组件文件，不用 alias 替换 `@theme/*`。
- 首页（`.new-home3-page`）与 UInk 首页（`.uink-home`）的视觉结果保持不变。

## 令牌

- 新建全站令牌，挂在 `:root` / `[data-theme='dark']`，数值与 `home.css` 的 `--nh3-*` 一致（底、表面、表面悬停、正文 1-3、强调色、强调色上的文字、圆角、时长、缓动）。
- `NavActions.vue` 目前依赖只在首页存在的 `--nh3-*`，全站使用前必须让这些令牌在任何页面都可用：
  - 方案 A（推荐）：把 `--nh3-*` 中颜色 / 圆角 / 动效令牌从 `.new-home3-page` 上移到全局（`home.css` 里对应部分改为引用或删除），首页结果不变。
  - 方案 B：另起 `--site-*` 令牌，`--nh3-*` 与 `--uink-*` 都指向它。改动面更大，暂不采用。
- `uink.css` 中深色背景覆盖（`.uink-home` 的 `#0f0f0f`）在全站生效后成为冗余，可删除；`--uink-*` 组件令牌保留（组件嵌入别处仍需要）。

## Plume 变量映射（全局）

| Plume 变量 | 浅色 | 深色 |
| --- | --- | --- |
| `--vp-c-bg` / `--vp-c-bg-alt` | `#ffffff` | `#0f0f0f` |
| `--vp-c-bg-soft` / `--vp-c-bg-elv` | 表面 `#f5f5f5` | 表面 `#1b1b1b` |
| `--vp-c-text-1/2/3` | `#121212` / `#5c5c5c` / `#757575` | `#f2f2f2` / `#a6a6a6` / `#8a8a8a` |
| `--vp-c-brand-1` | `#006a63` | `#58ffec` |
| `--vp-c-brand-2/3/soft` | 由强调色派生（悬停 / 按下 / 低透明底），实现时校验对比度 | 同左 |
| `--vp-sidebar-bg-color` / `--vp-nav-bg-color` / `--vp-local-nav-bg-color` | 跟随 `--vp-c-bg` | 同左 |
| `--vp-c-divider` / `--vp-c-gutter` | 保留给正文内部；外框线用选择器单独去除 | 同左 |

`--vp-c-bg-alt` 与 `--vp-c-bg` 相等是“侧边栏与内容同色”的关键；Plume 里其他用 `bg-alt` 的地方（输入框、搜索结果焦点、友链卡片）实现时逐一检查，必要时把它们的专用变量改指向表面色。

深色强调色 `#58ffec` 很亮，作为按钮底时文字用 `--nh3-on-accent`（`#00201d`）；作为链接文字时注意不要过刺眼，必要时 `brand-1` 在正文链接上略降亮度（实现时截图对比后决定）。

## 去除外框分割线（选择器，rc.219 已核对存在）

- 顶栏底边：`.vp-navbar` 的 `border-bottom`，以及 `.vp-navbar .divider`（有侧边栏时顶栏下方的那条线）。
- 侧边栏右边 / 顶栏竖线：`.vp-sidebar`、`.content-body` 相关边线（实现时用浏览器检查实际来源）。
- 手机页内导航：`.vp-local-nav` 上下边。
- 页脚：`.vp-footer` 上边。

## 顶栏

- `Layout.vue` 的 `#nav-bar-content-after` 去掉 `pageLayout === 'NewHome3'` 条件，全站渲染 `NavActions`。
- `home.css` 中顶栏外观规则（品牌字号、链接颜色、半透明 + 模糊背景、收起 `.social-links/.appearance/.extra/.translations/.vp-menu-badge`、隐藏 `/download` 文字链接）提升为全站规则；**`.search` 的隐藏仍只限首页**。
- 顶栏宽度：首页保持 1360px 容器；有侧边栏的文档页沿用 Plume 的布局宽度，只换外观。
- 搜索按钮（`@vuepress-plume/plugin-search` 的 `.mini-search-button`）：表面色底、`--nh3-r-control` 圆角、无边框，高度与小号按钮一致（38px），悬停用表面悬停色；快捷键提示保留但弱化。搜索弹窗本身沿用 Plume，只随变量换色。

## 兼容与回滚

- 全部改动集中在 `custom.css`、`home.css`、`uink.css`、`Layout.vue`（可能新增一个全站样式文件），回滚即还原这几个文件。
- 升级 Plume 后若类名变化，失效的只是“去线 / 收起元素”这类外观规则，颜色变量仍生效，不会导致页面不可用。
