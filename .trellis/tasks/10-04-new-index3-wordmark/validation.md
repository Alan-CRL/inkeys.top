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
