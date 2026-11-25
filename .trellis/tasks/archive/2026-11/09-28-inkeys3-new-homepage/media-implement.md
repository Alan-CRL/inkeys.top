# 2026-10-24 功能演示重设计：实施计划

> 2026-10-25 当前续作：[Remotion 单片计划](./remotion-screen-freeze.md)。用户已授权直接制作一个视频；本轮使用独立 Remotion 项目并进行实际渲染审查，取代下文旧的工具限制和等待确认步骤。其他视频保留现状。

> 用户已于 2026-10-24 批准最终规划，当前正在实施。独立原生制作工作区为 `D:/Project/Inkeys/Repo/Inkeys-feature-media`（`feature/shape@d060e39`，detached）；原 `bugfix/font` 工作区保持不动。原生导出与 v2 合成已完成：29 个资产、2100 张 60fps 序列帧，`render.py --check` 通过，14 项模板测试通过。三条试片已生成并完成动态审查与实际解码：3 个场景、24 个媒体文件，`complete=false`；C1/C2 桌面与手机衔接帧平均像素差均小于 1/255。新增 `--resume`，仅复用实际解码帧数完整的视频。当前等待用户确认试片风格后再批量输出，不自动 commit/push。

## 1. 工具选择与安装结论

采用现有 **原生 C++ 离屏渲染 + Python/Pillow 合成 + FFmpeg 编码 + 当前 VuePress/浏览器验证**。

不需要用户安装 After Effects、Blender、Remotion、FFmpeg、Python 包或 npm 依赖。旧版视觉问题来自分镜和图层设计，不是 Pillow 无法完成高质量运动设计。

### 已验证工具路径

```powershell
$mediaPython = 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$ffmpeg = 'C:/Users/alan-/AppData/Local/JianyingPro/Apps/10.6.0.14092/ffmpeg.exe'
$nativeRepo = 'D:/Project/Inkeys/Repo/Inkeys-feature-media'
```

- `$mediaPython`：Python 3.12.14，Pillow 12.3.0。
- `$ffmpeg`：20.5.0-f2bcd19d3f，支持 `h264_mf`，不含 `libx264`。
- 默认 Python 3.13 没装 Pillow，FFmpeg 不在 PATH；所有命令显式使用上面路径。
- ARM64 MSBuild：`C:/Program Files/Microsoft Visual Studio/18/Community/MSBuild/Current/Bin/arm64/MSBuild.exe`。
- 原生 solution：`D:/Project/Inkeys/Repo/Inkeys-feature-media/InkeysRepo.sln`。
- Node 与 pnpm 已在 PATH；网站不增加依赖。

如果未来换机器，仅需提供等价的 Python+Pillow、FFmpeg 和已有 Visual Studio ARM64 工具链；不要把本机绝对路径写成跨机器硬编码。

## 2. 实施顺序

### [x] 0. 批准与基线保护

- 用户已确认最终规划摘要；当前任务上下文已设置，独立工作区已创建并核对 `feature/shape@d060e39`。
- 原生制作使用独立的 feature/shape 工作区，并将命令中的 `$nativeRepo` 指向该路径。规划收尾时主工作区已外部切换到 `bugfix/font` 且带有字体任务修改，不得切回、清理或在该工作区安装媒体 adapter。
- 保留旧 `sources/`、`docs/.vuepress/public/feature-media/`、`media-result.md` 和旧 storyboard 作为回滚基线。
- 新原生输入使用 `sources-redesign/`，预览使用 ignored `build/redesign-*`；未验收不覆盖公开成品。
- 不切换用户当前原生分支，不修改 Office/COM 配置，不启动普通 GUI。
- 基线验证通过：播放器生命周期回归；旧 16 个 MP4、16 张 poster、8 个 GIF 和 302 张原生 PNG 的完整解码/hash；`pnpm docs:build` 成功渲染 51 页，仅有既有插件耗时提示。

### [ ] 1. 当前 shape 分支的原生适配核查（进行中）

- 检查旧 `native/install-adapter.py` 的 include/锚点与 `feature/shape@d060e39` 是否匹配。
- 确认 UI3 正确桌面/PPT/Whiteboard 投影、PageControl、Whiteboard 主题和 Freeze 可用性。
- 确认 Shape Down/Move/Up、最终事务提交、PenIcon、Laser Active/Hold/Fade 的可读回路径。
- 先完成最小无窗口 smoke export；失败则修复 harness-only 适配，不能用仿图替代。
- 适配安装/恢复继续采用字节级备份、冲突拒绝和 `finally` 恢复；构建日志和原始大画布放 ignored build。

### [ ] 2. 建立共享输入时间轴和原生素材

