# new-index3 Inkeys 手写动画重做

## Goal and approval
重做 /new-index3 首屏 Inkeys 文字、平滑书写动画、响应式与视差。2026-10-04 用户已同意官网子任务并批准实施；本轮中途明确否定首版效果，并要求彩虹直接沿平滑曲线绘制、完全脱离物理模型和原始折线影响。该最新指令替代旧物理模拟方案。

## Requirements
- R1 全新设计手写中心线，不沿用原字形算法。按自然笔顺 I / n / ke / y / s 顺序执行，必要时可进一步断开不自然的连笔；抬笔不连线。整词按同一手写字体体系统一倾斜、粗细、圆润度和字距，先用单色字形验证协调性再上彩虹；收敛 I 宽横饰、k 高环、e 窄圈、y 长尾的比例差异，禁止为连笔牺牲字形，尤其 y 与 s 分开。I 可辨识大写；k 舒展上伸、y 下伸回环。参考用户 hello 图片，圆润、舒展、少量连笔。
- R2 彩虹直接沿精心设计的平滑贝塞尔曲线绘制，不运行墨迹物理模型，不受原始采样点或折线影响。按弧长及曲率安排直快弯慢的时序，压感笔宽85%–115%，圆头无笔锋。无需任何实时平滑模拟。
- R3 彩虹沿累计书写弧长连续变化，抬笔不重置。连续变宽轮廓避免盖章结节；所有笔画接头均为 round join，包括急转弯和回描，不允许透明裂缝或内部小洞；交叉处后写覆盖先写，轻微局部阴影仅落下层墨迹。
- R4 首次彩虹书写4.2s、保持3s、渐隐0.7s。之后循环：灰点折线4.2s、保持0.35s、保留灰线重写彩虹4.2s、保持3s、一起渐隐0.7s。首次与循环使用同一成品。
- R5 灰点低对比、小圆点、细折线，只作原始输入的示意，与彩虹独立。长直段稀疏、弯道/小圈/回折局部加密，以字形正常可读为先，不限定总点数，允许 I 等笔画回描；新点与到前一点的整段同帧出现，不沿线伸长、不跨笔。灰色示意也可自然断开，断点不必与彩虹完全一致。
- R6 虚拟平面外围约120px内距离衰减启用视差，最大±4deg/6px，平滑回正。灰线墨迹同平面，触屏禁用；reduced-motion仅显示静态完整彩虹。
- R7 水平居中，导航下可用高度42%处；桌面目标56vw最大900px，窄屏左右至少24px，无溢出最小宽；矮屏高度约束，含视差不裁切。
- R8 标签隐藏或离屏暂停、恢复接续；卸载清理。保留开发定格时间入口覆盖完整时间轴。
- R9 仅浅色文字与交互；不添加介绍、按钮、下滑内容或背景重设计。不改其他页面、公共API、路由、依赖。

## Acceptance
- 命令行校验时间递增、自然笔画顺序、抬笔不连线、数值有限、宽度边界、循环切换及暂停恢复。
- 检查320/375/768/1440/1920px及矮屏边界（含视差）。
- pnpm docs:build通过或如实报告环境问题，不升级依赖绕过。
- 不启动交互式GUI/浏览器，不commit/push，保留编码换行与其他未提交成果。
- 构建与数值检查不能冒称人工视觉验收已通过。

## 最新示意折线要求
用户再次明确：局部点可以密一些，力争字形看起来正常，允许例如 I 的回头路。旧固定点数仅为首版约束，已取消。

## k/e 第二轮优化（用户已授权）
基线版本已提交10a4dfd。仅减轻 k/e 的结构重量：简化 k 右上闭环和腰部回描、舒展下腿到 e 的过渡、适当打开 e 字腔；k 可分两笔。保持其余字母、全局笔宽、动画/视差不变。此轮不沿用前一任务的一次性commit授权。

