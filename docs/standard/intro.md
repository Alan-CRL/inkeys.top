---
title: UInk 规范
---

**UInk 是开放的墨迹文件规范。** 一个 `.uink` 文件可以装下一整块白板、一整份 PPT 的全部批注：多页、多块屏幕、笔迹、图形、图片与 PDF。不同的批注与白板软件按同一套规则读写它，换一款软件打开，每一笔都在原处。

::: tip UInk 1.1 Beta
当前版本 `Header.version = 11`。1.0 → 1.1 的变化见[版本与变更](version)。
:::

## 两个特点

### 通用

UInk 把功能分成五个等级。只实现最基础的**核心级**——多页、笔迹、基础图形——就能正确显示任何 UInk 文件的主要内容；更高的等级让荧光笔、虚线、图片、PPT 绑定等内容也原样呈现。软件遇到自己不支持的内容时，有明确的回退方式，不会因此打不开文件。

→ [分级与认证](levels) · [兼容与回退](compatibility)

### 集合

一个白板的所有页面、一份 PPT 每张幻灯片上的批注，都在同一个 `.uink` 里。文件可以同时包含多个场景（屏幕批注、白板、PPT）、多块屏幕和多个图层；白板翻页、PPT 换页时，只需把改动的那一页追加到文件末尾。

→ [墨迹主文件](file/main) · [保存、追加与恢复](incremental)

## 文件

::: file-tree

- lesson.uink 主文件：MessagePack 对象流
- lesson.uink.extra 资源包：ZIP，可选
  - images
    - diagram.png
  - documents
    - handout.pdf

:::

- **主文件** `filename.uink` 是一串连续的 [MessagePack](https://msgpack.org/) 对象，保存全部页面、笔迹、图形与媒体引用。它始终是内容的权威来源。
- **资源包** `filename.uink.extra` 是 ZIP，保存图片、PDF、音视频等资源，可以没有。资源缺失时，笔迹与图形照常显示。

## 一眼看懂结构

<!-- visual: overview — 一个 .uink 拆开：Header → Header Extension（屏幕、场景）→ 一个个 Canvas（页面）→ 每页上的 Ink、Shape、Media、Clear -->
<UInkFileStream />

| 块 | 作用 |
| --- | --- |
| [Header](blocks/header) | 文件开头：身份与版本 |
| [Header Extension](blocks/headerextension) | 注册屏幕（Device）与场景（Workspace），可选 |
| [Canvas](blocks/canvas) | 一页（在某块屏幕上的某个图层），以及页码、背景、PPT 绑定、平移缩放 |
| [Ink](blocks/ink) | 一条笔迹：普通笔、荧光笔、橡皮 |
| [Shape](blocks/shape) | 一个图形：直线、矩形、圆、多边形；复杂图形由多个部件组成 |
| [Media](blocks/media) | 一张图片、一页 PDF、一段音视频 |
| [Clear](blocks/clear) | 一次可以撤回的清空 |

## 设计取舍

- **保证内容与布局一致，不保证像素一致。** 笔迹的曲线插值、抗锯齿、箭头外形可以因软件而不同；点的位置、宽度、颜色与顺序必须一致。
- **快速保存，不怕崩溃。** 书写时可以每抬一次笔就追加到文件末尾；软件崩溃时最多丢掉最后一个没写完的对象。
- **不保存重做。** 文件保存当前内容和撤回分组，撤回的粒度由软件决定。
- **未知内容可以跳过。** 新版本增加的块和字段，旧软件会跳过，其余内容照常显示。

## 从哪里开始

| 你想 | 阅读 |
| --- | --- |
| 先写一个能显示 UInk 的最小读取器 | [快速开始](quick-start) |
| 确定自己要实现到哪一级 | [分级与认证](levels) |
| 逐条核对规则 | 各块页面中的编号规则，以及[实现一致性与样例](conformance) |
| 让 AI 助手帮你实现 | [单文件版规范](/dist-standard/uink-v11/spec.md)、[llms.txt](/standard/llms.txt) |
| 查一个词的意思 | [术语表](glossary) |
