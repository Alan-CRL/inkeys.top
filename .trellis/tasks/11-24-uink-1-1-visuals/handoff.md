# 交接：笔尖宽高约定（D20）+ 图示第二批

> 写于 2026-11-24。接手的 Agent 从这里开始；任务目录 `.trellis/tasks/11-24-uink-1-1-visuals/`（状态 in_progress）。
> 先读：`prd.md` → `design.md` → `implement.md` → 本文件。规范约定见 `.trellis/spec/frontend/uink-spec-guidelines.md`。

## 0. 当前状态

- **第一批图示已完成，用户审阅风格通过**（13 处占位，组件在 `docs/.vuepress/theme/components/UInk/diagrams/`，外框 `UInkFigure.vue`，几何 `geometry.ts`，`client.ts` 用 `import.meta.glob` 注册）。
- 审阅后按用户意见改过一次滑块样式：`UInkFigure.vue` 的 `.uf-range`（正文色已选部分 + 浅灰轨道 + 白底黑边圆点）。Chromium 的已选部分靠组件给 `input` 传 `--uf-fill` 百分比（见 `UInkViewportMapping.vue` 的 `fill()`），**第二批的滑块照此传值**。
- **全部未提交**。提交须用户在当次明确授权（见 §4）。
- 用户的预览服务器 `pnpm start` 正在 `http://localhost:8080/` 运行（用户自己的终端）。**不要运行 `pnpm docs:build`**：它带 `--clean-cache --clean-temp`，会删掉 `.cache` 让预览崩溃。构建一律用 `npx vuepress build docs`。
- 验收工具：`shots/verify-visuals.cjs`（无窗口 Playwright + headless Edge，服务 `docs/.vuepress/dist`），`check-geometry.mjs`（几何自检）。用户不允许打开可见窗口。

## 1. 先做：笔尖宽高约定（决策 D20，用户 2026-11-24 定）

### 决定

**去掉 `widthMeaning`，不做换算。**

- 圆形笔尖：`width` 是直径。
- 矩形笔尖：`width` 就是笔尖高度：`H = w`，`W = aspect × H`。荧光笔、矩形橡皮、方形橡皮全部如此。
- Inkeys 软件内部仍按自己的等面积换算决定橡皮大小；**写入文件时**换算成高度：`H = (s / 2) × √(π / a)`（`s` 为软件内部的橡皮尺寸），文件里只出现直观的宽高。这一句写在 nib.md 的「Inkeys 的取值」里作为写入说明，不是读取规则。
- 文档里的矩形笔尖示例统一取 `width = 24`：1:8 → 3 × 24，2:3 → 16 × 24，1:1 → 24 × 24。
- 图示统一用用户认可的“矩形 2:3 / `H = w，W = a × H` / `W × H = …`”那种标注方式（原 `UInkNibWidthMeaning` 中间那一栏的样子）。

1.1 仍是 Beta、样例尚未被任何实现验证，所以直接删字段，不保留兼容。

### 要改的地方

规范正文（这一项是用户特批的正文修改，不受本任务“不改正文”的限制）：

- `docs/standard/common/nib.md`
  - Nib Map 删除 `widthMeaning` 行；`aspect` 说明保持“宽 ÷ 高”。
  - 「笔尖尺寸」改成两行说明：圆形直径 = `w`；矩形 `H = w`，`W = aspect × H`。删掉三列对照表。
  - 占位注释 `nib-width-meaning` 改为 `nib-size — 圆形、1:8、2:3、1:1 四种笔尖在 width = 24 时的宽高标注`，下一行换成新组件（见下）。
  - NIB-7 的枚举列表去掉 `widthMeaning`。规则编号不变（NIB-1–NIB-7）。
  - 「Inkeys 的取值」表去掉 `widthMeaning` 列；表下补一句橡皮写入时的换算（上面的公式），说明这是 Inkeys 自己的尺寸习惯，文件中只存高度。
