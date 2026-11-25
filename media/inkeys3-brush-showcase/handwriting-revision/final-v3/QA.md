# 最终检查

- 场景验证通过：482 条手写笔画、8 ms 采样、最终采样后 88 ms Up 延迟；原生诊断的最后真实移动至 Up 为 96 ms。全部手写（含已平滑批注）、教学布局与批准几何均与 `build/before-subtle-laser/` 完全一致。
- 激光仅一条开放短弧，沿下图顶角小三角形右斜边中间 50%，长度 60.164 preview px；向外偏移 1.5–3.5 px，原生实体和材质同步缩放 .60。中心线距 Z / (k-6)sqrt2 字形分别 29.617 / 25.488 px，无闭合、填充或额外强调。
- dev / shape capture-only 原生重放均 `failures=0`；输入、实际 EXE、编译适配源、构建日志、图层与元数据绑定验证通过。私有 EXE、适配文件和原生源码保持不变；没有重新编译或挂载适配器。
- `ink-handwriting.png`、`ink-highlight.png`、`ink-brush.png`、`pattern.png`、`toolbar.png`、`geometry.png` 六个图层 SHA256 与修改前完全相同。非 laser 输入文本逐字节一致。
- 最终母图的 40047 个差异像素全部位于旧/新原生激光 alpha 覆盖范围。上图激光完全移除；新激光覆盖像素 2489，旧版为 37558（约 6.6%）。证据见 `build/subtle-laser-validation.json`。
- 原生合成与 capture 验证通过；母图 3200×2000、预览 1600×1000。工具栏实体边界 `[1107.5,1772,2185.5,1884]`，底边精确贴任务栏。冻结背景的浏览器、侧栏及任务栏像素一致。
- 已查看最终整图及下图局部：上方无大圈，短弧仅强调一段右斜边、光晕轻且仍可见，Z 和尺寸文字保持清晰。手写、曲线与工具栏外观不变。
- 实际 UI 为合并模式 0、英文 Soft Pen、红色笔尖，Undo 可用、Redo 不可用；Click-through 隐藏，Select 无 Clear 合并后缀。
- 唯一交付版本：`build/final-subtle-laser-preview.png`、`build/final-subtle-laser-master.png`；局部为 `build/final-qa/subtle-laser-lower.png`、`subtle-laser-upper.png`。修改前输入、来源、代码、成图和哈希保存在 `build/before-subtle-laser/`。

这是媒体资产工作，未运行网站构建；复用已验证的私有二进制，无 GUI、生产配置修改、Git 提交或发布。固定方向原生平头刷与未来三角纹理演示边界见 README。
