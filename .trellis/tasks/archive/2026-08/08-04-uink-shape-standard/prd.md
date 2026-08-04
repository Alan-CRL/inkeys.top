# UInk Shape 规范

## Goal

在仍处于完善阶段的 UInk version `10` 中增加可跨软件解析和渲染的 Shape 内容块，使参数化图形能够保存自身几何、单色填充与单色描边，并与现有 Ink、Media 一同参与 Canvas 内容顺序和撤回分组。

## Background

- 当前 Ink 面向自由书写轨迹，点包含坐标、宽度和可选的点级颜色/透明度，不适合同时承载参数化几何、填充和描边语义。
- 当前 Canvas 内容流只有 Ink 和 Media；两者共享连续的 `contentId`、非递减的 `undoId` 和物理渲染顺序。
- UInk version `10` 尚未正式冻结，本次修改继续纳入 version `10`，不新增版本号。

## Requirements

- 新增与 Ink、Media 并列的 Shape 顶层内容块，不把 Shape 设计为 Ink 的 `inkType` 或 Ink 子类。
- Shape 使用新的 Type ID `5`，并与 Ink、Media 共享 Canvas 内的 `contentId`、`undoId` 和物理堆叠顺序。
- Shape 由参数化几何、可选单色填充、可选单色描边和可选私有 `extra` 组成；填充与描边不得同时缺失。
- 首版注册 Line、Polyline、Rectangle、Square、Ellipse、Circle 和 Polygon：
  - Square 与 Circle 使用独立 `shapeType`，供程序判断缩放时是否保持宽高比例；
  - Triangle 使用 Polygon 表达，不注册独立类型；
  - Arrow 不注册独立 `shapeType`，而由 Line/Polyline 的 `startMarker` / `endMarker` 端点样式表达；单向、反向和双向箭头均保持为一个逻辑 Shape；
  - `undoId` 只表达撤回分组，不表达对象归属。
- Polyline 与 Polygon 的几何点使用独立的二维坐标结构，不复用包含宽度和点级样式的 Ink Point。
- Shape 坐标使用 float32 绝对坐标；Shape 不采用 Ink 的首点绝对、后续点相对编码。
- Rectangle/Ellipse 保存中心、最终宽高和旋转；Square 保存中心、边长和旋转；Circle 保存中心和半径。旋转使用弧度，在 Canvas 坐标系中正值顺时针。
- Shape 不保存通用仿射矩阵；Line/Polyline/Polygon 直接保存最终 Canvas 坐标。
- 描边在单个 Shape 内只使用一种 Color、一种透明度和一个固定宽度，不支持逐点变化宽度或颜色。
- `stroke.width` 和 dash pattern 保存写入时最终可见的 Canvas 空间尺寸；编辑器在交互缩放时保持或改变描边尺寸均属于软件行为，但写入器必须保存换算后的实际可见结果。
- Shape 的几何变换不得在读取渲染时再次隐式缩放已经按 Canvas 空间保存的描边宽度和 dash pattern。
- 描边线型使用通用 dash pattern 表达；实线为无 dash pattern，虚线、点线等保存实际间隔模式，不额外保存可能与 pattern 冲突的名称枚举。
- 虚线和点线仍是单个 Shape 的单份逻辑几何；短线与间隔由读取器根据 dash pattern 渲染，不拆分保存为多个 Shape。
- Line/Polyline 可以分别保存 `startMarker` 与 `endMarker`；端点样式属于同一个 Shape，不额外生成箭头端头 Shape 或内容编号。
- Marker 使用可扩展的类型编号：`0` 为无端头，`1` 为开放式箭头，`2`–`127` 为 UInk 后续标准端头保留区，`128` 及以上供软件保存自定义端头。
- version `10` 不在 Marker 中内嵌任意 Path 几何；软件私有端头通过私有 `markerType` 表达。
- 读取器遇到未知 Marker 时必须按无端头回退，不得丢弃主体 Line/Polyline。
- OpenArrow 只注册端头语义，不保存端头 Path、尺寸或固定比例；Marker、线帽和线段连接处的具体外观均由软件决定。
- 软件内部可以继续用“主线 + 两条端头线”等多个线段绘制箭头，但写入 UInk 时应归一化为一个 Line/Polyline Shape 及其 Marker；规范线格式不绑定软件内部绘制实现。
- 填充首版仅支持纯色填充，不包含渐变、纹理或图片填充，但保留后续标准扩展空间。
- Fill 使用可扩展类型编号：`0` 为 Solid，`1`–`127` 为标准保留，`128` 及以上为软件私有；未知类型按已保存的 Color 与 opacity 进行 Solid 回退。
- 将现有 Ink 文档中的 Color Map 抽取为公共颜色结构，供 Ink、Shape 以及 SDR/HDR 回退共同使用；Shape 的填充色与描边色均引用该结构。
- Shape 可以作为完整内容块追加到文件末尾最后一个 Canvas；修改、移动、缩放或删除已经保存的 Shape 时必须完整重写。
- 擦除 Ink 按物理顺序作用于其下方的 Shape；读取器不得因内容类型不同而重新排序。
- 形状修正产生 Shape 时，原始 Ink 的 `renderOnlyWhenLatest` 判断必须把后续 Shape 视为新的可见结果。
- 未识别 Shape Type ID 的旧读取器可以跳过该完整块并继续读取；不能原样保留未知块的读取器不得无警告覆盖源文件。

## Out of Scope

- 渐变、纹理和图片填充。
- 贝塞尔 Path、布尔运算、组合/解组和复杂复合轮廓。
- 在 Marker 中内嵌任意矢量 Path 以跨软件还原私有端头。
- 独立 Triangle 或其他可由基础几何直接表达的语义类型。
- Shape 描边的逐点宽度、逐点颜色、压力、倾斜或速度数据。
- 修改 UInk Header.version；本次继续使用 version `10`。

## Acceptance Criteria

- [x] `docs/standard` 注册 Type ID `5` 的 Shape，并提供字段、几何、描边、填充、示例和容错规则。
- [x] Line、Polyline、Rectangle、Square、Ellipse、Circle 和 Polygon 均有无歧义的几何字段与校验规则。
- [x] Square/Circle 的等比缩放语义和 Rectangle/Ellipse 的可非等比缩放语义得到明确规定。
- [x] 实线、虚线和点线能够由规范化的描边字段确定性表达。
- [x] Line/Polyline 可以通过端点 Marker 确定性表达无箭头、单向箭头、反向箭头和双向箭头，并始终作为一个 Shape 编辑。
- [x] 同一文件在不同读取器中呈现的描边宽度和 dash pattern 与保存时的最终可见尺寸一致，不依赖原软件的交互缩放策略。
- [x] Color Map 只有一份公共定义，Ink 和 Shape 均引用它，且现有 HDR 回退行为不发生变化。
- [x] 主文件、Canvas、增量写入、Ink 条件渲染和擦除规则中的内容流描述包含 Shape。
- [x] 文档明确旧读取器遇到 Shape 时的降级读取与安全保存要求。
- [x] 所有改动保持现有 Markdown 风格、中文术语和链接结构一致。
