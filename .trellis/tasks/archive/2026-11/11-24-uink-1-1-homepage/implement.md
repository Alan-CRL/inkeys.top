# UInk 主页实施计划

> 前置：`design.md` v2 经用户确认；执行前运行 `task.py start`。不修改 `NewHome3`，不改动工作区里与本任务无关的未提交文件（`docs/index.md`、`Layout.vue`、`client.ts` 中已有的修改要保留）。

## 步骤

1. **入口与路由**
   - 新建 `docs/standard/README.md`（`aside: false`），按 design §2 写 ③ ④ ⑤ 的 Markdown 正文，① ② 处放组件标签。
   - `plume.config.ts` 中 `/standard/` 侧边栏顶部加“概览”。
   - `navbar.ts` 加“UInk 规范” → `/standard/`。
   - 回滚点：以上三处可以单独撤回，不影响其他页面。
2. **`UInkHero.vue`**：标题、说明、两个按钮、文件展开 SVG 动画；IntersectionObserver 控制播放，带暂停按钮；支持 reduced-motion；SSR 安全（只在 `onMounted` 中访问浏览器 API，卸载时断开 observer、清除定时器）。
3. **`UInkTierDemo.vue`**：分段按钮（radiogroup、键盘切换）+ 一幅 SVG 板书；每个元素按等级显示或变化；每级一句说明。
4. **③ 拆解图**：静态 SVG（与 visuals 子任务风格一致；已有组件就复用）。
5. **注册**：在 `client.ts` 注册两个组件（只追加注册行，保留文件里已有的未提交修改）。
6. **链接检查**：确认“分级与认证”“公开样例”“单文件规范”页面已由 spec-text 子任务创建；未创建前不发布。

## 验证

- `pnpm docs:build` 通过，无新增警告。
- 无 GUI 截图：用 Playwright 驱动 headless Edge，访问构建产物里的 `/standard/`，截取桌面 1440 宽、移动 390 宽，浅色与深色各一张；再截一张 reduced-motion 下的首屏。
- 检查：左侧导航和顶栏入口正常；分级切换的五个状态画面正确；动画离开视口时暂停；`git diff` 中没有意外改动（编码与换行保持不变）。

## 审阅关口

- 步骤 2、3 完成后，先给用户看截图，确认后再写 ③–⑤。
