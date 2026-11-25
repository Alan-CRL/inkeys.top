# Journal - AlanCRL (Part 1)

> AI development session journal
> Started: 2026-07-29

---


## Session 1: Bootstrap project guidelines

**Date**: 2026-07-29
**Task**: Bootstrap project guidelines
**Branch**: `main`

### Summary

Researched the VuePress and Plume repository, replaced frontend spec placeholders with code-backed conventions, documented pnpm/build/Netlify and 123pan asset boundaries, removed the stale npm lockfile, and verified the production build.

### Git Commits

| Hash | Message |
|------|---------|
| `e1f28d1` | (see git log) |

### Status

[OK] **Completed**


## Session 2: UInk Shape 规范

**Date**: 2026-08-04
**Task**: UInk Shape 规范
**Branch**: `main`

### Summary

为 UInk version 10 新增 Shape Type 5 规范，抽取公共 Color Map，并同步内容流、增量写入、兼容规则和 VuePress 导航；文档构建通过。

### Git Commits

| Hash | Message |
|------|---------|
| `dc5f6e1` | (see git log) |

### Status

[OK] **Completed**


## Session 3: UInk Canvas 视口规范

**Date**: 2026-08-04
**Task**: UInk Canvas 视口规范
**Branch**: `main`

### Summary

为 UInk version 10 的 Canvas 增加 viewport 平移缩放状态，明确 Device/Canvas 坐标边界、多图层共享、完整重写和兼容规则；文档构建通过。

### Git Commits

| Hash | Message |
|------|---------|
| `4a90ca3` | (see git log) |

### Status

[OK] **Completed**


## Session 4: new-index3 手写文字重做与圆接头修复
<!-- trellis-session: v=2 fp=8e454c91e1fd5425 -->

**Date**: 2026-10-04
**Task**: new-index3 手写文字重做与圆接头修复
**Branch**: `main`

### Summary

按用户反馈改为独立平滑曲线，统一字形、拆开y/s、灰线局部加密、修复round join透明缺口；像素/时间轴/生命周期/生产构建通过，未提交。

### Git Commits

(No commits - planning session)

### Status

[OK] **Completed**


## Session 5: new-index3 首个发布介绍板块
<!-- trellis-session: v=2 fp=b248b498edf77437 -->

**Date**: 2026-10-19
**Task**: new-index3 首个发布介绍板块
**Branch**: `main`

### Summary

完成深色原生UI3主栏、双彩虹墨迹与反光、单次入场和鼠标视差；补全无JS窄屏缩放。

### Main Changes

- 复用主栏发布变体，保留原生Logo和七个工具图标，下载与首屏同址。
- 新增独立发布板块、预计算SVG场景和共享鼠标目标计算；保留原有草稿。

### Git Commits

(No commits - planning session)

### Testing

- [OK] 三组CLI回归、最终docs:build、git diff --check均通过；UTF-8无BOM/LF检查通过。
- [OK] 11组真实无窗口Edge页面检查通过并退出0；静止RAF为0；测试服务及隔离进程已关闭。

### Status

[OK] **Completed**

### Next Steps

- 保留活动任务用于用户视觉反馈，本轮不commit/push。


## Session 6: new-index3 发布板块视觉简化
<!-- trellis-session: v=2 fp=64c5a185e3fcc117 -->

**Date**: 2026-10-19
**Task**: new-index3 发布板块视觉简化
**Branch**: `main`

### Summary

按用户反馈移除双彩虹墨迹及关联反光，柔化深色标题；保留原生主栏、视差、响应式和单次内容入场。

### Main Changes

- 移除无用途的几何/颜色采样与淡出阶段，入场在1.25s结束；同步当前需求和组件规范。

### Git Commits

(No commits - planning session)

### Testing

- [OK] 独立复查、三组CLI回归、docs:build、4组实际无窗口页面检查及diff/格式检查通过；静止新增RAF为0。

### Status

[OK] **Completed**

### Next Steps

