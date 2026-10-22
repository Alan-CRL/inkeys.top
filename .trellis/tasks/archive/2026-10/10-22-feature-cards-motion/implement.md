# 实施

1. 阅读组件、ReleaseSection、现有 active clock 和前端 specs。
2. 修改完整卡片布局、交替头部、舞台占比、低调控制，收紧发布区段底间距。
3. 加入 mount 后无重复随机入场及可见性生命周期，保留轮播语义。
4. 在本任务编写 CLI 回归，可沿用已归档 framework 测试改造；不改历史测试。验证 SSR、无 IO、随机唯一、暂停续播、一次性、轮播入场门控、卸载清理、移动端结构。
5. trellis-check 审阅并运行必要检查，pnpm docs:build；不执行 GUI。
6. 更新相关 component spec，记录结果、归档任务与 journal；不 commit/push。

回滚范围为本任务组件布局/动效改动及 ReleaseSection 底部间距，不回滚上轮已有框架。
