# Validation — 2026-10-04

## Final implementation
- Unified handwritten proportions: shared baseline/x-height/slant; I/n/ke/y/s natural groups. Direct dense cubic ink, no physical smoother.
- Gray layer purely illustrative, with local turning-point enrichment and independent pen lifts; current sample: 114 raw vs 2975 dense ink points.
- Rounded caps and joins at every color section: a connected native round-joined interior plus variable-width ribbon; sharp turns split rounded sub-runs without inserting animation lifts. No dot stamping.
- Intro and loop timing, responsive layout, fine-pointer proximity parallax, reduced-motion, active-time pausing and cleanup.

## Passed commands/checks
- `node .trellis/tasks/10-04-new-index3-wordmark/verify.cjs`: finite points, sequential strokes, width range13.4497–16.6544 within85%–115% of15.5,100 timeline cycles,20 responsive cases including perspective corners.
- `node .trellis/tasks/10-04-new-index3-wordmark/verify-render.cjs`:13 reused-v-fresh Canvas frames, discrete raw events,4 resizes/DPRs, raw-coordinate perturbation cannot change rainbow pixels, synthetic90deg/reversal round joins, zero enclosed transparent pixels for I/n/s.
- `node .trellis/tasks/10-04-new-index3-wordmark/verify-lifecycle.cjs`: actual compiled Vue setup in a commandline DOM/RAF mock; hidden/offscreen pause/resume, live reduced-motion, pointer limit/return/touch exclusion, teardown.
- Targeted strict TypeScript noEmit check for glyphs.ts and softPen.ts (ES2022/DOM, Bundler resolution).
- Production `pnpm docs:build`, pinned local11.11.0 executable: exit0,52pages rendered,11.67s. Initial sandbox attempt failed with esbuild spawn EPERM; approved unsandboxed retry succeeded. No dependency/config/source workaround. Only plugin timing informational warnings.
- `git diff --check`, all3 source files UTF8 noBOM/LF; hashes of existing client/new-index2/new-index3/NewHome2/design-drafts unchanged.

## Visual review and limits
Actual Canvas renderer used through bundled @napi-rs/canvas without GUI or browser window.12 stage PNGs plus monochrome proof in frames/. Inspected full wordmark, raw phase and joins; removed old long y-s connector, inconsistent glyph proportions and transparent wedges. Offline snapshots do not constitute browser interaction testing or user approval of final artistic appearance.

## Scope/spec assessment
Only NewHome3 product files modified. Registration/routes/dependencies unchanged. Feature-specific typography/timeline/round-join contracts retained in this task design; no global frontend convention or cross-layer API was introduced, so no unrelated shared-spec changes required. User requested no commit/push; no automatic committing archive command used. Keep this task available for visual refinements.

## k/e refinement after10a4dfd
- Product diff limited to glyphs.ts: k-stem + ke replaces single heavy ke gesture, removes right closed loop/backtracking, quieter lower-leg connector and more open e. Other glyph control points, renderer and Vue unchanged.
- Current data:110 illustrative raw points/2797 dense ink points; width13.5992–16.8035 within original pressure envelope.100cycles/20layouts, compiled Vue lifecycle, strict TS all PASS.
- Pixel test initial n1pixel failure was AA exterior-connectivity misclassification. Corrected to8-neighbor flood through partially opaque edge pixels, retaining zero tolerance for enclosed alpha<128. Added synthetic holes alpha0/51/127, diagonal AA, and900/901px glyph tests. Negative control omitting round-joined interior still detects35 genuine I holes. Final renderer regression PASS.
- Production build using existing pinned pnpm11.11.0 command: exit0,52pages,16.69s; only plugin timing notices. No GUI, dependency/config change, commit or push this round.
- Latest monochrome/color proof in frames/; pre-refinement comparison preserved as before-ke-monochrome.png and before-ke-color.png. Appearance remains subject to user feedback.