- 保留现有活动任务供视觉反馈，未commit/push，原有草稿保留。


## Session 7: Inkeys3 发布区横向卡片
<!-- trellis-session: v=2 fp=79d6a5f336dc5a96 -->

**Date**: 2026-10-22
**Task**: Inkeys3 发布区横向卡片
**Branch**: `main`

### Summary

完成已批准的横向卡片、主栏突出裁切、移动端完整显示与轻视差。生产构建和回归通过，32个无窗口布局场景通过。按用户要求不提交。

### Main Changes

- 发布卡片及裁切焦点策略；同步规范。

### Git Commits

(No commits - planning session)

### Testing

- [OK] pnpm docs:build；verify-release.cjs；32场景无窗口Edge；git diff --check。

### Status

[OK] **Completed**


## Session 8: 完成滚动圆角外框与背景绘制
<!-- trellis-session: v=2 fp=7a490a9d4ab9c290 -->

**Date**: 2026-10-22
**Task**: 完成滚动圆角外框与背景绘制
**Branch**: `main`

### Summary

实现三阶段纯色外框、方向唤回导航、四类稀疏背景绘制及卡片透明度；遵循用户要求保留未提交状态。

### Main Changes

- 增加 ScrollFrame/scrollFrame 与 AmbientInk/ambientScene；保留首屏和真实主栏交互。
- 补充外框实色、淡内轮廓与首屏下方细分界；更新规范并归档本轮任务。

### Git Commits

(No commits - planning session)

### Testing

- [OK] 生产构建通过（51 pages）；frame/ambient/release/hero 回归和聚焦 TypeScript 检查通过。
- [OK] Headless Edge：28 组主题/尺寸/JS 矩阵与 5 组背景动画通过；保存截图和实际录屏 GIF。
- [OK] git diff --check 通过；无可见 GUI、无 commit/push；真实 Safari/触屏设备未测。

### Status

[OK] **Completed**


## Session 9: Inkeys3 功能介绍框架
<!-- trellis-session: v=2 fp=01f52c8db692edbb -->

**Date**: 2026-10-22
**Task**: Inkeys3 功能介绍框架
**Branch**: `main`

### Summary

完成三个纵向自动轮播与静态素材占位；用户要求不提交代码，真实动态素材后续处理。

### Main Changes

- 新增FeatureSections，NewHome3两行接入；无软件仓库改动。

### Git Commits

(No commits - planning session)

### Testing

- [OK] Vue组件生命周期与SSR回归通过；pnpm docs:build退出0，51页；独立审查通过；未做GUI验收。

### Status

[OK] **Completed**

### Next Steps

- 用户审阅框架后，专项制作真实离屏动态素材。


## Session 10: 功能介绍卡片与随机入场动效
<!-- trellis-session: v=2 fp=26cea35c26bae9f7 -->

**Date**: 2026-10-22
**Task**: 功能介绍卡片与随机入场动效
**Branch**: `main`

### Summary

按批准方案完成三张完整卡片、扩大舞台、交替标题与随机单次入场，通过独立审阅。

### Main Changes

- FeatureSections 完整卡片与左右交替头部；featureMotion 随机无重复动效、活跃时钟及轮播门控。
- ReleaseSection 仅收紧底部间距104到40px；同步组件spec。

### Git Commits

(No commits - planning session)

### Testing

- [OK] 任务CLI回归通过，含SFC/SSR、挂载随机、一次性入场、隐藏离屏暂停、焦点中断与资源清理。
- [OK] pnpm docs:build通过：exit0、51页、19.01秒。未做GUI视觉验收。

### Status

[OK] **Completed**

### Next Steps

- 真实软件演示素材仍待后续专项制作与接入；本次没有commit/push。


## Session 11: Inkeys3 功能动态素材与可复用制作模板
<!-- trellis-session: v=2 fp=c55a560ad2e56057 -->

**Date**: 2026-10-22
**Task**: Inkeys3 功能动态素材与可复用制作模板
**Branch**: `main`

