# UInk version 10 草案规范完善实施计划

- [x] 更新介绍、版本、Type ID 与公共编码规则，明确预 Beta 兼容边界和第三方实现目标。
- [x] 更新 Header、Header Extension、主文件和增量写入，统一快照计数、隐式单例、截断恢复与原子保存。
- [x] 更新 Device、Canvas、Ink 与 Shape，落实逻辑像素、合成顺序、layer 0 viewport、latest 显示和基础渲染规则。
- [x] 更新 Media 与 Color Map，落实 ZIP 安全、资源预算、占位语义和颜色容错。
- [x] 新增 conformance 页面并加入 VuePress 侧栏。
- [x] 生成并提交真实 `.uink` / `.uink.extra` 样例、可读说明、十六进制摘要和 SHA-256，不新增项目依赖。
- [x] 搜索并消除 Header 原地更新、多层 viewport、PPT pageIndex 回退、Ink-only latest 和未知块无损保存等旧表述。
- [x] 使用独立 MessagePack 工具解码样例并验证截断尾块行为。
- [x] 运行 `pnpm docs:build` 和 `git diff --check`，复核 UTF-8、CRLF、链接和最终差异。
- [x] 审校全部规范页面的指代、术语和执行步骤，消除影响人和 AI 实现的歧义，但不改变既有线格式与行为。
- [x] 将 version `10` 冻结为 UInk 1.0 Beta，明确兼容基线和后续版本升级边界。

## 风险与回滚点

- Header、viewport 和 latest 规则会改变现有 version `10` 草案线格式，必须同步所有交叉引用和样例。
- 样例二进制必须与可读 JSON 和 SHA-256 一致；不允许手工只更新其中一份。
- `docs/.vuepress/public/` 发生变更时，最终报告需要提醒同步对应静态资源发布。
- UInk 1.0 Beta 冻结后，不得再以 version `10` 发布不兼容的线格式或既有语义修改。
