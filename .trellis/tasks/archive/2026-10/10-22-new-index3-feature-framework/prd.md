# new-index3 功能介绍框架

## Goal

屏幕批注、课件联动、多页白板三个纵向自动轮播框架，不加载动态素材

## Requirements

- 2026-10-22用户批准先做网页框架，动态素材后续专项。不需再次审批已讨论方案。
- ReleaseSection后依次屏幕批注、课件联动、多页白板；保持已有首屏/发布卡片/背景。
- 屏幕轮播：动态批注、保留批注继续操作、定格。课件：随页墨迹、多文稿动态绑定、部分COM异常兼容与开箱即用。白板：背景样式、多页书写。
- 自动循环与低调文字按钮/进度、暂停按钮；手动切换重置时长。焦点停留、离屏、后台暂停并保留进度；仅最可见舞台运行。系统动画关闭不禁用本组件演示。
- 素材仅静态柔和底色和明确占位标识；白板用斜向三背景。无假产品控件、GIF/视频/软件渲染。
- 框架保持后续局部越界能力，响应式至320px、深浅主题、最大1200px、无水平溢出。
- 禁止GUI、软件仓库修改、部署、commit/push；不碰已有无关未跟踪文件。

## Acceptance Criteria

- [x] 三板块接入现有页面、内容和辅助切换可用，SSR默认首项完整。
- [x] 可见性/焦点/暂停/卸载生命周期正确，无空闲RAF或后台轮播。
- [x] pnpm docs:build通过，保持旧编码与实际换行格式（NewHome3为UTF-8无BOM、LF），最小diff和适量中文注释。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
