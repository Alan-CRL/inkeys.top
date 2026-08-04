# UInk Shape 规范实施计划

- [x] 将最终决定同步到 PRD，确认无开放问题。
- [x] 新增公共 Color Map 文档，并把 Ink 的内嵌定义改为引用，保持线格式不变。
- [x] 新增 Type ID `5` 的 Shape 块规范，覆盖七种几何、Stroke、Fill、Marker、示例和容错。
- [x] 更新规范介绍、版本、Type ID、主文件、Canvas、Ink、Media 与增量写入中的 Ink/Shape/Media 内容流规则。
- [x] 更新 VuePress 规范侧栏，加入公共 Color Map 和 Shape。
- [x] 搜索残留的 Ink/Media 双类型表述以及旧 Type ID `0`–`4` 说明并逐项核对。
- [x] 运行 `pnpm docs:build`。
- [x] 运行 `git diff --check`，核对编码、换行、链接、示例和最终差异。

## 风险与回滚点

- Color Map 迁移必须先建立公共页面再删除 Ink 内嵌正文，避免产生断链或丢失 HDR 规则。
- version 文档必须区分旧草案 Type 5 Media 与当前 Type 5 Shape，避免兼容性歧义。
- Shape 加入内容流时必须同步 contentId、undoId、追加保存、撤回、擦除和条件渲染规则，不能只修改 Type ID 表。