## Playback controls and pen travel after6be2b54
- Accepted k/e revision committed as6be2b54 before this change. User explicitly authorizes a final commit for the following additions; no push.
- Loop ink completion immediately removes gray input; hold/fade contain rainbow only. Manual pause jumps to opaque finished rainbow; continue starts the0.7s fade immediately then replays normally.
- Native pause/continue button uses equal responsive right/bottom insets and absolute positioning inside the first screen. Reduced-motion disables playback control; paused parallax remains available.
- Distance-aware pen travel gaps114–222ms apply to both layers, including k's two strokes; total writing duration remains4.2s. Current100raw/2797ink points, width13.3263–16.2459.
- Logic, native Canvas pixel and compiled Vue lifecycle tests PASS:100cycles/20layouts, no pixels during pen travel, no gray during completed/fading rainbow, all-phase manual pause/resume, resize/visibility/preference changes while paused, teardown. Raw-spacing regression now includes adaptive curve samples instead of filtering them out by elapsed sample interval.
- Targeted strict TypeScript PASS. Existing pinned pnpm docs:build PASS(exit0),52pages,10.94s; only plugin timing notices. Build ran outside sandbox due known esbuild subprocess restriction; no dependency/config changes.
- Independent Trellis review found no actionable issue. No GUI/browser test performed per user instructions; native Canvas and mocked lifecycle checks do not replace browser visual acceptance.

## Theme/background/navbar extension
- Added separate muted-luminous dark rainbow, gray input and local crossing shade. Light ink unchanged. Theme is included in painter cache and native Plume useDarkMode watch repaints current frame without advancing/resetting its timeline.
- Removed grid. Shared SSR new-home3-page layout background uses low-opacity mint/lavender/pearl radial gradients in light mode and teal/indigo charcoal gradients in dark mode. Navbar and content are transparent; native search and pause button share subtle themed surfaces. Mobile menu remains opaque/readable.
- Product scope3files: NewHome3.vue,softPen.ts,new-index3.md(pageClass). glyphs, timing, global layout and client registration unchanged.
- PASS existing logic100cycles/20layouts, nativeCanvas regressions plus5theme roundtrip/cache states, compiledVue paused theme repaint preserving clock, strictTS. Actual dark palette PNG inspected on flat theme base; this is not a whole-page screenshot.
- Existing pnpm docs:build PASS(exit0),52pages,20.47s; plugin timing notices only. Used approved outside-sandbox build for known esbuild subprocess restriction, no toolchain/config changes.
- SSR HTML confirmed new-home3-page and theme-plume on shared ancestor of navbar/root, originalnavbar/searchmarkup retained; index.html lacks thatpageclass. Reviewer also checked new-index2 exclusion.
- Independent reviewer verified installed Plume CSS: VPContent/customlayout have no background; navbar/contentbody consume transparent navvar; dividerhidden; actual mini-search-button selector matches; mobile VPNavScreen keeps opaque themevar. No actionable findings. gitdiffcheck PASS; sourceUTF8LF.
- No GUI/browser acceptance run under repository instructions. No commit/push authorized this round; kept changes reviewable for user.

## Icon control / pause transition validation
- Previous theme checkpoint committed92a733f after user-authorized retry resolved1Password signing failure; no signing workaround.
- Updated compiledVue lifecycle PASS: outgoing geometry frozen,220msout/300msin, originalopacity retained at click, all5stage pause/resume, rapidtoggles continuous, theme/visibility duringfade, reducedmotion, resize and teardown.120frame icon settling verifies both endpoints and noRAF after pausedsettle.
- Existing nativeCanvas renderer regression PASS. SSR builtbutton verified icon-only/no title/has accessible pause label; SVG surface does not clip keyboardfocus.
- Existing pnpm docs:build PASS exit0,52pages,21.92s; only plugin timing notices, no dependency/config change. gitdiffcheck PASS, UTF8LF preserved. No GUI/browser animation acceptance run.

