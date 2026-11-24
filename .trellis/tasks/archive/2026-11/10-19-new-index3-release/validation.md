# Verification — 2026-10-19

## Visual revision — 双墨迹移除与深色标题柔化

按用户最新反馈移除双彩虹墨迹、遮罩、几何/颜色采样及关联彩色反光。深色标题改为低饱和青绿色`#8eb8b3`，保留浅色配色、字号、字重与布局。原生主栏、悬停/按压/回弹、鼠标视差、下载及SSR窄屏缩放保留。内容入场结束时间由2.1s缩至1.25s，删除原墨迹淡出尾段。

- 实施与独立trellis-check均运行三组既有CLI回归，全部退出0；未发现需要额外修复的问题。`git diff --check`及4个修订源文件UTF-8无BOM/LF检查通过。
- 内置pnpm执行既有`docs:build`：退出0，26.52s，渲染50页；只有PLUGIN_TIMINGS耗时诊断。
- 确定性生命周期模拟：入场含两次暂停共执行77次RAF、发布78次场景状态（含初始武装），无布局测量；100次mouse事件合并为一次测距；稳定期间新增RAF、场景更新及姿态更新均为0。
- `RENDER_QUICK=1`实际无窗口Edge检查退出0：1440×900亮/暗、375×812暗，以及320宽无JS回退，共4组通过。确认墨迹不存在、标题终态完整、原生深色主栏、完整Logo及按钮、无横向溢出、mouse/点击/重新进入和静止0RAF。375主栏311×36.48，320无JS主栏约256×30.03。
- 已查看更新后的实际深色桌面截图；结果与截图保存在`.trellis/.runtime/release-rendered/quick-results.json`及同目录PNG。测试服务与隔离浏览器均已结束，无GUI、commit/push、依赖或原生仓库修改。

以下为初版实施的历史验收记录，涉及双墨迹的设计已由上方视觉修订替代。

## Outcome

发布板块已实施并通过独立trellis-check复查。保留原生默认Logo、固定深色主栏、定制按钮、双向彩虹墨迹及来源一致的反光；手机整组等比缩小。新板块独立管理一次性入场、鼠标视差、离屏/隐藏及清理。

## CLI and build

- `node .trellis/tasks/10-19-new-index3-release/verify-release.cjs`：通过。
- `node .trellis/tasks/10-04-new-index3-wordmark/verify-lifecycle.cjs`：通过。
- `node .trellis/tasks/10-04-new-index3-wordmark/verify-toolbar.cjs`：通过。
- 使用内置pnpm执行原有`docs:build`：最终退出码0，16.45s，渲染50页；仅PLUGIN_TIMINGS耗时诊断。系统pnpm启动的数据库问题未通过修改项目配置绕过。
- `git diff --check`：通过；11个产品/验证源文件已核查UTF-8无BOM、LF。
- 项目没有独立lint/typecheck命令，不声称执行过这些命令。

旧首屏测试仅增加展示子组件导入stub，并对齐已经存在的橡皮默认true与下载地址；原有时序/行为断言保留。

## Measured scheduling

任务本地确定性模拟中，入场含两次暂停共执行128次RAF、129次场景发布（含初始武装），无布局测量。100次鼠标事件合并为一次稳定外层测量，80帧后收敛；静止阶段新增RAF/场景/姿态发布均为0。这些计数不是设备FPS。

## Real headless rendering

Edge155.0.4283.62，headless，隔离临时配置，仅允许127.0.0.1请求，不使用用户浏览器资料或Computer Use。

最终完整命令`node .trellis/tasks/10-19-new-index3-release/research/verify-rendered.cjs`退出码0，11组检查全部通过，本地服务及隔离浏览器均已结束。

- 启用JS的6组：1440×900亮/暗、375×812亮、320×568暗、768×1024亮、1920×1080暗。均通过完整主栏、深色表面、原生Logo画布、主题、系统reduced-motion仍演示、无水平溢出和空闲0RAF检查；鼠标倾斜、工具不选中及重新进入不重播也通过。全局RAF计数前先用原有暂停按钮隔离首屏演示。
- 禁用JS的5组：320、375、768、1440、1920宽度。标题完整可见、整条主栏完整容纳、页面无横向溢出。320主栏约256×30.03，375约311×36.48，宽屏682×80。
- 完整JSON和实际截图保存在`.trellis/.runtime/release-rendered/`（忽略的本地生成物），不加入产品资产。
- Windows runner会让已经退出的Edge留下未结束的Playwright客户端关闭Promise；验证脚本限定等待，并检查本脚本拥有的浏览器进程确已退出后结束CLI，不接触用户浏览器实例。

## Independent review fixes

1. 背景墨迹自然末端超出SVG viewBox，默认裁切造成桌面平直截面。修为局部SVG overflow:visible、section统一裁切页面边界；新增回归先失败后通过。
2. SSR初始scale1会在未测量窄屏裁掉主栏。修为未测量时使用CSS保守整组缩放与对应占位，挂载后精确inline接管；覆盖初始、断点、挂载、无观察器及320精确比例。

未启动交互式GUI，未做Safari真机验收，未修改原生仓库、依赖或锁文件，未commit/push；原有3项未跟踪草稿保留。
