---
title: Header Extension 块
---

- Type ID：`1`
- 类型：Map
- 可选

**Header Extension 是文件的“目录”**：注册文件里有哪些显示区域（Device）和哪些使用场景（Workspace），Canvas 通过 GUID 引用它们。只有一块屏幕、一个场景的简单文件可以不写它。

::: tip 等级
- **核心级**：读取注册表；注册表缺失时建立隐式单例；按注册顺序列出 Workspace。
- **标准级**：识别 `workspaceType`（屏幕批注、白板、PPT）、`hostId`、`currentPageIndex`。
- **完整级**：多 Device、嵌套 Workspace 的合成。
:::

## 字段

| 字段 | 类型 | 要求 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `type` | uint16 | Required | 核心 | 固定为 `1` |
| `name` | string | Optional | — | 文件显示名称 |
| `explanation` | string | Optional | — | 文件说明 |
| `devices` | `Array<Map>` | Optional | 核心 | Device 注册表，见 [Device](device) |
| `workspaces` | `Array<Map>` | Optional | 核心 | Workspace 注册表，见下文 |
| `extra` | Map | Optional | — | 软件私有字段 |

## Workspace 注册项

| 字段 | 类型 | 要求 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| `guid` | string(36) | Required | 核心 | Workspace 的永久 UUID |
| `workspaceType` | int32 | Required | 标准 | 场景类型，见下表 |
| `name` | string | Optional | — | 显示名称 |
| `parentWorkspaceGuid` | string(36) | Optional | 完整 | 父 Workspace 的 UUID |
| `hostId` | string | Optional | 标准 | 宿主（例如一份演示文稿）的稳定标识 |
| `currentPageIndex` | uint32 | Optional | 标准 | 保存时正在显示的页，缺省为 `0` |
| `extra` | Map | Optional | — | 软件私有字段 |

| `workspaceType` | 场景 | 说明 |
| --- | --- | --- |
| `0` | Screen Annotation | 屏幕批注 |
| `1` | Whiteboard | 白板 |
| `2` | Presentation | PPT / 演示文稿 |
| `3`–`127` | 保留 | 留给后续版本 |
| `128`+ | 私有 | 软件自定义 |

## 规则

### 位置

- **HEXT-1** Header Extension 最多一个；存在时必须紧跟 Header，后面只能是第一个 Canvas 或文件结尾。

### 注册表与隐式单例

- **HEXT-2** `devices` 与 `workspaces` 中的 `guid` 在各自注册表内不得重复。
- **HEXT-3** Header Extension 缺失、或某个注册表缺失或为空时，读取器为它建立一个隐式单例：隐式 Device 是当前渲染目标的整个显示区域；隐式 Workspace 是 `workspaceType = 0` 的屏幕批注。
- **HEXT-4** 隐式单例没有 GUID，Canvas 省略对应的 `deviceGuid` 或 `workspaceGuid`。读取器不得为它生成 UUID 并写回文件。
- **HEXT-5** 一个注册表写了显式条目，Canvas 就必须写对应的 GUID，并且能在注册表中找到。同一个注册表内不得混用显式条目与隐式单例；两个注册表一个显式、一个隐式是允许的。
- **HEXT-6** 使用隐式单例时，Header 中对应的 `deviceNum` 或 `workspaceNum` 写 `1`。

### 场景识别

- **HEXT-7** 白板只用 `workspaceType = 1` 表示，PPT 只用 `workspaceType = 2` 表示，不需要额外的私有标记。PPT 按页码绑定时仍使用 `workspaceType = 2`，绑定方式写在 Canvas 的 `binding` 中。
- **HEXT-8** PPT Workspace 推荐把一个稳定标识写入演示文稿（例如 `Presentation.Tags`），并在 `hostId` 中保存同一个值，用来确认打开的是同一份演示文稿。
- **HEXT-9** 每个显式 Workspace 至少应有一个 Canvas；没有内容的 Canvas 表示已创建的空白首页。
- **HEXT-10** `currentPageIndex` 按读取器排好的页序解释（含按页追加后的重新编号，SAVE-14）。它位于文件开头，只在完整保存时更新，按页追加期间可能落后于实际。缺失或指向不存在的页时，读取器显示第 0 页并报告警告。

### 嵌套（完整级）

- **HEXT-11** 子 Workspace 跟随父 Workspace 的显示与生命周期，合成在父 Workspace 之上。
- **HEXT-12** 父子 Workspace 不要求引用相同或有父子关系的 Device。

### 容错

- **HEXT-13** 注册表出现重复 UUID、损坏条目或父引用循环时，读取器报告警告，只在本次加载中修复（FILE-22），不得写回源文件。
- **HEXT-14** 读取器遇到不认识的 `workspaceType` 时，按普通白板加载，保留 Canvas 与内容，不执行宿主绑定（FILE-20）。

## 示例

```jsonc
{
  "type": 1,
  "name": "物理课",
  "devices": [
    { "guid": "11111111-1111-4111-8111-111111111111", "deviceType": 0,
      "x": 0, "y": 0, "width": 3840, "height": 2160 }
  ],
  "workspaces": [
    { "guid": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "workspaceType": 2,
      "name": "第三章 力", "hostId": "INKEYS-PPT-7B58E2A1", "currentPageIndex": 3 },
    { "guid": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "workspaceType": 1,
      "name": "演示中打开的白板",
      "parentWorkspaceGuid": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }
  ]
}
```

## 回退

| 读取器缺少的能力 | 显示方式 |
| --- | --- |
| `workspaceType`、`hostId`（核心级、基础级） | 所有 Workspace 都当作普通页面序列显示 |
| 嵌套 Workspace（完整级以下） | 子 Workspace 当作独立的页面序列，按注册顺序列出 |

## 相关

- [Device 结构](device)
- [Canvas 块](canvas)
- [墨迹主文件](../file/main)
