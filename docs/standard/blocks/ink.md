---
title: Ink 块
---

- Type ID: 3
- Type: Map

Ink 表示一条完整墨迹。擦除、普通笔、荧光笔和高级荧光笔都是 Ink 的渲染类型，不再使用独立的 `penType` 或 Eraser 顶层块。

## 字段

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `type` | uint16 | Required | 固定为 `3` |
| `contentId` | uint32 | Required | Canvas 内 Ink/Shape/Media 共享的连续内容编号 |
| `undoId` | uint32 | Required | Canvas 内非递减的撤回操作分组编号 |
| `inkType` | int32 | Required | 墨迹渲染类型 |
| `color` | Color Map | Required | 块级颜色与 HDR 回退信息 |
| `opacity` | float32 | Required | 块级透明度，范围 `0`–`1` |
| `texture` | int32 | Required | 纹理编号 |
| `points` | `Array<Map>` | Required | 至少一个轨迹点 |
| `renderOnlyWhenLatest` | bool | Optional | 缺失时为 `false` |
| `extra` | Map | Optional | 私有扩展 |

`contentId` 与 Shape/Media 共用同一编号空间，并严格按照顶层对象流中的先后顺序从 0 连续递增。`undoId` 从 0 开始且只允许不递减；对象流中 `undoId` 相同且连续的内容块构成一次撤回操作。

`contentId` 只标识当前文件版本中当前 Canvas 的对象流顺序。完整保存会重新整理编号，其他文件、外部元数据或后续文件版本不得把它当作稳定对象身份。

## `inkType`

| 值 | 名称 | 语义 |
| --- | --- | --- |
| `0` | Erase | 擦除墨迹 |
| `1` | Pen | 普通笔 |
| `2` | Highlighter | 荧光笔 |
| `3` | Advanced Highlighter | 高级荧光笔 |
| `4`–`127` | Reserved | UInk 后续版本保留 |
| `128` 及以上 | Private | 软件私有墨迹类型 |

`128+` 私有编号没有全局厂商命名空间，只保证预先约定的实现之间互操作。其他读取器遇到未知或不支持的 `inkType` 时，必须保留基础几何并按 `inkType = 1` 普通笔回退。

### 四种通用渲染规则

- Erase 保存完整擦除形状，并按对象流顺序作用于同一 Canvas 中位于它之前的 Ink 与 Shape，不作用于 Media。具体裁剪、透明和背景效果由软件决定。
- Pen 使用块级 `color` 和 `opacity`。笔刷外形、线帽和连接方式仍由软件决定，不以是否支持透明度区分普通笔与荧光笔。
- Highlighter 使用块级 `color` 和 `opacity`。渲染器必须先把整条笔迹生成一次完整覆盖，再将该覆盖作为一个整体以 alpha source-over 合成到画布；不得逐采样段反复合成而在段间重叠处累加透明度。
- Advanced Highlighter 使用相同的“整条覆盖后合成一次”规则，但部分点可以提供颜色与透明度锚点；没有任何点级样式时使用块级样式。

## Color Map

Ink 的颜色字段使用公共 [Color Map](../common/color)，同时提供基础 SDR 回退色和可选 HDR 色彩空间数据。该结构也供 Shape 的填充和描边使用。

## `texture`

| 值 | 语义 |
| --- | --- |
| `0` | 默认普通纹理 |
| `1`–`127` | UInk 标准纹理保留区 |
| `128` 及以上 | 软件私有纹理 |

读取器不认识某个纹理时必须按 `texture = 0` 回退，不得丢弃整条 Ink。

## 轨迹点

每个点使用 Map：

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `x` | float32 | Required | 首点为绝对 X，后续点为相对前一点的 X 位移 |
| `y` | float32 | Required | 首点为绝对 Y，后续点为相对前一点的 Y 位移 |
| `width` | float32 | Required | 该点处笔迹的完整直径，必须大于 0 |
| `color` | Color Map | Conditional | 高级荧光笔的点级颜色 |
| `opacity` | float32 | Conditional | 高级荧光笔的点级透明度 |

点级 `color` 和 `opacity` 必须成对出现。首个样式锚点之前沿用首个锚点的样式，最后一个锚点之后沿用最后一个锚点的样式；锚点之间必须平滑过渡，但具体插值方法由软件决定。

点列定义有序中心位置和完整直径，不注册唯一曲线、包络、线帽、连接或宽度插值算法。读取器必须保持点顺序、位置和宽度语义，但自由墨迹的最终轮廓可以因实现而不同；单点 Ink 也由软件按同一笔刷语义呈现。

UInk 1.0 不注册压力、时间、倾斜、朝向、速度、加速度或预测点。读取器必须忽略不认识的点键，以便后续版本增加可选输入参数。