## Multi-pen / style panel implementation
- New local styles.ts and playback.ts; product edits limited to NewHome3.vue/softPen.ts plus those modules. Accepted glyph paths and existing backgrounds/navbar untouched; no dependency/native-app change or commit/push.
- Full default rainbow intro.5/3/.7, ordered selectedpen rotation, rawonlysinglehard/soft, pendingsettingspercurrentpenfade, pauseddefaultoverride, emptyselectionart/shimmer, localnonpersisted8colors/3sizes/5checkboxpanel.
- Scheduler regression covers all32subsets and two rotations, pendingpen/color/size boundaries, randomsolidperappearance stability, rapidpause/defaultrestore, artentrance/exit/color/sweep, reducedmotion. CompiledVue checks panelkeyboard focus/Escape/outside close, visibility/resize/theme, material/artpause, pointer and cleanup. PASS before finalreviewpatch; rerun finalbelow.
- Existing geometry100cycles/20responsivecases PASS; painter13historicalframes and30material/theme/size cache+emptyedge cases PASS. Material30cases PASS: highlighter samepenalpha.35/interstroke.5775, brushopaque, softtaper, laserwhitecore/coverageMAX, incremental-v-fresh pixels after forward/backward/resize/theme/color/penlifts.
- Laser uses native4channelMAX thenmaterialresolve; stableprefix cached and active-tail dirtyrect recomputed. Time-constrained simplification tolerance.15physicalpixel. NativeCanvas900px/DPR2/thick253frames measured median9.87ms,p9514.81ms,max32.58ms inmainrun. Timing is workload-sensitive; no browserFPS guarantee. AA differsfromD3D; highlighter AAedge maydiffer1/255 onself-retrace, interioralphaunchanged.
- Inspected actualCanvas light/dark five-material sheets in frames/material-sheet-{light,dark}.png, plus individual frames. They are materialproofs onsolidthemebase, not page screenshots. NoGUI/browser visualacceptance performed.
- Initialproductionbuild PASS52pages exit0 in21.89s; plugin timing noticesonly. SSR retainsnewhomepageclass+bothiconcontrols, closedinitialpanel; no localstorage orNewHome2componentdependency. Finalreviewfoundreducedmotionentrances restoredpartialopacity; reviewer corrected and addedregressions. Finalpostreviewcheck recordedbelow.
- Final post-review verification: scheduler32subsets/boundaries and compiledVue lifecycle PASS; strictTypeScript all4modules PASS. Final pnpm docs:build exit0,52pages,17.08s; plugin timing noticesonly. Source+newtestfiles UTF8noBOM/LF; gitdiffcheck PASS. Original client.ts NewHome2-only edits leftunchanged.
- Review fixes: settle intro/art entrances when enablingreducedmotion; newlyselectedstaticstyles settletohold/art; initialreducedmount settlesbeforefirstpaint. Regression confirms preference restoredoesnotreturntohalftransparententrance. No remainingreviewfinding.

## 软笔仅末端收锋修订
- 移除起笔收尖，起笔与主体保持硬笔的圆头及压感宽度；末端改为更长的22%/55弧长范围与五次平滑包络，起止导数归零，不再使用硬阈值截断。
- 实际Canvas直线测试通过：起笔和主体与hard逐像素一致、尾部单调收细、逐列宽度变化无突跳且渐变跨度足够。30组材料回归、TypeScript与diff检查通过；离屏成品已检查。
- 独立review无问题。pnpm docs:build成功退出0，52页，21.24s，仅插件耗时提示。未进行GUI验收。用户授权提交此修订及待提交多笔型功能，不推送。

## 旧预览入口停用与发布验证
- config.ts保留VuePress默认pagePatterns并排除两个旧根页面；client.ts移除NewHome/NewHome2导入和注册。旧源码与本地草稿原地保留，NewHome3可独立从已跟踪文件构建。
- 实际扫描50→48个Markdown，准确只排除new-index/new-index2。生产构建成功退出0，生成50页，15.45s，仅插件耗时提示。
- 构建产物验证通过：new-index.html/new-index2.html不存在，运行时routes.js及sitemap/llms索引无旧链接，new-index3.html存在且路由保留。独立review无问题，diff检查通过。未使用GUI。
- 用户已明确授权本轮commit及正常push；读取远端首次遇到网络连接重置，不修改认证或网络配置，继续验证和提交后检查推送结果。


