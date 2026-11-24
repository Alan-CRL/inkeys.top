# Research: 性能与兼容增量独立只读审阅

- Query: 检查本輪NewHome3性能缓存、系统动画偏好独立、Safari艺术字与旧API/CSS回退是否符合批准需求。
- Scope: internal
- Date: 2026-10-05
- Inputs: 主会话保存的 `research/current-performance-compat.diff`、当前源文件、PRD/design/implement、frontend spec及trellis-check技能。本代理遵守研究范围，不执行git操作或产品修改。

## Findings

### Files found / code patterns

- `NewHome3.vue:119`：浅引用帧只发布模板使用的可见字段；Canvas读取当前playback帧，不依赖滞后的模板快照来冻结暂停。
- `NewHome3.vue:140`：Canvas缓存包含raw/ink时间、opacity、擦除进度、CSS尺寸、DPR、主题、笔型、颜色和粗细，主题与尺寸切换不会被错误跳过。
- `NewHome3.vue:194`：零姿态transform为none/willChange:auto；真实视差仍使用原4°/6px范围和指数跟随，触屏不申请变换层。
- `NewHome3.vue:230`：图标稳态不再生成相同path；tick仍累计活跃时间，停留结束能正确推进下一阶段。
- `NewHome3.vue:244`：隐藏/离屏取消RAF和预热，不消费活跃时间；显式pause仍由原playback调度保持220ms/300ms转场。
- `NewHome3.vue:443`：v-memo依赖包括面板展开、完整选择集合、橡皮、颜色、粗细、主题、pause和图标路径；选择集合通过数组替换更新，没有漏掉模板用到的可变状态。
- `softPen.ts:549`：完整笔画前缀缓存按pixel尺寸/geometry transform/theme/material失效，回退到已缓存笔画结束之前会重建。
- `softPen.ts:598`：prefixPrevious保留交叉判断的既往线段，活动笔画仍按原round-join/变宽轮廓顺序绘制，荧光笔单笔union及独立笔alpha叠加规则未变。
- `softPen.ts:616`：laser使用既有笔画局部覆盖率缓存；跳过尚未起笔笔画，避免提前计算整词激光。
- `eraser.ts:157/167/188/224`：仅将Array.at(-1)改等价索引访问，路线/曲率/速度/宽度公式未变。

### 已通过的独立轻量检查

- `node .../verify-lifecycle.cjs`：exit0；开场、隐藏与离屏暂停/恢复、设置延迟边界、暂停、主题、resize、视差、系统reduced-motion不阻断、稳态少更新、idle与setTimeout预热取消、监听器清理。
- `node .../verify-toolbar.cjs`：exit0；真实Vue模板与CSS编译、共享平面墨迹/艺术字/光标变换、v-memo选择失效、关闭不可聚焦、320–1920布局及图标常量。
- TypeScript `--noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM` 对glyphs/styles/eraser/softPen/playback/toolIcons六模块：exit0。
- 三产品源文件严格UTF8解码有效、无BOM、无CRLF、全部LF；当前diff是局部hunk，未见全文件编码/换行改写。
- 本次没有重跑重型像素/性能或生产build；这些交主会话串行执行，避免与正在进行的浏览器诊断争抢资源。

### 已审需求与范围

系统reduced-motion查询/监听器、暂停disabled和本组件CSS reduced-motion阻断均被移除，符合最新明确用户指令；历史PRD的静态规则已被末尾增量条款覆盖。用户pause、document.hidden和IntersectionObserver门控仍在。

局部兼容处理有对应已知缺口：无ResizeObserver继续window.resize、replaceChildren的removeChild兜底、关闭栏后代tabindex=-1、100vh在100svh之前、传统背景色在color-mix之前、prefixed backdrop-filter。没有新增公共API、路由、依赖或修改原生仓库。

预热不推进clock、不发布eraser帧，已取消选择、resize、hidden/offscreen、unmount均撤销未运行工作。延迟队列仅触发相同尺寸几何缓存；当前没发现缓存/控制链路阻断问题。

### 尚未满足的浏览器验收 / 必须保留的限制

Safari DOM艺术字擦除不能以CLI模板通过判定已修复：主会话真实WebKit16.4证明当前foreignObject/g方案在fresh动态追加mask后仍残留；该浏览器结果优先于静态代码推理。建议由拥有组件的代理与主会话修复实际资源更新，再覆盖完整擦除、半擦冻结后的pause opacity、主题/resize/回退及实际tilt下的遮罩。

