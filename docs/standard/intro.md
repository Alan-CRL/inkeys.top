---
title: UInk 规范
createTime: 2026/02/15 10:26:08
---

UInk 规范用于解决本地绘图软件的墨迹存储与跨端预览问题。规范优先保证数据语义、内容布局和基础呈现一致；自由墨迹曲线、Marker 外形、抗锯齿以及复杂擦除效果可以因软件实现而不同。

::: warning 预 Beta 草案
当前规范版本号为 `10`（UInk 1.0 草案），尚未进入 Beta，也没有冻结线格式。本文档取代此前所有 version `10` 草案，是当前草案的唯一有效定义；“取代”不表示兼容，读取器无须支持旧草案文件。
:::

[规范版本号](version)

## 特点

1. 一个文件可以注册多个屏幕批注、白板或 PPT Workspace，并支持父子工作区、多显示器、多页面和多图层。
2. 支持可选的[增量写入](incremental)，在当前文件末尾 Canvas 中追加完整内容，用于降低运行中崩溃造成的数据丢失。
3. 墨迹主文件使用连续 MessagePack 对象流，兼顾读写性能、体积和扩展性。
4. Ink、Shape 与 Media 按它们在顶层对象流中的先后顺序混合处理，并共享内容编号和撤回分组。
5. Device 与 Canvas 解耦：Device 描述显示区域，Canvas 使用逻辑像素保存内容，并可通过 `viewport` 保存平移与缩放状态。
6. 擦除、普通笔和两类荧光笔统一使用 [Ink 块](blocks/ink)，未知样式可以安全回退。

## 文件

### 墨迹文件

UInk 格式由必需的墨迹主文件和可选的墨迹扩展文件组成。

::: file-tree

- filename.uink MessagePack
- filename.uink.extra ZIP
  - *.png
  - *.svg
  - *.mp3
  - *.pdf
  - ……

:::

- 墨迹主文件（`filename.uink`）使用 [MessagePack](https://msgpack.org/) 对象流，保存 Ink、Shape、Media、Canvas 和元数据。
- 墨迹扩展文件（`filename.uink.extra`）使用 ZIP 格式打包，保存由 [Media 块](blocks/media) 引用的图片、SVG、音视频和 PDF 等资源。

两个文件使用相同的基础文件名，其中墨迹扩展文件是可选的。`.uink` 主文件始终是当前有效内容的权威来源；资源包缺失或资源不可用时，基础 Ink/Shape 仍必须正常加载。

#### 墨迹文件的定位

- 墨迹主文件用于快速加载、基础预览和内容交换。
- 墨迹扩展文件只是资源容器，不保存内容顺序、几何或撤回信息。
- UInk 可以保存编辑与撤回所需的当前有效内容，但不承诺在关闭后保留 Redo 历史。

### 墨迹扩展文件

资源路径必须是 ZIP 根目录内经过规范化的安全相对路径。媒体的 MIME、几何、播放参数、PDF 页状态和顺序全部保存在 `.uink` 主文件中，详细安全要求参见 [Media 块](blocks/media)。

## 第三方实现

第三方读取器和写入器必须遵守字段类型、对象顺序、容错与保存边界。实现前应先阅读[实现一致性与样例](conformance)，并使用公开样例验证基础互操作。

## 相关链接

- [规范版本](version)
- [块类型与编码](type)
- [实现一致性与样例](conformance)
- [墨迹主文件](file/main)
- [Device 结构](blocks/device)
- [Canvas 块](blocks/canvas)
- [Ink 块](blocks/ink)
- [Shape 块](blocks/shape)
- [Media 块](blocks/media)
- [Color Map](common/color)
