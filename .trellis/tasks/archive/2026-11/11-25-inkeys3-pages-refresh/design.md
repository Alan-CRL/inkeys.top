# Design

## 1. 侧栏分组间距（不画线、不改 CSS）

用户要的是留白而不是线，并且要求沿用版本侧栏的做法，不改 CSS。

Plume 的 `getSidebarGroups`（`vuepress-theme-plume/dist/client/composables/index.js:471`）这样分组：

- 连续的普通链接项合并进同一个无标题分组 `{ items: [...] }`；
- 带 `items` 的项单独成为一个分组，之后出现的普通项另起一组；
- 每个分组渲染为 `level-0` 侧栏项，自带 `padding-bottom: 24px`，分组之间因此有空隙。

版本侧栏的空隙就是 `Inkeys3 Canary` 带 `items` 产生的（版本 | Inkeys3 分组 | 碎碎念 三组）。下载侧栏四项都是普通链接，被合并成一组，所以紧挨。

做法：只改 `sidebar.ts` 的数据结构，把后两项包进一个无标题、带 `items` 的分组：

```ts
export const downloadSidebar = [
    { text: '下载', link: '/download' },
    { text: '使用条款', link: '/tos', badge: { text: '新', type: 'danger' } },
    {
        // 带 items 的项会被 Plume 单独分成一组，与上面两项之间留出分组间距（同版本侧栏）。
        items: [
            { text: 'Inkeys3', link: '/version/inkeys3' },
            { text: '更新日志', link: '/version/', badge: { text: '新', type: 'tip' } },
        ],
    },
]
```

- 前两项本来就在 Plume 自动生成的无标题分组里，子项都按 `level-1` 渲染，新分组与之一致，字号、缩进不变。
- 无标题分组不渲染标题行，也不可折叠（未设 `collapsed`）。
- 不改任何 CSS；繁中、英文下载侧栏在第二阶段用同样结构调整。

## 2. 改名

| 位置 | 原 | 新 |
| --- | --- | --- |
| `sidebar.ts` `downloadSidebar` | Inkeys3 Canary / 版本 | Inkeys3 / 更新日志 |
| `sidebar.ts` `versionSidebar` | 版本 / Inkeys3 Canary | 更新日志 / Inkeys3 |
| `plume.config.ts` 简中 `collections[0].title` | 版本 | 更新日志 |
| `docs/version/inkeys3.md` `title` | Inkeys3 Canary 已发布 | Inkeys3 |

繁中、英文对应项第二阶段再改。

## 3. 画廊图片

- 从 `04a7af2^` 恢复 `feature-media/new-index3/{overview,tools}-{light,dark}-2000.webp`（2000 宽，正文区 2 倍屏也清晰；单张约 220 KB，懒加载，每种外观只加载两张）。
- 放到 `docs/.vuepress/public/showcase/`，文件名去掉尺寸后缀：`overview-light.webp` 等。
  - 不放在 `public/version/inkeys3/` 或 `public/inkeys3/`：与页面路径 `/version/inkeys3`、快捷入口 `/inkeys3` 同名的目录会让静态服务器把页面请求当成目录（`public/download/` 已有此问题）。
- Markdown 用图片标记语法（`config.ts` 已开启 `image.mark`）：`![…](/showcase/overview-light.webp#light)` 和 `#dark` 各一行。实现时先确认 Plume 的深色模式能正确切换；若不生效，改用原始 `<img>` 加 `html.dark` 选择器控制显示。
- 图片仍经 CDN 运行时脚本的失败回退；新文件需用户上传到 123 云盘备用通道。

## 4. 正文按钮

复用 `site.css` 已有的 `.nh3-btn` / `.nh3-btn-primary` / `.nh3-btn-secondary`（高 48px、胶囊、黑白反色），新增一个按钮行容器：

```css
/* 正文里的按钮行（Inkeys3 介绍页、Win7 兼容页）。 */
.theme-plume .vp-doc .doc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 24px 0;
}

.theme-plume .vp-doc .doc-actions--center {
  justify-content: center;
}

/* 正文链接的下划线与悬停变色不作用于按钮。 */
.theme-plume .vp-doc a.nh3-btn {
  text-decoration: none;
}
```

- 站内跳转用 `<RouteLink to="/download" class="nh3-btn nh3-btn-primary">`，保持 SPA 跳转；外链用 `<a … target="_blank" rel="noopener noreferrer" class="nh3-btn … no-icon">` 去掉外链图标。
- 实现时确认 `.vp-doc a:hover` 的颜色规则不会覆盖按钮文字色，必要时把颜色规则一并限定。

## 5. 文案草稿

### 5.1 `/version/inkeys3`

