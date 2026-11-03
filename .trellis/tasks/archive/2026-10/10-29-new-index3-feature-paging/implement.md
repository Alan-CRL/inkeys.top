# 实施计划

1. 新增 `featurePager.ts`：页步长常量、`pageFromProgress`（含滞回）、锚点偏移计算、`dockScale`、内容适配缩放计算。
2. 新增 `FeaturePager.vue`：模板（锚点 + 粘性视口 + 5 页 + 页码点）、SSR 纵向布局、样式（舞台占剩余空间、字号缩小、<768px 适配、深浅色）与内容适配缩放。
3. 接入滚动：RAF 合并的 scroll 处理 → `active`；切换动画方向；进入/离开焕新发布的自动对齐；吸附；用户输入打断程序滚动。
4. 页码点：鼠标放大 RAF、点击跳转、键盘可达、可见性随区间淡入淡出。
5. `FeatureSections.vue`：移除旧主功能渲染与相关样式，挂载 `<FeaturePager />`；其余区块不动。
6. 命令行回归 `verify-feature-pager.cjs`：页码映射/滞回、锚点、放大函数、SSR 渲染完整 5 页且无页码点激活、卸载清理。
7. 浏览器验证（preview 工具）：1920×1080、1366×768、1280×600、390×844（手机）；检查无裁切、切换/浮入动画、上下可逆、页码点悬停与点击、第 5 页后进入下载区；截图给用户。
8. `npm run docs:build`（或项目现有构建命令）通过；更新 `.trellis/spec/frontend/component-guidelines.md` 的 NewHome3 翻页合同。

回滚点：步骤 5 之前不影响现有页面；如翻页方案不满意，恢复 `FeatureSections.vue` 即可。
