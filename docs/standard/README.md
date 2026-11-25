---
title: UInk
aside: false
pageClass: uink-home
readingTime: false
---

<UInkHero />

## 通用：同一个文件，在不同软件里打开

支持的等级不同，看到的画面也不同，但每一笔都在原处。点下面的等级，看同一页板书在不同读取器里的样子。

<UInkTierDemo />

每一级具体要实现什么、不支持时怎样显示，见[分级与认证](levels)和[兼容与回退](compatibility)。

## 集合：一块白板，一个文件

一块白板的所有页面、一份 PPT 每张幻灯片上的批注，都保存在同一个 `.uink` 里，批注跟着幻灯片走。翻页、换页时，软件只需把改动的那一页追加到文件末尾，不用重写整个文件。

<UInkStructure />

文件由哪些块组成、怎样排列，见[墨迹主文件](file/main)。

## 使用 UInk 的软件

<CardGrid>
<LinkCard title="智绘教Inkeys" href="https://www.inkeys.top/" description="面向多场景的 Windows 屏幕批注工具。" />
<LinkCard title="ICC-CE" href="https://github.com/InkCanvasForClass/community" description="InkCanvasForClass 社区版，课堂批注与白板软件。" />
</CardGrid>

## 开始实现

写一个能显示 UInk 的最小读取器，只需要三步：

1. **读 Header**：逐个解码 MessagePack 对象，确认第一个是版本 10–19 的 Header。见[快速开始 · 检查 Header](quick-start#_2-检查-header)。
2. **按 Canvas 分页**：每个 Canvas 开始一页，后面的内容块都属于它；同一页出现多次时以最后一次为准。见[快速开始 · 建立页面](quick-start#_3-建立页面)。
3. **绘制 Ink**：按点坐标和每点宽度画出笔迹，颜色用 `fallback`，跳过橡皮。见[快速开始 · 画一页](quick-start#_4-画一页)。

<CardGrid>
<LinkCard title="规范正文" href="/standard/intro" description="从规范介绍开始，逐页阅读。" />
<LinkCard title="分级与认证" href="/standard/levels" description="确定要实现到哪一级，并对照检查清单。" />
<LinkCard title="公开样例" href="/standard/conformance#公开样例" description="用样例文件验证读取器在每一级的显示结果。" />
<LinkCard title="单文件规范（给 AI 助手）" href="/dist-standard/uink-v11/spec.md" description="全部规范页面合成一个 Markdown 文件。" />
</CardGrid>

让 AI 助手帮你实现时，可以把[单文件规范](/dist-standard/uink-v11/spec.md)或 [llms.txt](/standard/llms.txt) 交给它。
