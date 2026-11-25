# 实施计划：网站 i18n

## 阶段 A：机制（不含正文翻译）

1. [ ] `i18n/locales.ts`、`i18n/useLocale.ts`：语言表、浏览器语言映射、存储键、快捷入口表。
2. [ ] `config.ts` 加 VuePress `locales`；`plume.config.ts` 把 navbar / sidebar / collections / footer 移入三套 `locales`（先放占位译名，阶段 B 定稿）；`navbar.ts`、`sidebar.ts` 按 locale 导出。
3. [ ] `i18n/runtime.ts` + `i18n/plugin.ts`：head 脚本、已翻译路径收集、快捷入口静态跳转页；从 `redirectPlugin.config` 移除 `/inkeys3`、`/win7`。
4. [ ] `client.ts`：快捷入口的站内路由处理、首页滚动判定扩展。
5. [ ] `LocaleSwitch.vue` 接入 `NavActions.vue`；隐藏 Plume 自带语言入口。
6. [ ] `copy.ts` 改为路由驱动，删除 `?lang=` 预览；`NavActions` 下载链接按语言。
7. [ ] 建 `docs/zh-tw/`、`docs/en-us/` 骨架页面（frontmatter + 组件），确认路由、`<html lang>`、语言按钮跳转正确。
8. [ ] 阶段检查：`pnpm docs:build` 通过；headless 验证 AC1–AC7 的跳转行为（见“验证”）。

## 阶段 B：内容与翻译

9. [ ] 使用条款合并：`git mv` 两个文件，新增 `zh-tw/tos.md`，更新页脚 / 侧栏 / `DownloadCard` 引用，生成 `/tos/zh-cn`、`/tos/en-us` 旧地址跳转页。
10. [ ] `DownloadCard.vue`、UInk 首页组件、`AsideNav.vue` 三语文案表。
11. [ ] 页面正文：主页（copy.ts 校对）、UInk 首页、下载页、inkeys3、win7 的繁中 / 英文版；未翻译目标一律用简体绝对路径。
12. [ ] 顶栏 / 侧栏 / 页脚 / 站点标题译名定稿，品牌名 “Inkeys”。
13. [ ] 输出 `translation-review.md`（任务目录内）：术语对照表 + 需审阅文件清单与要点，交用户审阅（AC11 审阅关口）；按反馈修改。

## 阶段 C：验收

14. [ ] `pnpm docs:build`（不得在 `pnpm start` 运行时执行，见记忆 inkeys-website-headless-shots）。
15. [ ] 用 `docs/.vuepress/dist` + http-server + Playwright headless Edge 验证：
    - 以 `locale: zh-TW / zh-HK / en-US / ja-JP / zh-CN` 分别打开 `/`、`/download`、`/standard/`、`/tutorial/tutorial`、`/zh-tw/download`、`/en-us/`（AC2、AC3）。
    - `/inkeys3`、`/inkeys3.html`、`/win7`、`/tos/zh-cn#一、服务说明`、`/tos/en-us`（AC5、AC10）。
    - 英文页点进简体页不回跳（AC4）；语言按钮切换 + 新上下文携带 localStorage 再访问（AC6、AC7）；爬虫 UA 不跳转。
    - 三语言 × 浅 / 深 × 桌面 / 手机 截图检查范围内页面（AC8、AC9、AC12）。
16. [ ] 全局搜索 `docs/zh-tw`、`docs/en-us` 与相关组件中残留的简体字符（AC8）。
17. [ ] `git diff` 检查编码 / 换行无意外变化；不提交，等待用户授权。

## 风险点 / 回退点

- `plume.config.ts` 大幅重排：阶段 A 第 2 步后先单独 build 一次，确认简体站点无回归再继续。
- head 脚本文本需在 SSR 与客户端一致；若切页时出现重复插入，检查脚本是否含构建期不稳定内容。
- 回退：还原 `i18n/`、配置、`zh-tw/`、`en-us/`、改动组件，并 `git mv` 回 `tos/` 两个文件。