### Summary

延续主页任务，完成八幕真实原生素材、非线性镜头、桌面/手机MP4和README GIF并接入三张功能卡片。

### Main Changes

- 保存无窗口原生导出适配、原始帧与分镜合成模板；输出16MP4、16poster、8GIF；视频按真实播放状态驱动轮播，舞台适配成片比例。

### Git Commits

(No commits - planning session)

### Testing

- [OK] ARM64 solution与原生导出通过；模板4项回归、全部成品实际解码/哈希、Vue生命周期/SSR、VuePress51页构建以及1440/599/390/320px headless真实播放与截图检查通过。

### Status

[OK] **Completed**

### Next Steps

- 按用户后续反馈迭代内容与镜头，复用media/inkeys3-features；发布时同步公共素材或123pan直链。父任务继续in_progress，本轮不commit/push。


## Session 12: Remotion 单片重设计与交付

**Date**: 2026-10-25
**Task**: Inkeys3 新主页 / screen-freeze
**Branch**: `main`

### Summary

用户确认只重制定格讲解。新增独立Remotion项目，完成单摆最高点定格、真实受力图和桌面/手机独立构图；只接入该片。

### Main Changes

- 14s/60fps静音MP4、poster、GIF与provenance；修复旧合成球心坐标及按钮热点偏差。
- 来源449PNG校验；2倍渲染；项目内x64运行时兼容ARM64；完整重建文档。

### Testing

- TypeScript、原生哈希、两片完整解码、29帧/版视觉检查通过；独立审查无缺陷。
- VuePress51页构建、既有播放器回归、1440/390/320px真实播放/暂停/ended通过。
- Studio无窗口预览通过；其他35项媒体hash不变。

### Status

本轮单片完成，父任务仍in_progress；无commit/push。结果见任务remotion-result.md。


## Session 13: 教学展示图第一阶段背景及根式托盘修订
<!-- trellis-session: v=2 fp=d82352822b49eaa3 -->

**Date**: 2026-10-30
**Task**: 教学展示图第一阶段背景及根式托盘修订
**Branch**: `main`

### Summary

完成五页真实 A4 教材与 16:10 背景；用户指出根号与系统托盘后修订，等待背景确认，不进入墨迹阶段。

### Main Changes

- 独立 media/inkeys3-brush-showcase 制作源与 PDF/PNG；日期2025/10/07、页序3/5、两侧灰边269px。
- 根式采用 PDF 矢量横线；托盘使用新参考实际图标像素与 Segoe UI 时钟。

### Git Commits

(No commits - planning session)

### Testing

- [OK] ReportLab/Poppler生成、Python编译、PDF五页A4无图片、双尺寸与视觉检查通过；独立几何交点面积核验通过。

### Status

[OK] **Completed**

### Next Steps

- 等待用户确认背景，再做自然手写直接合成草稿；草稿确认后才原生离屏。


## Session 14: 教学展示图第二阶段批注草稿
<!-- trellis-session: v=2 fp=79a917b465dd91b1 -->

**Date**: 2026-10-30
**Task**: 教学展示图第二阶段批注草稿
**Branch**: `main`

### Summary

用户确认背景后制作直接合成批注草稿；冻结背景与 PDF，等待草稿确认后才原生离屏。

### Main Changes

- 自然手写中心线、准确投影立方体及截面、白色平头刷、荧光重点、激光圈画和英文主栏布局代理。

### Git Commits

(No commits - planning session)

### Testing

- [OK] 生成、笔画时序单调、中心截面几何、正交相机、冻结背景哈希和 Python 编译通过；已视觉迭代修正视角与标签。

### Status

[OK] **Completed**

### Next Steps

- 等待用户确认草稿内容、手写风格、图形布局；之后再用真实 UI3/Draw3/feature-shape 离屏渲染。


## Session 15: 教学批注草稿 v2 真实课堂痕迹修订
<!-- trellis-session: v=2 fp=7dcdfbc7d9c3a375 -->

