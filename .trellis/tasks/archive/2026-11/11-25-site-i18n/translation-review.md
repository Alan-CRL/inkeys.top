# 译文审阅清单（zh-TW / en-US）

> 审阅后在对应条目打勾或直接在文件里改。繁中采用台湾地区用语，术语以软件自身语言包为准（`research/app-glossary.tsv`，取自 `Inkeys/src/i18n/{zh-CN,zh-TW,en-US}.jsonc`）；品牌名繁中 / 英文均为 “Inkeys”。

## 1. 术语对照

| 简体 | 繁中 | 英文 | 依据 |
| --- | --- | --- | --- |
| 智绘教Inkeys | Inkeys | Inkeys | 用户决定；与软件 README_zh-TW 一致 |
| 屏幕批注 | 螢幕批註 | Screen annotation | 软件 README |
| PPT 演示 / 幻灯片 | PPT 簡報 / 投影片 | Slide show / slides（UInk 页用 PowerPoint） | 台湾惯用 |
| PPT演示助手 3 | PPT簡報小幫手 3 | PPT Presentation Helper 3 | 软件语言包 `SettingsUI.PlugIn.PPTHelper.N` |
| 白板 | 白板 | Whiteboard | 软件语言包 |
| 主栏 / 底栏 | 主欄 / 底欄 | Main bar / Bottom bar | 软件语言包 |
| 定格 | 定格 | Freeze | 软件语言包 |
| 选择 | 選擇 | Select | 软件语言包 |
| 荧光笔 / 激光笔 | 螢光筆 / 雷射筆 | Highlighter / Laser pointer | 软件语言包 |
| 硬笔 / 软笔 / 刷子 | 硬筆 / 軟筆 / 筆刷 | Hard Pen / Soft Pen / Brush | 软件语言包 |
| 橡皮 | 橡皮擦 | Eraser | 软件语言包 |
| 手掌橡皮 | 手掌橡皮 | Palm eraser | 软件语言包 |
| 设置 | 設定 | Settings | 软件语言包 |
| 数位板 / 屏幕笔 | 繪圖板 / 螢幕筆 | Drawing tablet / Screen pen | 软件 README |
| UInk 等级 核心 / 基础 / 标准 / 完整 / 附加级 | 核心 / 基礎 / 標準 / 完整 / 附加級 | Core / Basic / Standard / Full / Inkeys extension | `docs/standard/levels.md` |

## 2. 需审阅的文件

### 页面

- [ ] `docs/zh-tw/tos.md`：由简体版经 OpenCC（s2twp）转换后人工校对法律用语（聲明、授權條款、數位簽章、存取、儲存庫、函式庫等）。**请重点确认**：
  - 第 299 行商标条款「與「Inkeys」相同或近似的名稱」：按品牌决定写成 Inkeys，简体原文是“智绘教Inkeys”。若希望法律文本保留完整中文品牌名，请告知。
  - 第 404 行“以簡體中文版本為準”保留。
- [ ] `docs/en-us/tos.md`：沿用原英文版，仅删去页首手写的语言切换行，正文未改。
- [ ] `docs/{zh-tw,en-us}/standard/README.md`（UInk 首页）：规范正文链接指向简体页，卡片描述注明“（簡體中文）/ (in Chinese)”。
- [ ] `docs/{zh-tw,en-us}/version/inkeys3.md`、`version/introduction/win7.md`：微软链接改为对应语言的 `support.microsoft.com/<lang>/help/2670838` 与下载中心；未翻译页面（更新日志、PPT 助手）用简体绝对路径并标注。
- [ ] `docs/{zh-tw,en-us}/index.md`、`download.md`：只有 frontmatter，正文由组件提供。

### 组件

- [ ] `DownloadCard.vue` 的 `COPY`：下载页全部文字。英文版权署名与软件英文 README 一致，写作 “AlanCRL (Chen Runlin / Chen Yunlam) Studio”（页脚相同）。下载详情里的“提供方”文字来自服务器 JSON，未翻译。
- [ ] `UInk/UInkHero.vue`、`UInkTierDemo.vue`、`UInkStructure.vue` 的 `COPY`：UInk 首页图示文字。
- [ ] `AsideNav.vue`：文档页右侧小组件。
- [ ] `NewHome3/copy.ts`：首页与顶栏按钮。本轮校对改动：
  - 英文首屏标语改用软件英文 README 的原句 “Fluid ink. Beautiful motion. / Screen annotation that feels as good as it looks.”；
  - 笔名称按软件语言包：英文 Hard Pen / Soft Pen / Laser pointer，繁中「筆刷」；繁中「切回選擇」（软件用「選擇」）。
  - 其余繁中 / 英文首页文案沿用原临时稿，已通读，未发现需要改的地方，请重点看 S2 三段长文与 S5-B。
