# Research: Safari 16.6.2 与旧浏览器动画兼容性

- Query: iPad Safari（AppleWebKit/605.1.15、Version/16.6.2）首屏背景、导航、按钮可见，但 Inkeys 中央文字完全空白；审计默认 Canvas 初始化、DOM 艺术字遮罩及现有构建边界。
- Scope: mixed
- Date: 2026-10-05
- Snapshot: 当前任务并行实施期间只读研究；下述行号以研究时源文件为准，其他代理的局部修改可能使行号移动。本代理没有修改产品、配置、依赖或原生仓库。

## Findings

### Files found

- `docs/.vuepress/theme/components/NewHome3/NewHome3.vue`：Canvas 首帧初始化、视口尺寸、动画帧调度、3D 共享平面和 DOM 艺术字遮罩。
- `docs/.vuepress/theme/components/NewHome3/softPen.ts`：Canvas 2D 材质、Path2D、离屏 HTMLCanvasElement、最终合成与增量擦除。
- `docs/.vuepress/theme/components/NewHome3/eraser.ts`：惰性构造擦除路线；使用 Array.at，仅在擦除计算时调用。
- `docs/.vuepress/config.ts`：`viteBundler()` 未传浏览器 target 或新增兼容插件。
- `package.json`：VuePress/bundler 2.0.0-rc.30、Vue 3.5.39、Plume 1.0.0-rc.204；本机解析到 Vite 8.1.4。
- `docs/.vuepress/dist/new-index3.html`：SSR 已输出空 `<canvas class="nh3-mark">`、共享平面与两个按钮；仅靠截图不能判断客户端已完成挂载。
- `node_modules/.pnpm/vite@8.1.4_@types+node@24.10.13_esbuild@0.28.1_yaml@2.9.0/node_modules/vite/dist/node/chunks/node.js:608`：实际默认 JS target 包含 Safari 16.4 / iOS 16.4。

### P0：默认硬笔完全空白的直接根因尚未证实

`NewHome3.vue:319` 附近的 mounted 顺序为创建 painter、读取 matchMedia、注册监听器/观察器、resize、syncPlayback。背景和按钮由 SSR 输出，所以“按钮显示”并不能证明组件挂载、尺寸计算或 Canvas 渲染已执行。

`softPen.ts:510` 创建三个普通 HTMLCanvasElement 的 2D context；没有使用 OffscreenCanvas、Canvas filter、roundRect、WebGL、WASM 或 DOMMatrix。硬笔路径使用 Path2D、arc、fill、stroke、线性渐变、source-atop 局部阴影和 drawImage；这些并非 Safari 16.6 缺失的新 API。2D context 当前使用非空断言，若设备资源压力或浏览器失败导致返回 null，会在后续调用时抛错；这是未复现的设备故障假设，不能当作已定位根因。

排查应依次取得：

1. 两个按钮是否响应点击、实际完整路径与部署版本（截图日期为 10/4，当前本地版本已有后续变更）。
2. 客户端 pageerror / console、JS 资源下载状态；SSR 成功与某个客户端 chunk 失败可以同时出现。
3. root / plane 实际宽高、canvas 的 width/height 与采样像素 alpha，区分尺寸为零、没有绘制和像素已绘制但未显示。
4. 最后才用临时取消 `will-change: transform` / 身份 3D transform 比较 WebKit 合成层行为。`NewHome3.vue:545` 无条件提升共享平面，这个实验可定位 GPU 合成异常；本次没有真实 WebKit 证据，不能声称它是根因。

Canvas 像素尺寸上限约 1800×813（CSS 宽最多900、DPR最多2、scene比率决定高度），不是显而易见的巨大画布。不能单凭“iPad”认定触发历史 canvas 尺寸限制。

### P1：DOM 艺术字擦除确有 Safari 实现缺口，但不解释默认硬笔