**Date**: 2026-10-30
**Task**: 教学批注草稿 v2 真实课堂痕迹修订
**Branch**: `main`

### Summary

根据用户六项反馈调整第二阶段草稿，保留已确认背景，仍等待草稿确认。

### Main Changes

- 增加中间推导、错位叠色荧光和红蓝圈画；蓝色无填充图形、图形结构激光强调。
- 米白斜向平头擦拭和单相位点阵；记录未来纹理刷代理；主栏可见实体底边对齐任务栏顶边。

### Git Commits

(No commits - planning session)

### Testing

- [OK] 冻结源哈希、数学与几何、笔画时序、点阵裁切与透明度、实体贴边、Python编译均通过；独立复核收尾。

### Status

[OK] **Completed**

### Next Steps

- 用户确认第二阶段后，才进行真实原生墨迹和 en-US UI 离屏渲染。


## Session 16: 教学展示图原生离屏成品完成
<!-- trellis-session: v=2 fp=de5fbedc10a99e60 -->

**Date**: 2026-10-30
**Task**: 教学展示图原生离屏成品完成
**Branch**: `main`

### Summary

三阶段完成并独立检查通过，增强三角形激光涂抹，交付原生成品。

### Main Changes

- 实际UI3/Draw3及feature-shape渲染；主栏en-US红色软笔Undo可用，实体底边贴任务栏。
- 任务私有OutDir解决共享EXE覆盖与锁文件；按字节还原原生适配；添加native媒体来源与定位规范。

### Git Commits

(No commits - planning session)

### Testing

- [OK] 两套完整ARM64solution构建及原生导出通过，failures=0；来源hash绑定、冻结背景、主栏贴边、独立视觉复核通过。

### Status

[OK] **Completed**

### Next Steps

- 交付final-preview/final-master；未来点阵纹理刷效果仍明确为素材合成。


## Session 17: 手写小样V2：结构变体与连续笔势
<!-- trellis-session: v=2 fp=6f76444d211a7e43 -->

**Date**: 2026-10-30
**Task**: 手写小样V2：结构变体与连续笔势
**Branch**: `main`

### Summary

修正原生时序后，用户认为V1像字体；继续制作V2自然书写小样，等待风格确认。

### Main Changes

- 保留生产软笔55ms算法，使用真实停笔；新增结构变体、英文连续笔势与跨token公式节奏。

### Git Commits

(No commits - planning session)

### Testing

- [OK] ARM64原生捕获、来源hash、速度/末端诊断、44旧文件冻结与独立复核通过；风格仍待用户认可。

### Status

[OK] **Completed**

### Next Steps

- 确认小样后才应用整图并更新下方面积构造图、加粗双圈激光、三角点阵和真实合并主栏。


## Session 18: V3直接字形草稿：数字大写与根号重画
<!-- trellis-session: v=2 fp=1deb593136aef74c -->

**Date**: 2026-10-30
**Task**: V3直接字形草稿：数字大写与根号重画
**Branch**: `main`

### Summary

按用户要求仅直接绘制V3，扩大数字与大写的结构变化，根号完整笔势重写，等待字形确认。

### Main Changes

- 32px课堂笔记及21px检查条、同绘制器V2/V3对照、实际像素裁切放大；补齐英文与正确角度测试。

### Git Commits

(No commits - planning session)

### Testing

- [OK] 路径/数学/拼写/像素裁切/源编译通过；29个V2和44个旧文件hash不变；独立检查通过；未执行原生构建或整图更新。

### Status

[OK] **Completed**

### Next Steps

- 用户确认V3字形方向后再接回原生渲染并继续构造图、双圈激光、点阵和合并主栏修订。


## Session 19: 恢复并完成右侧几何草稿
<!-- trellis-session: v=2 fp=fbd72fbd5121b8a1 -->

**Date**: 2026-10-31
**Task**: 恢复并完成右侧几何草稿
**Branch**: `main`

### Summary

