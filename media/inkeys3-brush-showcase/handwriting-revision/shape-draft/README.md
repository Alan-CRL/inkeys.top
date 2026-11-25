# 右侧几何草稿

本目录是供确认的直接绘制草稿，尚未进行 Draw3 原生渲染、工具栏修订或整图讲解合成。上方与下方几何无面填充。所有墨迹文字复用已批准 V3 中心线；缺字在本目录脚本内补充，未修改 V3 文件。字体仅用于截图外的草稿标题。

- `build/context-preview.png`：1600×1000 原尺寸语境预览。
- `build/context-master.png`：3200×2000 母图。
- `build/context-review.png`：截图外附草稿说明的预览板。
- `build/right-detail.png`：从母图裁切右侧实际像素，加外部标题；未重绘放大替身。
- `build/right-overlay.png`：独立透明叠层。
- `data/scene.json`：3D/2D 几何、相机、点阵、扫笔并集、两圈激光、全部手写中心线与 8 ms 运动数据、来源 SHA256。
- `data/validation.json`：独立检查结果。

上图保留原相机的单位正交基及单一比例 29，仅把中心平移至点阵节点。ABC D / EFGH 对应关系沿用原始数据，A 的三条背面棱虚线。截面为 x+y+z=9 的六个中点，空间边长均为 3√2。

下图以 k=10 示意 9<k<12：大三角形顶点为三个坐标轴截距，三角形边长 k√2；三个被扣角边长为 (k−6)√2。实际六边形边长交替为 (12−k)√2 与 (k−6)√2。尺寸文字保持符号形式，无中点或正六边形角度标注。大边为 15 个点阵间隔，小角边为 6 个间隔；所有下图顶点严格落在同一三角点阵上。

奶油色底使用九次宽扁斜扫的并集一次着色，点阵使用统一相位裁切，不产生叠加暗块。两条闭合、略错位的 4.3 px 激光中心线仅环绕顶角，轻微光晕，无内部涂抹。底部裁切到预览 y=935，保留与任务栏之间的间隙。

复现（无 GUI、无原生构建）：

```powershell
& 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' 'media/inkeys3-brush-showcase/handwriting-revision/shape-draft/build_shape_draft.py'
& 'C:/Users/alan-/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' 'media/inkeys3-brush-showcase/handwriting-revision/shape-draft/validate.py'
```

检查由立方体 12 条棱独立求平面交点，在 k=9.2、10、11.5 验证多边形面积等于 √3/2[k²−3(k−6)²] 及 27√3−3√3d²。另检查正交相机、隐藏棱、点阵、标签框、闭合激光、无面填充、92 个冻结文件与背景像素边界。已查看两张最终图片进行视觉复核。资产草稿不涉及网站源文件，未运行网站构建。下一步须在用户确认此几何方向后才开始原生与最终合成。
