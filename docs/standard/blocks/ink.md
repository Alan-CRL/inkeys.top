---
title: Ink 块
---

- Type ID：`3`
- 类型：Map

**Ink 表示一条完整的笔迹**：从落笔到抬笔的一串点，每个点带一个宽度。普通笔、荧光笔和橡皮都用 Ink 表示，用 `inkType` 区分。

::: tip 等级
- **核心级**：Pen 的点坐标、每点宽度、`fallback` 颜色；可以忽略透明度，端头一律画成圆头。
- **基础级**：块级 `opacity`、Highlighter、笔尖描述 `nib`、端帽 `cap`。
- **完整级**：Advanced Highlighter 的点级样式、`texture`、`renderOnlyWhenLatest`。
- **Inkeys 附加级**：Erase Ink 与橡皮笔尖形状。
:::

## 什么时候用

- 用户用笔、荧光笔写下的每一笔。
- Inkeys 附加级的橡皮擦过的轨迹（Erase Ink）。
- 直线、矩形等可编辑图形用 [Shape](shape)，不用 Ink。

## 字段

“等级”列表示读取器从哪一级开始必须理解该字段。标为 Required 的字段，无论写入器声明哪个等级都必须写入。

| 字段 | 类型 | 要求 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `type` | uint16 | Required | 核心 | 固定为 `3` |
| `contentId` | uint32 | Required | 核心 | Canvas 内的内容序号，见 INK-2 |
| `undoId` | uint32 | Required | 标准 | 撤回组编号，见 INK-3 |
| `inkType` | int32 | Required | 核心 | 笔的种类，见下表 |
| `color` | [Color Map](../common/color) | Required | 核心 | 块级颜色；核心级只用 `fallback` |
| `opacity` | float32 | Required | 基础 | 块级透明度，`0`–`1` |
| `texture` | int32 | Required | 完整 | 纹理编号：`0` 为默认，`1`–`127` 保留，`128`+ 私有 |
| `points` | `Array<Map>` | Required | 核心 | 至少一个点，见[轨迹点](#轨迹点) |
| `nib` | Map | Optional | 基础 | 笔尖描述，见[笔尖与端帽](../common/nib) |
| `cap` | int32 | Optional | 基础 | 端帽；缺省时圆形笔尖为 Round、矩形笔尖为 Butt，见[笔尖与端帽](../common/nib) |
| `renderOnlyWhenLatest` | bool | Optional | 完整 | 缺省为 `false`，见 INK-15 |
| `extra` | Map | Optional | — | 软件私有字段 |

### `inkType`

| 值 | 名称 | 等级 | 含义 |
| --- | --- | --- | --- |
| `0` | Erase | Inkeys | 擦除轨迹 |
| `1` | Pen | 核心 | 普通笔 |
| `2` | Highlighter | 基础 | 荧光笔 |
| `3` | Advanced Highlighter | 完整 | 点上可以带颜色与透明度锚点的荧光笔 |
| `4`–`127` | 保留 | — | 留给后续版本 |
| `128`+ | 私有 | — | 软件自定义 |

### 轨迹点

| 字段 | 类型 | 要求 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `x` | float32 | Required | 核心 | 首点为绝对坐标，之后为相对前一点的位移 |
| `y` | float32 | Required | 核心 | 同上 |
| `width` | float32 | Required | 核心 | 该点的笔迹宽度，必须大于 `0` |
| `color` | Color Map | Conditional | 完整 | Advanced Highlighter 的点级颜色，与 `opacity` 成对出现 |
| `opacity` | float32 | Conditional | 完整 | Advanced Highlighter 的点级透明度，与 `color` 成对出现 |

<!-- visual: ink-points — 一条笔迹的点：首点绝对坐标、后续点的相对位移箭头、每点宽度画成圆 -->
<UInkInkPoints />

## 规则

### 编号与撤回

- **INK-1** Ink 的 `type` 固定为 `3`。笔的种类只由 `inkType` 决定。
- **INK-2** `contentId` 在同一个 Canvas 内由 Ink、Shape、Media、Clear 共用：按对象流顺序从 `0` 开始连续递增。它只在当前文件版本内有效，完整保存后会重新编号，不能当作稳定的对象身份。
- **INK-3** `undoId` 从 `0` 开始，只增不减。对象流中 `undoId` 相同且连续的内容块是一个撤回组，一次撤回会把它们一起撤销。

### 几何

- **INK-4** `points` 至少有一个点。首点是 Canvas 绝对坐标，之后每个点保存相对前一点的位移。读取器应使用 float64 累加位移，避免长笔迹累积误差。
- **INK-5** `width` 必须大于 `0`。圆形笔尖（包括没有 `nib`）时，`width` 是该点处笔迹的直径；矩形笔尖时，`width` 是笔尖高度，见[笔尖尺寸](../common/nib#笔尖尺寸)。
- **INK-6** 坐标与宽度的单位是 Device 像素。缩放由 Canvas 的 `viewport.scale` 表达，渲染时宽度随之缩放。
- **INK-7** 读取器必须保持点的顺序、位置与宽度含义。点与点之间的曲线插值、轮廓生成与抗锯齿由软件决定；单点 Ink 按同样的笔尖画成一个点。
- **INK-8** 读取器必须忽略不认识的点键。1.1 不注册压感、倾斜、时间等输入通道；笔锋效果应直接体现在每点的 `width` 中。

### 绘制

- **INK-9** Pen 使用块级 `color` 与 `opacity` 绘制。核心级读取器可以忽略 `opacity`，按不透明绘制。
- **INK-10** Highlighter 必须先生成整条笔迹的完整覆盖区域，再把它作为一个整体以 alpha source-over 合成到画布上；不得逐段合成，以免重叠处颜色变深。
- **INK-11** Erase 属于 Inkeys 附加级。**未实现 Inkeys 附加级的读取器必须跳过 `inkType = 0` 的 Ink，不得把它当作普通笔画出来。** 实现该级的读取器按对象流顺序，把 Erase 作用于同一 Canvas 中在它之前的 Ink 与 Shape；Erase 不作用于 Media。擦除的具体效果（裁剪、透明）由软件决定。
- **INK-12** Advanced Highlighter 的点级 `color` 与 `opacity` 必须成对出现，构成样式锚点。第一个锚点之前沿用第一个锚点的样式，最后一个锚点之后沿用最后一个锚点的样式，锚点之间平滑过渡（插值方法由软件决定）。没有任何锚点时使用块级样式。合成方式同 INK-10。
- **INK-13** 读取器遇到不认识或不支持的 `inkType`（`0` 除外）时，必须保留几何，按 Pen 绘制。
- **INK-14** 读取器遇到不认识的 `texture` 时，必须按 `0` 绘制，不得丢弃整条 Ink。

<!-- visual: ink-highlighter-composite — 荧光笔整条合成与逐段合成的对比：后者在折返处出现深色重叠 -->
<UInkHighlighterComposite />
<!-- visual: ink-erase-order — Erase 只擦掉对象流中在它之前的笔迹，之后写的笔迹不受影响 -->
<UInkEraseOrder />

### 末尾最新组（完整级）

- **INK-15** `renderOnlyWhenLatest` 用于“形状修正”：先保存原始笔迹并标记为 `true`，再保存修正后的图形；修正结果存在时原稿隐藏，撤回修正结果后原稿重新显示。完整级读取器对每个 Canvas 执行：
  1. 从最后一个内容块开始向前扫描。
  2. 遇到 Media 直接越过。
  3. 遇到 Clear 停止。
  4. 遇到标记为 `true` 的 Ink 或 Shape，把它加入末尾最新组，继续向前。
  5. 遇到第一个未标记的 Ink 或 Shape 停止。
  6. 末尾最新组和所有未标记的内容正常显示；其余标记为 `true` 的内容隐藏。

  这条规则只影响显示，不改变 `undoId`；隐藏的原稿仍是有效内容，完整保存时必须保留。低等级读取器忽略该字段。

<!-- visual: ink-render-latest — 原稿（标记）+ 修正结果（未标记）的显示；撤回结果后原稿重新出现 -->
<UInkRenderLatest />

### 保存

- **INK-16** 会切断已有笔迹的普通板擦，必须把擦除结果写成剩余的完整片段，并执行完整保存；同一次擦除产生的片段可以共享一个 `undoId`。不得通过追加让旧笔迹和新片段同时存在。
- **INK-17** Erase Ink 是一条新的完整 Ink，可以直接追加到文件末尾。

### 容错

- **INK-18** 有限但越界的 `opacity` 钳制到 `0`–`1`；NaN 与 Infinity 使该字段无效。
- **INK-19** 没有点、点结构损坏或缺少必填字段的 Ink，读取器跳过它，报告警告，继续读取后续内容。

## 示例

以下均为 MessagePack Map 的可读伪 JSON。

::: tabs

@tab 普通笔（核心级）

```jsonc
{
  "type": 3,
  "contentId": 0,
  "undoId": 0,
  "inkType": 1,
  "color": { "fallback": 255 },        // 0x0000FF，蓝色
  "opacity": 1.0,
  "texture": 0,
  "points": [
    { "x": 120.0, "y": 240.0, "width": 6.0 },  // 首点：绝对坐标
    { "x": 4.5, "y": 1.0, "width": 6.2 }       // 相对前一点的位移
  ]
}
```

@tab 荧光笔（基础级）

```jsonc
{
  "type": 3,
  "contentId": 1,
  "undoId": 1,
  "inkType": 2,
  "color": { "fallback": 16776960 },   // 0xFFFF00，黄色
  "opacity": 0.4,
  "texture": 0,
  "nib": { "shape": 1, "aspect": 0.125, "orientation": 0 },
  "cap": 2,                            // 平头
  "points": [
    { "x": 100.0, "y": 300.0, "width": 24.0 },  // width 是笔尖高度
    { "x": 180.0, "y": 0.0, "width": 24.0 }
  ]
}
```

@tab 矩形橡皮（Inkeys 附加级）

```jsonc
{
  "type": 3,
  "contentId": 2,
  "undoId": 2,
  "inkType": 0,
  "color": { "fallback": 0 },
  "opacity": 1.0,
  "texture": 0,
  "nib": { "shape": 1, "aspect": 0.6666667, "orientation": 0 },
  "cap": 2,
  "points": [
    { "x": 320.0, "y": 180.0, "width": 24.0 },  // width 是笔尖高度：16 × 24
    { "x": 8.0, "y": -2.0, "width": 24.0 }
  ]
}
```

:::

## 回退

| 读取器缺少的能力 | 显示方式 |
| --- | --- |
| 块级 `opacity`（核心级） | 按不透明绘制 |
| Highlighter（核心级） | 按 Pen 绘制，宽度含义不变 |
| `nib`、`cap`（核心级） | 圆形笔尖、圆头，`width` 当作直径 |
| Advanced Highlighter 点级样式（基础级、标准级） | 按 Highlighter 绘制，使用块级样式 |
| `texture`（完整级以下） | 按默认纹理绘制 |
| `renderOnlyWhenLatest`（完整级以下） | 忽略标记，全部显示 |
| Erase Ink（未实现 Inkeys 附加级） | 跳过，不显示（INK-11） |

导出到低等级时怎么处理 Erase Ink 与 `renderOnlyWhenLatest`，见[兼容导出](../compatibility#兼容导出)。

## 相关

- [笔尖与端帽](../common/nib)
- [Color Map](../common/color)
- [Shape 块](shape)
- [Clear 块](clear)
- [Canvas 块](canvas)
- [保存、追加与恢复](../incremental)