V3文字已确认；完成上方中心截面立方体、下方面积相减构造图，停在图形确认门。

### Main Changes

- 精确非正则六边形、大辅助三角形与三个扣除角；三角点阵对位；加粗双圈激光无内部涂抹。

### Git Commits

(No commits - planning session)

### Testing

- [OK] 独立数学、投影、隐藏边、点阵、实际像素裁切及92冻结文件检查通过；背景保护区域不变。

### Status

[OK] **Completed**

### Next Steps

- 用户确认图形后才进行原生渲染、合并式主栏及最终整图合成。


## Session 20: V3文字与新构造图原生合成完成
<!-- trellis-session: v=2 fp=aeda15591629b88c -->

**Date**: 2026-10-31
**Task**: V3文字与新构造图原生合成完成
**Branch**: `main`

### Summary

用户确认字形及图形后完成真实原生渲染、合并主栏和最终合成；独立复核通过。

### Main Changes

- V3字形及停笔时序、一般截面面积构造图、对齐三角点阵、双圈激光；真实合并式英文红色软笔主栏。

### Git Commits

(No commits - planning session)

### Testing

- [OK] 两套完整ARM64solution构建、原生捕获failures=0、482笔时序/来源绑定、102冻结文件、保护像素及实体贴边均通过。

### Status

[OK] **Completed**

### Next Steps

- 最终图在handwriting-revision/final-v3/build；未发布或提交。三角点阵刷为已披露的未来功能演示合成。


## Session 21: 激光移至立方体偏移截面并修正批注折线
<!-- trellis-session: v=2 fp=9eee9082b91d53e0 -->

**Date**: 2026-10-31
**Task**: 激光移至立方体偏移截面并修正批注折线
**Branch**: `main`

### Summary

按授权完成两项局部轨迹修正及原生重放，独立复核通过。

### Main Changes

- k10投影单圈激光自然起伏并避开M；8条题干/蓝色批注先构造连续曲线再做8ms采样。

### Git Commits

(No commits - planning session)

### Testing

- [OK] 两次最终native导出failures=0，数学/时序/来源绑定、无关图层hash与编辑区外像素一致；实际PNG复核通过。

### Status

[OK] **Completed**

### Next Steps

- 交付final-laser-curves-preview/master；未提交或发布。


## Session 22: 激光改为下图局部短弧
<!-- trellis-session: v=2 fp=6e88ee8453b3bdaf -->

**Date**: 2026-10-31
**Task**: 激光改为下图局部短弧
**Branch**: `main`

### Summary

用户选择更克制的局部强调；移除上方大圈，改为下图小三角形右斜边中段短弧。

### Main Changes

- 约60px开放曲线，原生scale.60，其他内容不变。

### Git Commits

(No commits - planning session)

### Testing

- [OK] 原生捕获/来源/像素/场景和独立视觉检查通过；六个非laser图层hash相同，变化仅旧新激光范围。

### Status

[OK] **Completed**

### Next Steps

- 已交付final-subtle-laser-preview/master，保留before版本。


## Session 23: 最终展示图移除激光
<!-- trellis-session: v=2 fp=bfd5e9c75b26052b -->

**Date**: 2026-10-31
**Task**: 最终展示图移除激光
**Branch**: `main`

### Summary

按用户要求移除激光合成层，其他内容保持不变。

### Main Changes

- 合成器不消费激光，交付final-no-laser-preview/master，保留历史版本。

### Git Commits

(No commits - planning session)

### Testing

- [OK] 独立来源与像素检查通过：43原生相关文件不变，2489变化像素仅原激光范围。无需重新捕获/编译。

### Status

[OK] **Completed**

### Next Steps

- 交付无激光成品；未提交或发布。


## Session 24: new-index3 展示内容重新规划（S0–S6 评审）
<!-- trellis-session: v=2 fp=eef632ee7ac35d87 -->

**Date**: 2026-11-16
**Task**: new-index3 展示内容重新规划（S0–S6 评审）
**Branch**: `main`

### Summary

