You are doing a READ-ONLY investigation. Do not modify any file.

# Goal

We are designing UInk 1.1, the next version of an open ink file format (MessagePack object stream + optional ZIP resource pack). We need to know which parts of the ICC-CE (InkCanvasForClass Community Edition, a WPF classroom whiteboard / screen annotation app) architecture **cannot be stored, or are awkward to store, in UInk 1.0**, so that UInk 1.1 can cover them.

UInk 1.1 will also introduce feature tiers per section: a Core tier (every reader/writer must support; guarantees basic interop for any multi-page vector app), a Standard tier (what apps like ICC-CE / Inkeys need for most scenarios, e.g. multi-page), a Full tier (everything: multi-layer, HDR color, ...), plus an optional "Inkeys" add-on tier for Inkeys-specific eraser/Clear semantics. Your findings will help decide which ICC-CE needs go to which tier.

# Inputs

1. UInk 1.0 spec (Chinese markdown): `D:\Project\Inkeys\website\docs\standard\` — read `intro.md`, `type.md`, `file/main.md`, `incremental.md`, `conformance.md`, and every file under `blocks/` and `common/`.
2. ICC-CE source (shallow clone, current working directory): `D:\Project\Inkeys\_ext\icc-ce`. ICC-CE already has a UInk implementation in `Ink Canvas/UInk/` (`UInkModel.cs`, `UInkReader.cs`, `UInkWriter.cs`, `UInkIccMapper.cs`, `UInkConversion.cs`, `UInkUndoAdapter.cs`, `UInkAppend.cs`, `UInkSaveService.cs`, `UInkExtraArchive.cs`, `UInkFormatters.cs`), plus `MainWindow_cs/MW_UInk.cs` and `MainWindow_cs/MW_Save&OpenStrokes.cs`. Also check `InkCanvas.PluginSdk/IOpenFileFormatService.cs`.

# What to investigate

A. **Current UInk mapping in ICC-CE.** For each ICC-CE concept, how it is mapped to UInk 1.0 today, and what is dropped, approximated, stuffed into `extra`, or silently lost on round-trip. Look especially at `UInkIccMapper.cs` and `UInkConversion.cs`, and any TODO / comments mentioning limitations.

B. **ICC-CE data model beyond the current mapping.** Survey ICC-CE's own native save formats and in-memory model (e.g. WPF `StrokeCollection` / ISF, drawing attributes, its own whiteboard page save format, element/image/text insertion, shapes, PPT ink, timeline/undo history, background/grid/page color, page size, etc.). For each, decide: fully representable in UInk 1.0 / representable but awkward / not representable.
   Pay attention to (non-exhaustive): stylus pressure and per-point attributes, `DrawingAttributes` (FitToCurve, IgnorePressure, StylusTip shape/ellipse/rectangle, height vs width, IsHighlighter), stroke-level custom properties, text elements, images and their transforms, shapes ICC-CE supports (arrows, dashed lines, coordinate axes, cuboids, cylinders, cones, parabolas, etc. — whatever it actually has), page background color / grid / pattern, page size / infinite canvas, PPT slide binding, multi-whiteboard / multi-page, undo/redo history (TimeMachine?), selection, eraser modes (stroke eraser vs point eraser vs geometry eraser), and anything plugin-related.

C. **Pain points.** Where UInk 1.0 rules are inconvenient for ICC-CE's architecture even if technically representable (e.g. the `contentId`/`undoId` rules, `renderOnlyWhenLatest`, Clear semantics, incremental append restrictions, implicit singletons, Device/Workspace registries, viewport, exact MessagePack typing, relative point coordinates, Media ZIP handling).

# Output

Write your final answer in **English**, as Markdown, structured as:

1. `## Summary` — 5–10 bullet points of the most important gaps.
2. `## Current ICC-CE ↔ UInk 1.0 mapping` — a table: ICC-CE concept | UInk 1.0 mapping today | loss / approximation | evidence (file:line).
3. `## Not representable or awkward in UInk 1.0` — one subsection per gap: what ICC-CE has (with file:line evidence), why UInk 1.0 cannot/awkwardly store it, how important it is for interop (high/medium/low), and a concrete suggestion for UInk 1.1 (new field / block / enum value / rule change), plus which tier you think it belongs to (Core / Standard / Full / not worth standardizing).
4. `## Rule-level pain points` — section C findings.
5. `## Uncertain / not verified` — anything you could not confirm.

Every claim about ICC-CE must cite a file path and line number. Do not speculate without labeling it as speculation. Keep it concise but complete; tables over prose.
