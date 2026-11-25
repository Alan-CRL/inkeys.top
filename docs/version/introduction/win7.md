---
title: Inkeys3 兼容性说明
---

Inkeys3 采用了全新的界面和绘图引擎，需要用到较新的系统图形组件（Direct2D 1.1），因此最低系统要求从 Inkeys2 的 Windows 7 调整为 Windows 7 SP1，并需要安装 KB2670838 更新。为避免升级后无法启动，不满足条件的 Windows 7 电脑不会自动更新到 Inkeys3。

## 系统要求

- Windows 8 及以上：无需额外操作，可以直接使用。
- Windows 7：需要已安装 Service Pack 1（SP1）和 KB2670838 更新。

## KB2670838 是什么

KB2670838 是微软为 Windows 7 SP1 发布的平台更新，补充了 Inkeys3 所需的图形组件，不会改动系统的其他内容。更新详情见 [微软说明](https://support.microsoft.com/zh-cn/topic/windows-7-sp1-%E5%92%8C-windows-server-2008-r2-sp1-%E7%9A%84%E5%B9%B3%E5%8F%B0%E6%9B%B4%E6%96%B0-d97da9ca-c15c-b21f-ebb0-838f7be8d9f6)。

::: tip 如何确认已经安装了 KB2670838
1. 按下 Win + R，输入 `powershell` 并按回车。
2. 输入 `get-hotfix -id KB2670838` 并按回车。
3. 如果看到如下内容，说明已经安装。

| Source | Description | HotFixID | InstalledBy | InstalledOn |
| :- | :- | :- | :- | :- |
| <任意值> | Update | **KB2670838** | <任意值> | <任意值> |

:::

## 安装 KB2670838

1. 打开微软官网的下载页，选择与系统位数一致的文件：64 位系统选 `x64`，32 位系统选 `x86`。（查看位数：右键“计算机”→“属性”→“系统类型”。）
2. 双击下载好的 `.msu` 文件，按提示完成安装，然后重启电脑。

<div class="doc-actions">
  <a class="nh3-btn nh3-btn-primary no-icon" href="https://www.microsoft.com/zh-cn/download/details.aspx?id=36805" target="_blank" rel="noopener noreferrer">从微软官网下载</a>
  <a class="nh3-btn nh3-btn-secondary no-icon" href="https://www.123912.com/s/duk9-58EAd" target="_blank" rel="noopener noreferrer">云盘备份</a>
</div>

更新包的签名方式 Windows 7 本身就支持，不需要先安装 SHA-2 相关补丁。

::: warning 双显卡笔记本请注意
少数同时带有 Intel 与 AMD 显卡的笔记本，安装此更新后可能出现蓝屏或黑屏，这是微软已知的问题。遇到这种情况，请安装微软的修复更新 [KB2834140](https://www.catalog.update.microsoft.com/Search.aspx?q=KB2834140)，并到电脑厂商官网更新显卡驱动。
:::

## 无法安装时

**提示“此更新不适用于你的计算机”**

- 系统还没有安装 SP1：请先安装 SP1。
- 下载的文件与系统位数不一致：换另一个文件。
- 已经安装过：按上文的方法确认即可，无需重复安装。

**提示错误 0x80070422 或“服务无法启动”**

Windows Update 服务被禁用了，常见于精简版或被优化软件处理过的系统。打开“服务”（Win + R 输入 `services.msc`），将 Windows Update 的启动类型改为“手动”并启动，然后重新安装；安装完成后可以改回原设置。

**其他错误**

可能是系统的更新组件损坏，可以先运行微软的系统更新准备工具（[KB947821](https://www.catalog.update.microsoft.com/Search.aspx?q=KB947821)）修复后再试。仍然无法安装的，欢迎到[社区](/community)反馈。

## 没有安装 SP1？

请先通过 Windows 更新或微软官网安装 [Windows 7 Service Pack 1](https://www.catalog.update.microsoft.com/Search.aspx?q=KB976932)，再安装 KB2670838。

---

::: tip 一些杂物
Inkeys3 的相关测试模块构建([#](https://www.123912.com/s/duk9-L8EAd))  
:::