## 灰线收起与暂停按钮（6be2b54后，用户已授权）
- 后续循环彩虹书写完成的同一时刻，灰色折线/点立即隐藏，保持期与渐隐期只显示彩虹。
- 首屏右下角圆角矩形原生按钮“暂停动画”。任何阶段点击即呈现完整、不透明、无灰线彩虹并停止时间轴；文字切换“继续动画”。再次点击立即从彩虹渐隐阶段开始，随后正常灰线/彩虹循环，不额外停留、不接续半截笔画。
- 按钮相对首屏绝对定位，right/bottom共享同一响应式间距值；刷新与resize正确靠右下，未来下滑时跟随首屏上移，不fixed、不sticky。
- 保持现有系统减少动态效果优先、隐藏页面暂停与视差行为，原生键盘操作和可见焦点。此轮先提交了字形基线6be2b54，新改动不自动追加提交。

## 抬笔移动与最终提交授权
用户追加：两笔间加入类似真实笔移动的延迟，按抬笔距离合理变化，空中移动时不画连接线；适用于 k 两笔和其他抬笔。此次所有新改动完成验证后明确授权再创建commit，不push。旧的“新改动不自动提交”仅指此前未授权时的默认，已由本条替代。

## Dark palette / atmospheric background / integrated navbar
当前轮次扩展视觉范围：实现深色专属彩虹、灰线及按钮配色；浅/深背景采用微弱的大范围柔和渐变，移除网格。首屏渐变延伸至Plume顶栏，移除其纯色填充、分割线，保留logo、文字、搜索、菜单及主题切换的原有功能。调整导航/搜索对比度，使之适合各自背景。
仅作用于NewHome3路由，其他文档页不受影响。切换主题时包括暂停、reduced-motion及开发定格状态也应立即重绘，不重启动画。保持已认可字形、时序、暂停按钮位置和滚动行为。无GUI测试，无新增依赖；本轮未授权commit/push。
验收：亮/暗Canvas像素不同且主题往返无缓存残留；灰点深色可辨但低于彩虹；主题切换生命周期不泄漏；SSR输出已包含页面范围样式标识；导航各层背景/分割线均处理且移动菜单可读；生产构建通过。

## Icon playback control and graceful pause
本轮按钮专属优化：超椭圆图标按钮，无可见文字、无title/tooltip；保留动态aria-label、键盘操作和focus-visible。悬停轻微放大并渐深底色，按压缩小，非线性柔和过渡；暂停/播放图标应有粘连般连续形变，不新增依赖。
暂停不再瞬跳完整字：冻结当前帧，先渐隐当前墨迹/灰线，再渐显完整不透明彩虹。继续仍渐隐后重播；快速连续点击、主题切换、窗口缩放、离屏/隐藏与reduced-motion需保持一致且不突跳。减少动态效果时直接静态且禁用动画按钮。
用户明确要求先提交上一轮、完成后再次提交。上一轮commit首次因1Password签名failed to fill whole buffer失败；用户明确要求重试后正常签名成功，提交92a733f。最终按钮修改亦已获单独提交授权。

