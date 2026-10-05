# Design

## Boundaries
仅改 docs/.vuepress/theme/components/NewHome3/{glyphs.ts,softPen.ts,NewHome3.vue}；命令行验证脚本放任务目录。无运行时依赖新增。保留外围布局背景及当前页面注册。

## Pipeline（按用户最新指令修订）
协调的 I / n / ke / y / s 手写贝塞尔中心线（允许进一步自然抬笔） -> 致密平滑曲线/弧长与曲率速度时序 -> 带宽度、累计弧长的墨迹 -> 直接连续变宽彩虹绘制。彩虹轨迹完全独立于灰色示意折线，不再运行spring/smoothStroke/实时输入模拟。
独立生成灰点示意：长直段稀疏、弯道/小圈/回折自适应加密，不限定总点数，保留 I 等自然回描以确保字形正常。点的坐标、密度不得改变彩虹字形。全词总计4.2s含短抬笔，顺序起笔；拆开 y/s 牵强的斜连线，统一字形、倾斜、间距。灰色折线同样允许抬笔，断点不强制与彩虹一致。
预计算可复现；DOM/Canvas在mounted访问。颜色沿全词弧长，不按屏幕x统一渐变。交叉检测排除邻接/平行回描段；后写覆盖先写，阴影限定已有墨迹。绘制轮廓共享边界，避免细白缝/盖章结节；保持手绘贝塞尔本来的圆润曲率。墨迹活动头按时间插值，灰线按事件离散出现。

## Timeline
纯函数由elapsed求阶段/rawTime/inkTime/opacity。首次7.9s，后续循环12.45s。Vue维护活跃时钟，暂停不消费时间；不重绘静止Canvas。reduced-motion响应偏好变化。开发?t=秒冻结完整时间轴。

## Interaction/layout
从未变换外层测量指针，120px距离衰减、±4deg/6px上限，fine+hover启用，平滑跟随回正。两层共享transform。bounds含原始点、平滑笔宽和阴影，DOM另留视差安全区。视觉中心42%，min(56vw,900px)，窄屏扣48px，矮屏按字形比例限制；DPR上限2；resize不重启。保留Inkeys accessible label，清理全部观察器/监听/RAF。

## Compatibility
不更改全局主题机制，本次无深色专属设计。替换三文件内部为明确授权，其余未提交成果不回退。

## Typography refinement
用户明确否定首版拼凑字体感。重建共享局部坐标体系（基线0、小写高度100、大写/上伸约160、下伸约70），统一右倾与粗细，压缩 I 装饰宽度，平衡 k/y 环形及 e/s 的圆润度。先离屏渲染单色轮廓验证，再审彩虹，不仅修一个接头。

## Round joins / opacity
用户明确要求所有笔画 join 为 round join。急转弯与回描不能仅依赖平均法线拼轮廓；需几何上完整圆角连接，颜色片段合成不留透明孔洞。离屏像素测试对不应有字腔的 I/n/s 做背景 flood-fill，内部透明像素必须为0；并比较首次与复用画布、缩放DPR结果。

## k/e refinement after10a4dfd
以结构减重为主，优先只改glyphs.ts的k/e中心线。必要时将k上伸主干与右侧臂分笔，以消除多次腰部穿越；右臂可自然衔接e。时序按既有多笔调度继续顺序书写，总长保持4.2s。对比单色和彩虹离屏帧并复用round-join/透明孔洞回归。

## Pause control and gray-layer retirement
循环ink完成后timelineAt的rawTime立即变为-1，hold/fade均维持隐藏。手动paused是组件局部响应式状态，paint直接选择完整静态彩虹；恢复时跳转既有渐隐起点（推荐首次fade时间7.2s，经0.7s进入循环），clock支持最小seek操作或等效offset，避免多套循环状态。手动暂停不冻结鼠标视差；系统reduced-motion仍优先显示静态，按钮可禁用防止承诺无法播放。新按钮放nh3-root内，绝对定位right/bottom同一clamp留白变量，圆角与focus-visible样式；随容器滚动、无viewport fixed定位。