## 2026-10-05 左展开栏与斜向橡皮退场最终验证
- 最终源码：同高左展开栏/<1100px多行、原生六SVG/原生橡皮光标、按固定位置找后继/退场前锁定、斜向弧线逐次变速擦拭、仅橡皮艺术字循环、固定几何前缀蒙版、完整光标矮屏高度预算。
- strict TypeScript：6个局部TS模块通过；Vue模板/CSS编译及生命周期通过；工具栏键盘关闭/焦点/inert/主题/暂停/缩放检查通过。没有项目lint命令，不声明lint验证。
- playback：64组合、320后继变更、锁定后排队设置/艺术字衔接、暂停快速连点、随机颜色稳定性及减少动态效果通过。
- 既有几何/render/material回归通过；荧光笔独立交叠alpha仍约0.5775，软笔首圆尾尖及其他笔型材质保持不变。
- 最终斜向擦除：56个严格alpha单调蒙版与艺术字保守包围区，30个材质回退/暂停/主题/缩放，150个视口×材质×主题×粗细最终清空通过（含激光光晕）。检查出11段明显弧形及9段独立加减速。480Hz几何以120Hz不可变片段前缀显示，SVG/Canvas同源。
- 独立复核54布局完整圆周及最大视差投影，最小横向32.91px、顶部24.61px、底部43.67px留白；高度受限时统一平面缩放防止顶部裁切。
- 原构建首次沙箱esbuild spawn EPERM；外部运行一次因本机原生内存分配失败。待像素测试进程退出后以同一pnpm11.11.0 docs:build串行重试：exit0，50页面，10.46s，只有插件耗时提示。未修改依赖、配置或内存选项。
- git diff --check通过。产品文件UTF-8无BOM/LF。原有未跟踪NewHome2/设计草稿/生成帧保留，不进入commit。用户最新明确授权本轮commit，不push。
- 仅命令行与离屏渲染检查，未启动GUI/浏览器；离屏联系图已查看，不能等同实际浏览器动画视觉验收。


## 2026-10-05 上凸擦拭路线与光标节奏修订
- 按用户本轮要求先正常提交上一轮改动，commit f4eb05b；未绕过签名。随后开展本次修订，新增改动保持未提交，不push。
- 实际擦拭4.8s；二次Bezier长弧在两个方向均上凸，五次折返匹配单位切向和弧长曲率，取消边缘短直线。速度由曲率与弧长平滑决定，直段快、折返慢，首尾近静止。
- 光标280ms渐显、220ms准备停顿、擦拭、200ms结束停顿、300ms渐隐、350ms空白停顿；实际接触期间opacity=1，保留原生白盘灰边和双握持条。暂停冻结轨迹及光标透明度，整个退场序列保持设置决策锁定。
- verify-eraser通过：56个严格alpha单调蒙版/艺术字包围区、30组材质回退/暂停/主题/缩放、150组视口×材质×主题×粗细最终零残留（含激光光晕）；9段长弧有符号上凸、24处切向/曲率连续、11段挥动比相邻折返更快。42个布局全光标投影最小横向22.19px/纵向24.56px留白；无需再改高度预算。
- verify-playback通过64组合/320后继变更及六个退场阶段的设置排队、暂停/快速切换、减少动态效果；compiledVue lifecycle、toolbar验证和六模块strict TypeScript通过。
- 既有pnpm11.11.0 docs:build成功exit0，50页，12.33s，只有插件耗时提示。沿用已知esbuild沙箱限制的外部构建方式；未修改依赖/项目配置。像素测试结束后串行构建。
- 已检查离屏连续路径及不透明光标联系图；未启动GUI/浏览器，静态与像素检查不代表实际浏览器动画已获视觉验收。diff和原编码/换行检查通过。
- 独立复核无待修复问题；追加63布局（含高度约束切换点）×577帧×72圆周点×9视差姿态，最小横向22.19px、顶部23.52px、底部40.82px，均无裁切。复跑调度/生命周期/工具栏、strict TS与diff通过。


