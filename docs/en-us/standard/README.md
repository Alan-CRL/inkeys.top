---
title: UInk
aside: false
pageClass: uink-home
readingTime: false
---

<UInkHero />

## Universal: one file, opened in different apps

Apps that support different levels show different amounts of detail, but every stroke stays where it was drawn. Pick a level below to see the same page of notes in different readers.

<UInkTierDemo />

For what each level must implement and how unsupported content is shown, see [Levels and Certification](/en-us/standard/levels) and [Compatibility and Fallback](/en-us/standard/compatibility) (in Chinese).

## All in one: one whiteboard, one file

A single `.uink` file can store every page of a whiteboard, or the annotations on every slide of a PowerPoint deck, so the annotations stay with their slides. When you move to another whiteboard page or slide, the app can append just the changed page to the end of the file, without rewriting the whole file.

<UInkStructure />

For the blocks a file is made of and how they are ordered, see [Main Ink File](/en-us/standard/file/main) (in Chinese).

## Apps that use UInk

<CardGrid>
<LinkCard title="Inkeys" href="https://www.inkeys.top/en-us/" description="A Windows screen annotation tool for all kinds of settings." />
<LinkCard title="ICC-CE" href="https://github.com/InkCanvasForClass/community" description="The community edition of InkCanvasForClass, an annotation and whiteboard app for the classroom." />
</CardGrid>

## Start implementing

A minimal reader that can display UInk takes just three steps:

1. **Read the Header**: decode MessagePack objects one by one and check that the first is a Header with version 10–19. See [Quick Start · Check the Header](/en-us/standard/quick-start#_2-检查-header).
2. **Start a new page at each Canvas**: each Canvas starts a page, and the content blocks after it belong to that page; if the same page appears more than once, the last one wins. See [Quick Start · Build the pages](/en-us/standard/quick-start#_3-建立页面).
3. **Draw the Ink**: draw strokes from the point coordinates and per-point widths, use the `fallback` color, and skip erasers. See [Quick Start · Draw a page](/en-us/standard/quick-start#_4-画一页).

<CardGrid>
<LinkCard title="Specification" href="/en-us/standard/intro" description="Start with the introduction and read page by page (in Chinese)." />
<LinkCard title="Levels and Certification" href="/en-us/standard/levels" description="Decide which level to implement and check it against the checklist." />
<LinkCard title="Public samples" href="/en-us/standard/conformance#公开样例" description="Check what your reader shows at each level using the sample files." />
<LinkCard title="Single-file spec (for AI assistants)" href="/dist-standard/uink-v11/spec.md" description="All specification pages combined into one Markdown file." />
</CardGrid>

When an AI assistant helps you implement UInk, you can give it the [single-file spec](/dist-standard/uink-v11/spec.md) or [llms.txt](/standard/llms.txt).
