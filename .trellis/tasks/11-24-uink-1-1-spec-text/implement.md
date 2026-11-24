# UInk 1.1 规范正文实施计划

> 前置：本任务 `design.md` 与父任务 `design.md` 经用户确认，执行前运行 `task.py start`。文件使用 UTF-8、LF 换行（与现有文件一致）。不改动工作区中与本任务无关的未提交修改。

## 步骤

1. **单文件插件与 1.0 存档**（先做，必须在改写任何页面之前）
   - 新建 `docs/.vuepress/plugins/uinkSpecBundle.ts`，在 `config.ts` 的 `plugins` 中注册。
   - 用它从当前 1.0 源文件生成 `docs/.vuepress/public/standard/uink-v10/spec.md` 并提交（静态存档，之后不再生成）。
   - 构建产物中出现 `/standard/uink-v11/spec.md`（此时内容仍是 1.0）与 `/llms.txt`。
   - 回滚点：插件与存档文件可以单独撤回。
2. **规则编号与术语表骨架**：确定各页编号前缀（`HDR`、`HEXT`、`DEV`、`CANVAS`、`INK`、`SHAPE`、`MEDIA`、`CLEAR`、`COLOR`、`NIB`、`FILE`、`SAVE`、`EXTRA`、`TYPE`），新建 `glossary.md`。
3. **基础页面**：改写 `version.md`（版本规则、1.0 勘误、1.0 → 1.1 变更、存档链接）、`type.md`；新建 `levels.md`、`compatibility.md`。
   - **审阅关口 A**：连同改写好的 `blocks/ink.md` 一起给用户审阅语言风格与页面模板，确认后再批量改写。
4. **文件页面**：改写 `file/main.md`、`incremental.md`；新建 `file/extra.md`。
5. **块与公共结构**：改写 Header、Header Extension、Device、Canvas、Shape、Media、Clear、Color Map；新建 `common/nib.md`。
6. **图形预设注册表**：先做只读调研（Inkeys 的预设与 construction，结果写入 `research/`；是否用 Codex 先问用户），再写 `appendix/shape-presets.md`。
7. **入门与一致性**：改写 `intro.md`；新建 `quick-start.md`；改写 `conformance.md`（等级检查清单引用规则编号，样例清单改为 1.1）。
8. **样例**：新建 `scripts/uink-fixtures/`（自带编码器、`cases/*.json`），`package.json` 增加 `fixtures:uink`；生成 `public/standard/uink-v11/`。
   - **审阅关口 B**：样例清单与期望结果给用户确认。
9. **导航**：`plume.config.ts` 侧边栏按 design §1 更新（“概览”由主页子任务加入，本任务预留位置）。

## 验证

- `pnpm docs:build` 通过，无新增警告；产物中存在 `/standard/uink-v11/spec.md`、`/standard/uink-v10/spec.md`、`/llms.txt`。
- 连续运行两次 `pnpm fixtures:uink`，`git status` 中样例无变化（输出逐字节一致）。
- 用独立的 MessagePack 解码（脚本内自检）确认每个样例都能完整解码，类型与位宽符合字段表。
- 全文检查：不再出现“逻辑像素”的旧定义、`version = 10` 的强制要求、已删除的私有键；所有站内链接指向存在的页面。
- `git diff` 检查编码、换行，不包含与本任务无关的文件。
- 提醒用户：`docs/.vuepress/public/` 有新增文件，需要上传或更新 123pan 直链。
