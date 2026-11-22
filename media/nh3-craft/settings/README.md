# S5-B 设置首页离屏采集

在 Windows ARM64 上使用带 Pillow、NumPy 的 Python，传入已配置 Visual Studio、Windows SDK 与 vcpkg 依赖的 Inkeys3 源码目录。

~~~powershell
$nativePath = $env:Path
Remove-Item Env:PATH -ErrorAction SilentlyContinue
$env:Path = $nativePath
$env:MSBUILDDISABLENODEREUSE = '1'
python media/nh3-craft/settings/export.py D:/Project/Inkeys/Repo/Inkeys
~~~

脚本用 vswhere 查找 ARM64 MSBuild，在私有 solution 副本中选择原有 Debug|ARM64 的 InkeysHeadlessTests 项目。测试工程内的 WARP、Direct3D 11 和 ImGui 后端、FreeType 字体、设置首页、导航、原生标题栏按钮及资源均来自传入的源码。它只运行 `--no-window --setting-home-only`；所有适配源码、目标文件、私有可执行文件和日志都在本目录的 `build/` 内。

六次采集各自加载实际 JSONC 语言文件和主题，以 150% DPI 绘制产品默认的 960×700 DIP 客户区（1440×1050 px），首页露出横幅下方的版权行。设置首页处在开屏结束后的静止态。连续读回稳定后保留原生根材质和前景的 Alpha，转为直通 Alpha PNG；再由 `../glass.py` 只把 80% 的 AppBase 底板换成网页统一的 60%，横幅等卡片区域保持原生像素（主栏的 `toolbar/prepare.py` 同样处理底板）。网站负责在窗口后方模糊壁纸。六组全部通过后写入网页资源目录，`capture-manifest.json` 记录渲染程序、图层、字体、输入语言和日志的 SHA-256。