::: tip float32 范围
float32 足以覆盖 16K 和多显示器坐标，并保持优于 0.1 px 的精度。首点绝对、后续相对的设计用于减少位移数值范围，同时仍保留亚像素精度。
:::

## 条件渲染与撤回

Ink 和 Shape 共享 `renderOnlyWhenLatest` 规则。读取器必须对当前 Canvas 执行以下判定：

1. 从最后一个内容块开始反向扫描。
2. 遇到 Media 时直接越过；Media 不加入末尾最新组，也不终止扫描。
3. 遇到 `renderOnlyWhenLatest = true` 的 Ink/Shape 时，将其加入末尾最新组并继续反向扫描。
4. 遇到第一个未标记或标记为 `false` 的 Ink/Shape 时停止扫描。文件中更早的标记 Ink/Shape 不属于末尾最新组。
5. 正常显示末尾最新组和所有未标记的 Ink/Shape，隐藏不属于末尾最新组的标记 Ink/Shape。末尾最新组可以为空。

该机制适用于形状修正：软件先保存多条原始 Ink/Shape，并将它们的 `renderOnlyWhenLatest` 设为 `true`，再保存未标记的结果 Shape。结果 Shape 存在时，反向扫描会在该未标记 Shape 处停止，因此标记原稿隐藏。撤回结果并执行完整保存后，原稿成为末尾最新组并重新显示。

末尾最新组只影响显示，不合并或修改 `undoId`。撤回结果后，用户仍按原稿各自的 `undoId` 逐步撤回。隐藏但未撤回的原稿是当前有效内容，完整保存必须保留；UInk 不承诺在保存并关闭后保留 Redo 历史。

## 擦除模型

### 擦除墨迹

`inkType = 0` 保存完整的擦除轨迹，可以像其他 Ink 一样在抬笔后追加。追加 Erase Ink 不要求修改此前的内容块。读取器按对象流顺序，将 Erase Ink 作用于同一 Canvas 中位于它之前的 Ink 与 Shape；Media 始终不受影响。

### 普通板擦

软件也可以采用会修改或切断既有 Ink/Shape 的普通板擦。写入器必须把擦除结果归一化为当前有效的完整对象，并执行完整保存；不得通过追加使旧对象与新片段同时存在。由同一次擦除产生的多个结果片段可以共享同一个 `undoId`，以便一步撤回全部片段。

## 示例

以下均为 MessagePack Map 的可读伪 JSON 表示。

::: tabs

@tab 普通笔

```jsonc
{
  "type": 3,
  "contentId": 0,
  "undoId": 0,
  "inkType": 1,
  "color": { "fallback": 255 },
  "opacity": 0.4,
  "texture": 0,
  "points": [
    { "x": 120.0, "y": 240.0, "width": 6.0 },
    { "x": 4.5, "y": 1.0, "width": 6.2 }
  ]
  // 普通笔使用块级 opacity，此处按 0.4 绘制
}
```

@tab 高级荧光笔与 HDR

```jsonc
{
  "type": 3,
  "contentId": 1,
  "undoId": 1,
  "inkType": 3,
  "color": { "fallback": 16776960 },
  "opacity": 0.35,
  "texture": 0,
  "points": [
    {
      "x": 100.0,
      "y": 100.0,
      "width": 24.0,
      "color": {
        "fallback": 16763904,
        "space": "scrgb",
        "components": [1.8, 0.65, 0.1]
      },
      "opacity": 0.25
    },
    { "x": 12.0, "y": 3.0, "width": 25.0 },
    {
      "x": 10.0,
      "y": 4.0,
      "width": 26.0,
      "color": { "fallback": 65535 },
      "opacity": 0.6
    }
  ]
}
```

@tab 擦除墨迹

```jsonc
{
  "type": 3,
  "contentId": 2,
  "undoId": 2,
  "inkType": 0,
  "color": { "fallback": 0 },
  "opacity": 1.0,
  "texture": 0,
  "points": [
    { "x": 320.0, "y": 180.0, "width": 32.0 },
    { "x": 8.0, "y": -2.0, "width": 32.0 }
  ]
}
```

:::

## 容错

- 有限但越界的 `opacity` 应钳制到 `0`–`1`；NaN/Infinity 使对应字段无效。
- Ink 没有点、点结构损坏或缺少必填字段时，读取器应跳过该 Ink，报告警告并继续读取后续内容。
- 写入器必须把块级私有字段放入 `extra`；读取器仍应容错忽略未知顶层键。

## 相关说明

- [墨迹主文件与混合顺序](../file/main)
- [增量写入](../incremental)
- [Canvas 块](canvas)
- [Shape 块](shape)
- [Color Map](../common/color)
