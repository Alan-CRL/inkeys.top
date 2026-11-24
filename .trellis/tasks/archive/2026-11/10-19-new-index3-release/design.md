# Technical Design

## Boundaries and reuse

将发布区块接在NewHome3.vue现有.nh3-root首屏外侧，作为同级内容。新组件只在NewHome3本地引入。保留首屏布局/时钟/渲染模型，抽出无状态pointer target计算供首屏和发布区块共用，参数保持120px距离衰减、±4deg/6px、.16s跟随。

扩展已有NewHome/Ui3Bar.vue：可选variant: 'default' | 'release'（默认default）及downloadHref，旧入口DOM/行为/断点不变。发布变体固定深色、展开状态主按钮、原生Logo、两组自定义工具和末尾下载。Ui3BarButton添加相同默认兼容的变体用于原生交互，不建立新通用组件框架。复用已有SVG；仅必要原生Logo资产放组件目录，不放public。

发布分组五个twoTwo（选择/select、绘制/brush1、图形/geometry、橡皮/eraser、撤回/recall）和上下两个twoOne（白板/whiteboard、定格/freeze），无selected/active切换。下载宽于普通按钮。主按钮只有视觉交互，不折叠主栏。

## Native visual contract

原生来源详见research/native-ui3.md。长条外框80高、按钮70x70、5间距、28图标、4按钮圆角、8长条圆角、1边框；表面rgba(24,24,24,.8)，白色边框.18。主按钮80x80、距长条10，展开时超椭圆n=10。Logo用完整logo1.svg，笔形white、框white/.22，不创建彩色Frame94覆盖层。

默认变体保持现状；发布普通按钮使用原生.95按压和.4s曲线，hover .24s显现及原生淡退；主按钮释放脉冲1.05，.4s克制回弹。隐藏/离屏停止动态调度，终态不循环。

## Scene and scheduling

组件包含section（可见性）、标题、稳定测距plane、入场wrapper、缩放wrapper、视差surface、文案。布局负责缩放后占位宽高，不用变换后的getBoundingClientRect反向算目标。整组natural width缩到available/natural，最大1；手机不隐藏工具、不横滚、不换行。预留3D安全区。

2026-10-19视觉修订：移除两道墨迹SVG、遮罩、几何/颜色采样，以及主栏对应的彩色反光CSS和变量。主栏保留原生深色表面、边框、悬停/按压，不增加替代装饰。深色主题标题由荧光青色调整为低饱和青绿色，保留字号、字重及浅色主题标题样式。

有限时间轴只保留内容入场：标题0–.65s；主栏.18–.88s、文案.55–1.25s上浮20px/淡入。移除墨迹后不再等待原1.4–2.1s淡出阶段，正文完成即停止场景调度。

复用createActiveClock；首次有效进入开始，inViewport且!document.hidden才推进。完成不重播，静止无RAF。视差依真实mouse，归零释放will-change。丢焦/离开/滚动等变化避免残留倾斜；每帧最多一次必要稳定外层测量，禁止逐按钮布局读写。主题/resize不重置时序。

SSR输出完整可见终态，mounted且观察器可用才武装入场；缺少观察器完整终态。系统reduced-motion不关闭本页，必要的!important覆盖局限新板块。全部observer/listener/RAF/交互动画可清理。

最终复查补充：SSR完整可见包括320px起的无JS窄屏。SSR阶段不强制inline scale1，使用按断点最小可用宽度保守计算的CSS整组缩放及占位；mounted后由原有测量值精确覆盖，不双重缩放。

## Compatibility and rollback

无新网络协议、路由或全局样式。保持NewHome3 Safari兼容方案。撤回仅涉及新组件和主栏可选变体/视差纯函数提取。原文件UTF-8无BOM、LF。