- `docs/standard/blocks/ink.md`
  - INK-5 改为：`width` 必须大于 `0`；圆形笔尖（包括没有 `nib`）是直径，矩形笔尖是笔尖高度（链到 nib 页）。
  - 荧光笔示例删 `widthMeaning`；矩形橡皮示例删 `widthMeaning`，`width` 改为 `24.0`，注释改为“width 是笔尖高度”。
- 全站再搜一遍 `widthMeaning`、`EqualArea`、`等面积`，确认 `docs/standard/**` 无残留（`compatibility.md`、`levels.md`、`quick-start.md` 目前的写法不受影响，但要复核）。

样例（`docs/.vuepress/public/standard/uink-v11/`，由脚本生成，不要手改产物）：

- `scripts/uink-fixtures/build.mjs`：`NIB` 的 map 删 `widthMeaning`。
- `cases/03-basic-appearance.json`、`cases/08-full-hdr-advanced.json`：删 `widthMeaning`。
- `cases/10-inkeys-erase-clear.json`：删 `widthMeaning`；`width` 保持 `40`，含义变为高度（2:3 → 26.67 × 40，1:1 → 40 × 40）；同步改 `description` 里的“EqualAreaDiameter”字样。
- `cases/12-fallback-unknown.json`：删 `widthMeaning: 9` 及期望列表里对应的那一条（推荐），并同步 `description`；其余未知值测试保留。
- 运行 `pnpm fixtures:uink` 重新生成 `.uink`、`fixtures.json`、`SHA256SUMS.txt`，`git diff` 确认只有预期变化。提醒用户：公开目录变了，123pan 上的副本需要重新上传。

图示与几何：

- `geometry.ts`：`Nib` 去掉 `widthMeaning`；`nibSize` 矩形一律 `H = width`，`W = aspect × H`；注释同步。
- `UInkNibShapes.vue`：`fields` 去掉 `'Height'`、`'EqualAreaDiameter'`；`WIDTH = 24` 不变，尺寸会自动变成 3 × 24、16 × 24、24 × 24。
- `UInkNibWidthMeaning.vue` → 重写并改名 `UInkNibSize.vue`，标题“笔尖尺寸”：四栏（圆形、1:8 荧光笔、2:3 矩形橡皮、1:1 方形橡皮），`w = 24`，每栏画笔尖与 W / H 标注线，下方 `H = w，W = a × H` 与 `W × H = …`（圆形栏写 `直径 = w`）。延续现有那一栏的视觉。删除旧文件。
- `check-geometry.mjs`：期望改为 2:3 `w=40` → 26.67 × 40、1:1 `w=40` → 40 × 40、1:8 `w=24` → 3 × 24；扫掠用例删 `widthMeaning`。
- `shots/verify-visuals.cjs`：`UInkNibWidthMeaning` 条目换成 `UInkNibSize`（标题“笔尖尺寸”）。

任务文档：

- 本任务 `design.md` §2 `nibSize` 行、§4 第一批 `nib-width-meaning` 行、§6 的橡皮期望值；`prd.md` Requirements 里“笔尖等面积换算”改为“笔尖宽高”。
- 父任务 `.trellis/tasks/11-24-uink-1-1-spec/design.md` 第 108–110 行是历史设计，不改原文，在其后加一行“已被 D20 取代”。D20 已写入父任务 `prd.md`。

不在本仓库内做：Inkeys 适配（`D:\Project\Inkeys\Repo\Inkeys`）需要在写文件时做橡皮换算、读文件时不再认 `widthMeaning`。**只在完成报告里提醒用户，不要改那个仓库。**

### 验收

```bash
pnpm fixtures:uink
node .trellis/tasks/11-24-uink-1-1-visuals/check-geometry.mjs
npx vuepress build docs
node .trellis/tasks/11-24-uink-1-1-visuals/shots/verify-visuals.cjs
```

另外打开构建出的 `dist/standard/uink-v11/spec.md`（单文件规范）确认没有 `widthMeaning`，`nib-size` 的“图示：…”文字在。

