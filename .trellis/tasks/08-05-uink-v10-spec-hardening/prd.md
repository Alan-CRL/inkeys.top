# 完善 UInk version 10 草案规范

## Goal

把 UInk version `10` 完善为可供第三方独立实现的公开草案，统一线格式、保存恢复、内容合成、基础渲染、媒体安全和容错语义，并提供可下载的真实 MessagePack 样例。

## Background

- version `10` 尚未进入 Beta，允许不兼容修改；当前规范覆盖此前同版本草案，不提供迁移兼容。
- 当前 Header、Device、Workspace、Canvas、Ink、Shape、Media 和增量写入已形成基础结构，但仍存在崩溃恢复、合成顺序、viewport 重复、PPT 误绑定、条件渲染和媒体安全等歧义。
- 仓库只有规范文档，不包含 UInk 序列化器、读取器或校验器。

## Requirements

- 保持 Header `array(7)` 和 version `10`，不增加 magic；精确规范写入类型，读取时允许范围内可无损转换的等价数值编码。
- 把缺失 GUID 定义为文件内唯一的隐式 Device/Workspace 单例，并统一唯一键、viewport 和计数语义。
- 增量写入只用于末尾最后一个 Canvas 的完整块追加；增量期间不修改 Header，读取器以实际对象流为准。
- 明确尾部截断、中间损坏、再次追加、完整重写和 `.uink.extra` 提交顺序。
- 定义确定的 Canvas 图层、Workspace 和 Window Device 合成顺序。
- Device 与 Canvas 均使用平台无关的逻辑像素；viewport 仅由同页同 Device 的 `layerIndex = 0` Canvas 保存。
- Ink 与 Shape 共享 `renderOnlyWhenLatest` 尾部显示规则；Media 不打断判定，显示分组不改变 undoId，隐藏原稿在完整保存后仍保留。
- Highlighter 采用整条覆盖后 alpha source-over；Ink 曲线、包络、线帽和采样插值仍由软件决定。
- Erase 只作用于此前的 Ink 与 Shape，不作用于 Media。
- PPT `slideId` 失配时保持未绑定，不按 `pageIndex` 自动附着。
- `.uink.extra` 不增加 manifest；补充路径、重复条目、主动内容、MIME、流式读取和实现自定资源预算规则。
- 不要求无损保留未知块；外部导入或含未知内容的文件默认另存为，显式确认后才能覆盖原件。
- 保留自由的 `128+` 私有编号，不增加 vendorId；不增加稳定 `objectGuid`。
- 新增规范一致性页面和真实 `.uink` / `.uink.extra` 样例，不增加生成脚本、依赖或校验器。

## Out of Scope

- 旧 version `10` 草案迁移。
- Header magic、资源 manifest、私有命名空间、稳定对象 GUID 和格式级资源硬上限。
- UInk 读写器、校验器或像素级统一的 Ink/Marker/抗锯齿算法。

## Acceptance Criteria

- [x] 所有 `docs/standard/**` 页面对版本、编码、身份、顺序、保存和容错的描述一致。
- [x] Header 不再要求增量原地更新；截断尾块仅丢弃最后不完整对象。
- [x] 多图层 viewport、Workspace/Canvas 合成和 PPT 失配行为无歧义。
- [x] Ink/Shape 的 latest 显示、逐步撤回和隐藏原稿持久化有完整示例。
- [x] Media 安全规则覆盖路径规范化、重复条目、主动内容、MIME 和资源预算。
- [x] conformance 页面提供第三方实现检查表和可下载的真实样例及 SHA-256。
- [x] `pnpm docs:build` 与 `git diff --check` 通过，工作树中不包含依赖或锁文件变更。
