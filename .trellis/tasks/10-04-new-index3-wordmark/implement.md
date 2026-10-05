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


## 2026-10-05 实施顺序
1. 并行分工：组件/原生SVG及UI；playback调度/64组合测试；eraser几何/softPen合成及像素测试。各自独占文件、遵守共同eraseProgress/getEraserFrame接口。
2. 集成后strict TypeScript、既有CLI回归及新增轮播/擦除/布局键盘检查。只更新因批准行为改变而过时的断言。
3. trellis-check独立检查全范围，修复并复验；执行pnpm docs:build，检查编码/换行/diff及外部草稿未变。记录真实验证结果及视觉未GUI验收限制。不commit/push。

最新验收追加：检查斜向弧线走向及每次挥动变速，不能水平逐行扫描。用户已授权完成后一次常规签名commit，只暂存本任务产品/验证/规范记录，不包含原有未跟踪草稿；不push。

斜向手势验收以可见内容为准：各笔型/粗细（含激光光晕）最终 alpha=0；艺术字使用中央90%宽×88%高的保守字形包围区域验证，外侧原本透明的虚拟平面不要求额外清扫。旧横向版本的不透明整屏矩形测试过于宽泛，不能为通过该合成测试添加违背用户示意图的周边补擦动作。几何内部480Hz采样，120Hz成组显示，保证弧线细密且光标与擦除端点一致。

## 上凸/节奏实施顺序
1. 已完成旧版正常签名commit f4eb05b，后续改动作为独立未提交增量。
2. 几何worker独占eraser.ts/verify-eraser，调度worker独占playback.ts/NewHome3.vue/对应playback+lifecycle+toolbar测试，约定ERASE_SECONDS及eraseOpacity接口。
3. 先看轨迹离屏图确认上拱且连接平滑，再完成方向/曲率/速度、透明度单调/字形及光晕清空、视口全光标边界检查。独立trellis-check后顺序pnpm docs:build，避免并行像素验证引起内存不足。检查diff/编码，不开GUI，不push，本次新增修改不再commit。