## 2026-10-05 擦除性能、自然速度与视差修复最终验证
- 产品范围仅NewHome3.vue、softPen.ts、eraser.ts、playback.ts；字形/笔型材质/背景/路由/依赖不改。本轮未授权commit/push，新增成果保持未提交。
- 原后段每帧重放全部577块改为独立剩余覆盖率蒙版，正向仅追加新增块，回退/重启/CSS或像素尺寸/DPR变化确定性重建；主题/样式/暂停淡出不重放历史。完整材质缓存保持不受擦除污染。
- 最终900px/DPR2本机native Canvas、288个连续60Hz时间步：中位11.047ms/p9518.498ms，末72帧14.588/16.666ms；90%进度25个强制淡出帧10.030/16.254ms，对照原223.67/480.42ms。每块只栅格化一次、每帧最多新增3块；13个重建/回退/样式用例、61帧严格alpha单调性通过。数据不是浏览器GPU/FPS验收。
- 路线采用10次宽弧斜向上拱挥动；旧8次方案存在真实硬笔/激光残留，因此适度增加次数与基准光标半径(.18H)，第一处下回身加长以覆盖I底部激光外扩。总长3780.52px、转弯内部最小半径28.45px；按法向/切向加速度安排直快弯慢，起停平顺。实际60Hz最大位移22.17px/相邻方向变化13.85°，加速度最大约10450px/s²；60–240Hz无位置重复停帧。曲线整段与时间域检查替代仅C2接头检查。
- 56组严格alpha单调遮罩/圆角艺术字代理、30组材质回退/暂停/主题/缩放、150组视口×材质×主题×粗细最终严格零残留（含激光光晕）通过。艺术字代理为中央90%宽×88%高、.30H圆角，排除DOM字形为空的矩形四角；Windows回退字体离屏度量支持这一区域，不能声称验证浏览器最终字体像素。
- 独立63布局×577帧×72圆周点×9视差姿态，最小横18.23px、上14.59px、下40.87px留白，无裁切；未改变统一字形布局预算。
- 视差统一到稳定外框下的模板变换层，支持any-hover/any-pointer的混合设备鼠标，保留触屏/减少动态效果禁用及暂停鼠标倾斜。没有证据证明原transform被Vue覆盖；真实原因是主指针查询排除鼠标和旧绘制长帧阻塞同一RAF。实际Vue编译模板/VNode host测试验证文字、艺术字、光标共用变换并保持。
- 光标.18s渐显期间已移动并擦除；删除独立静止入场/准备阶段；结束保留.20s停留、.30s渐隐、.35s空白。64工具组合/320后继变更、锁定期间设置/暂停/快速切换、减少动态效果均通过。
- 艺术字模式不绘制隐藏Canvas；SVG遮罩仅需要时挂载、增量追加，回退/尺寸/节点重挂载重建，迟到nextTick卸载后不写节点。尚未测浏览器SVG蒙版栅格化开销，不声明艺术字60fps。review修复唯一无可访问名称回归：共同surface承载role=img/名称，Canvas aria-hidden，模板回归通过。
- 严格六模块TypeScript、Vue生命周期/工具栏/模板回归、diff/原UTF8无BOM及LF检查通过。既有pnpm11.11.0 docs:build成功exit0，50页，19.07s；只有插件耗时提示，沿用已知esbuild沙箱限制的外部构建方式，无工具链/配置修改。所有native像素进程结束后串行构建。
- 离屏最终路线与光标联系图已检查，未打开GUI/浏览器，视觉流畅度仍需用户实际页面反馈。