- 定义统一事件模型：Move、Hover、Down、Up、contact 点、Shape 阶段、场景状态、结果帧。
- 主栏普通按钮在 Up 提交；PPT 方向键按真实按下策略；课件/白板使用各自正确状态。
- 导出 UI3 主栏/分页、正确 Freeze/Pierce 状态、Whiteboard 三主题和必要面板。
- 导出自由笔、长方体/圆锥辅助 Shape、Dashed 连续路径、圆锥后侧弧、PenIcon 和 Laser 全生命周期。
- 浅底深边 PenIcon 以最小 harness 外观调整实现并记录；现代圆角箭头不放进原生产品 manifest，而归为 editorial 输入层。
- 原生动画按 60fps 目标采样；保留共享 alpha bounds、straight-alpha、帧号、hash、输入和 revision。
- 不开启 Laser 粒子，不宣称实时触笔/预测/自动拉直/Office 端到端验收。

### [ ] 3. 建立 v2 分镜和共享合成构件

- 将八幕独立时长、60fps、shots、输入事件、转场、锚点和素材依赖写入新版 `storyboard.json`。
- 在 `scenekit.py` 中只抽取共享需求：浏览器/窗口、单摆、现代光标、斜轴 easing、数学符号、几何背景、三色分屏。
- 现代箭头用高分辨率矢量式几何重新绘制，不能放大用户低清图；静止收敛光晕，Down 收缩而非椭圆扩散。
- `render.py` 继续负责调度、合成和导出；不引入 Remotion 或复杂新框架。
- 删除新时间轴中的主栏上浮、无意义椭圆、烘焙宣传句段和无关镜头推拉。
- 所有场景先能输出静态代表帧，缺 native 输入时直接失败。

### [ ] 4. 先做代表帧与三条运动试片

- 八幕先输出关键镜头 contact sheet，检查每个画面上有什么、文字是否必要、窗口归属和颜色语义。
- A3 验证最高点、受力关系、虚线平行四边形和复杂教学节奏。
- B1 验证青蓝/橙黄辅助线、真实 Dashed、圆锥后侧弧和翻页恢复。
- C1 验证三色分屏、一次 Laser contact、1 秒 Hold + 0.8 秒 Fade 以及激光后的斜轴转场。
- 试片只输出到 `build/redesign-preview/`，先桌面，再补手机关键镜头。
- 用户确认风格和运动方向后才批量制作其余场景；如需改变已批准需求，回到 `media-prd.md` 更新。

### [ ] 5. 完成八幕与桌面/手机/GIF 输出

- 按 A → B → C 完成其余场景，复用共享时间轴，不为三个平台复制分镜。
- 使用 2 倍超采样绘制背景、光标和符号；最终输出桌面 1440×640、手机 720×720。
- 正式 MP4 为 60fps；GIF 为 960×426 / 15fps，保持同一动作时间。
- 手机重新取景，尤其检查 A2 两次点击、A3 受力图、B2 两个应用标识和 C1 跨区激光。
- 每段生成合适 poster、首末帧、manifest、provenance 和范围化 contact sheet。
- C1/C2 检查衔接帧；其他场景检查手动独立选择时的可理解性。

### [ ] 6. 媒体、网页与原生边界验证

- 运行模板回归、原生 manifest/hash/alpha 校验和全部成品实际解码。
- 检查 60fps、时长、尺寸、文件大小、GIF 总时长和 scene ID 完整性。
- 复用并更新现有 `verify-feature-media*.cjs`，验证真实播放、暂停、隐藏/离屏、ended、过期事件、失败 poster、换源续播和清理。
- 在真实浏览器检查桌面/手机关键镜头与运动节奏；contact sheet 不能替代视频观看。
- 运行 `pnpm docs:build`；检查无 SSR、资源路径和响应式回归。
- 若公开静态资源变更，最终提醒同步发布或更新 123pan 直链。

### [ ] 7. 独立审阅与交付记录

- 由 `trellis-check` 按 `media-prd.md`、`media-design.md`、原生证据和前端规范审阅。
- 分别记录：真实产品像素、fixture 注入、教学背景、宣传片光标、数学/编辑符号、后期斜向转场。
- 新成片验收后才替换公开旧素材；保留必要的回滚说明。
- 更新 `media-result.md` 为新一轮实际结果，不能在制作前预写成功。
- 不自动提交、不推送、不归档尚未完成的父任务。

## 3. 计划验证命令

以下是实现落地后的命令合同；当前旧脚本尚不支持新版全部分镜，不能据此宣称新验证已经通过。

### 原生导出

```powershell
$mediaPython = 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$nativeRepo = 'D:/Project/Inkeys/Repo/Inkeys-feature-media'

# 先完成并审查 adapter 对 feature/shape 的兼容更新，再运行：
./media/inkeys3-features/native/export-native.ps1 `
  -Repository $nativeRepo `
  -Python $mediaPython `
  -OutputDirectory './media/inkeys3-features/sources-redesign'
