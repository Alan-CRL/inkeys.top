# UInk Canvas 视口实施计划

- [x] 将已确认的共享归属、Canvas Map、左上角锚点、scale 方向、所有 Workspace、非撤回语义和页面复制继承规则同步到 PRD。
- [x] 在 Canvas 规范中新增可选 viewport 字段、字段表、映射公式、默认值、多图层一致性、示例和容错。
- [x] 在 Device 与主文件规范中明确 Device 几何与 Canvas viewport 的职责边界，修正“Canvas 只填满 Device”造成的歧义。
- [x] 更新增量写入和完整重写规则，区分新增 Canvas 可追加与修改既有 viewport 必须重写。
- [x] 更新规范介绍和相关链接，说明内容坐标不因视口平移缩放而改变。
- [x] 搜索所有 Canvas/Device/页面复制/撤回表述，清理与 viewport 冲突的旧语义。
- [x] 运行 `pnpm docs:build` 和 `git diff --check`。

## 风险与回滚点

- 不得把 Device 的系统绝对 x/y 或 Window 的父 Device 相对 x/y 复用为 viewport 坐标。
- 多图层 viewport 重复保存时必须写清权威值和不一致回退，否则不同读取器可能产生层间错位。
- 修改既有 Canvas 的 viewport 不能被误写成可追加内容，否则增量恢复会出现重复 Canvas。