## 2. 然后做：图示第二批（`implement.md` 第 7–10 步）

清单与类型见 `design.md` §4「第二批」（15 处占位，3 个交互）。占位注释已经在各页面里，按第一批的方式在注释下一行插入组件标签，注释保留。

要点：

- 复用 `UInkFigure`（标题 + 一句说明 + 控件插槽）与 `.uf-*` 共用类（`uf-art`、`uf-text`、`uf-mono`、`uf-fill-*`、`uf-stroke-*`、`uf-fill-eraser`、`uf-panel`、`uf-code`、`uf-btn`、`uf-range`、`uf-readout`），看第一批组件的写法再动手，不要另起一套样式。
- 颜色只用 `uink.css` 里的令牌；线稿灰、只有墨迹是彩色；深浅色自动适配。
- 交互：`preset-solids`（切换预设、`baseRotation` 滑块、`mirrored` 开关，隐藏边实时变虚线）、`media-fit`（Fill / Contain / Cover / None + crop 开关）、`shape-object`（悬停 / 聚焦部件高亮整个对象），以及步骤演示 `ink-render-latest`。滑块用原生 `input[type=range]` 并传 `--uf-fill`；按钮键盘可用；状态变化用 `aria-live="polite"` 读数；服务端渲染默认状态。
- 不用滚动驱动动画；`prefers-reduced-motion` 时无过渡。手机宽度（390px）文字不小于 12px，不横向溢出。
- `geometry.ts` 补 `fitRect`、`solidParts`、`planarPreset`、`closedDashPhase`，纯函数，按 `docs/standard/appendix/shape-presets.md` 与 `blocks/media.md` 的公式。斜二测 `k = 1 / (2√2)`。
- `check-geometry.mjs` 增加：`solidParts` 算出的长方体部件与样例 `full-shape-preset` 逐点一致（容差 0.01）。
- `verify-visuals.cjs` 加上第二批 15 个组件；交互组件各截一张默认状态和一张改变后的状态；`MOBILE_SHOTS` 加入新的交互组件。
- 顺带一项（已向用户提过）：主页分级演示 `UInkTierDemo.vue` 里 “PDF” 占位文字在手机上约 7.8px，调到不小于 12px。这是唯一允许碰的主页组件改动，改完把 `verify-visuals.cjs` 中对 `UInkTierDemo` 的字号豁免去掉。
- 发现规范本身的问题只报告、不改正文。已知未决：`dashOffset` 方向、FollowDirection 在拐点处的方向、矩形笔尖配 Square 端帽的延伸方式、Miter 截断。

验收命令同 §1。完成后把截图（`shots/`）交给用户审阅，这是第二个审阅关口。

## 3. 约束（沿用全任务）

- 与用户交流用简体中文。最小改动；UTF-8、LF；单引号、无分号、两空格缩进；关键逻辑写中文注释。
- 不新增 npm 依赖；不打开任何可见窗口（截图只用无窗口脚本）。
- 不要用 `pnpm docs:build`（见 §0）。
- 可以分派 `trellis-implement` / `trellis-check` 子 Agent，派发提示第一行写 `Active task: .trellis/tasks/11-24-uink-1-1-visuals`，并把“用 `npx vuepress build docs`”写进提示。

## 4. 提交（只有用户授权后）

- 建议分三次：①第一批图示（含滑块样式）；②D20 笔尖宽高约定（正文 + 样例 + 图示 + 几何）；③第二批图示。任务文档改动可以随各自提交或单独一个 `chore(trellis)`。
- 提交信息沿用仓库风格（`feat(uink): …`、`fix(uink): …`、`chore(trellis): …`），**不得**加任何 AI 署名或 `Co-Authored-By`。
- **不要带上与本任务无关的改动**：已暂存的 `11-24-cdn-asset-fallback` 归档重命名、`.trellis/.template-hashes.json`、`design-drafts/`、`media/**` 都不是本任务的。提交前用 `git diff --cached --stat` 核对。
- 签名失败就停下报告，不得关闭签名。不 push。