默认硬笔在主会话WebKit16.4和26.5均能显示，用户特定iPad默认全空白根因仍未证实；最终报告须区分本地已验证的引擎和用户环境，不能承诺任意旧浏览器或具体iPad已解决。

## Related specs

- frontend hook/quality/type-safety：SSR挂载、资源清理、局部类型与既有build。
- 当前PRD末尾：效果/字形/材质/分辨率保持、性能测量、Safari重点、系统动画设置不阻断、后续修改不自动commit/push。

## Caveats / Not Found

- 只读审阅不改源文件；浏览器遮罩问题已发送主会话与toolbar代理，等待其修复和真实引擎结果。
- diff快照可能先于后续Safari修复；该报告是当前缓存/控制链路审阅结果，不是对尚未实现的替代方案背书。
- 没有repo级lint/全站typecheck配置，不能将局部六模块strictTS称为项目全量类型验证。

## 最终方案只读复核（同日后续，替代上面的临时foreignObject方案）

最新组件恢复原HTML艺术字；不采用动态资源更新失败的foreignObject/g遮罩。mounted能力检测同时要求`document.getCSSCanvasContext`函数存在及`CSS.supports('-webkit-mask-image', '-webkit-canvas(name)')`为true，满足时启用命名CSSCanvas alpha遮罩，否则仍用原SVG引用方案。使用Vue useId生成每实例独立名称，SSR setup不读取document；所有浏览器API仍位于mounted/paint/卸载。

`syncArtMask`的CSSCanvas分支按CSS/pixel宽高缓存，首次、resize/DPR改变、进度回退或固定块身份改变时先清空为完整白色alpha，再destination-out追加新固定块。`-webkit-mask-size:100% 100%`与no-repeat保证DPR画布对应原虚拟平面；主题、冻结帧的opacity变化不重复绘制历史路径。Canvas mask不依赖文字字体或背景色，DOM字形及层级保持原规则。`eraserKey`新增DPR，静止mask也可响应像素密度变化。组件卸载将命名Canvas缩小1×1并解除context引用。

`Painter.dispose()`新增幂等disposed门控，缩小当前可见/ink/prefix/eraser四buffer、当前laserMap内所有layer，清空paths/previous；晚到render不分配或复活旧buffer。组件卸载已在cancelWarmup后调用。独立`verify-painter-dispose.cjs`覆盖六类笔/缓存生命周期，36画布都1×1/alpha0，repeat dispose和late render无变化。

本组件CSS精确原transition声明附!important，抵消Plume全局reduced-motion的0s重置；按压120ms和展开delay0均显式保留。没有全局修改系统偏好规则或其他页面，Canvas/图标RAF/视差链路仍不依赖系统动画设置。

最终复核执行：lifecycle、toolbar、dispose及六模块strictTS再次全部exit0。lifecycle使用真实离屏alpha像素验证CSSCanvas能力双门控、同笔新块增量、主题/opacity不重放、回退/尺寸重建、唯一id与卸载释放；toolbar检查原HTML结构和CSS能力分支；此类模拟不等于Safari真实CSS消费像素验收，主会话负责真实引擎。

### 激光失效缓存释放遗漏：已解决

此前发现`laserCache.clear()`前未dispose旧layer，弱机仍需要等待GC释放已经从Map移除的缓存。拥有renderer的代理已最小修复：`softPen.ts:585`在cacheKey失效时逐layer.dispose后才clear。独立复核该逻辑并重跑`verify-painter-dispose.cjs`退出0；扩展覆盖激光主题/颜色/粗细/resize切换、切硬笔及卸载，六生命周期共84画布全部缩小1×1，重复dispose和晚到render保持无副作用。此项已解决。

用户具体iPad默认空白仍未复现；最终实现和真实引擎验证必须继续明确这个范围，不能宣称根因已定位。

### 最终主会话验证结果（转述，不冒充本代理独立执行）

主会话告知真实旧WebKit16.4、新WebKit26.5、系统Edge均通过艺术字部分擦除、冻结opacity、完整擦除零残留、实际tilt、resize；两WebKit使用named CSSCanvas，Edge使用SVG分支。生产VuePress构建exit0、50pages约10s。以上浏览器/构建由主会话执行，本代理只独立执行记录中的轻量回归与释放复核。用户原iPad默认完全空白仍未复现。
