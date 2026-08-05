---
title: Header Extension 块
---

- Type ID: 1
- Type: Map
- Optional

Header Extension 保存文件说明，并注册 Canvas 可以引用的 Device 与 Workspace。Device 树描述显示空间，Workspace 树描述逻辑页面与宿主关系，两棵树彼此独立。任一注册表缺失时，由文件内唯一的对应隐式单例代替。

## 位置与字段

Header Extension 最多出现一次；若存在，必须紧跟 Header。Header Extension 之后只能是第一个 Canvas 或文件末尾。Ink、Shape 和 Media 必须出现在某个 Canvas 之后。

| 字段 | 类型 | 要求 | 说明 |
| --- | --- | --- | --- |
| `type` | uint16 | Required | 固定为 `1` |
| `name` | string | Optional | 文件显示名称 |
| `explanation` | string | Optional | 文件说明 |
| `devices` | `Array<Map>` | Optional | Device 注册表 |
| `workspaces` | `Array<Map>` | Optional | Workspace 注册表 |
| `extra` | Map | Optional | 文件级私有扩展 |

`devices` 和 `workspaces` 中的 `guid` 在各自注册表内不得重复。注册表出现循环、重复 UUID 或损坏条目时，读取器应报告警告，并只在内存中建立供本次加载使用的修复结果。读取器不得把容错结果自动写回源文件。

## 隐式默认项

Header Extension 整体缺失，或者 `devices` / `workspaces` 注册表缺失或为空时，读取器必须为缺失的注册表建立一个隐式默认项：

- Device 使用当前渲染目标的根显示区域；
- Workspace 使用 `workspaceType = 0` 的通用屏幕批注工作区；
- Canvas 可以省略对应的 `deviceGuid` 或 `workspaceGuid`；
- Header 中对应的 `deviceNum` 或 `workspaceNum` 必须写为 `1`。

隐式默认项是当前文件内部唯一的逻辑单例，不具有可序列化 UUID。Canvas 唯一键、viewport 归属、页面计数和内容作用域在缺失 GUID 时都使用该单例；不同读取器不得为它生成并回写随机 UUID。

某一注册表包含显式条目时，Canvas 必须写入该类条目的 GUID，且该 GUID 必须能解析到注册项。同一个 Device 或 Workspace 注册表内不得混用显式条目与隐式默认项。一个注册表使用显式条目、另一个注册表使用隐式单例是合法的。

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

`128+` 私有编号没有全局厂商命名空间，只保证预先约定的实现之间互操作。读取器遇到未知 `workspaceType` 时，必须按通用白板加载并保留 Canvas 与内容，但不得执行无法识别的宿主绑定。`currentPageIndex` 缺失或没有对应页面时，读取器回退到第 0 页并报告警告。

Workspace 可以多级嵌套。合成与容错规则如下：

1. 子 Workspace 跟随父 Workspace 的可见性和生命周期，并合成在父 Workspace 之上。
2. 同级 Workspace 按 `workspaces` 数组顺序从前到后合成；数组中的后项位于前项之上。
3. 父子 Workspace 不要求引用相同的 Device，也不要求所引用的 Device 具有父子关系。
4. 父引用形成循环时，读取器应断开产生该循环的父引用，将对应 Workspace 作为仅供本次加载使用的临时根项，并报告警告。

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

`extra` 是字符串键到任意 MessagePack 值的 Map。写入器必须把私有文件级字段放入 `extra`；读取器仍应忽略未知顶层键。UInk 不为私有键提供全局命名空间，跨软件使用前必须自行约定。