## 2026-10-05 保持视觉的性能优化与 WebKit 兼容
- 首先按本轮授权完成正常签名提交 b1a68a2（实际鼠标事件视差修复）；本节新增性能/兼容增量不自动commit/push。无依赖、路由、全局构建配置、字形、路线、DPR或几何采样精度变更。
- 完整笔画前缀缓存保留交叉元数据，只重绘当前活动笔画；重启/回退/尺寸/DPR/主题/材料/粗细变化正确失效。激光保留原覆盖率缓存，跳过未起笔段和无用中间点数组。
- 对提交b1a68a2逐帧原生像素对照1375例通过（五笔型/灰线时间边界/主题/颜色/粗细/缩放/回退/透明度/擦除），最后释放修订后追加275激光像素例通过。不改变原圆接头、软笔末端笔锋、荧光笔叠加或激光白芯。
- 900px/DPR2原生CPU Canvas，逐帧交错前后版本，getImageData(1px)强制完成：硬笔median20.099→7.560ms、软笔19.054→8.785ms、荧光笔13.642→6.939ms、刷子12.265→6.986ms；激光12.516→12.885ms基本持平。p95与主机负载相关，这些数值不代表Safari GPU或所有弱机FPS。几何冷构建约35ms，在完整字停留时闲时预热并支持取消。
- 稳态不重复发布DOM无关播放字段，不重复Canvas相同帧、图标path和工具栏VNode；实际视差仍±4°/6px，零姿态释放强制GPU层。隐藏/离屏取消RAF和预热，恢复接续时钟。用户暂停交互不变；系统reduce偏好不再阻止本页书写/扫光/视差/按钮过渡，局部!important只覆盖本组件原过渡声明。
- Safari确证缺口是HTML引用SVGmask，foreignObject实验又发现旧WebKit动态资源重绘不稳定；最终恢复原HTML艺术字体与布局，双能力检测采用命名CSSCanvas增量alpha mask，其他引擎保留SVG。不逐帧编码PNG、不UA识别、主题/opacity不重放历史；回退/缩放/DPR重建、每实例独立命名、卸载释放。
- 补充100vh、传统背景色、webkit backdrop-filter、ResizeObserver/replaceChildren/inert焦点及CSS.supports方法存在性回退；eraser四处Array.at改等价下标，删除该API后的三尺寸21进度与原路线逐项一致。
- 所有画布在卸载主动1×1释放，激光缓存失效前也主动释放旧层；六生命周期84原生Canvas、幂等清理和迟到render均通过。独立审阅发现的激光失效遗漏已修复并重新复核。
- 真实隔离无窗口引擎：WebKit16.4(revision1860)、26.5(revision2336)、系统Edge均通过默认字Canvas像素+实际合成截图、reduce=true控件computed过渡、原HTML艺术字部分擦除/opacity0.5/完整577块零残留/视差/缩放。两WebKit使用namedCSSCanvas，Edge使用SVG；无GUI，无用户浏览器数据访问。开发页外部图标请求被测试主动拦截时有插件图标错误，生产本地测试pageerror为空。
- 最终生产产物WebKit16.4：320×568、768×1024、1440×900、1440×500（DPR2、reduce=true）文字实际可见且控制过渡有效，pageerror=[]。最终生产Edge实际鼠标在coarse查询false下仍matrix3d、触摸不改变目标、离开none、reduce=true仍正常视差与暂停可用，pageerror=[]。
- CLI几何100循环/20布局、64工具集合/320后继变更、编译Vue生命周期/实际模板/工具栏320–1920、旧API与资源回归通过；局部六TS模块strict检查通过。项目无lint/全站typecheck命令，不声明这些检查。
- pnpm11.11.0现有docs:build最终exit0，50页，10.00s，仅插件耗时提示。先停止本轮自行启动8099开发服务器，其他进程不动；沙箱外运行沿用已确认esbuild限制，不改工具链配置。
- Windows WebKit测试不等于用户iPad Safari16.6.2实机。用户截图的默认硬笔全空白未在两个引擎或线上旧版复现，不能将艺术字mask修复或释放身份变换层说成已证明该根因。仍需用户实机按钮响应/控制台反馈与更新后复测。现有Vite全站语法基线Safari/iOS16.4，不承诺任意更旧浏览器。
- git diff --check及源UTF8无BOM/LF检查通过；任务/规范保持原有换行。原有未跟踪草稿、NewHome2及缓存保持原状，本轮新修改未提交、未推送。
