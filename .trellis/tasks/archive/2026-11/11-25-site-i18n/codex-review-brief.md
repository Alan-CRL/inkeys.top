# 任务：审查网站的繁体中文（zh-TW）与英文（en-US）译文

你是只读审查者，不要修改任何文件。工作目录是 Inkeys 官网仓库（VuePress 2 + Plume）。简体中文（zh-CN）是原文，繁中与英文是新写的译文，需要你逐条对照审查。

## 背景与约定（这些是已确定的决定，不要提议更改）

- 品牌名：简体写“智绘教Inkeys”；繁中和英文一律只写 “Inkeys”。
- 繁中使用**台湾地区**用语（螢幕、軟體、簡報、投影片、設定、檔案、預設等），不是香港用语，也不是简繁字形直转。
- 英文面向普通用户：自然、简洁、不堆术语和指标，不要直译中文语序。
- 产品术语以软件自身语言包为准：`D:\Project\Inkeys\Repo\Inkeys\Inkeys\src\i18n\zh-CN.jsonc`、`zh-TW.jsonc`、`en-US.jsonc`（同一个 key 对应三种语言）。已整理的对照表在 `.trellis/tasks/11-25-site-i18n/research/app-glossary.tsv` 和 `.trellis/tasks/11-25-site-i18n/translation-review.md` 第 1 节。软件英文 README（`D:\Project\Inkeys\Repo\Inkeys\README.md`）与繁中 README（`README_zh-TW.md`）也可作参考。
- 未翻译页面的链接目标、锚点（如 `#_2-检查-header`、`#公开样例`）是故意指向简体页面的，**不要报告链接路径和锚点**；链接路径在审查期间可能被另一位同事修改。
- `docs/en-us/tos.md` 是沿用的旧英文版，只需审查明显错误（与简体版意思不符、遗漏条款），不要做文风润色。

## 需审查的内容（原文 ↔ 译文）

1. 首页文案：`docs/.vuepress/theme/components/NewHome3/copy.ts`，对象 `zhCN`（原文）对照 `zhTW`、`enUS`。`placeholder` 字段不用看。
2. 下载页：`docs/.vuepress/theme/components/DownloadCard.vue` 顶部 `COPY` 对象（`'zh-CN'` 对照 `'zh-TW'`、`'en-US'`）。
3. UInk 首页组件：`docs/.vuepress/theme/components/UInk/UInkHero.vue`、`UInkTierDemo.vue`、`UInkStructure.vue` 的 `COPY`。
4. UInk 首页正文：`docs/standard/README.md` 对照 `docs/zh-tw/standard/README.md`、`docs/en-us/standard/README.md`。
5. 版本页：`docs/version/inkeys3.md`、`docs/version/introduction/win7.md` 对照 `docs/zh-tw/version/...`、`docs/en-us/version/...`。
6. 使用条款：`docs/tos.md` 对照 `docs/zh-tw/tos.md`（这份由 OpenCC s2twp 转换后人工校对，重点查转换残留的错误词，如把“程序”误转成“程式”、“范围内存在”误转成“範圍記憶體在”这类，以及台湾法律用语是否自然）和 `docs/en-us/tos.md`（只查明显错误）。
7. 站点框架：`docs/.vuepress/navbar.ts`、`docs/.vuepress/sidebar.ts`（繁中 / 英文部分）、`docs/.vuepress/plume.config.ts` 的 `locales['/zh-tw/']`、`locales['/en-us/']` 中的 footer 文案、`docs/.vuepress/config.ts` 的 `locales` 标题与描述、`docs/.vuepress/theme/components/AsideNav.vue`、`NewHome3/copy.ts` 的 `nav` 字段。

## 审查维度

A. **误译 / 漏译 / 多译**：意思与简体原文不一致、漏掉信息、加了原文没有的承诺。
B. **术语不一致**：与软件语言包或同一网站其他位置的译法不一致（列出两处位置）。
C. **繁中用语**：大陆用语残留（屏幕、软件、视频、信息、默认、设置、文件→檔案 等）、简体字残留、香港用语、OpenCC 误转。
D. **英文质量**：语法错误、生硬直译、不自然的搭配、大小写与标点不统一（标题大小写风格是否一致）、美式拼写。
E. **界面适配**：明显过长、在按钮或窄栏里很可能放不下的译文（例如按钮文字比简体长很多）。

## 输出格式（中文撰写）

1. **问题清单**：按严重程度分三档（必须改 / 建议改 / 可选），每条包括：`文件:行号`、语言（zh-TW / en-US）、当前译文、问题说明（属于 A–E 哪一类）、建议译文。行号必须是你实际读到的行号。
2. **已检查无问题的部分**：按上面 1–7 列出你确认没有问题的范围，不要省略。
3. **不确定项**：你拿不准的地方单独列出，说明原因；查不到依据时写“未找到”，不要猜测。

不要输出与译文无关的代码审查意见。
