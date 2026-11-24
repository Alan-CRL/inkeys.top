# Design

## Files

- `docs/.vuepress/cdn/bases.ts`：远程地址列表 `ASSET_BASES`（`.cn`、`.com`）与探测文件 `PROBE_PATH`。本站固定排在最前，不写进列表。
- `docs/.vuepress/cdn/runtime.ts`：生成插入 `<head>` 的内联脚本（仅生产构建），参数为站点 base 与 public 文件清单。
- `docs/.vuepress/cdn/useAssetUrl.ts`：组件用的 `asset(path)`，跟随当前通道。
- `docs/.vuepress/config.ts`：`replaceAssets: false`；构建时遍历 public 生成文件清单传给运行时。
- `SectionAbilities.vue`、`SectionCraft.vue`：GIF、截图、壁纸经 `asset()` 取地址，背景通过内联 CSS 变量传入。

## Runtime (`window.__INKEYS_ASSETS__`)

- 通道：`[本站 origin + base, ...ASSET_BASES]`。`preferred` 为当前通道，默认本站，存 `sessionStorage`。
- `split(url)`：把相对路径、本站绝对地址或远程地址拆成 `[通道, public 路径]`，路径不在 public 清单中返回空，保证页面链接和外部资源不被改动。写回 DOM 时本站用相对路径。
- 单文件回退：捕获阶段的 `error` 事件，按 `[preferred, ...通道]` 选该图片尚未试过的下一个通道。
- 看门狗：每秒（页面可见时）检查视口上下 800px 内未完成的 `<img>`，以及内联样式里带 public 地址的元素及其子元素、伪元素的计算背景图（用同 URL 的 `Image` 对象观察完成状态，浏览器会复用同一请求）。同一资源连续 6 秒未完成即视为卡顿。
- 卡顿处理：并行 GET 每个通道的探测文件（带时间戳查询串、`no-store`、5 秒超时），得到耗时。15 秒内只测一次。
  - 卡住资源所在通道失败，或默认顺序中存在耗时不到它一半的通道：取其中最靠前的一个（不按测速挑最快），若卡住的是 `preferred` 则整站切过去，否则只把该图片换过去。
  - 否则若该通道耗时 < 2 秒：只把该图片换到下一个未试过的通道（背景图无法单独切换，跳过）。
  - 否则不动。
- 整站切换：DOM 中 `src`/`href`/`poster`/`srcset`/`style` 里指向旧通道的 public 地址改写到新通道；`preferred` 不是本站时启用 MutationObserver，把之后渲染的本站 public 路径改写到新通道；通知订阅者刷新组件背景。
- 脚本在 head 被 VuePress 重新生成时不重复初始化。

## useAssetUrl

服务端渲染与挂载前统一返回本站路径（`withBase`），挂载后订阅运行时，当前通道不是本站时返回远程地址。传入的完整远程 URL 会先还原成 public 路径。

## Tradeoffs

- 本站优先，正常情况下不产生 CDN 请求；CDN 仅作备用。
- 只防卡死不测速：两个 123 域名速度相近，测速收益小；探测只在出现卡顿时进行。
- 背景图没有加载错误事件，单个背景文件缺失无法单独回退，只能随整站切换。
- 同一 URL 的 `Image` 观察依赖浏览器复用进行中的图片请求；未复用时最多多一次下载。

## Rollback

删除 head 中的运行时脚本并还原两个组件即可回到纯本地加载；`cdn/` 目录可直接删除。