```md
---
title: Inkeys3
sticky: 2
tags:
  - 介绍
---

Inkeys3 是智绘教Inkeys 迄今为止最大的一次升级。我们重新设计了主栏，换上了全新的绘图引擎，让书写更跟手，操作更轻盈。屏幕批注、PPT 演示、自由白板这些熟悉的功能都还在，而且更好用了。

（overview 图）

## 每一笔，都跟得上思路

全新绘图引擎由 C++ 与 Direct3D 驱动，快速勾画不断线，细致书写有笔锋。手抖修正让线条更平稳，使用支持压感的笔时还能写出自然的粗细变化。硬笔清晰利落，软笔富有笔锋，荧光笔突出重点，激光笔写完自动消失；再加上丰富的形状与智能绘图，从随手圈画到精细作图都得心应手。

（tools 图）

## 焕然一新的主栏与设置

主栏按下有回弹，光影随指针流动。它可以悬浮在屏幕任意位置，也可以停靠在底部；大小、深浅色和透明度都能按喜好调整。设置界面同样重新设计，清爽易找，界面语言扩展到 20 种，切换后立即生效。

## 日常使用更省心

在触控大屏上，可以直接用手掌擦除，不必来回切换工具；超级置顶让主栏始终显示在最上层，不会被其他软件遮住。自由白板提供无限画布和多页板书，背景颜色与点阵、网格样式任你挑选。放映 PPT 时，无论是 PowerPoint 还是 WPS 都能自动接上，翻页按钮闲置时自动淡化，不挡住课件。

鼠标、触摸、屏幕笔和数位板都有各自合适的书写手感，从笔记本电脑到教室里的触控大屏都能顺手使用。

## 系统要求

支持 Windows 7 SP1 及以上系统，兼容 32 位、64 位与 ARM64 电脑。Windows 8 及以上可以直接使用；Windows 7 需要先安装 KB2670838 更新，详见 [Windows 7 兼容性说明](introduction/win7)。

<div class="doc-actions doc-actions--center">
  <RouteLink to="/download" class="nh3-btn nh3-btn-primary">立即下载</RouteLink>
</div>
```

文案已由用户确认准确（2026-11-25），实现时按草稿落地，不再逐句核实；查看软件仓库只为发现可补充的新亮点，补充内容同样遵守文案偏好。

### 5.2 `/win7`

```md
---
title: Inkeys3 兼容性说明
---

Inkeys3 采用了全新的界面和绘图引擎，需要用到较新的系统图形组件（Direct2D 1.1），因此最低系统要求从 Inkeys2 的 Windows 7 调整为 Windows 7 SP1，并需要安装 KB2670838 更新。为避免升级后无法启动，不满足条件的 Windows 7 电脑不会自动更新到 Inkeys3。

## 系统要求

- Windows 8 及以上：无需额外操作，可以直接使用。
- Windows 7：需要已安装 Service Pack 1（SP1）和 KB2670838 更新。

## KB2670838 是什么

KB2670838 是微软为 Windows 7 SP1 发布的平台更新，补充了 Inkeys3 所需的图形组件，不会改动系统的其他内容。更新详情见 [微软说明](…原链接…)。

::: tip 如何确认已经安装了 KB2670838
1. 按下 Win + R，输入 `powershell` 并按回车。
2. 输入 `get-hotfix -id KB2670838` 并按回车。
3. 如果看到如下内容，说明已经安装。
（表格保留）
:::

## 安装 KB2670838

1. 打开微软官网的下载页，选择与系统位数一致的文件：64 位系统选 `x64`，32 位系统选 `x86`。（查看位数：右键“计算机”→“属性”→“系统类型”。）
2. 双击下载好的 `.msu` 文件，按提示完成安装，然后重启电脑。

（按钮行：主按钮“从微软官网下载” → 微软下载页；次按钮“云盘备份” → 原 123 云盘链接）

更新包的签名方式 Windows 7 本身就支持，不需要先安装 SHA-2 相关补丁。

::: warning 双显卡笔记本请注意
少数同时带有 Intel 与 AMD 显卡的笔记本，安装此更新后可能出现蓝屏或黑屏，这是微软已知的问题。遇到这种情况，请安装微软的修复更新 KB2834140，并到电脑厂商官网更新显卡驱动。
:::

## 无法安装时

**提示“此更新不适用于你的计算机”**
- 系统还没有安装 SP1：请先安装 SP1。
- 下载的文件与系统位数不一致：换另一个文件。
- 已经安装过：按上文的方法确认即可，无需重复安装。

**提示错误 0x80070422 或“服务无法启动”**
Windows Update 服务被禁用了，常见于精简版或被优化软件处理过的系统。打开“服务”（Win + R 输入 `services.msc`），将 Windows Update 的启动类型改为“手动”并启动，然后重新安装；安装完成后可以改回原设置。

**其他错误**
可能是系统的更新组件损坏，可以先运行微软的系统更新准备工具（KB947821）修复后再试。仍然无法安装的，欢迎到社区反馈。

## 没有安装 SP1？

请先通过 Windows 更新或微软官网安装 Windows 7 Service Pack 1，再安装 KB2670838。

---

（“一些杂物”提示原样保留）
```

KB2834140、KB947821、SP1 的链接用微软更新目录搜索页（`https://www.catalog.update.microsoft.com/Search.aspx?q=KB…`），实现时确认可访问。