抬笔移动间隔由前笔末点至后笔起点的距离计算，加短起落缓冲并设置上下界（约100–240ms），灰点和彩虹共用笔画时序，空中阶段无连线。总书写时长4.2s包含移动间隔，剩余时长仍按曲率速度权重分配。不引入墨迹物理模型。

## Theme extension boundary (supersedes previous light-only/background preservation scope)
颜色实际位于softPen绘制层，背景和按钮位于NewHome3.vue，顶栏属于Plume外层布局。优先复用Plume主题状态和安装版本的导航DOM；按页面SSR class限定样式，在该布局共同祖先绘制连续渐变，避免挂载后添加全局body类造成首帧闪烁/路由污染。必要时只增加new-index3.md的页面class。字形数据、动画时间轴、公共主题和其它页面不改。
视觉方向：浅色珍珠白为底，边缘低饱和薄荷/淡紫柔光，文字后方保留平静区域；深色墨蓝炭底配克制青绿/靛紫柔光，彩虹提高亮度而不加整笔发光。去掉网格。原生导航功能不重写，搜索和按钮用轻半透明表面与清晰焦点态。

## Playback-control transition boundary
产品改动局限NewHome3.vue，只有确有必要才扩展softPen。字形、配色、背景和顶栏不改。按钮保持原右/下等距及首屏absolute定位，图标视觉约20px、点击区域至少44px。焦点轮廓置于不被超椭圆裁切的原生按钮外层。暂停过渡使用活跃时间驱动冻结快照的淡出，再切换为完整静态淡入；不可使用不受visibility控制的裸setTimeout。图标和表面动画尊重reduced-motion。

## Icon-only control and graceful pause implementation
仅NewHome3.vue改动：48px原生button以SVG超椭圆作为背景，焦点轮廓在外层；两子路径同命令圆角轮廓通过既有RAF弹簧插值合并为播放图标。悬停1.07、按压0.94，fill与transform非线性过渡；无title或可见文字，动态aria-label保留。
getPaintState(now)集中解析画面：独立transitionClock累计可见活跃时间，冻结from帧220ms渐隐，再完整无灰彩虹300ms渐显。过渡中再点击仅改目标paused，不重置当前包络；最终目标为继续时从原有7.2秒淡出接回循环。主题/resize重绘不推进时钟；reduced取消过渡静态显示，卸载停止两时钟和RAF。背景配色、字形与原播放时间轴不变。

## Multi-pen implementation boundary and contract
Product scope NewHome3.vue/softPen.ts plus localstyles.ts/playback.ts. Glyphdata,new-index2,globaltheme/nav/routes/nativeapp untouched. Renderer owns styles.ts andsoftPen; UIworkerownsplayback.ts/NewHome3.vue. No runtime deps.
Internal styles: PenKind hard|soft|highlighter|laser|brush, ColorChoice rainbow|neutral|red|amber|green|cyan|blue|purple, StrokeSize thin|medium|thick; RenderStyle={pen,color,size}. Export PEN_ORDER,DEFAULT_STYLE,SIZE_SCALE,resolveSolidColor(nonRainbow,theme):hex. Painter.render(state,width,height,dpr=1,theme=light,style=DEFAULT_STYLE). Explicit scheduler replacesfixedmodulotimeline inVue; purestate separatesrequestedsettings/activeappearance/pendingboundary, randominjectedfortests; painterstabletheme+stylecache.
Nativeevidence under D:/Project/Inkeys/Repo/Inkeys/Inkeys/Inkeys/Drawing/Draw3/: fixedvertical8:1sweep Draw3.StrokeGeometry.cpp:325–368; highlighteralpha min(selectedAlpha,.35) Draw3.DrawingController.cpp:216–230; samepenMAX Draw3.Renderer.cpp:440–472. Laser Draw3.RendererLaser.cpp:37–68 and Assets/inkPixelShader.hlsl:156–225,311–322: core=AA(coreCapsuleSDF), scatter=AA(abs(coreSDF)-.4coreRadius),border=AA(bodySDF),diffuse=clamp(1-bodySDF/outerWidth,0,1)^2. AAwidth=max(fwidth*1.25,1e-4). AllchannelsMAXwithinpen beforematerial. diffuseedgeMix=smoothstep(.20,.29,diffuse)*(1-border)*.72;diffuseRGB=mix(C,mix(C,white,.43),edgeMix); thenpremultipliedover(diffusealpha1,borderC/.98,scattermix(C,white,.94)/.94,corewhite/1). CPUlocalcoverage+ImageData permitsnobrowserGPUdependency; cachecompletedgeometry, updateactivebounds, never persegmentglowstack.
Nativewidthconstants50/5areold; websitevisualadaptationapproved. ArtreusefontstacksGoogleSansFlex/HarmonyOSSansSC/system-ui andDMSerifDisplay/Georgia/serif, sameInk650/eysitalic400; copyonlytypographyruleswithoutdependingonuntrackedNewHome2. Iconandpanelretainaccessibility, outclickandkeyhandlerscleanup.