`NewHome3.vue:381` SVG `<mask>` 资源及 `:387` HTML `<div>` 的 `maskImage: url(#nh3-art-erasure)` 组合正好命中 MDN BCD 的 Safari 限制：不支持非 SVG 元素引用 SVG `<mask>`。该条目前仍标为 partial implementation。补 `-webkit-mask-image` 只能扩展旧前缀语法，不能解决此资源引用限制。

最小可验证方案：保留 DOM 字体，把当前白底黑擦除轨迹写为独立 SVG mask-image **图像**（不是引用 SVG mask 元素），图像输出应转为 alpha 白色未擦区 / 透明已擦区；或由共享 Canvas mask 输出独立 alpha mask 图像，同时设置 unprefixed 与 prefixed CSS mask-image。后者每帧编码可能较贵，需要测量，不能为兼容引入新的热点。也可以研究 SVG foreignObject 内包 DOM 字体再施加 SVG mask，但须 WebKit 实测字体/布局和性能。完整字形始终保留，不能简单关闭艺术字擦除。

此缺口只在无绘画笔、橡皮开启的 DOM 艺术字退场出现。默认硬笔 Canvas 不使用这个 DOM mask，二者不能混为一谈。

### P2：局部旧浏览器兜底建议与系统动画偏好

官方/MDN 核实：Safari 15.4 已有 svh/dvh、Array.at、focus-visible、未加前缀 mask；Safari 15.5 已有 inert；ResizeObserver 从 Safari 13.1 支持，MediaQueryList 的 EventTarget 监听方式从 Safari14 支持；Path2D 从 Safari8 支持。因此 Safari16.6.2 理应支持当前默认路径的语言和初始化 API。

对于更早的浏览器，有证据的局部兜底：

- `100svh` 前放 `100vh`，保证旧浏览器 root 不因唯一高度声明无效而坍缩。`computeLayout` 用 root.clientHeight，坍缩会令整词 width/height 为0而跳过绘制。
- feature-detect ResizeObserver，缺失时沿用现有 resize 事件；IntersectionObserver 已有存在性判断。
- 若继续保留 matchMedia 监听，兼容 addListener/removeListener；用户本轮要求不随系统 reduced-motion 关闭演示，更合适的是从页面动画控制链路移除该监听及所有 reduced-motion 阻断，而保留显式暂停/离屏暂停。
- 支持 Pointer Events 的浏览器用真实 mouse pointermove；更早浏览器可只在没有 PointerEvent 时注册 mousemove，不能双注册造成重复运算。
- inert 缺失需保证关闭栏的后代 tabindex=-1，并在 reopen 恢复原生键盘焦点。visibility hidden 可以阻止完全关闭后聚焦，但收起动画的可见过渡期仍需处理。
- panel 的 color-mix / backdrop-filter / corner-shape 添加稳定背景色、前缀 blur、既有圆角兜底；这些属性影响工具栏外观，不是默认 Canvas 完全空白的直接原因。

### 实际产物边界与验证环境

本机 Vite 默认 target 是 Chrome111 / Edge111 / Firefox114 / Safari16.4 / iOS16.4，项目没有覆盖。Safari16.6.2 位于该边界内。Vite 官方明确默认只转换语法，不自动补运行时 API；仅改局部 source 不能承诺整个 VuePress/Plume 对任意更早浏览器兼容。

生成 JS 扫描出现 toSorted/toReversed/findLast/findLastIndex 仅位于 Vue 数组代理的对应方法实现；NewHome3 未调用前三者，不能因字符串出现直接判定初始化必然失败。eraser 中 Array.at 不在默认开场执行；若扩大至 Safari15.3以下，可局部用下标访问代替，但不能称之为 Safari16.6 的修复。

只读探测 bundled Playwright：webkit.executablePath 为 `C:\Users\alan-\AppData\Local\ms-playwright\webkit-2336\Playwright.exe`，文件不存在；Chromium bundled 二进制也不存在。系统 Edge 可进行无窗口 Chromium 检查，但改 UA 不会变成 WebKit。没有下载/安装/启动 GUI，没有真实 Safari16.6 跑通结论。

## External references

