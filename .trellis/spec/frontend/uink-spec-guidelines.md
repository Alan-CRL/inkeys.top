# UInk Spec Guidelines

Conventions for editing the UInk specification in `docs/standard/**`, its single-file bundle, and its public samples. UInk 1.1 Beta was written to these rules on 2026-11-24; decisions live in `.trellis/tasks/*uink-1-1-spec*/`.

## Page Contract

Every block page follows the same order so humans and agents can find the same things in the same place:

```text
frontmatter title
- Type ID / 类型 lines (block pages)
**一句话说明**（加粗）
::: tip 等级  ← which level needs what
## 什么时候用（optional）
## 字段         ← table with a 「等级」 column
## 规则         ← numbered rules, one sentence each
## 示例         ← readable pseudo-JSON, values match the samples
## 回退         ← table: missing capability → how it is shown
## 相关
```

- The 「等级」 column states from which level a **reader** must understand the field. `Required` fields are always written, whatever level a writer claims.
- Levels are 核心 / 基础 / 标准 / 完整 plus the Inkeys 附加级. They are implementation conformance levels and are **not** written into files. The finalized matrix is in `docs/standard/levels.md`; a page's tip, field table, `levels.md` and the fallback table in `compatibility.md` must agree.
- Normative words are limited to **必须 / 不得 / 应 / 可以** (defined in `conformance.md`).
- Mark diagram slots with `<!-- visual: id — intent -->`. The bundle turns them into `> 图示：…`; the visuals task fills them.
- Level badges use the theme's built-in `<Badge>`; do not add a component for them.

## Rule IDs

- Format `PREFIX-n`, bolded at the start of the rule line: `- **INK-11** …`. Prefix-to-page mapping is the table in `conformance.md`.
- IDs are stable: never renumber or reuse; when a rule is deleted, record it in `version.md`.
- References elsewhere are plain text (`INK-11`) or ranges (`SHAPE-11–SHAPE-14`). Only the defining line is bold.
- After editing rules, run this check; both lists must be empty:

```bash
cd docs/standard
P='VER|TYPE|COMPAT|FILE|SAVE|EXTRA|HDR|HEXT|DEV|CANVAS|INK|SHAPE|MEDIA|CLEAR|COLOR|NIB|PRESET'
grep -rhoE "\*\*($P)-[0-9]+\*\*" --include=*.md . | sort | uniq -d            # duplicates
grep -rhoE "\b($P)-[0-9]+\b" --include=*.md . | sort -u > /tmp/ref.txt
grep -rhoE "\*\*($P)-[0-9]+\*\*" --include=*.md . | tr -d '*' | sort -u > /tmp/def.txt
comm -23 /tmp/ref.txt /tmp/def.txt                                              # referenced but undefined
```

### Common Mistake: `|` inside table cells

**Symptom**: a table row silently gains extra columns.
**Cause**: absolute values such as `|e − s|` or `√|det T|` inside a table cell, even inside backticks.
**Fix**: escape as `\|` in table cells. Outside tables write `|…|` normally.

## Sidebar and Single-File Bundle

- `docs/.vuepress/plugins/uinkSpecBundle.ts` builds `/standard/uink-v11/spec.md` and `/standard/llms.txt` in `onGenerated`. Its `UINK_V11_PAGES` order **must match** the `/standard/` sidebar in `plume.config.ts`. When you add or move a page, change both.
- Missing pages are skipped with a `[uink-spec-bundle] 跳过不存在的页面` warning. A clean build has no such warning.
- Do not write `/llms.txt` at the site root: `config.ts` has `llmstxt: true`, and plume writes the site-wide `/llms.txt`. A second writer would overwrite it.
- `docs/.vuepress/public/standard/uink-v10/spec.md` is a frozen 1.0 archive produced once by `scripts/uink-archive-v10.mjs` from commit `afc6765`. Do not regenerate or edit it.

## Sample Generator

### Signature

```bash
pnpm fixtures:uink          # = node scripts/uink-fixtures/build.mjs (Node ≥ 22, no npm deps)
```

- Input: `scripts/uink-fixtures/cases/NN-name.json`, one per sample.
- Output: `docs/.vuepress/public/standard/uink-v11/` — `*.uink`, `*.uink.extra`, `fixtures.json`, `SHA256SUMS.txt`.

### Case Contract

