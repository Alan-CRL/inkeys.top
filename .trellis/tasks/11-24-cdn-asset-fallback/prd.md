# 静态资源多地址 CDN 与本地自动回退

## Goal

`docs/.vuepress/public/` 下的图片、GIF、`.uink` 等资源在生产站点优先从 123 云盘直链加载；某个地址不可用时依次换到备用地址（`.cn`、以后新增的 S3），全部不可用时自动退回站点本地文件。

## Background

- Plume 的 `replaceAssets` 来自 `@vuepress/plugin-replace-assets`，只在构建时把源码里的路径字符串替换成一个地址，没有失败回退，也不支持多个地址；上游截至 rc.219 / plugin rc.137 没有相关能力。
- 现有配置用的是内置 `image` 规则，只匹配 `/images/` 开头的路径，站点 public 里没有这个目录，所以构建产物里一个 CDN 地址都没有，`config.ts` 里的图片回退脚本也从未生效。
- 2026-11-24 核对：public 的 79 个文件与 `https://1709404.cdn.123clouddisk.com/1709404/Inkeys/Website/public/` 下逐个哈希一致；`.cn` 同路径可用；两者都返回 `Access-Control-Allow-Origin: *`，不存在的文件返回 403。

## Requirements

- 地址列表只维护一处：第一项为主地址 `.com`，第二项为 `.cn`，以后加 S3 只需追加一行（要求目录结构相同，即地址前缀之后就是 public 内的相对路径）。本地 public 永远作为最后一级，不写进列表。
- 生产构建时，源码里指向 public 实际存在文件的路径替换成主地址；public 中不存在的路径保持不变。开发模式不替换，始终用本地。
- 运行时回退覆盖：
  - Markdown 和组件中的 `<img>`（含 GIF）：加载失败就换下一个地址，最后用本地。
  - 下载链接（`.uink`、`.uink.extra`、`fixtures.json`、`SHA256SUMS.txt`）、`<video poster>`：地址判定不可用后改写到可用地址。
  - `/new-index3` S1 的 GIF、S5-B 的原生截图与壁纸（CSS 背景）：跟随当前可用地址。
- 单个文件尚未同步到云盘（403）时只让这个文件退回，不把整个地址判为不可用。
- 地址判定结果只在本次浏览会话内记住，下次打开重新判断。
- 不影响站点图标（favicon / apple-touch-icon）和 Plume 主题配置里的 logo。

## Out of Scope

- S5-A 的 HLS 视频（转码路径，不在 public 内）的多地址切换。
- 打包后的 JS/CSS chunk 走 CDN。

## Acceptance Criteria

- [ ] `pnpm docs:build` 通过；构建产物中 public 资源指向主地址，且 public 中不存在的路径未被改写。
- [ ] 正常情况下页面上的资源全部从主地址加载，控制台无报错。
- [ ] 屏蔽主地址后，图片、GIF、CSS 背景、下载链接改走 `.cn`；同时屏蔽 `.com` 和 `.cn` 后全部改走本地且页面完整显示。
- [ ] 主地址上单个文件缺失时，只有该文件退回，其他资源仍走主地址。
- [ ] 开发模式（`pnpm docs:dev`）下不出现任何 CDN 地址。
