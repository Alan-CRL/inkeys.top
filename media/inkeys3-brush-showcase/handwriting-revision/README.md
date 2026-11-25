# V2 原生板书手写小样

当前只做小样，等待用户确认；没有替换整张教学展示图，也没有执行后续图形、激光、纹理或主栏修改。

## 当前输出
展示时优先使用独立V2文件名 `build/handwriting-natural-v2-preview.png` / `handwriting-natural-v2-master.png`，避免旧预览缓存；它们与下面规范输出字节一致。
- `build/handwriting-samples-preview.png`：1040×1105，短笔记置顶，下面是重复字符及真实像素放大。
- `build/handwriting-samples-master.png`：2080×2210。
- `build/detail-note.png`、`detail-digits.png`、`detail-letters.png`、`detail-rounds.png`、`detail-roots.png`：上方V1，下方V2。
- `build/sample-validation.json`：当前输入/原生来源身份、实际停笔和结构变化检查。

本轮左栏是上一版V1规整策略，右栏是V2自然书写。两栏都使用已经修正的真实停笔处理，不能再把左栏称为旧legacy抬笔行为。原生EXE和C++适配与V1一致，本轮仅更新输入并进行无窗口数据复捕获，没有重编译。

## 改动是实际书写路线
`natural_paths.py`保存作者路径变体：3有4种、2有3种、M/N各3种，E/F/0/7/s各至少2种。不同处包括上下弧比例、开口、横画长短及方向、略弯的竖画、不同起收笔与分笔方式；不是同一路径缩放旋转，也不添加随机坐标噪声。数字7保持同一不加横杠习惯。

短笔记中的公式以跨token持续的动作相位生成，MN、运算符、上标和末尾18有作者式落位、间距及轻微基线起伏；下一行OM/ON/MN有不同缩进。这仍包含正常抬笔，不能声称整条数学式一笔写完。基准字高21DIP、基准笔宽1.995DIP，数学token字高约18.2–22DIP，上标另缩小；笔宽随token高度等比例设置，实际粗细仍由真实软笔速度算法决定。

`by symmetry`不是逐字盖章后补连接线：by为1条完整路线，symmetry为2条长笔势及1条t横画，共4条真实路线、3次组间抬笔。词内连接由作者路径本身构成。

`data/sample-input-manifest.json`记录每个字符的结构variant、规范化路径SHA、笔画范围、每条连续词组路线、token上下文、速度与停笔。8ms均匀采样和真实转角减速保留；名义速度按笔势上下文变化，抬笔前设置72–112ms，实际移动至Up观测80–120ms。不同转角采用0/8/16ms驻留，保留原生55ms收笔窗口，不回退到所有笔画尖尾。

## 真实性与验证
- 所有红色墨迹均来自当前真实Draw3导出；普通字体只用于中文标题和说明。
- 本轮89条V1对照、93条V2笔画，两组均physical-hold，导出failures=0。
- 合成器要求输入、实际EXE、原生适配、PNG、CSV及成功日志的hash绑定，无草稿后备。
- 放大细节直接使用原生像素最近邻放大，不重画或额外描边。
- 结构变化验证在规范化字形路径上进行，不能仅靠图片边框变化作为证据。

## V1保留位置
`build/v1/authoring/`保留原生成器、数据与README；`build/v1/boards/`保留原对照板及验证记录；`build/v1/native-sources/`由原生导出代理保留原透明PNG、CSV和来源清单。当前生成器只读使用保存的V1函数生成同内容对照，不修改V1文件。

## 重建
```powershell
& 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' media/inkeys3-brush-showcase/handwriting-revision/prepare_samples.py
# 用本目录native/的现有私有EXE进行--skip-build导出，禁止覆盖旧整图native来源。
& 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' media/inkeys3-brush-showcase/handwriting-revision/compose_samples.py
```

用户确认这份小样之前，停止后续整图工作。