| Key | Meaning |
| --- | --- |
| `file`, `title`, `primaryLevel`, `rules`, `description` | Identity; `rules` must be existing rule IDs |
| `objects` | Top-level objects. Every number is typed: `{"u16":0}`, `{"u32":1}`, `{"u64":…}`, `{"i32":…}`, `{"f32":…}`, `{"f64":…}`; `{"str8":"…"}` forces str8; `{"raw":"hex"}` splices bytes |
| `deviations` | Every intentional spec violation (unknown keys, Type ID ≥ 7, reserved values, version ≠ 11, non-canonical encodings…) listed one by one |
| `expected` | One Chinese sentence per level: `core`, `basic`, `standard`, `full`, `inkeys` |
| optional post-processing | e.g. `truncateBytes`, `$replaceFirstByte` for corruption cases |

### Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Untyped JSON number | Build fails, nothing written |
| Spec violation not listed in `deviations`, or a listed deviation that does not occur | Build fails |
| Cited rule ID not defined in `docs/standard` | Build fails |
| Re-decoded object count ≠ `expectedObjects`, Header not `array(7)` with exact widths | Build fails |
| `.gitattributes` lacks `*.uink binary` / `*.uink.extra binary` | Build fails |

### Tests Required

- Run twice; `sha256sum` of every output must be identical (deterministic: fixed ZIP timestamps, stable ordering).
- `cd docs/.vuepress/public/standard/uink-v11 && sha256sum -c SHA256SUMS.txt` — all OK.
- Optional independent decode: `uv run --no-project --with msgpack python -I <script>` per the headless-check pattern; object counts must match `fixtures.json`.
- `pnpm docs:build` passes with no `uink-spec-bundle` warning.

### Status

The 16 samples are final (2026-11-24; `16-core-shape-curves` added the same day), but their `expected` texts are **not yet validated by a real reader**. Inkeys validates them while adapting to 1.1. If an expectation disagrees with the spec text, the spec text wins; fix the sample.

## Settled Semantics (do not reintroduce)

- **Nib size (D20)**: there is no `widthMeaning`. Circle nib: `width` = diameter. Rectangle nib: `width` = height `H`, `W = aspect × H`. Inkeys' equal-area eraser sizing is converted to a height when writing; readers never see it. Docs use `width = 24` for rectangle examples (1:8 → 3 × 24, 2:3 → 16 × 24, 1:1 → 24 × 24).
- **Curves and free shapes (SHAPE-24, SHAPE-25)**: no curve type and no curve equations. Sample into Polyline (open) or Polygon (closed) with ≤ 0.25 unit deviation; disconnected pieces (hyperbola branches) are separate Shapes, optionally grouped by an object without `preset`. Point lists in `cases/16-core-shape-curves.json` are literal, computed once by adaptive sampling; regenerate them only if the curve changes.
- **Stroke details (D21–D24)**: `dashOffset` uses the SVG convention (SHAPE-26; positive shifts the pattern toward the start); FollowDirection uses the bisector at interior points (NIB-8); Ink `cap` applies to circle nibs only, rectangle nibs always end at the nib's own edges (NIB-3); Miter should fall back to Bevel above limit 4, a recommendation only (SHAPE-10). `geometry.ts` implements exactly these; keep them in sync.
- **1.0 files (VER-5)**: 1.1 readers read `version = 10` best-effort; full compatibility is not promised.

## Git Attributes

> **Warning**: the repository default `* text eol=lf` rewrites `0D 0A` byte pairs. `.uink` / `.uink.extra` are binary and would be corrupted on commit.

`.gitattributes` therefore contains:

```gitattributes
*.uink binary
*.uink.extra binary
docs/.vuepress/public/standard/**/SHA256SUMS.txt text eol=lf   # *.txt is crlf by default; sha256sum -c rejects CRLF
```

## Wrong vs Correct

#### Wrong

```markdown
| `cap` | int32 | Optional | 端帽，缺省为 Round |        <!-- no 等级 column; default disagrees with NIB-3 -->
- Erase 只作用于此前的内容，见 Ink 页。                   <!-- unnumbered rule, vague reference -->
```

#### Correct

```markdown
| `cap` | int32 | Optional | 基础 | 端帽；缺省时圆形笔尖为 Round、矩形笔尖为 Butt，见[笔尖与端帽](../common/nib) |
- **SHAPE-18** Inkeys 附加级的 Erase Ink 作用于在它之前的 Shape（INK-11）。
```
