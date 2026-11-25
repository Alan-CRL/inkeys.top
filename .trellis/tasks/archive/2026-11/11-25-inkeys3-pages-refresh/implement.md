# Implement

## 阶段一：简体中文

1. 侧栏与标题
   - [ ] `docs/.vuepress/sidebar.ts`（CRLF）：`downloadSidebar`、`versionSidebar` 改名；`downloadSidebar` 后两项包进无标题 `items` 分组（design §1）。不改 CSS。
   - [ ] `docs/.vuepress/plume.config.ts`（LF）：简中版本集合 `title: '更新日志'`。
2. 资源
   - [ ] `git show 04a7af2^:…/{overview,tools}-{light,dark}-2000.webp` 恢复到 `docs/.vuepress/public/showcase/`，二进制写入，不经文本管道转换。
3. 按钮样式
   - [ ] `site.css`：`.doc-actions`、`.doc-actions--center`、`.vp-doc a.nh3-btn`（design §4）。
4. 页面
   - [ ] `docs/version/inkeys3.md`（CRLF）：按 design §5.1 重写（文案已定稿，不再核实）。
   - [ ] `docs/version/introduction/win7.md`（LF）：按 design §5.2 重写，“一些杂物”提示逐字保留。
5. 验证
   - [ ] 先确认用户的 `pnpm start` 是否在运行；运行中时禁止 `pnpm docs:build`，改用隔离构建：
         `NODE_ENV=production npx vuepress build docs --dest <repo>/node_modules/.i18n-build/dist --temp <repo>/node_modules/.i18n-build/temp --cache <repo>/node_modules/.i18n-build/cache`
   - [ ] 构建输出无新增警告 / 错误。
   - [ ] 无头 Edge（Playwright，clean-URL 静态服务器）截图：`/download` 侧栏（分组空隙，无线条）、`/version/` 侧栏（间距不变）、`/version/inkeys3` 浅色与深色、`/version/`、`/win7`，以及 375px 窄屏的按钮行。
   - [ ] 检查：图片按外观切换；按钮无下划线、无外链图标、悬停正常；“立即下载”为站内跳转；`/zh-tw/version/inkeys3`、`/en-us/win7` 仍正常。
   - [ ] `git diff` 确认编码、换行符未变，无无关改动。
6. 交付用户审阅简中效果；提醒上传 `public/showcase/` 到 123 云盘备用通道。

## 阶段二：繁中、英文（用户确认简中后）

- [ ] `sidebar.ts` 的 `zhTW*` / `enUS*` 侧栏改名，下载侧栏同样分组（更新日誌 / Changelog 等用语以软件语言包与 i18n 术语表为准）。
- [ ] `plume.config.ts` 繁中、英文版本集合标题。
- [ ] 按定稿简中翻译 `docs/zh-tw|en-us/version/inkeys3.md` 与 `introduction/win7.md`，链接指向同语言路径。
- [ ] 重跑阶段一第 5 步的相关检查，以及 i18n 规范中的 `verify-i18n.cjs`。

## 回退

所有改动集中在上述文件与 `public/showcase/`，逐文件 `git restore` 或删除新目录即可回退。
