# Implementation Plan

用户于2026-10-19明确批准最终proposed_plan并要求实施，不再重复请求批准。

1. trellis-implement代理拥有全部产品代码及任务本地回归：主栏默认兼容发布变体、原生SVG、发布组件、首屏同级接入与共用pointer target。主会话拥有task artifacts/spec/协调。
2. 任务本地无窗口验证native SVG/Logo、分组与默认兼容、single-shot/hidden/offscreen/resize/no-observer/SSR/RAF/cleanup、false媒体查询下mouse、pen/touch忽略、320–1920等比尺寸。记录入场/移动/静止的更新及RAF次数。
3. 运行旧任务verify-lifecycle.cjs和verify-toolbar.cjs；若旧harness需要支持展示child import，只最小调整stub，不削弱原断言。
4. trellis-check独立校验并自修bug，检查语义/性能/SSR/原生细节/旧路由。运行现有docs:build。没有独立lint/typecheck命令，不声称通过未存在的检查。
5. 主会话检查git diff/encoding/边界，必要时更新规范/验证记录。禁止commit/push，finish前确认归档脚本有安全no-commit选项，不能触发默认自动提交。

## Tools

- Python: C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe（系统python商店别名不可用）。
- Node已确认v24.16.0。
- 系统pnpm报unable to open database file，为本机启动问题；使用C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm.cmd（11.25.0）执行既有docs:build，不改packageManager/依赖/锁文件。
- 禁止交互GUI；构建允许至少5分钟，长进程轮询而非反复重启。

## Review Gates

Logo精确.22，没有Frame94覆盖层；展开主按钮n=10；手机整条等比缩小；下载同首屏；新旧observer各自观察各自区域；新板块静止无常驻循环；保留原先3项untracked草稿。

## Visual revision — 2026-10-19

用户明确要求去掉两道墨迹并柔化深色标题。本轮只修改ReleaseSection.vue、releaseScene.ts、Ui3Bar.vue内的相关发布样式及既有verify-release.cjs断言。移除关联彩色反光和不再需要的采样/淡出计算，内容入场在1.25s结束；保留原生主栏、布局、交互、3D视差、SSR缩放和下载地址。继续走implement→check与既有CLI/生产构建验收，不创建新任务，不请求重复批准。
