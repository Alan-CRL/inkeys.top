---
title: Inkeys3 相容性說明
---

Inkeys3 採用了全新的介面和繪圖引擎，需要用到較新的系統圖形元件（Direct2D 1.1），因此最低系統需求從 Inkeys2 的 Windows 7 調整為 Windows 7 SP1，並需要安裝 KB2670838 更新。為避免升級後無法啟動，不符合條件的 Windows 7 電腦不會自動更新到 Inkeys3。

## 系統需求

- Windows 8 及以上版本：不需額外操作，可以直接使用。
- Windows 7：需要已安裝 Service Pack 1（SP1）和 KB2670838 更新。

## KB2670838 是什麼

KB2670838 是微軟為 Windows 7 SP1 發布的平台更新，補充了 Inkeys3 所需的圖形元件，不會改動系統的其他內容。更新詳情請見[微軟說明](https://support.microsoft.com/zh-tw/help/2670838)。

::: tip 如何確認已經安裝了 KB2670838
1. 按下 Win + R，輸入 `powershell` 並按 Enter。
2. 輸入 `get-hotfix -id KB2670838` 並按 Enter。
3. 如果看到如下內容，就表示已經安裝。

| Source | Description | HotFixID | InstalledBy | InstalledOn |
| :- | :- | :- | :- | :- |
| <任意值> | Update | **KB2670838** | <任意值> | <任意值> |

:::

## 安裝 KB2670838

1. 開啟微軟官網的下載頁面，選擇與系統位元數一致的檔案：64 位元系統選 `x64`，32 位元系統選 `x86`。（查看位元數：在「電腦」上按右鍵 →「內容」→「系統類型」。）
2. 按兩下下載好的 `.msu` 檔案，依照提示完成安裝，然後重新啟動電腦。

<div class="doc-actions">
  <a class="nh3-btn nh3-btn-primary no-icon" href="https://www.microsoft.com/zh-tw/download/details.aspx?id=36805" target="_blank" rel="noopener noreferrer">從微軟官網下載</a>
  <a class="nh3-btn nh3-btn-secondary no-icon" href="https://www.123912.com/s/duk9-58EAd" target="_blank" rel="noopener noreferrer">雲端硬碟備份</a>
</div>

更新套件的簽章方式 Windows 7 本身就支援，不需要先安裝 SHA-2 相關更新。

::: warning 雙顯示卡筆電請注意
少數同時配備 Intel 與 AMD 顯示卡的筆電，安裝此更新後可能出現藍色畫面或黑畫面，這是微軟已知的問題。遇到這種情況，請安裝微軟的修正更新 [KB2834140](https://www.catalog.update.microsoft.com/Search.aspx?q=KB2834140)，並到電腦製造商官網更新顯示卡驅動程式。
:::

## 無法安裝時

**提示「此更新不適用於您的電腦」**

- 系統尚未安裝 SP1：請先安裝 SP1。
- 下載的檔案與系統位元數不一致：改用另一個檔案。
- 已經安裝過：依上文的方法確認即可，不需重複安裝。

**提示錯誤 0x80070422 或「服務無法啟動」**

Windows Update 服務被停用了，常見於精簡版或經過最佳化軟體處理的系統。開啟「服務」（Win + R 輸入 `services.msc`），將 Windows Update 的啟動類型改為「手動」並啟動，然後重新安裝；安裝完成後可以改回原設定。

**其他錯誤**

可能是系統的更新元件損壞，可以先執行微軟的系統更新準備工具（[KB947821](https://www.catalog.update.microsoft.com/Search.aspx?q=KB947821)）修復後再試。仍然無法安裝的話，歡迎到[社群](/zh-tw/community)回饋。

## 沒有安裝 SP1？

請先透過 Windows Update 或微軟官網安裝 [Windows 7 Service Pack 1](https://www.catalog.update.microsoft.com/Search.aspx?q=KB976932)，再安裝 KB2670838。

---

::: tip 其他
Inkeys3 的相關測試模組建置（[#](https://www.123912.com/s/duk9-L8EAd)）  
:::