新建任务 11-16-new-index3-content-plan，完成竞品官网调研和内容规划；S0–S6 逐场景评审确认，S7–S9 待续。

### Main Changes

- content-plan.md：首屏碎片、S1 能力卡片、S2 三张场景卡片、S5 书写体验与界面、S6 简化下载
- prd.md 补充 R8–R10 交互与文案约束

### Git Commits

(No commits - planning session)

### Testing

- [OK] 仅文档规划，无代码改动，无需测试

### Status

[OK] **Completed**

### Next Steps

- 样式与主题风格设计（先出布局草图）；之后重启任务评审 S7–S9


## Session 25: S1 三张卡片动画定稿并归档
<!-- trellis-session: v=2 fp=708190b54f72a121 -->

**Date**: 2026-11-22
**Task**: S1 三张卡片动画定稿并归档
**Branch**: `main`

### Summary

第二张白板改米白/墨蓝底色并去掉主栏；第三张 PPT 演示整体重做（激光笔与留在页上的笔迹）；三张的 Studio 预览经用户确认通过，两个任务归档。

### Main Changes

- whiteboard：底色换成软件预设的米白 #F5F1E6 / 墨蓝 #172A46，深色版强调笔迹改橙色，去掉主栏
- slide-show：两页灰阶幻灯片、激光笔圈画后熄灭、翻页后墨迹留在各自的页上；native-slideshow 导出放映分页栏原生图
- 规范 remotion-video-guidelines / native-media-guidelines 入库，补充返工经验、放映与激光笔的软件事实、SVG 滤镜范围和 IntDir 的坑

### Git Commits

| Hash | Message |
|------|---------|
| `f85e6bb` | refactor(new-index3): S1“自由白板”卡片改用米白与墨蓝底色，去掉主栏 |
| `a5849d0` | feat(new-index3): 新增 S1“PPT 演示”卡片的 Remotion 动画 |
| `71d3033` | docs(spec): 新增 Remotion 视频与原生离屏导出的制作规范 |
| `865aef6` | chore(trellis): 归档 S1 卡片动画的两个任务 |

### Testing

- [OK] [OK] tsc --noEmit 通过；浅色深色抽帧自查；离屏导出四次捕获 failures=0
- [OK] 未渲染成片，节奏由用户在 Studio 确认

### Status

[OK] **Completed**

### Next Steps

- 三张卡片的成片渲染、静态封面和接入 /new-index3（用户决定留到最后统一进行）


## Session 26: new-index3 收尾提交与子任务归档
<!-- trellis-session: v=2 fp=26c3b92d0283bea2 -->

**Date**: 2026-11-24
**Task**: new-index3 收尾提交与子任务归档
**Branch**: `main`

### Summary

提交新框架、S1 动图与 S5-A 视频接入，改写组件规范，归档四个子任务

### Main Changes

- 新框架（设计令牌、三语词典、MediaSlot、S1/S2/S6、顶栏）与 S1 六张 GIF 入库，删除 23 个旧组件和未用的 Archivo Black 字体
- S5-A 书写演示接入 123 云盘 HLS，按物理像素宽度选清晰度
- component-guidelines.md 删去已移除组件的说明，改为描述新框架
- 归档 design-system、S5-B、手写动画、发布板块；补入 10 月未入库的归档任务与主任务记录；删除失效的 verify-new-home3-content.cjs

### Git Commits

| Hash | Message |
|------|---------|
| `438cbad` | feat(new-index3): 按新设计语言重建首屏以下框架，S1 卡片接入动图 |
| `83f1306` | feat(new-index3): S5-A 书写演示接入云盘 HLS 视频 |
| `456d4e2` | docs(spec): 组件规范改为描述 new-index3 新框架，删去已移除组件的说明 |
| `ae44a88` | chore(trellis): 归档 new-index3 设计框架、S5-B、手写动画与发布板块任务 |

### Testing

- [OK] [OK] pnpm docs:build 退出 0，51 页（提交前后各一次）

