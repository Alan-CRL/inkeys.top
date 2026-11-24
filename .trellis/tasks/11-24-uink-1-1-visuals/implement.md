# UInk 规范文档可视化实施计划

> 前置：`design.md` 经用户确认，执行前 `task.py start`。不修改规范正文的文字；不改动主页组件（`UInkTierDemo` 只复用）。UTF-8、LF；单引号、无分号、两空格缩进；关键逻辑写中文注释。

## 第一批

1. 新建 `geometry.ts`（第一批需要的函数：`absolutePoints`、`nibSize`、`sweepPath`、`dashSegments`、`strokeOutline`、`viewportMap` / `viewportInverse`）与 `UInkFigure.vue`。
2. 在 `client.ts` 追加 `import.meta.glob` 注册段。
3. 依次完成第一批 12 个组件（`fallback-ladder` 直接嵌入 `UInkTierDemo`），并在对应页面的占位注释下一行插入组件标签。
4. 几何自检（第一批部分）：橡皮尺寸、viewport 往返。
5. 构建与截图验收。
6. **审阅关口**：把第一批截图交给用户审阅风格；确认后再继续。回滚点：第一批全部是新增组件和组件标签行，可以整体撤回。

## 第二批

7. 补齐 `geometry.ts`：`fitRect`、`solidParts`、`planarPreset`、`closedDashPhase`。
8. 完成第二批 15 个组件并嵌入页面。
9. 几何自检（全部）：长方体部件与 `full-shape-preset` 样例一致。
10. 构建与截图验收，交用户审阅。

## 验证命令

```bash
pnpm docs:build
node <几何自检脚本>
node .trellis/tasks/11-24-uink-1-1-visuals/shots/verify-visuals.cjs   # 无窗口截图，参考主页任务的 verify-uink-home.cjs
```
