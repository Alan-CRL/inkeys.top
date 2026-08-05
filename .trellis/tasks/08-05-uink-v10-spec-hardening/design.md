# UInk version 10 草案规范完善设计

## 边界

本任务只完善公开规范、VuePress 导航和可下载样例。version `10` 仍是可发生不兼容修改的预 Beta 草案，当前文档是唯一权威定义。

## 线格式与身份

- Header 保持 `array(7)`。除 Header 固定布局外，写入器仍必须使用字段表声明的精确 MessagePack 类型；读取器可以接受可无损转换且范围合法的其他整数/浮点编码。
- 同一 Map 出现重复的已知键时当前块无效；未知键按各块规则忽略。
- Header 计数和 time 是最近一次完整保存快照。增量对象流可以使其暂时过期，读取器不得依赖计数预分配或拒绝实际有效对象。
- 缺失 `workspaceGuid` / `deviceGuid` 分别表示文件内唯一的隐式单例；不存在可序列化的隐式 UUID。

## 保存与恢复

- 增量写入只向文件末尾最后一个 Canvas 追加完整 Ink/Shape/Media，或追加新的 Canvas 及其完整后续内容；不原地更新 Header。
- EOF 中不完整的最后一个 MessagePack 对象被丢弃。解析错误出现在已完成对象之间时，保留此前对象并停止读取余下字节，不做重同步。
- 写入器重新追加前先截断无效尾部，并从最后一个有效块恢复 contentId/undoId。
- 完整保存写入临时文件并原子替换主文件。有资源时先完成 `.uink.extra`，再提交 `.uink`；主文件引用为权威，多余资源允许延后清理。

## 合成、坐标与显示

- 所有 Device/Canvas 坐标使用逻辑像素；`viewport.scale = 1` 表示一 Canvas 单位映射为一 Device 逻辑像素。
- `layerIndex` 越大越靠前；同级 Workspace 按注册数组从前到后合成，后项覆盖前项；子 Workspace 位于父项之上；Window Device 使用 zIndex，同值按注册顺序。
- viewport 只允许出现在 `layerIndex = 0`。其他图层继承第 0 层；第 0 层缺失或无效时使用默认 viewport。
- `slideId` 无法匹配时保留未绑定 Canvas，不使用 pageIndex 自动重新附着。

## 内容与渲染

- Ink 和 Shape 都可保存 `renderOnlyWhenLatest`。读取时忽略 Media，从 Canvas 尾部反向收集连续且标记为 true 的 Ink/Shape；只有这组标记内容显示，其他标记内容隐藏。
- latest 分组不改变 undoId。纠正结果被撤回后，尾部原稿重新显示，并继续按原 undoId 逐步撤回。隐藏但未撤回的原稿必须参与完整保存。
- Highlighter/Advanced Highlighter 先生成整条覆盖，再以 alpha source-over 合成。自由 Ink 的曲线、包络和采样插值不作像素级规定。
- Erase 只影响此前 Ink/Shape；Media 不参与擦除。Shape 的 Marker、线帽、连接和抗锯齿只保证基础语义。
- contentId 只标识当前文件版本内的 Canvas 物理顺序，完整重写后不得作为外部稳定引用。

## 媒体与未知内容

- ZIP 路径使用 UTF-8、Unicode NFC 和 `/`；拒绝绝对路径、URI、反斜杠、空段、`.`、`..`、NUL、控制字符和规范化后重复条目。
- 读取器在分配和解压前应用本地资源预算，超限、MIME 不一致或不安全资源按缺失 Media 处理。SVG 脚本、外部网络资源和文件引用默认禁用。
- 外部导入或含未知内容的文件默认另存为。用户显式确认覆盖时，写入器可以只保存当前能够理解的有效内容。
- 私有 `128+` 编号无全局命名空间，只保证预先约定的实现之间互操作。

## 样例

样例置于 `docs/.vuepress/public/standard/uink-v10/`，每个样例配套可读 JSON、用途说明和 SHA-256。至少覆盖隐式文件、显式多层文件、混合内容、latest 撤回、尾部追加、截断尾块、未知块、宽容数值编码和安全资源包。

## 回滚

文档正文、导航与样例可以整体回滚。不得只回滚单一块文档而保留已经改变的公共顺序、Header 或 viewport 契约。
