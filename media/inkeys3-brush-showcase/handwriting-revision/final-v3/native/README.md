# Final V3 native capture

独立最终适配：完整 UI3/Draw3 导出器与小样已验证 physical-hold 语义合并；旧产物保持原样。

free_hold soft R G B A width upDelayMs count 后跟 x/y/time_ms。保留0.25px移动准入、真实lastMovementInputTime、生产idle settling/recovery及physical Up；SimulatedPressure、真实modeler、FinalizeStoredStroke的0.055秒窗口及DrawStoredStroke均未关闭。CSV保存实际模型/存储点和笔宽。

laser_scaled scale count 同时缩放LaserSolidRadius与ConfigureLaserStyle，使用真实coverage/material resolve。当前scale=.60，192DPI基准实体直径6masterpx=3previewpx，下图小三角形右斜边的一条开放短弧保留生产模拟压力变化。

pattern originX originY step rowHeight radius R G B A 生成原生D2D三角点阵。当前原点(2780,1250)，间距40，行高20sqrt3，半径2，RGBA(129,116,89,92)。这是未来纹理刷组合演示，合成器按原生不透明Highlighter平头刷覆盖裁切一次，不声称产品已有三角纹理笔。生产平头笔尖方向固定，因此从批准扫刷区导出中心线和宽度。

UI使用en-US、红色FF1000、Soft Pen、绘制态、SetSelectAndClickThroughMode(0)。toolbar-state.json记录最终MainLayoutSnapshot实际文字/显隐、GetSelectAndClickThroughMode及RecallChromeView。断言Undo开、Redo关，无可见Click-through/Select(Clear)；普通Clear是正常独立清空按钮。toolbar-body.json记录MainBar/MainButton实体并集和实际DC变换，合成实体底部定位master y1884。

安装器预检全部锚点/include冲突。仅临时修改离屏入口和Recall通知保持逻辑；恢复前核验所有patched bytes，拒绝覆盖并发编辑，按原字节恢复并移除临时includes，无永久产品更改。

重建必须串行（两个worktree共享依赖junction）。每条命令前在同一PowerShell invocation保存Path、Remove-Item Env:PATH、恢复单一Path，并设MSBUILDDISABLENODEREUSE=1及PYTHONUTF8=1。使用C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe依次运行：

    native/export.py --repository D:/Project/Inkeys/Repo/Inkeys-draw
    native/export.py --repository D:/Project/Inkeys/Repo/Inkeys-hero-shape --shape
    native/verify_capture.py

脚本位置均相对此final-v3目录。vswhere定位ARM64 MSBuild，构建完整InkeysRepo.sln Debug|ARM64，各自private OutDir。构建1200秒、捕获900秒超时。仅offscreen flag，无GUI/提交/发布。--build-only可预编译；--skip-build要求实际私有EXE及adapter哈希匹配compiled-adapter.json。

sources/provenance-{dev,shape}.json绑定最终输入、实际EXE、编译adapter、revision、构建日志、导出日志、图层及元数据。verify_capture.py核验这些绑定和源恢复，输出sources/restoration.json。shape空诊断仅保留capture目录，不能覆盖dev笔画证据。

最新capture-only重放：--skip-build不安装/恢复源适配器，只验证既有私有EXE与compiled-adapter.json，然后离屏重放。编译revision保持原manifest值，当前worktree revision另记。外部源码已发生迁移；不重建已移除文件。replay-source-{kind}.json记录当前相关文件在重放前后完全一致（不存在也作为状态记录）。原先按字节恢复证据归档build/restoration-initial-capture.json，最新restoration.json分别说明capture-only无源改动。
