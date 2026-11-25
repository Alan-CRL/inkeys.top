---
title: UInk
aside: false
pageClass: uink-home
readingTime: false
---

<UInkHero />

## 通用：同一個檔案，在不同軟體裡開啟

支援的等級不同，看到的畫面也不同，但每一筆都在原處。點下面的等級，看同一頁板書在不同讀取器裡的樣子。

<UInkTierDemo />

每一級具體要實作什麼、不支援時怎樣顯示，見[分級與認證](/zh-tw/standard/levels)和[相容與回退](/zh-tw/standard/compatibility)。

## 集合：一塊白板，一個檔案

一塊白板的所有頁面、一份 PPT 每張投影片上的批註，都儲存在同一個 `.uink` 裡，批註跟著投影片走。切換白板頁面或投影片時，軟體只需將變更的頁面加到檔案結尾，無須重寫整個檔案。

<UInkStructure />

檔案由哪些區塊組成、怎樣排列，見[墨跡主檔案](/zh-tw/standard/file/main)。

## 使用 UInk 的軟體

<CardGrid>
<LinkCard title="Inkeys" href="https://www.inkeys.top/zh-tw/" description="適用多種情境的 Windows 螢幕批註工具。" />
<LinkCard title="ICC-CE" href="https://github.com/InkCanvasForClass/community" description="InkCanvasForClass 社群版，課堂批註與白板軟體。" />
</CardGrid>

## 開始實作

寫一個能顯示 UInk 的最小讀取器，只需要三步：

1. **讀 Header**：逐個解碼 MessagePack 物件，確認第一個是版本 10–19 的 Header。見[快速開始 · 檢查 Header](/zh-tw/standard/quick-start#_2-检查-header)。
2. **按 Canvas 分頁**：每個 Canvas 開始一頁，後面的內容區塊都屬於它；同一頁出現多次時以最後一次為準。見[快速開始 · 建立頁面](/zh-tw/standard/quick-start#_3-建立页面)。
3. **繪製 Ink**：按點座標和每點寬度畫出筆跡，顏色用 `fallback`，略過橡皮擦。見[快速開始 · 畫一頁](/zh-tw/standard/quick-start#_4-画一页)。

<CardGrid>
<LinkCard title="規範正文" href="/zh-tw/standard/intro" description="從規範介紹開始，逐頁閱讀（簡體中文）。" />
<LinkCard title="分級與認證" href="/zh-tw/standard/levels" description="確定要實作到哪一級，並對照檢查清單。" />
<LinkCard title="公開範例" href="/zh-tw/standard/conformance#公开样例" description="用範例檔案驗證讀取器在每一級的顯示結果。" />
<LinkCard title="單檔案規範（給 AI 助理）" href="/dist-standard/uink-v11/spec.md" description="全部規範頁面合成一個 Markdown 檔案。" />
</CardGrid>

讓 AI 助理幫你實作時，可以把[單檔案規範](/dist-standard/uink-v11/spec.md)或 [llms.txt](/standard/llms.txt) 交給它。