## 软笔尾锋曲线修订
取消起段8%的收尖因子。末端收锋区长度min(全笔弧长×22%,55字形单位)，倍率0.12+0.88×quinticSmoothstep(距末端/收锋区长度)，输入限于0..1。起止的一、二阶导数为零，代替旧12%/26长度与max(.12,...)截断；尾锋外保持原压感宽度及圆头。以真实Canvas合成直线检查起笔/主体像素与hard一致、尾部逐渐收细，保留原字形回归。


## 2026-10-05 左展开栏与擦除增量设计
修改边界是NewHome3局部组件、playback调度、softPen最终合成及新增eraser局部模块/SVG资源。字形/材质/公共API/路由/依赖不改。PenKind保留五笔，PlaybackSettings新增eraser:boolean（兼容旧调用可选，规范化false）；PlaybackFrame新增eraseProgress:number（-1禁用，0..1擦除），暂停快照复制它。播放在保持结束锁定exit计划，fade/erase完成消费锁定计划；退出期间configure只更新selected。仅橡皮增加art-hold/erase路径，艺术字擦除无shimmer。
绘制器render末尾增加eraseProgress=-1参数，必须计入最终合成缓存key而不改变原材质缓存。eraser.ts导出 getEraserFrame(progress,width,height): {path:string,cursor:{x:number,y:number,radius:number}}；路径表示已擦除区域，SVG/Cavas Path2D共用几何，按CSS像素对齐plane并覆盖完整字形及光晕。最终Canvas以destination-out清除；组件DOM艺术字用白底黑path SVG mask，同步cursor SVG。擦除只影响字层，光标叠在mask外并与同一平面一起倾斜。主题/尺寸只重绘不重置阶段。

2026-10-05 实施中补充：用户再次强调橡皮光标必须与软件同款。复用 Draw3 EraserGripCircle：白色圆盘、#cfcfcf 内描边（直径0.04）、两根灰色竖向胶囊握持条（中心±0.12D、半径0.05D、半高0.24D），整体透明度0.5；轮廓外径等于擦除直径。以 Assets/EraserGripVisual.h 和 inkPixelShader.hlsl type6 为准，不用普通空心圈替代。

最新擦除几何以用户第二幅方向示意图为准：斜向往复弧线，整体从左往右推进，初段/末段较短，中段舒展。getEraserFrame 追加 paths: readonly string[]，实际 Canvas/SVG 以固定120Hz不可变胶囊前缀逐段合成，path仅诊断整条几何；不得整条复合path一次填充，否则相交轮廓的抗锯齿可能让边缘像素重现。

