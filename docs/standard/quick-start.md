---
title: 快速开始
---

本页带你写一个**核心级读取器**：读出所有页面，画出笔迹与基础图形。代码是接近 TypeScript 的伪代码，换成任何语言都一样。完整规则见各块页面；括号里的编号是对应的规则。

## 准备

需要一个能**逐个解码**连续 MessagePack 对象的库，例如 JavaScript 的 `@msgpack/msgpack`（`decodeMulti`）、C# 的 `MessagePack-CSharp`、C++ 的 `msgpack-c`（`unpacker`）、Python 的 `msgpack`（`Unpacker`）。

主文件里没有外层数组：对象一个接一个排列（FILE-6）。

## 1. 读出全部对象

```ts
const objects = []
try {
  for (const obj of decodeMulti(bytes)) objects.push(obj)
} catch {
  // 结尾的对象不完整或中间损坏：保留已经读到的对象（FILE-16、FILE-17）
}
```

## 2. 检查 Header

```ts
const header = objects[0]
if (!Array.isArray(header) || header.length !== 7 || header[0] !== 0
    || header[1] < 10 || header[1] > 19) {
  throw new Error('不是 UInk 1.x 文件')                    // VER-3、HDR-2
}
```

`version` 大于 `11` 时照常读取，必要时提示用户“文件来自更新的版本”（VER-4）。

## 3. 建立页面

```ts
let i = 1
const ext = objects[i]?.type === 1 ? objects[i++] : null   // Header Extension，可选
const firstDevice = ext?.devices?.[0]?.guid ?? null         // 核心级只显示第一个 Device（FILE-9）

const canvases = new Map()                                  // 唯一键 → { canvas, blocks }
let current = null
for (; i < objects.length; i++) {
  const o = objects[i]
  if (o?.type === 2) {
    const key = [o.workspaceGuid ?? '', o.deviceGuid ?? '', o.pageGuid, o.layerIndex].join('|')
    current = { canvas: o, blocks: [] }
    canvases.set(key, current)                              // 同一个键再次出现：后者替代前者（FILE-8）
  } else if (current && [3, 4, 5, 6].includes(o?.type)) {
    current.blocks.push(o)                                  // 内容块属于前一个 Canvas（FILE-3）
  }                                                         // 其他 Type ID：跳过（TYPE-9）
}
```

然后按 Workspace 注册顺序、`pageIndex` 排序列出页面；只取 `deviceGuid` 等于 `firstDevice`（或省略）的 Canvas；同一页的多个图层按 `layerIndex` 从小到大叠加（FILE-9）。

## 4. 画一页

```ts
function drawCanvas(blocks) {
  // Clear（Inkeys 附加级）的推荐回退：只画最后一个 Clear 之后的内容（CLEAR-7）
  const lastClear = blocks.findLastIndex(b => b.type === 6)
  for (const b of blocks.slice(lastClear + 1)) {
    if (b.type === 3) drawInk(b)
    else if (b.type === 5) drawShape(b)
    // Media（type 4）属于标准级，核心级可以跳过
  }
}
```

### 笔迹

```ts
function drawInk(ink) {
  if (ink.inkType === 0) return                 // Erase 属于 Inkeys 附加级：必须跳过（INK-11）
  const color = rgb(ink.color.fallback)         // 核心级只用 fallback（COLOR-2）
  let x = 0, y = 0
  const pts = ink.points.map((p, k) => {
    x = k === 0 ? p.x : x + p.x                 // 首点绝对，其余为位移；用 float64 累加（INK-4）
    y = k === 0 ? p.y : y + p.y
    return { x, y, w: p.width }
  })
  // 最简单的画法：每个点画一个直径为 w 的圆，相邻两点之间画一个梯形把圆连起来。
  // 这就是“圆形笔尖 + 圆头”（NIB-1）。其他 inkType 一律按普通笔画（INK-13）。
  strokeVariableWidth(pts, color)
}
```

### 图形

```ts
function drawShape(s) {
  const g = s.geometry
  switch (s.shapeType) {
    case 0: case 1: polyline(g.points); break                       // Line、Polyline
    case 6: polygon(g.points); break                                // Polygon，自动闭合
    case 2: rect(g.centerX, g.centerY, g.width, g.height, g.rotation ?? 0); break
    case 3: rect(g.centerX, g.centerY, g.size, g.size, g.rotation ?? 0); break
    case 4: ellipse(g.centerX, g.centerY, g.width / 2, g.height / 2, g.rotation ?? 0); break
    case 5: ellipse(g.centerX, g.centerY, g.radius, g.radius, 0); break
    default: return                                                 // 不认识的几何：跳过（SHAPE-20）
  }
  if (s.fill) fillWith(rgb(s.fill.color.fallback))
  if (s.stroke) strokeWith(rgb(s.stroke.color.fallback), s.stroke.width)   // 圆头、圆角（NIB-4）
}
```

到这里，你的读取器已经满足核心级读取的主要要求。对照[核心级检查清单](levels#核心级)补齐剩下的几项，再用[公开样例](conformance#公开样例)验证。

## 5. 写一个最小文件

写入时必须使用规定的**精确类型与位宽**（TYPE-1）。很多 MessagePack 库会自动选择最短的整数编码，这时需要手动指定类型。

```ts
const header = [
  u16(0), u16(11), str8(uuid()),       // type、version、guid
  u32(1), u32(1), u32(1),              // deviceNum、workspaceNum、pageNum
  u64(Math.floor(Date.now() / 1000)),  // time
]
const canvas = {
  type: u16(2), pageGuid: uuid(), pageIndex: u32(0), pageNumber: u32(1),
  layerIndex: u32(0), layerNumber: u32(0),
}
const ink = {
  type: u16(3), contentId: u32(0), undoId: u32(0), inkType: i32(1),
  color: { fallback: u32(0x000000) }, opacity: f32(1), texture: i32(0),
  points: [
    { x: f32(100), y: f32(100), width: f32(4) },
    { x: f32(50), y: f32(20), width: f32(4) },   // 相对前一点的位移
  ],
}
write(encode(header), encode(canvas), encode(ink))  // 三个对象直接首尾相接
```

这个文件没有 Header Extension，使用隐式的 Device 与 Workspace（HEXT-3），所以 Canvas 不写 `workspaceGuid` 与 `deviceGuid`。

## 下一步

- 想正确显示荧光笔、虚线和箭头：[基础级](levels#基础级)。
- 想支持图片、PPT 与撤回：[标准级](levels#标准级)。
- 想在书写过程中实时保存：[保存、追加与恢复](incremental)。