## Approved multi-pen plan (current implementation scope)
2026-10-04 user explicitly approved implementation; no commit/push. Initial complete default rainbow hard medium: .5s fadein,3hold,.7fadeout then configuredloop. Defaults pens=[hard],color=rainbow,size=medium; state not persisted.
Pen order hard,soft,highlighter,laser,brush; each4.2write+3hold+.7fade. Only exactly one hard OR exactly one soft adds4.2raw+.35rawhold beforeink; raw disappearswheninkcomplete. Pendingpen/color/size apply afterCURRENT PEN fade, not allpensround. Penlistchanged startsfirst; onlycolor/size keepsnextorder. Mergeeditslatest.
Palette48pxsquircle leftofpause12pxgap; popovernonmodal abovecontrols max320px narrow16margin; toggle/X/Escape/outsideclose, keyboardclosefocusreturns; animationscontinue. Threegroups:5checkboxes(multiselect/empty),8colorradios(rainbow,neutral,red,amber,green,cyan,blue,purple),3sizeradios(thin/medium/thick=.7/1/1.4).
Pauseanyphase freezesoutgoing .22fadeout then .30fadein defaultfullhard/rainbow/medium; selection retainedandeditablepending. Resume default.7fade→firstselectedorart. Rapidtogglecontinuous. Theme/resize/visibility preserveclock.
Hard unchangedbaseline15.5 pressure. Soft samepath pressure plussmoothstart/end taper overatmost8%/12%strokearclength; noDraw3buggytaper. Highlighter fixedverticalrectangle8:1; medium31x3.875 designunits,alpha.35; samepenunion/MAXnoalphastacking, separatepenoverlapsourceover. Brushsamegeometryalpha1. LaseronlymaterialNOpaticles: middlebody15.5,whitecorebody/3,scatterhalfwidthcoreRadius*.4,fixedouterdiffuse15.5 regardlesssizes;4coverageMAXsamepenthenpremultipliedmaterialresolve asnative. Wholewordtimingwebsite. Allstylespreserveacceptedglyphs/lifts; maxboundsinclthicklaserandtilt.
Onlyhard/soft supportrainbow; unsupportedselectedrainbow getsoneuniformrandomregularcolor perappearance, stableuntilnextappearance; themeonlymapscolorid. Artwhenempty: Ink sans+eysserifitalicfromNewHome2 (NO3/noimportdependence), purecolororrainbow; nofadecycle,diagonalclippedhighlight6speriod1.8ssweep. Artcolorchange shortcolortransition, thicknessstoredonly. Selectpensfromartfade→first. Keepcenter/responsive/tilt.
Reducedmotion noanimation/loop/shimmer/transitions: displayappropriatefullstaticstyle; cleanupRAFs/listeners. NewHome3productmodulesonly; noGUI/nativeRepowrites/dependencies. Testsselectioncombinations/boundaries/randomstability/pause/empty/reduced/visibility; pixelsalpha.5775twostrokes,opaqueBrush,laserwhitecore/MAX/thickbounds. Buildexistingpnpm docs:build.

## 软笔末端收锋修订（当前要求优先）
起笔不再收尖，保持与硬笔相同的完整圆头。仅末端渐细，扩大平滑收锋区，消除突然变细的视觉拐点。保留现有中心线、压感与书写速度，其他笔型不改。用户明确要求完成后commit；包含本轮修正及上轮尚未提交的多笔型功能，不包含NewHome2、client.ts的既有草稿或生成预览文件，不push。

## 发布前隐藏旧预览入口
用户要求只保留new-index3网页入口，停用new-index/new-index2，并commit后push。多笔型与软笔已提交e8e9f89，无需重复提交；NewHome2本地草稿不单独发布。
实现边界：VuePress pagePatterns保留默认Markdown扫描与.vuepress排除，额外排除两个旧根页面；client.ts移除旧预览组件导入/注册，保留NewHome3。旧源码及未跟踪草稿不删除、不打包进本次提交。验证构建中仅new-index3被生成，旧路径不出现在路由/站点地图/LLM索引中。正常签名commit及非force push；若认证/签名失败停止并报告。