### Status

[OK] **Completed**

### Next Steps

- S2 三张场景卡片视频；评审并实现 S7–S9；首屏碎片
- 上线前：S5-A 繁中/英文版式、主栏红笔、去掉 ?lang= 预览、首屏字体本地子集、清理旧 public 图片


## Session 27: new-index3 S2 场景卡片静态层叠画面
<!-- trellis-session: v=2 fp=eaad2c767c710ef5 -->

**Date**: 2026-11-24
**Task**: new-index3 S2 场景卡片静态层叠画面
**Branch**: `main`

### Summary

三张场景卡片右侧改为网页内层叠的静态画面：内容层、Inkeys 墨迹层、en-US 界面层，深浅色各一套，依次出场。线条改用原始采样点，停顿收笔不出锋。素材由 media/nh3-scenes/build.py 生成。

### Git Commits

| Hash | Message |
|------|---------|
| `00a90da` | feat(new-index3): S2 场景卡片改为静态层叠画面 |
| `ad99653` | chore(trellis): S2 场景画面任务文档、验收脚本与规范 |

### Status

[OK] **Completed**


## Session 28: 网站三语 i18n（zh-CN / zh-TW / en-US）
<!-- trellis-session: v=2 fp=f66de1fe6604cd4d -->

**Date**: 2026-11-25
**Task**: 网站三语 i18n（zh-CN / zh-TW / en-US）
**Branch**: `main`

### Summary

实现三语 i18n：简体无前缀、/zh-tw/、/en-us/；整页加载按手动选择或浏览器语言跳转到已有译文（站内不自动切换、爬虫不跳），/inkeys3、/win7、/tos 旧地址按语言跳转；顶栏语言按钮并隐藏 Plume 自带入口；首页、下载页、UInk 首页、inkeys3、win7、使用条款三语，条款合并为 /tos 并新增繁中版，英文条款按简体原文修订（修改/生效日期 2026-11-25）；未翻译页面构建时生成繁中/英文镜像（简体原文 + 暂未翻译提示，canonical + noindex），访客不再掉回简体界面。Codex（gpt-6.2-sol high 只读）交叉审查译文，核实后采纳。生产构建与 25 项 headless 跳转测试通过。新增 spec frontend/i18n-guidelines.md。

### Git Commits

| Hash | Message |
|------|---------|
| `7f81652` | feat(i18n): 网站支持简体中文、繁体中文、英文三语 |
| `333a7ef` | docs(spec): 补充 i18n 规范（语言匹配、语言按钮、未翻译页面镜像、译文用语） |

### Status

[OK] **Completed**


## Session 29: 下载侧栏分组、Inkeys3 介绍页与 Win7 兼容页（三语）
<!-- trellis-session: v=2 fp=b5feba0354eac694 -->

**Date**: 2026-11-25
**Task**: 下载侧栏分组、Inkeys3 介绍页与 Win7 兼容页（三语）
**Branch**: `main`

### Summary

下载侧栏用 Plume items 分组把 Inkeys3/更新日志与下载/使用条款分开，Canary 与版本改名；重写 /version/inkeys3 介绍页（恢复画廊两图到 public/showcase，加立即下载按钮）；/win7 去掉未发布提示、加 KB2670838 下载按钮与安装失败处理；调查确认 KB2670838 为 SHA-1 签名，Win7 原生支持；繁中英文同步；规范补充侧栏分组、public 目录命名与正文按钮写法；custom.css 侧栏宽度修复单独提交；归档 9 个已完成任务

### Git Commits

| Hash | Message |
|------|---------|
| `b7f5d9f` | feat(version): 重写 Inkeys3 介绍页与 Win7 兼容页，下载侧栏分组改名 |
| `35f048a` | docs(spec): 补充侧栏分组、public 目录命名与正文按钮、深浅色图片的写法 |
| `807186f` | fix(theme): 视口窄于 1660px 时侧栏不再被压窄 |

### Status

[OK] **Completed**