- [ ] 顶栏 / 侧栏 / 页脚 / 站点标题与描述（`navbar.ts`、`sidebar.ts`、`plume.config.ts`、`config.ts`）：
  - 侧栏「PPT簡報小幫手 3」/「PPT Presentation Helper 3」按软件语言包；英文「碎碎念」暂译 “Ramblings”，可换成你更喜欢的说法。
  - UInk 规范侧栏条目全部翻译，链接到简体正文。

## 3. 不在页面代码里的文字

- 下载页版本号后缀（例如 “20261109a Insider 通道”）和下载详情里的提供方文字来自 `website_version_2.json`，繁中 / 英文页面也会显示服务器返回的简体中文。若要翻译，需要在 JSON 里加多语言字段，属于另一项改动。

## 4. Codex 交叉审查（2026-11-25，gpt-6.2-sol / high，只读）

完整报告：`codex-review-report.md`（必须改 10 条、建议改 23 条、可选 5 条、不确定 3 条）。抽查了它引用的软件语言包行号（崩溃处理方式 / Crash handling、Pen tablet、Main toolbar、边擦边写、游标）与镜像站名称（页面标题为 “HERNET”），均属实。

**已采纳并修改**

- 首页英文：PPT 不再省略（PPT slideshows）；翻页按钮“闲置淡化”不再写成“永不遮挡”；S2 三段标语与正文、S5-A 标题与导语、S5-B 正文改写（Main toolbar、pen tablet）；末屏标题与导语。
- 首页繁中：「解除定格並切回「選擇」後，就能照常操作背景」；「光影隨游標流動」；「數位板」（软件繁中语言包用「數位板」，我原先写成「繪圖板」，Codex 未发现，我核对语言包时补上）。
- 下载页：英文 HERNET 镜像、开源授权句、风险提示改写、pen tablet；繁中首句语序、「訓練」「大型觸控顯示器」「數位板」。
- UInk：英文等级说明的辅助文字（避免 “a Inkeys extension reader”）、“annotations” 代替易误解的 “notes”、“Stored separately for each screen”、“Start a new page at each Canvas”、“the app can append”（原句写成“只会追加”）、第二个小节标题改为 “All in one: one whiteboard, one file” 与第一节对仗；繁中「範例」统一、换页描述改写。
- win7 页繁中 / 英文的系统需求句式与 D2D1.1 描述；站点描述（去掉「絲滑」、英文不再夸大为 every task）。
- 繁中使用条款：个人资料 / 敏感個人資料 / 明確同意 / 揭露 / 記憶體傾印檔案 / 當機 / 處理序 / 本機 / 服務提供者 / 主管機關 / 開源授權 / 衍生著作 / 憑證簽發機構 / 標誌 / 版面配置 / 以營利為目的散布 / 依現況提供 / 適售性 / 衍生性損害 / 資料遺失 等台湾法律用语。

**未采纳**

- 英文侧栏标题缩短（Levels & Certification 等）：侧栏过窄的根因已在另一会话修复（`custom.css`），1440px 下侧栏恢复 260px，不再截断。
- 「PPT簡報小幫手 3」是否补 “Lite”：依据不足，保持现状（Codex 也不建议补）。

**用户决定（2026-11-25）**

- [x] **英文使用条款**：按报告修订了 8 处语义偏差（“You” also includes、3.5 检查是否包含敏感内容、Local Processing、仅使用境内服务商、由我们签名、著作权及相关权利归属、自发布或通知载明的生效日起、强制在消费者居住地起诉）；页首新增 Last Modified: November 25, 2026，生效日期改为 November 25, 2026，首次发布日期保留。
- [x] **繁中使用条款**：發布日期、生效日期均为 2026年11月25日。简体条款不动。
- [x] **「教学安全模式」**：保留现有叫法，三种语言不改（软件后续会改名对齐）。

## 5. 发现但未处理的既有问题

- 宽度 1440–1660px 时侧栏只有约 150px 宽（`custom.css` 把 `--vp-layout-max-width` 设为 1660px，Plume 的侧栏宽度公式在这段宽度里算出的值小于 260px）。中文条目短不明显，英文规范侧栏的长条目会被截断（如 “Levels and Certification”）。简体页面同样受影响。已由独立会话修复：`custom.css` 中 `--vp-layout-max-width` 改为 `min(100%, 1660px)`（未提交，与本任务改动同在工作区）。
