# Inkeys3 原生素材导出

这里保存可以再次运行的制作适配，产品像素来自 `Inkeys-draw` 的生产渲染器。`FeatureMediaExport.inc` 只在已有 `--bar-eraser-offscreen-test` 入口中，由环境变量显式启用；普通启动路径没有修改。

## 重建

在 Windows 11 ARM64、现有 Visual Studio ARM64 工具链和 native 依赖可用时运行：

```powershell
./export-native.ps1 -Repository 'D:/Project/Inkeys/Repo/Inkeys-draw' -Python '<python.exe，带 Pillow>'
```

脚本使用 `vswhere` 定位 ARM64 MSBuild，构建现有 `InkeysRepo.sln Debug|ARM64`，显式等待离屏进程结束（最多五分钟），再校验并发布到 `../sources/`。构建没有人为短超时。导出过程不创建 HWND，不连接 DComp，不运行正常 GUI，也不操作 Office/COM。需要允许对 native 仓库的编译输出与临时 harness 文件写入。

临时改动采用精确字节备份，还原前比较补丁文件及 include，遇到其他进程改动会停止覆盖。原始 BOM 和 CRLF 保持不变。备份、构建日志和原始透明大画布保留在 ignored `build/`，源文件在 `finally` 中还原。编译出来的 Debug EXE 包含导出适配；需要普通原始 Debug 二进制时，在恢复源码后重新构建同一 solution。

## 素材与边界

- 主栏使用生产 `BarRenderLoopCoordinator`、真实图标资源、内置中文字体、状态机与光照。深色主题、蓝色笔、动画和边缘光在 fixture 内明确启用；配置写入隔离目录。穿透通过真实 `ChangeStateModeToClickThrough()` 切换并验证工具状态；定格使用真实 Freeze 状态机。
- PPT / 白板分页使用生产 `BarPageSurface`。注入页码是演示 fixture，不意味着运行过 PowerPoint/WPS 或 COM 损坏设备的端到端测试。保存各页静态图及 36 帧 30fps 原生 hover / press / release / leave 动画，跨页切镜可使用同一帧号接续回弹。
- UI 按 3 倍尺寸渲染。所有主栏静态状态与动画帧统一裁切一次 alpha 包围盒加 18px 安全边距，不逐帧改变锚点。分页保留真实 shadow outset。
- 白板底图直接调用软件 `WhiteboardVisual::DrawTheme`（1440×720），包含相同颜色、24px 纹理间距、点阵与网格样式。
- 笔迹由真实 `Draw3::InkRenderer` 的 HLSL、操作层和合成路径渲染，在从不 Present 的 composition swapchain 上导出。轨迹是模板中的明确样本，36 个进度帧；这是生产像素渲染演示，不代表实时触笔输入、预测或 stroke-modeler 的完整录制。
- 读回预乘 BGRA 转为 PNG straight alpha，避免透明边缘二次预乘变暗。`manifest.json` 保存源码 revision、适配器 SHA-256、尺寸、内容包围盒、每帧哈希与导出边界。

`finalize-sources.py` 要求导出日志结尾 `failures=0`、所有 PNG 完整可读、动画尺寸一致且有实际像素变化，最后才发布 manifest。不要手动伪造 manifest 的成功状态。要改变真实软件外观，应修改 native 状态/参数后重新渲染，不在图片上重画控件。

## 调整模板

产品更新时，先更新 native 仓库，再运行此适配。若 harness 的注入锚点变动，安装器会拒绝应用，需要检查对应新入口。镜头时序、字幕与构图在上级目录中维护；此目录只负责真实产品层。主栏动画按 60Hz 推进、每两个样本导出一帧，页控按 30Hz 推进；网页/README 共用这些 30fps 图层，缓动曲线由原生 renderer 保持。

## 2026 重设计原生素材

使用独立 `feature/shape` 制作工作区，禁止指向正在其他任务中的主工作区：

```powershell
./export-native.ps1 `
  -Repository 'D:/Project/Inkeys/Repo/Inkeys-feature-media' `
  -Python '<python.exe，带 Pillow>' `
  -OutputDirectory '<website>/media/inkeys3-features/sources-redesign' `
  -Redesign
```

`export-native.py` 是实际编排入口，统一调用 adapter、完整 `InkeysRepo.sln Debug|ARM64`、离屏捕获和 finalizer，并在 `finally` 恢复原生字节；上述 PowerShell 只做兼容转发。也可直接运行 `python export-native.py --repository <repo> --output <sources-redesign> --redesign`。

`-Redesign` 只允许发布到 `sources-redesign/`。`sources-redesign/asset-contract.json` 是权威输入合同，当前包含 28 个指定 ID 和额外的 `toolbar-whiteboard-laser`：后者用于区分 C1 的 Laser 选中与 C2 普通笔，避免把两个真实 Whiteboard 状态混用。序列按 60fps 导出，文件名为六位帧号。PPT 翻页不重置 Shape，`slides-ink` 第 2 页及返回第 1 页继续使用 `toolbar-ppt-shape`。最高单摆点使用 `mg=160`、`θ=55°`，`|T|=160cos55°=91.77222981616738`；`Fₜ` 是 `mg` 的切向分量而非第三种独立力。Laser 第 179 帧可因低透明度量化而全透明，必须记录为量化尾帧，不能用额外像素掩盖。

- `FeatureMediaRedesign.inc` 只在 `INKEYS_FEATURE_MEDIA_REDESIGN=1` 时进入，与旧导出路径隔离；adapter 对两个 include 均执行存在性检查、字节比对和精确恢复。`run-capture.py` 直接传递 argv，等待并在超时时只终止本次精确 PID，不启动普通 GUI。
- 主栏普通按钮在 Up 提交业务状态；PPT 方向键按生产策略在 Down 提交，Up 不重复触发；Whiteboard 翻页在 Up 提交。PPT/Whiteboard 不显示 Freeze，A3 的 Shape 状态保留桌面 Freeze。
- Shape 使用生产 factory、`CreationTransaction` 和 `InkCanvas`。Down/Move 只产生预览；Up 后才追加文档并导出最终文档像素。Dashed 使用生产路径距离，连续折线保留相位，圆锥后侧弧来自同一几何生成路径。
- Laser 使用同一 contact 和真实 `LaserTrailLifecycle`，依次 Active、1.0 秒 Hold、0.8 秒 Fade、Inactive；不启用粒子。三色背景分别来自 `WhiteboardVisual::DrawTheme`，斜向分屏与转场属于合成器而非原生白板功能。
- `pen-icon-light` 的石墨深边和 `pen-icon-dark` 的对比浅边是明确的 harness/宣传片视觉调整，不是现有用户配置。现代鼠标箭头属于合成器的 editorial 图层，不进入原生 manifest。
- `finalize-redesign.py` 强制检查 ID、`failures=0`、尺寸、共享 alpha bounds、逐帧事件/hash、Shape 文档提交和 Laser 生命周期；`validate-redesign.py` 再校验发布文件，并在 `build/native-redesign/` 输出代表帧接触表和 `validation.json`。两者均不修改旧 `sources/` 或公开成品。
