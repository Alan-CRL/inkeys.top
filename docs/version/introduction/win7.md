---
title: Inkeys3 兼容性调整的相关说明
---

Inkeys3 将会推出全新的 UI 界面与绘图库，使用 D2D1.1 的相关功能。更新的 D2D1.1 可以带来更高的绘图效率和更丰富的绘图效果，但也提高了系统版本的要求。  
从 Inkeys2 升级到 Inkeys3，兼容性从原来的最低 Windows 7 RTM 调整至 Windows 7 Sp1+。小部分 Windows 7 用户可能在升级后无法启动智绘教，所以我们阻止了这部分用户的自动更新。  

---
  
::: tip 您的版本是最新的
Inkeys3 尚未推送，目前最新版本为 Inkeys2 的 `20260206a`
:::

## 系统环境要求

Inkeys3 的最低系统要求是 Windows 7 Sp1+。  
- 对于 Windows 8 **及**以上系统版本的用户无需担心，可以直接使用 Inkeys3。  
- 对于 Windows 7，则需要 Windows 7 Service Pack 1 和安装 KB2670838 更新。

### KB2670838 更新是什么
KB2670838 更新增加一些新的系统组件，例如 Inkeys3 所需要的 D2D1.1 的底层组件支持。安装这个更新只是补全系统组件，并不会改动其他内容。  
有关此更新的[详细内容](https://support.microsoft.com/zh-cn/topic/windows-7-sp1-%E5%92%8C-windows-server-2008-r2-sp1-%E7%9A%84%E5%B9%B3%E5%8F%B0%E6%9B%B4%E6%96%B0-d97da9ca-c15c-b21f-ebb0-838f7be8d9f6)。 

需要注意的是：一些电脑可能安装此版本后崩溃（据微软说明），请确认您的硬件是否支持，请先点击**详细内容**查看更新说明。  

::: tip 如何确认系统是否安装了 KB2670838 ？
1. 按下 WIN + R 输入 `powershell` 并按下回车打开 Powershell  
2. 输入 `get-hotfix -id KB2670838` 并按下回车  
3. 如果看到如下文字，则说明已经安装了 KB2670838

| Source | Description | HotFixID | InstalledBy | InstalledOn |
| :- | :- | :- | :- | :- |
| <任意值> | Update | **KB2670838** | <任意值> | <任意值> |

:::

### 我是 Windows 7 Sp1 用户该如何安装更新以支持
通过 [下载更新包](https://www.microsoft.com/zh-cn/download/details.aspx?id=36805) 的 msu 文件，打开文件安装即可。  

[云盘备份](https://www.123912.com/s/duk9-58EAd)  


### 更低版本？
如果没有安装 Windows 7 Service Pack 1，则需要先对系统进行更新。  

---

::: tip 超前体验 Inkeys3 ？
Inkeys3 将会先在 Canary 通道推出供体验，属于早期开发版本，不建议日常使用。[下载](https://www.123912.com/s/duk9-L8EAd)  
:::
