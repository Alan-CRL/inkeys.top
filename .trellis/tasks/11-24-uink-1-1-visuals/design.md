# UInk 规范文档可视化设计（v1）

> 状态：待用户审阅（2026-11-24）。决策 V1–V3 见 `prd.md`。

## 1. 文件与注册

```text
docs/.vuepress/theme/components/UInk/
├── uink.css                 # 已有：配色令牌（主页共用）
├── geometry.ts              # 新增：按规范公式计算几何
├── UInkFigure.vue           # 新增：图示外框（边框、标题、说明、控件区）
└── diagrams/
    ├── UInkFileStream.vue
    ├── UInkInkPoints.vue
    └── ……                   # 每张图一个组件，名称 UInk + PascalCase(占位 id)
```

- `client.ts` 用 `import.meta.glob('./theme/components/UInk/diagrams/*.vue', { eager: true })` 一次性注册全部图示组件（只追加一段，不逐个手写）。
- 嵌入方式：在 `<!-- visual: id — 意图 -->` 注释的**下一行**写组件标签，例如 `<UInkNibShapes />`。注释保留，单文件插件照常输出“图示：…”，组件行被删除。
- 所有组件无需参数，内容固定；交互组件的默认状态在服务端渲染。

## 2. 共享几何模块 `geometry.ts`

| 函数 | 对应规则 | 用途 |
| --- | --- | --- |
| `absolutePoints(points)` | INK-4 | 首点绝对、其余相对 → 绝对坐标 |
| `nibSize(width, nib)` | NIB-1、笔尖尺寸 | 圆形：直径 = w；矩形：H = w，W = aspect × H（D20） |
| `sweepPath(points, nib, cap)` | NIB-2、NIB-3 | 笔尖沿折线扫过的轮廓（圆形用胶囊并集，矩形用凸包扫掠） |
| `dashSegments(length, dashArray, dashOffset)` | SHAPE-7、NIB-5 | 虚线分段，含零长度点 |
| `strokeOutline(path, width, cap, join)` | NIB-4 | 描边端帽与拐角示意 |
| `viewportMap(pt, vp)` / `viewportInverse` | CANVAS-16–CANVAS-18 | Canvas ↔ Device 坐标 |
| `fitRect(src, box, fit, crop)` | MEDIA-1、MEDIA-3 | Fill / Contain / Cover / None 与裁剪 |
| `solidParts(preset, construction)` | PRESET-14–PRESET-19 | 斜二测投影、隐藏边、部件顺序 |
| `planarPreset(preset, construction)` | PRESET-9–PRESET-13 | 平面预设派生顶点 |
| `closedDashPhase(perimeter, d, w, dotted)` | PRESET-21 | 闭合虚线相位 |

- 纯函数、无 DOM 依赖，可在 Node 中直接运行，供几何自检脚本使用。
- 只实现图示需要的部分；不追求成为完整的 UInk 渲染器。

## 3. 外框 `UInkFigure`

- `<figure>` + `<figcaption>`：标题一行（图示名称），说明一行（取自占位意图，润色为读者语言）。
- 内容区固定比例的 `viewBox`，宽度随文档栏（约 680–780px）伸缩；手机宽度下按需改为纵向布局。
- 控件区（交互组件才有）：滑块、分段按钮、步骤按钮，统一样式；带可见焦点。
- 颜色：线稿用 `--uink-text2` / `--uink-line`，墨迹用主页的四种墨迹色，强调用 `--uink-accent`。

## 4. 两批清单

### 第一批（13 处占位）

| 占位 | 页面 | 组件 | 类型 |
| --- | --- | --- | --- |
| `file-stream` + `overview` | file/main、intro | `UInkFileStream` | 静态 |
| `ink-points` | blocks/ink | `UInkInkPoints` | 静态 |
| `nib-shapes` | common/nib | `UInkNibShapes` | 静态 |
| `nib-size`（原 `nib-width-meaning`，D20 后改） | common/nib | `UInkNibSize` | 静态 |
| `caps-joins` | common/nib | `UInkCapsJoins` | 静态 |
| `shape-geometry` | blocks/shape | `UInkShapeGeometry` | 静态 |
| `shape-stroke` | blocks/shape | `UInkShapeStroke` | 静态 |
| `viewport-mapping` | blocks/canvas | `UInkViewportMapping` | 交互：拖动、缩放取景框，实时显示 x / y / scale 与换算结果 |
| `clear-intervals` | blocks/clear | `UInkClearIntervals` | 交互：逐步撤回 / 重做，内容流与画面同步 |
| `page-append` | incremental | `UInkPageAppend` | 交互：步骤演示（写入 P1–P3 → 追加 P2′ → 读取结果 → 整理） |
| `levels-stack` | levels | `UInkLevelsStack` | 静态 |
| `fallback-ladder` | compatibility | 复用 `UInkTierDemo` | 交互（已有） |

