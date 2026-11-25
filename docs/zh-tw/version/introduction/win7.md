---
title: Inkeys3 相容性調整說明
---

Inkeys3 採用全新的 UI 介面與繪圖函式庫，使用了 D2D1.1 的相關功能。較新的 D2D1.1 可以帶來更高的繪圖效率和更豐富的繪圖效果，但也提高了系統版本的要求。  
從 Inkeys2 升級到 Inkeys3 後，最低系統需求從 Windows 7 RTM 提高到 Windows 7 SP1。少部分 Windows 7 使用者可能在升級後無法啟動 Inkeys，所以我們阻止了這部分使用者的自動更新。  

---
  
::: tip 版本狀態
[Inkeys3 Canary `20261014a`](../inkeys3) 已經發布，屬於早期開發版本，不建議日常使用。  

Inkeys3 LTS 正式版尚未發布，目前最新的 LTS 正式版為 Inkeys2 的 [`20261019a`](/zh-tw/version/changelog/20261019a)（簡體中文）。  
:::

## 系統環境需求

Inkeys3 需要 Windows 7 SP1 或更新版本。  
- Windows 8 **及**以上版本的使用者無需擔心，可以直接使用 Inkeys3。  
- Windows 7 則需要 Windows 7 Service Pack 1，並安裝 KB2670838 更新。

### KB2670838 更新是什麼
KB2670838 更新新增了一些系統元件，例如 Inkeys3 所需的 D2D1.1 底層元件。安裝這個更新只是補齊系統元件，不會改動其他內容。  
有關此更新的[詳細內容](https://support.microsoft.com/zh-tw/help/2670838)。 

需要注意的是：依微軟說明，部分電腦安裝此更新後可能當機。請先點選**詳細內容**閱讀更新說明，確認您的硬體是否支援。  

::: tip 如何確認系統是否已安裝 KB2670838？
1. 按下 Win + R，輸入 `powershell` 並按 Enter 開啟 PowerShell  
2. 輸入 `get-hotfix -id KB2670838` 並按 Enter  
3. 如果看到如下文字，就表示已經安裝了 KB2670838

| Source | Description | HotFixID | InstalledBy | InstalledOn |
| :- | :- | :- | :- | :- |
| <任意值> | Update | **KB2670838** | <任意值> | <任意值> |

:::

### 我是 Windows 7 SP1 使用者，該如何安裝更新
[下載更新套件](https://www.microsoft.com/zh-tw/download/details.aspx?id=36805)的 msu 檔案，開啟檔案安裝即可。  

[雲端硬碟備份](https://www.123912.com/s/duk9-58EAd)  


### 更低的版本？
如果尚未安裝 Windows 7 Service Pack 1，請先將系統更新至 SP1。  

---

::: tip 其他
Inkeys3 的相關測試模組建置（[#](https://www.123912.com/s/duk9-L8EAd)）  
:::
