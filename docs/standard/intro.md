---
title: UInk 规范
createTime: 2026/02/15 10:26:08
---

UInk 规范旨在解决本地绘图软件墨迹存储与跨端预览的一致性难题。在保证高效读写与空间节省的同时，为多端平台提供高度统一的渲染效果，并具备良好的规范扩展性。

::: warning 规范完善中
当前版本号为 `10`（UInk 1.0），字段仍在正式冻结前的完善阶段。
:::

[规范版本号](version)

## 特点

1. 一个文件可以注册多个屏幕批注、白板或 PPT Workspace，并支持父子工作区、多显示器、多页面和多图层。
2. 支持[增量写入](incremental)，在保持顺序可靠时逐块追加完整内容。
3. 墨迹主文件使用 MessagePack 对象流，兼具高性能、体积和可扩展性。
4. Ink 与 Media 按物理顺序混合处理，并共享内容编号和撤回分组。
5. Device 与 Canvas 解耦：Device 注册表描述空间，Workspace 注册表描述页面与宿主，Canvas 通过 UUID 引用两者。
6. 擦除、普通笔和两类荧光笔统一使用 [Ink 块](blocks/ink)，未知样式可以安全回退。

## 文件

### 墨迹文件

墨迹文件分为 2 个。

::: file-tree

- filename.uink MessagePack
- filename.uink.extra ZIP
  - *.png
  - *.svg
  - *.mp3
  - *.pdf
  - ……

:::

- 墨迹主文件（`filename.uink`）使用 [MessagePack](https://msgpack.org/) 格式存储，主要保存[墨迹](blocks/ink)、媒体、所属画布和元数据。
- 墨迹拓展文件（`filename.uink.extra`）使用 ZIP 格式打包，保存由 [Media 块](blocks/media)引用的图片、SVG、音视频和 PDF 等资源。

两者相互对应，其中墨迹拓展文件是可选的。

#### 墨迹文件的定位

- 墨迹主文件应用于快速加载与显示，画布中的图片等多媒体以链接的形式表示在内。
- 墨迹拓展文件按照 Media.path 存储资源，不包含额外索引。资源包缺失时，基础墨迹仍可正常加载。

### 墨迹拓展文件

资源路径必须是 ZIP 根目录内的安全相对路径。媒体的 MIME、几何、播放参数、PDF 页状态和顺序全部保存在 `.uink` 主文件中。

## 相关链接

- [墨迹主文件](file/main)
- [块类型](type)
- [Device 结构](blocks/device)
- [Canvas 块](blocks/canvas)
- [Ink 块](blocks/ink)
- [Media 块](blocks/media)
