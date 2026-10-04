# Implementation

1. 保存原三文件快照及编码换行。其他未提交内容不动。
2. trellis-implement 子代理负责三文件直接实施，不再派实现或检查代理，遵循PRD/design。
3. 主会话探测pnpm环境，并提供任务目录下命令行纯逻辑回归验证，不增加测试框架。
4. 验证单调时间、笔顺、数值/压感/点数、阶段边界、时钟暂停与响应式边界。
5. trellis-check子代理集中复核、自修局部问题，避免并行写相同文件。
6. pnpm docs:build，检查退出码、第一有效错误；环境问题不得修改配置/升级依赖绕过。
7. 检查diff和编码换行，记录结果及视觉限制。用户禁止commit/push，不调用隐式自动提交的归档/日志命令，直接记录本任务进展。

## Approval
用户在2026-10-04完整批准本轮计划实施，无需再次询问许可。

## 用户本轮修订
用户看到首版后要求彩虹不受模型/灰色输入约束。直接按平滑贝塞尔曲线绘制；灰点仅示意。移除物理模拟及其因果测试，继续验证笔顺、压感、循环、离屏绘制、响应式和构建。该修订是明确实施指令，无需重复询问。

用户进一步要求：取消固定四笔，优先全词字体协调；y/s 拆开，灰色示意也允许断开。不得保留为实现旧四笔约束的牵强连接。

## Approved multi-pen implementation sequence
1. Keep glyphs/routes/native app and unrelated uncommitted work intact. Renderer worker owns softPen.ts/styles.ts and material regression tests; UI worker owns NewHome3.vue/playback.ts and scheduler/lifecycle tests.
2. Agree local RenderStyle contract before edits. Native Draw3 research supplies highlighter sweep/MAX alpha and laser coverage/material formulas; do not add runtime dependencies.
3. Main coordinates artifacts and existing render regressions (30 material/theme/size cache and bounds cases). Verify scheduler all32pen sets, settings boundary, pause/default overrides, no-selection art and random color stability.
4. After both workers stabilize, dedicated trellis-check reviews interaction/render boundaries; self-fix local defects. Main runs strict TypeScript, nativeCanvas/lifecycle/scheduler tests, SSR build and output inspection without GUI.
5. Record test/build evidence and limitations. No commit/push or implicit auto-commit/archive this feature iteration.
