# Stage 3 native offscreen export

独立适配由 `media/inkeys3-hero/native` 派生，仅安装到现有 `--bar-eraser-offscreen-test` 入口。不创建 HWND、不运行产品 GUI、不写用户配置；临时 harness 与 Recall guard 在 finally 中按原字节恢复，拒绝覆盖他人变更。`restoration.json` 记录本次逐文件恢复 SHA256；两仓库 tracked 状态均无本次残留。

## Rebuild

在同一个 PowerShell invocation 中保留 PATH 值并合并大小写环境名，避免 .NET duplicate-key，同时不能丢失 postbuild 所需 pwsh 路径：

```powershell
$nativePath = $env:Path
Remove-Item Env:PATH -ErrorAction SilentlyContinue
$env:Path = $nativePath
$env:MSBUILDDISABLENODEREUSE = '1'
$env:PYTHONUTF8 = '1'
$py = 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
& $py media/inkeys3-brush-showcase/native/export.py --repository D:/Project/Inkeys/Repo/Inkeys-draw
& $py media/inkeys3-brush-showcase/native/export.py --repository D:/Project/Inkeys/Repo/Inkeys-hero-shape --shape
```

脚本通过 vswhere 找 ARM64 MSBuild，完整 InkeysRepo.sln Debug|ARM64，1200s 构建超时，900s 离屏捕获超时。采用 task-local OutDir（native-dev-bin/native-shape-bin），不改项目配置。首次共享输出构建遇到无关测试 EXE 锁及随后 EXE 被另一构建覆盖；改用独立输出后，两次完整 solution 构建和捕获均成功。`--skip-build` 仅供本目录已有匹配 exporter EXE 时重放；脚本验证导出入口标记。

## Sources and contracts

- dev revision cf3659c752e7b97db9231844b0e6ebff977b327d：UI3 production Bar callback、Draw3 modeler/FinalizeStoredStroke/DrawStoredStroke、真实激光 coverage/resolve。
- shape revision d060e39bca3673a9cb25da44b7e5a4534e32d038：production MakePresetShape/CreationTransaction/DrawShapeObject，以规范直线及椭圆图元组合准确立方体、六边形及辅助线，无填充。
- 手写和荧光输入来自冻结草稿坐标与时间；flat brush 使用真实 highlighter 几何及 opacity=1，普通标记保持输入 alpha。没有修改生产产品画笔模式。
- pattern.png 来自 WhiteboardVisual::DrawThemePattern，scale1.5，间距36母版像素，相位中心1600,1000，透明层。合成器平移相位并按原生平头刷 alpha 裁切一次。此为未来点阵纹理刷的素材合成，不声称产品已有该刷子模式。
- toolbar-body.json 的 body_rect 由 MainBar 和 MainButton 的生产布局值、缩放及实际 DC capacity-origin 变换得出。它是实体几何并非 PNG/getbbox 阴影边界，适用于本次浮动恒等映射。状态字段记录通过生产 API 设置的目标；en-US、红色颜色指示/边缘、选中软笔及白色可用 Undo 另经实际 PNG 视觉核验，不把目标常量当独立测量。
- provenance-dev.json / provenance-shape.json 绑定捕获输入、实际启动 EXE、adapter、PNG、元数据和失败数为0的日志。`capture-manifest.json` 是各捕获原始中间记录，发布级身份以两个 provenance 文件为准。

本轮只编译新增导出适配，未修改网站或原生产品逻辑。旧第三方告警未作无关清理。