```

若新导出器为避免覆盖旧输入而更名，应以实际脚本为准；不得为了复用命令而静默覆盖旧 sources。

### 模板、试片与全量验证

```powershell
$mediaPython = 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$ffmpeg = 'C:/Users/alan-/AppData/Local/JianyingPro/Apps/10.6.0.14092/ffmpeg.exe'

& $mediaPython media/inkeys3-features/test_render.py
& $mediaPython media/inkeys3-features/render.py --check
& $mediaPython media/inkeys3-features/render.py --contacts-only

& $mediaPython media/inkeys3-features/render.py `
  --scene screen-freeze --scene slides-ink --scene board-backgrounds `
  --output media/inkeys3-features/build/redesign-preview `
  --ffmpeg $ffmpeg --skip-gif

& $mediaPython media/inkeys3-features/verify.py `
  --output media/inkeys3-features/build/redesign-preview `
  --ffmpeg $ffmpeg

# 全部场景验收后才进行正式输出和完整 verify。
pnpm docs:build
```

另外执行 scoped `git diff --check`、原生源码状态比对和 native adapter 精确恢复检查。项目没有独立 lint/type-check 命令，不把 SFC 编译或媒体检查称为完整类型检查。

## 4. 节省 token 与时间的设计

1. **不换工具链**：直接复用现有渲染、导出、manifest、verify 和网页验收脚本，避免研究/迁移 Remotion 或商业软件。
2. **不重复全仓搜索**：以 `research/media-redesign-native-evidence.md` 为原生事实索引；后续子任务只读取自己需要的文件和行段。
3. **拆分工作而不是拆分上下文**：native、合成、浏览器验收可分别派发，主会话只接收结论和需决策问题，不读取大段构建日志。
4. **先帧后片**：先审最终尺寸代表帧，再做半分辨率/30fps 运动预览；60fps 全量只用于批准后的试片和正式输出。
5. **按 scene 重建**：修改某个场景只导出该场景及受影响 manifest；禁止每次迭代重做 16 个视频和 8 个 GIF。
6. **共享构件**：单摆、窗口、光标、斜轴、图形和移动端锚点只实现一次；桌面/手机/GIF 共用时间轴。
7. **复用原生帧**：静态控件、共享背景和已验证笔迹缓存复用；只有输入或视觉合同改变时重新导出 native。
8. **限制中间产物进入上下文**：查看接触表和代表性短视频，完整帧序列、构建日志和 hash 由脚本验证，不逐张读入对话。
9. **保持旧产物可回滚**：避免覆盖后需要重新寻找旧版本或重复生成，减少失败成本。

## 5. 风险与停止点

| 风险 | 停止点与处理 |
| --- | --- |
| 旧 native adapter 与 shape 分支不匹配 | 停止导出，更新 harness-only 适配；不伪造原生帧 |
| 原生仓库出现用户新改动 | 不 checkout、不还原；重新记录状态并保留并发修改 |
| PenIcon 深边被误认为现有配置 | 在 manifest 和设计/结果中明确标为 harness/宣传片视觉调整 |
| Shape/Laser 无法从同一路径导出 | 停止对应场景，不拿 Pillow 仿造；先完成真实读回适配 |
| 60fps 文件过大或播放异常 | 先优化编码与场景，再实测；不未经批准暗中改成 30fps |
| FFmpeg 无 libx264 | 使用已验证 `h264_mf`，并实际解码；不自动下载编码器 |
| 默认 Python 缺 Pillow | 使用 `$mediaPython`；不向默认环境 pip install |
| 办公软件标识被误当真实 Office 验收 | 在教学层与 provenance 明确标为风格化窗口，保留验收边界 |
| 新片未达视觉验收 | 保留旧公开成品，继续预览迭代，不提前接入正式资源 |

## 6. 开始条件

- `media-prd.md`、`media-design.md`、`media-implement.md` 已完成并相互一致。
- `research/media-redesign-native-evidence.md` 已记录前期探索、旧实现、当前分支、工具与边界。
- `implement.jsonl` / `check.jsonl` 包含最新需求、设计和研究入口。
- 阻塞性产品问题为空；工具安装问题已解决为“全部复用本机现有工具”。
- **仍等待用户明确批准最终规划摘要，之后才开始实际制作。**

## 2026-10-25 本轮结果

用户确认的 `screen-freeze` 已完成 Remotion 单片交付及本地官网接入。详见 [remotion-result.md](./remotion-result.md)。其他七段保持原状；本轮不把旧的八幕总验收标为完成。