- [WebKit Safari15.4 特性公告](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)：viewport单位、Array.at、focus-visible、unprefixed mask。
- [WebKit inert 公告](https://webkit.org/blog/12578/non-interactive-elements-with-the-inert-attribute/)：Safari15.5 支持。
- [MDN BCD mask-image](https://github.com/mdn/browser-compat-data/blob/main/css/properties/mask-image.json)：`svg_masks` Safari non-SVG 引用限制；unprefixed mask-image 15.4。
- [MDN BCD ResizeObserver](https://github.com/mdn/browser-compat-data/blob/main/api/ResizeObserver.json)：13.1 支持。
- [MDN BCD MediaQueryList](https://github.com/mdn/browser-compat-data/blob/main/api/MediaQueryList.json)：EventTarget 继承 Safari14。
- [MDN BCD Path2D](https://github.com/mdn/browser-compat-data/blob/main/api/Path2D.json)：Safari8 支持。
- [Vite production browser compatibility](https://vite.dev/guide/build.html#browser-compatibility)：本机默认目标与文档一致；syntax transforms 不覆盖 API polyfill。
- [WebKit Safari16.4 特性公告](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)：OffscreenCanvas2D 16.4 才新增；当前产品没有依赖它。

## Related specs

- `.trellis/spec/frontend/hook-guidelines.md`：浏览器 mounted 访问及资源清理。
- `.trellis/spec/frontend/quality-guidelines.md`：原生项目构建、最小化改动及验证范围，不添加新构建系统。
- 任务 PRD/design/implement：字形、材质与时序保持；系统偏好不再关闭本组件动画；本轮新改动不自动 commit/push。

## Caveats / Not Found

- 根因仍需 Safari 客户端日志、已部署版本、按钮是否响应及实际 DOM/像素证据；报告的 mask 缺口不能冒充默认硬笔空白根因。
- 公网 `https://www.inkeys.top/new-index3.html` 经 web 工具只读打开失败，未据此判断站点是否可用或当前部署版本。
- 没有读取研究隔离禁止的 implement.jsonl / check.jsonl；使用注入任务路径及允许的 PRD/design/implement/spec/source。
- 本机真实 WebKit 二进制缺失，没有Safari实机或模拟器验收。当前UA值也不提供具体iPad型号/系统版本，不能推断其CPU/内存预算。

## 后续无窗口 WebKit 调查（来自主会话的实际结果）

上面的二进制缺失是最初探测时的环境；随后主会话获得仅位于临时目录的测试运行时，没有增加项目依赖。主会话通知：WebKit16.4 / 26.5 均能显示原基线默认硬笔；用户具体 iPad 全空白仍未复现，不能把接口审计推断当成实机修复结论。

`SVG g → foreignObject → HTML字体` 方案在主会话中无 mask 时外观可与原 DOM 逐像素一致，但 WebKit16.4 内部定位 HTML 曾绕过 SVG mask。更改为普通流 `position:static` 后，仅某次动态修改能触发清空；新加载页面动态追加擦除资源仍残留，因此不能仅以模板编译或那次动态重排成功宣称修复。须测试新页面进入、逐帧资源更新、暂停冻结帧淡出及实际3D旋转状态。

可选备用：能力检测 `document.getCSSCanvasContext` 与 `-webkit-canvas(name)`。主会话已在真实WebKit16.4检查该方法为function；[Apple CSS Functions 文档](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariCSSRef/Articles/Functions.html) 和 [WebKit CSS Canvas Drawing](https://webkit.org/blog/176/css-canvas-drawing/) 说明它是可作为CSS image使用的命名画布，同document同名共享缓冲，同尺寸获取不清空、尺寸变化会清空，绘制会自动通知客户端。这样可将原白底/透明已擦区的增量alpha mask直接用为HTML CSS mask，保留字体与位置且免逐帧PNG编码。该接口非标准，必须检测能力，不可用UA强制对所有WebKit宣称支持。命名须避免组件实例冲突，卸载/resize需要释放或重置缓冲，主题切换不应清空已有擦除区域。真实动态遮罩验证仍是采用前的必要条件。