斜向手势验收以可见内容为准：各笔型/粗细（含激光光晕）最终 alpha=0；艺术字使用中央90%宽×88%高的保守字形包围区域验证，外侧原本透明的虚拟平面不要求额外清扫。旧横向版本的不透明整屏矩形测试过于宽泛，不能为通过该合成测试添加违背用户示意图的周边补擦动作。几何内部480Hz采样，120Hz成组显示，保证弧线细密且光标与擦除端点一致。

矮屏高度预算：原 maxHeight 上限再除以1.36，为最大橡皮光标外延及4°/6px视差预留高度。仅影响高度受限时的统一平面缩放，各动画阶段尺寸保持一致；正常高屏56vw/900px宽度目标不变。独立投影检查须覆盖宽度320～1920及高度约束切换点，不能只测固定手机尺寸。

## 上凸曲线与橡皮入退场增量设计
eraser.ts导出ERASE_SECONDS=4.8供几何物理时间与playback共用；保持固定120Hz不可变蒙版块+480Hz几何，消除累计抗锯齿回退。长弧使用控制点位于弦上方的二次Bezier；折返使用五次Bezier同时匹配单位切向与弧长曲率，去除边缘短直线拼接。沿弧长双向平滑曲率速度，进入折返前提前减速，首尾近静止。取消全程不断催快的成本映射，基于弧长/曲率安排直快弯慢，每次挥动自然起停；粗细继续过滤/转弯保持。
播放：erase-in .28s（完整字不动，光标透明度0→1）→erase-ready .22s→erase 4.8s→erase-hold .20s→erase-out .30s（光标1→0）→erase-gap .35s（空白停顿）→锁定的下一项。整个擦除序列视为已锁定退场，期间设置排队；不改变普通墨迹渐隐的时序。
PlaybackFrame增加eraseOpacity:number默认0，仅光标使用；eraseProgress=0入场不擦、1结束保持全擦除；pause-out冻结光标透明度及轨迹，通过state.opacity整体淡出。Vue去掉固定*0.5，使用state.opacity*eraseOpacity；不透明实际擦除，淡入淡出只发生边界。减少动态效果无光标/擦除动画，恢复先完整字保持。


## 本轮增量设计：性能与真实运动
产品边界为eraser.ts（路线与连续光标）、softPen.ts（增量蒙版）、NewHome3.vue/playback.ts（视差链路/显现即擦）。正常前进只追加新固定擦除块；回退/尺寸变化重新构建，主题/暂停透明度只重新合成，保持材质缓存不受擦除污染。不用巨大复合Path2D替代像素单调的分块。移除未使用的艺术字SVG更新，艺术字仍保留DOM字体与同步遮罩；须评估艺术字场景，不能只优化硬笔。几何减少过密往返，以舒展上拱长弧及内部半径有界的圆滑折返，时间映射限制法向/切向加速度并平滑起停；独立插值光标实际时间，不使高刷重复停帧。
光标在擦除阶段前段短渐显且已经运动/擦除；取消旧erase-ready及独立静止入场阶段。结束保留200ms停留、300ms光标渐隐、350ms空白。设置锁定覆盖整个退出；暂停冻结实际位置/蒙版/透明度。视差从不变外框量测，所有图层统一变换，确保动态DOM重绘不会覆盖Canvas直接设置的transform；保留触屏/减少动态效果关闭规则。

覆盖验收修订：旧艺术字中央90%宽×88%高的全填充矩形包含实际DOM文字为空的四角，会迫使更大的光标/更密的路线并压缩窄屏留白。以同尺寸圆角包围区域（角半径0.30倍平面高度）保守验证艺术字遮罩；真实五种笔型、全部粗细/主题/视口含激光外扩仍必须严格零残留。不得为虚拟平面的透明四角增加机械补擦或缩小文字。8段方案存在真实硬笔/激光残留，因此最终采用10段宽弧，基准光标半径0.18倍平面高度，横向内缩0.16倍高度；速度粗细响应保持原规则。Windows已有回退字体的离屏度量约644px总advance（900px平面/225px字高，未计负字距），支持圆角外侧为空白的判断；这不是浏览器最终字体视觉验收。具体像素与投影结果记入validation。