### 第二批（15 处占位）

| 占位 | 页面 | 组件 | 类型 |
| --- | --- | --- | --- |
| `ink-highlighter-composite` | blocks/ink | `UInkHighlighterComposite` | 静态 |
| `ink-erase-order` | blocks/ink | `UInkEraseOrder` | 静态 |
| `ink-render-latest` | blocks/ink | `UInkRenderLatest` | 交互：步骤演示（原稿 → 修正结果 → 撤回结果） |
| `export-bake-eraser` | compatibility | `UInkExportBakeEraser` | 静态 |
| `shape-object` | blocks/shape | `UInkShapeObject` | 交互：悬停 / 聚焦任一部件高亮整个对象，旁边显示该部件的 `object` 字段 |
| `preset-planar` | appendix | `UInkPresetPlanar` | 静态 |
| `preset-solids` | appendix | `UInkPresetSolids` | 交互：切换预设，滑块调 `baseRotation`，开关 `mirrored`，隐藏边实时变虚线 |
| `media-fit` | blocks/media | `UInkMediaFit` | 交互：Fill / Contain / Cover / None + crop 开关 |
| `background-patterns` | blocks/canvas | `UInkBackgroundPatterns` | 静态 |
| `device-tree` | blocks/device | `UInkDeviceTree` | 静态 |
| `registry-trees` | file/main | `UInkRegistryTrees` | 静态 |
| `header-bytes` | blocks/header | `UInkHeaderBytes` | 静态 |
| `extra-commit` | file/extra | `UInkExtraCommit` | 静态 |
| `save-modes` | incremental | `UInkSaveModes` | 静态 |
| `color-fallback` | common/color | `UInkColorFallback` | 静态（网页无法可靠显示 HDR，用色块加数值说明） |

### 追加（用户 2026-11-24 要求）

| 占位 | 页面 | 组件 | 类型 |
| --- | --- | --- | --- |
| `nib-orientation`（D22） | common/nib | `UInkNibOrientation` | 静态：同一折线 Fixed 与 FollowDirection 对比，拐点画出平分方向 |
| `shape-curves` | blocks/shape | `UInkShapeCurves` | 交互：滑块改变双曲线每支的采样点数，显示折线与真实曲线的最大偏差；配套正文「曲线与自由图形」（SHAPE-24、SHAPE-25）与公开样例 `core-shape-curves.uink` |

## 5. 动效与无障碍

- 不使用滚动驱动的动画。步骤演示由按钮推进，可选“自动播放”（进入视口才开始，可暂停，离开视口暂停）。
- `prefers-reduced-motion`：取消过渡，步骤切换直接跳到目标状态。
- 每张图提供 `aria-label` 或可见的文字说明；交互状态变化用 `aria-live="polite"` 播报关键数值。
- 浏览器 API 只在 `onMounted` 中使用，卸载时清理监听与定时器。

## 6. 验证

- `pnpm docs:build` 通过，无新增警告；单文件规范中无组件标签、图示文字完整。
- 几何自检脚本 `scripts/uink-visuals/check-geometry.mjs`（或任务目录内）：
  - 用 `solidParts` 计算 `full-shape-preset` 样例中长方体的部件，与样例里的部件逐点比较（容差 0.01）。
  - 用 `nibSize` 计算 `inkeys-erase-clear` 中的矩形与方形橡皮尺寸（D20 后为 26.7 × 40、40 × 40），与样例描述一致。
  - viewport 正反换算往返误差 < 1e-6。
- 无窗口截图：每张图浅色、深色各一张，手机宽度抽查；交互组件截默认状态与一个改变后的状态。
