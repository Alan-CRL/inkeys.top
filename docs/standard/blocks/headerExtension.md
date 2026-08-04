---
title: Header Extension 块
---

- Type ID: 1
- Type: Map
- Optional

Header Extension 保存文件说明，并注册 Canvas 可以引用的 Device 与 Workspace。Device 负责空间，Workspace 负责逻辑页面与宿主关系，两棵树互不约束。

## 位置与字段

Header Extension 最多出现一次；若存在，必须紧跟 Header。其后必须是第一个 Canvas 或文件末尾；Ink/Shape/Media 只能出现在某个 Canvas 之后。

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `type` | uint16 | Required | 固定为 `1` |
| `name` | string | Optional | 文件显示名称 |
| `explanation` | string | Optional | 文件说明 |
| `devices` | `Array<Map>` | Optional | Device 注册表 |
| `workspaces` | `Array<Map>` | Optional | Workspace 注册表 |
| `extra` | Map | Optional | 文件级私有扩展 |

`devices` 和 `workspaces` 中的 `guid` 在各自注册表内不得重复。注册表出现循环、重复 UUID 或损坏条目时，读取器应警告并仅为本次加载建立临时修复结果，不得回写源文件。

## 隐式默认项

Header Extension 整体缺失，或某个注册表缺失、为空时，读取器为缺失部分建立一个隐式默认项：

- Device 使用当前渲染目标的根显示区域；
- Workspace 使用 `workspaceType = 0` 的通用屏幕批注工作区；
- Canvas 可以省略对应的 `deviceGuid` 或 `workspaceGuid`；
- Header 中对应的 `deviceNum` 或 `workspaceNum` 必须写为 `1`。

注册表显式包含条目时，Canvas 必须写入对应 GUID，并且引用必须能够解析。显式条目不得与隐式默认项混用。

## Workspace 注册项

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `guid` | string(36) | Required | Workspace 的永久 UUID |
| `workspaceType` | int32 | Required | 工作区类型 |
| `name` | string | Optional | 工作区显示名称 |
| `parentWorkspaceGuid` | string(36) | Optional | 父 Workspace UUID |
| `hostId` | string | Optional | PPT、白板等宿主的稳定匹配字符串 |
| `currentPageIndex` | uint32 | Optional | 保存时正在显示的页，缺失时为 `0` |
| `extra` | Map | Optional | Workspace 私有扩展 |

| `workspaceType` | 场景 | 说明 |
| --- | --- | --- |
| `0` | Screen Annotation | 屏幕批注 |
| `1` | Whiteboard | 白板 |
| `2` | Presentation | PPT / 演示文稿 |
| `3`–`127` | Reserved | UInk 后续版本保留 |
| `128` 及以上 | Private | 软件私有类型 |

未知类型按通用白板加载，保留 Canvas 与内容，但不执行无法识别的宿主绑定。`currentPageIndex` 不存在或没有对应页面时回退第 0 页并警告。

Workspace 可以多级嵌套。子项跟随父项的可见性和生命周期，并合成在父项之上；同级 Workspace 的合成顺序由软件决定。父子关系不要求使用相同或互为父子的 Device。循环引用应断开产生循环的父引用，并将该项作为本次加载的临时根 Workspace。

每个显式 Workspace 至少应有一个 Canvas；没有内容的 Canvas 表示已经创建的空白首页。

::: note PPT 宿主绑定
PPT Workspace 推荐把稳定标识写入 `Presentation.Tags`，并在 `hostId` 保存同一值。每个 PPT Canvas 仍使用 COM `SlideID` 定位具体幻灯片。
:::

## 示例

```jsonc
{
  "type": 1,
  "name": "课堂白板与演示",
  "devices": [
    {
      "guid": "11111111-1111-4111-8111-111111111111",
      "deviceType": 0,
      "x": 0, "y": 0, "width": 3840, "height": 2160
    }
  ],
  "workspaces": [
    {
      "guid": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "workspaceType": 2,
      "name": "课程演示",
      "hostId": "INKKEYS-PPT-7B58E2A1",
      "currentPageIndex": 3
    },
    {
      "guid": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "workspaceType": 1,
      "name": "演示内白板",
      "parentWorkspaceGuid": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    }
  ],
  "extra": {}
}
```

`extra` 是字符串键到任意 MessagePack 值的 Map。写入器必须把私有文件级字段放入 `extra`；读取器仍应忽略未知顶层键。
