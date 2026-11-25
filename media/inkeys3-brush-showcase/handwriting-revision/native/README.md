# Native handwriting small samples

本目录独立于原成品 native/，仅小样透明墨迹；不输出主栏、白板、图形或激光。旧成品及其输入/适配/manifest 均不修改。

## Input contract
- `free soft R G B A width count`：旧导出行为，物理 Up = 最后样本 +0.1ms，所有样本更新移动时间。
- `free_hold soft R G B A width upDelayMs count`：明确物理 Up 延迟，后续为 x y time_ms；采样为原始物理输入，不是建模点。
- 旧、新均用同一当前 Draw3、SimulatedPressure、modeler、FinalizeStoredStroke(...,0.055,...)、DrawStoredStroke。没有改硬笔、关闭 taper 或修图。

新适配遵循生产 DrawingController 的移动准入及 idle settling：
1. 移动阈值0.25px；静止/过小快照不改变测速基准或 lastMovementInputTime。
2. 仅实际移动更新 lastMovementInputTime 并解除停笔 liveTipLength 封顶；速度仍按60ms低通。
3. 停笔只推进 logicalInputTime；用 ShouldStartEndpointSettling、IsModeledTipSettled、AppendEndpointBoundedModeledPoints 完成真实模型收敛；续画用 AppendRecoveryModeledPoints。
4. physical Up 锁定真实停笔年龄，使用实际最后移动时间完成终点准入。

当前新输入设 upDelay96ms。实际诊断年龄104ms，因为末尾一个8ms样本的位移低于生产0.25px阈值，真实移动时间保持在前一个准入点；这正是保持真实移动时间的预期结果。

## Outputs / evidence
- sources/samples-old.png、samples-new.png：真实透明原生墨迹。
- stroke-diagnostics.csv：每笔原始/移动/Up时间、真实停笔年龄、原始速度范围、真实建模及存储点数和宽度；所有软笔 taper_seconds 保持0.055。
- stroke-geometry.csv：真实 modeled/stored 点位置、直径、时间，便于检查折角及尾部。
- provenance-dev.json 绑定实际 scene、EXE、适配、PNG、CSV、export log；restoration.json 证明 native harness 按字节恢复且临时includes不存在。
- 两层对照使用同一个当前渲染器（revision见manifest），不是声称复现旧二进制逐像素输出。

本轮首次完整 solution 编译通过；随后为匹配静止快照准入补齐真实语义，再次增量完整solution编译通过；最终输入优化仅 skip-build 重放。所有捕获 failures=0。未打开 GUI、未提交。

## Rebuild
使用 existing InkeysRepo.sln Debug|ARM64、vswhere ARM64 MSBuild、独立 OutDir。保留 Path 值后 Remove-Item Env:PATH，再只恢复一个 Path；MSBUILDDISABLENODEREUSE=1。构建超时1200s，捕获900s。

```powershell
$samplePath = $env:Path
Remove-Item Env:PATH -ErrorAction SilentlyContinue
$env:Path = $samplePath
$env:MSBUILDDISABLENODEREUSE = '1'
$env:PYTHONUTF8 = '1'
& 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' media/inkeys3-brush-showcase/handwriting-revision/native/export.py --repository D:/Project/Inkeys/Repo/Inkeys-draw
```

`--build-only` 允许先编译后等待输入；`--skip-build` 仅重放已经匹配的私有EXE。临时安装只改 Bar.EraserAttribute.Test.cpp，不再修改 Bar.Button.cpp/Recall。
## V2 — varied structures and word gestures

V2仅改变输入，不改本目录C++、生产算法或私有EXE。两列现在都使用 free_hold：samples-old 为V1较规则字形（89笔），samples-new 为V2自然变体及词组笔势（93笔）；不能把本次左列误称为0.1ms旧导出器。上文52/66笔对照是V1历史结果，已归档到 build/v1/native-sources。

V2最终输入hash：3965e21ec977ea2c6a5aa285bb4bc5af4bec045ede731455b7537ffd9dca3070。首次V2（7c053e…）另归档于 build/v2-first/native-sources；最终仅两行笔记的连续书写布局微调，C++和EXE不变。新列显式Up延迟72–112ms，生产0.25px移动准入后实际停笔年龄80–120ms；旧列实际104ms。所有笔画保持0.055生产收笔窗口；端点直径/基准宽度中位数旧列1.297、新列1.280，没有恢复普遍长尖尾。

skip-build捕获退出0、failures=0；实际EXE/C++哈希与V1相同，PNG/CSV/输入/日志绑定通过，harness原字节恢复，V1归档hash不变。build/native-v2-validation.json 记录检查摘要。没有渲染整图或任何主栏、图形、激光。