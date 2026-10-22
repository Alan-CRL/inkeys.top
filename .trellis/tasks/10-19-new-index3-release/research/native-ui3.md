# Read-only source findings

参考仓库D:/Project/Inkeys/Repo/Inkeys只读，其.trellis/spec/native-desktop/index.md确认UI3 Bar为当前入口。禁止改动/构建该仓库。

- Inkeys/Inkeys/UI/Bar/Bar.Metrics.cppm: gap5、one side32.5、two side70、button radius4、border1、icon28、label13；press.95、hover.24s、operation.4s、hover fade5s；bar80/radius8、dark RGB24/.8、frame white/.18、main80/gap10。
- Bar.Initialization.cpp 302–330: 深色UI/logo1，浅色UI/logo2，完整height80；UI/Frame94为独立着色层初始pct0，发布展示保持隐藏。
- Bar.RenderLoop.cpp 1490附近: 展开main n=10/.8；收起n=3/.6不适用。845/1455附近release pulse1.05。1510附近区分base Logo和绘制态着色层。
- Inkeys/src/UI/logo1.svg：256x256 viewBox，两个frame路径white/.22，笔路径white，完整clip defs。旧网站Ui3Bar手写frame.2，不可照搬到release。
- Bar.Button.cpp: 未选中绘制图标barBrush1，选择barSelect，图形barGeometry，橡皮barEraser，撤回barRecall，白板barWhiteboard，定格barFreeze。标签图形/撤回按用户指定。
- 网站NewHome/icons与原生路径一致；六份SVG将rgba(10,0,7,0)转currentColor和CRLF规范化后完全一致。Freeze网站去掉了原生clip wrapper/ref/defs，保留其原路径和描边即可，或者拷贝完整有效SVG。
- Bar.Scene.cpp 252/324/377: hover .24s显现后5s EaseInSine淡退；普通press .95。Bar.Rendering.cppm光源半径480/240，1px边缘及6px外扩漫反射。Bar.Rendering.cpp 1000附近径向渐变stops 0:1,.25:.72,.65:.2,1:0。网页用有限渐变近似，不用Canvas读像素。

## Web contracts

- NewHome3.vue的.nh3-root只负责hero可见性/高度，新板块放外侧同级。
- 鼠标计算：实际mouse，120px衰减，不变换外层测距，±4deg/6px，.16s指数跟随、.0005终止阈值，touch/pen忽略。系统reduced-motion故意不关闭NewHome3。
- softPen.ts导出createActiveClock（read/seek/setRunning）。旧任务verify-lifecycle.cjs/verify-toolbar.cjs提供不启动GUI的SFC生命周期/VNode编译验证。
- Ui3Bar.vue默认carousel事件/鼠标边缘光保留。默认窄屏隐藏部分组，release必须局部覆盖。Ui3BarButton事件不监听则不改变选择。
- 首屏下载https://1709404.share.123pan.cn/123pan/duk9-Gdr4d，新标签页；用户选定沿用，不改docs/download.md或DownloadCard.vue。
- 原untracked：design-drafts/、docs/.vuepress/theme/components/NewHome2/、docs/new-index2.md，全部保留。
