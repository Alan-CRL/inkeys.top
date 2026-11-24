# Design

## Files

- `docs/.vuepress/cdn/bases.ts`：唯一的地址列表 `ASSET_BASES`、探测文件路径 `PROBE_PATH`。不依赖 Node，供构建配置和客户端共用。
- `docs/.vuepress/cdn/runtime.ts`：生成插入 `<head>` 的内联脚本字符串（Node 侧，在 `config.ts` 中使用），替换现有 `imageFallbackScript`。
- `docs/.vuepress/cdn/useAssetUrl.ts`：组件用的组合函数，返回随当前可用地址变化的 `asset(path)`。
- `docs/.vuepress/config.ts`：`replaceAssets` 改成自定义规则，只在生产构建启用；head 脚本只在生产构建插入。
- `SectionAbilities.vue`、`SectionCraft.vue`：模板字符串拼出的路径和 `<style>` 里的 `url()` 改用 `asset()`，经内联样式变量传给 CSS。

## Build-time replacement

规则 `find` 为以 `/` 开头、以 public 中出现的扩展名结尾的路径（png、jpe?g、gif、webp、avif、svg、uink、extra、json、txt，可带查询串）。`replacement` 函数去掉查询串和 hash 后检查 `docs/.vuepress/public/<path>` 是否存在：存在返回 `ASSET_BASES[0] + url`，不存在返回空字符串（插件对空结果不做替换）。

插件只处理 JS/CSS/Vue 模块，`siteData`/`themeData` 等 JSON 和 head 配置不会被改写，所以 favicon 和 Plume logo 仍是本地路径。

## Runtime (inline head script)

脚本在 `<head>` 中同步执行，早于正文图片开始加载，挂在 `window.__INKEYS_ASSETS__`：

- 状态：`bases`（列表）、`down`（本会话判定不可用的地址集合，存 `sessionStorage`）、`active()`（第一个未判定不可用的地址，全部不可用时为 `''` 即本地）。
- 探测 `probe(base)`：`fetch(base + PROBE_PATH, { method: 'HEAD', mode: 'cors', cache: 'no-store' })`，5 秒超时。失败或超时即 `markDown(base)`。每个地址每次页面会话只探测一次。启动时探测当前 `active()`，判为不可用后继续探测下一个。
- `markDown(base)`：加入 `down`、写回 `sessionStorage`、通知订阅者（组件刷新背景），并把 DOM 中 `src`/`href`/`poster`/`srcset`/`style` 属性里以该地址开头的值改写成当前可用地址。此后启用 `MutationObserver`，对新增节点和属性变化做同样改写（覆盖 SPA 切页后新渲染的 Markdown 内容）；一切正常时不启用。
- `<img>` 加载失败（捕获阶段的 `error` 事件）：从 `src` 拆出地址和相对路径，换成列表中该地址之后第一个未判定不可用的地址，没有就用本地；同时对失败的地址调用 `probe`。这样单个文件 403 只让该图片退回，而整个地址故障会由探测确认后全局切换。
- 不在列表里的地址、已经是本地的图片不处理。

## Component helper

`useAssetUrl()` 返回 `asset(path)`：

- `path` 可以是本地路径，也可以是构建时已被替换成主地址的完整 URL（`asset('/x.webp')` 的字面量会被构建替换），先剥掉已知地址前缀得到相对路径。
- 服务端渲染及客户端挂载前统一用主地址（生产）或本地（开发），保证水合一致；`onMounted` 后订阅运行时状态，切到当前可用地址，响应式刷新。
- 开发模式或运行时对象不存在时返回 `withBase(path)`。

## Tradeoffs

- 不引入第三方 retry 库：它们主要处理 JS/CSS chunk 或只处理 `<img>`，覆盖不到 CSS 背景和下载链接。
- CSS 背景不会触发加载错误，只能依赖地址探测；单个背景文件缺失时不会退回（上线前须同步云盘）。
- 探测使用 `/Inkeys.svg`，它本来就在 public，不新增需要上传的文件。

## Rollback

还原 `config.ts` 的 `replaceAssets`、head 脚本以及两个组件即可回到全部本地加载；`cdn/` 目录可直接删除。
