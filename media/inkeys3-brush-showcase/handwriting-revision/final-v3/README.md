# V3 原生整图

本目录隔离保存已批准 V3 手写与右侧几何的最终整合；此前的草稿、原生小样和旧整图保持原样。最终图只接受成功导出的原生墨迹、形状与 UI 图层（当前最终图已移除全部激光），不接受草稿后备。

- `build/final-preview.png`：1600×1000 预览。
- `build/final-master.png`：3200×2000 母图。
- `build/final-qa/`、`build/final-validation.json`：实际输出像素局部与来源/边界检查。
- `data/scene.json`：全部新手写轨迹、教学布局，以及逐项保留的已批准右图数据。
- `data/native-scene.txt`：原生输入，坐标放大两倍，时间保持毫秒。
- `sources/`：真实原生导出及输入、EXE、适配源、元数据、日志 SHA256 绑定。

`prepare_scene.py` 只读加载 V3 数学和英文中心线路径、对应运动采样器，以及 shape-draft 内补充字形。缺失符号在本目录局部补充。`teaching_layout.py.txt` 保留先前批准的教学位置和推导，实际字形及运动全部重新生成。数字、根号、大写和已批准连笔词组继续使用 V3 内部路线变体，不使用字体轮廓。原生标称宽度为字高 × 0.095；V3 草稿的 × 0.105 只是直接绘制预览宽度，未用作原生笔压目标。输入每 8 ms 采样，最后输入采样后保持 88 ms 再物理 Up；末尾另有一个 8 ms 静止采样，因此诊断中的最后真实移动至 Up 为 96 ms，生产 55 ms 收笔算法保持启用。

题干圈画和蓝色箭头先经过三次连续曲线插值，再按弧长以 8 ms 运动采样；闭合圈使用周期切线。显式 `curve=False` 的箭头尖、括号与分式横线保持折角。V3 字形与文字布局没有变化。修订前输入、来源和成图保存在 `build/before-laser-curves/`。

右侧上图为中央正六边形截面，下图为 k=10 示意的非正则六边形，尺寸仍以 k 表示。原生形状工厂只画边线，未填充面。当前成图已移除全部激光，蓝色 d=0 中央截面参照、全部文字、已平滑批注、几何和 UI 均保留。当前交付为 `build/final-no-laser-preview.png` / `build/final-no-laser-master.png`，同时更新 `final-preview.png` / `final-master.png`。旧含激光成图保留在 `build/final-subtle-laser-preview.png` / `build/final-subtle-laser-master.png`；`sources/ink-laser.png` 仅为历史捕获，不被当前合成器读取、消费或列入已消费图层。

纹理部分是未来功能演示：通过原生 D2D 绘制批准的三角点阵原型，统一相位后按生产平头刷覆盖范围裁切一次。它不是当前产品已经存在的纹理笔模式，也不是生产 Whiteboard 原有方形点阵。点阵原点为母图 (2780,1250)，基向量 (40,0)、(20,20√3)，点半径 2。生产平头笔尖方向固定，九条扫笔采用批准四边形左右边的中点与 84 px 预览宽度，保留扫笔分布但并非草稿任意四边形轮廓的逐像素复制；底部统一截止于预览 y=935。

工具栏来自英文、红色软笔绘图状态的生产 UI；合并模式 0，Undo 可用，Redo 不可用。按包含 MainButton/DC 位移的真实实体矩形统一缩放，实体底边贴母图任务栏 y=1884；透明容量和阴影不参与定位。浏览器、缩略图侧栏及任务栏像素要求逐像素保持。

当前无激光版本只需使用现有已验证捕获运行 `compose_native.py`，无需重新准备输入、编译或捕获。以下为历史完整捕获流程：运行 `prepare_scene.py`，使用 `native/export.py` 分别从 dev 与 shape 工作树导出，再运行 `compose_native.py`。已有私有二进制且编译绑定一致时可用 `--skip-build`；新编译须使用 InkeysRepo.sln Debug|ARM64、vswhere 定位的 ARM64 MSBuild、规范化 Path/PATH、隔离 OutDir。所有临时原生源修改由导出器按字节恢复。无 GUI、发布或 Git 提交。