## 2026-10-05 已批准：左展开样式栏与橡皮退场（覆盖旧面板和轮播集合变更规则）
用户批准本轮直接实施，不 commit、不 push。桌面48px高向左展开，控制按钮不动，300ms可逆非线性动画；小于1100px上方多行，16px留白/矮屏滚动。笔类型图标+文字超椭圆按钮 aria-pressed，多选且可全不选；原生UI SVG硬/软/荧光/激光/刷子/橡皮，原生仓库只读；颜色八选一；粗细用三种圆头斜线表示。调色盘/Escape/外部关闭，无独立×或tooltip；关闭后不可聚焦，键盘关闭焦点返回。
以当前笔固定顺序位置向后找最新选中项，末尾才绕回。保持期结束、退场开始前锁定退场方式/下一项/设置；退场期间新变更留下一次边界。橡皮只作末尾退场动作，不算绘画笔数；硬笔+橡皮或软笔+橡皮仍先灰线。多笔最后一笔擦除，其余渐隐。默认不启用橡皮。
擦除2.8s，从左上横向往返圆滑折返到右下，前慢后快，一次覆盖全字含激光外扩。速度过滤后渐粗，增长约200ms，转弯短减速保持尺寸/缓慢缩小。圆形半透明轮廓+握持条纹光标与擦除半径一致、与文字同视差。只删除文字像素，不能涂背景；手写离屏蒙版，艺术字DOM共享轨迹mask。确定性重建支持低帧率/主题/缩放/定格。
仅橡皮：艺术字0.3s渐显/3s停留/2.8s擦除循环，无扫光。全空仍持续艺术字+低频扫光。暂停冻结擦除画面再220ms淡出/300ms默认彩虹硬笔淡入，继续从首选笔开始。reduced-motion完整静态，无擦除/扫光/展开过渡。保留开场/其他材质及字形。
验收：64工具组合、动态选项边界、取消当前笔、绕回、暂停快速点击、空/仅橡皮；像素透明/无残留/光晕及艺术字mask；320-1920px/矮屏/主题/键盘；TypeScript、CLI回归、pnpm docs:build、diff。不开GUI，不动无关草稿。

2026-10-05 实施中补充：用户再次强调橡皮光标必须与软件同款。复用 Draw3 EraserGripCircle：白色圆盘、#cfcfcf 内描边（直径0.04）、两根灰色竖向胶囊握持条（中心±0.12D、半径0.05D、半高0.24D），整体透明度0.5；轮廓外径等于擦除直径。以 Assets/EraserGripVisual.h 和 inkPixelShader.hlsl type6 为准，不用普通空心圈替代。

2026-10-05 最新用户修正：擦除往返必须遵循所附两幅示意图，以明显的斜向右上挥动和弧形左下回落交替，整体向右下推进，幅度自然变化；不能沿水平行扫描，也不能只是把水平行轻微倾斜。每次挥动有真实的加速、折返减速节奏，保留转弯粗细平滑。用户新授权：完成后提交 commit，不 push；覆盖此前本轮不提交的约定。

## 2026-10-05 上凸路线与从容擦除节奏（最新要求）
上一轮已按用户本轮明确授权正常签名提交 f4eb05b。接下来用户要求改进擦除路线：保持斜向往复/向右推进，但长挥动必须向屏幕上方拱起，不能保持下凹/S形弧腹；路径整体平滑和谐，不像折线。低曲率直行较快，接近折返减速，取消当前僵硬且赶时间的观感。擦除开始前光标先渐显并停顿，结束后稍停、渐隐消失，消失后再稍停开始下一轮。实际擦除光标为原生按下状态不透明（白盘/灰圈/双条比例保持）。用户只要求先commit旧版，本次后续修改不额外自动commit或push。
继续保留工具栏、字形、墨迹材质、轮播后继锁定、暂停/主题/尺寸/离屏行为；修正擦除几何/节奏/光标呈现及必要验证。不开GUI，原生代码只读。


## 本轮：擦除性能、自然运动与视差恢复（最新要求）
用户要求优化擦除墨迹性能，重新平滑斜向上拱路线并模拟真实速度，恢复鼠标3D视差。光标显现时立即开始移动/擦除，不再有入场后准备停顿；结束仍可停留、淡出、空白停顿。修复应针对历史路径每帧重放、转弯内部近尖点、120Hz光标量化，以及真实DOM中的视差链路。保持文字/笔型/工具栏与暂停规则；本轮未授权commit/push。验收增加实际晚段帧耗时、连续位置和内部转弯/加速度检查，不只验证C2接头。
