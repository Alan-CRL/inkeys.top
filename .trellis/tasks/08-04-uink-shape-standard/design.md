# UInk Shape 规范设计

## 边界

本任务只定义 UInk version `10` 的 Shape 线格式和文档集成，不实现具体软件的 Shape 类、序列化器或渲染器。Shape 是与 Ink、Media 并列的 Canvas 内容块，使用 Type ID `5`。

## Shape Map

Shape 顶层字段为 `type`、`contentId`、`undoId`、`shapeType`、`geometry`、可选 `stroke`、可选 `fill` 和可选 `extra`。

`shapeType` 注册：

| 值 | 类型 |
| --- | --- |
| `0` | Line：由两个端点定义的单个线条对象 |
| `1` | Polyline：由至少两个点定义的单个折线对象 |
| `2` | Rectangle |
| `3` | Square |
| `4` | Ellipse |
| `5` | Circle |
| `6` | Polygon |
| `7`–`127` | Reserved |
| `128` 及以上 | Private |

## 几何契约

- Point Map 只包含有限 float32 `x`、`y`，全部是最终 Canvas 绝对坐标。
- shapeType 只描述底层几何；Line/Polyline 的连断由同一 Stroke 的 dashArray 控制，始终保存为单个 Shape，不拆分可见短线。
- Line 的 `points` 恰好两个；Polyline 至少两个；Polygon 至少三个且隐式闭合，写入器不重复首点。
- Rectangle/Ellipse 的 geometry 保存 `centerX`、`centerY`、正数 `width`、正数 `height` 和可选 `rotation`。
- Square 保存 `centerX`、`centerY`、正数 `size` 和可选 `rotation`；Circle 保存 `centerX`、`centerY` 和正数 `radius`。
- `rotation` 为 float32 弧度，Canvas 坐标系中正值顺时针，缺失时为 `0`。Circle 不保存无视觉意义的 rotation。
- 不提供通用 transform；写入器保存最终几何。Square/Circle 的字段结构保证等比语义。

## 描边、填充和端头

- Line/Polyline 必须有 stroke 且不得有 fill。其他闭合 Shape 允许 stroke-only、fill-only 或二者兼有，但至少存在一个。
- Stroke Map 必填 `color`、`opacity`、正数 `width`；可选 `dashArray`、`dashOffset`、`startMarker`、`endMarker`。
- width、dashArray 和 dashOffset 使用最终 Canvas 长度。dashArray 缺失或为空表示实线；非空时长度为偶数，元素为非负有限数且总和大于零，非法时整组回退实线。dashOffset 缺失为 `0`。
- 不注册 lineCap、lineJoin 或 miterLimit；端帽、连接处和抗锯齿外观由软件决定。
- Marker 注册 `0=None`、`1=OpenArrow`、`2`–`127=Reserved`、`128+ = Private`。不保存 Marker Path、尺寸或比例；未知 Marker 回退 None。
- Fill Map 必填 `fillType`、`color`、`opacity`。`0=Solid`、`1`–`127=Reserved`、`128+ = Private`；未知 fillType 使用保存颜色和透明度按 Solid 回退。
- opacity 使用 float32 并钳制到 `0`–`1`；NaN/Infinity 使相应样式无效。

## 公共颜色

把 Ink 中现有 Color Map 原样移动到 `docs/standard/common/color.md`。Ink 和 Shape 通过链接引用同一契约；fallback、sRGB、scRGB、HDR 和非法扩展分量的回退规则不改变。

## 内容流与兼容

- Ink/Shape/Media 按物理顺序混合，共享 Canvas 内连续 contentId 和非递减 undoId。
- 完整 Shape 可以追加到文件末尾最后一个 Canvas；修改既有 Shape 必须完整重写。
- Erase Ink 按顺序作用于此前 Shape，具体裁剪方式由软件决定。
- Ink 的 renderOnlyWhenLatest 判断后续 Ink 或 Shape，Media 不影响最新组判断。
- 未知 shapeType 或损坏必填几何时跳过单块并警告。未知 Marker/Fill 按各自回退规则保留主体。
- 旧读取器可以跳过未知 Type ID 5；不能原样保留未知块时不得无警告覆盖源文件。
- Header.version 保持 `10`。版本文档明确旧草案 Type 5 是 Media，而当前 Type 5 是 Shape。

## 导航与文档结构

- 新增 `docs/standard/blocks/shape.md`。
- 新增 `docs/standard/common/color.md`，并在规范侧栏加入公共结构和 Shape 入口。
- 同步修改 intro、version、type、file/main、canvas、ink、media 和 incremental 中的内容流与相关链接表述。

## 回滚

若构建或一致性检查失败，可整体撤销 Shape 文档、公共 Color 文档及所有交叉引用；现有 Ink Color Map 在迁移完成前不得删除。
