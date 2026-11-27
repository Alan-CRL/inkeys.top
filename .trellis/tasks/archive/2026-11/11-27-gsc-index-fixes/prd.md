# 处理 GSC 索引问题

## 背景

2026-11-27 Google Search Console 来信，报告新的无法编入索引原因：网页会自动重定向、重复网页（用户未选定规范网页）、被 noindex 排除、未找到 (404)。线上排查（Netlify）后，大部分属于预期行为（http→https、裸域→www、快捷跳转页、未翻译镜像页 noindex、canonical 于 11-25 才上线），以下几项需要处理。

## 需求

1. **headerExtension 大小写**：Netlify 把含大写字母的网址 301 到全小写，`/standard/blocks/headerExtension.html` 的 canonical 与 sitemap 指向一个会跳转的地址，页面无法收录。文件改名为 `headerextension.md`，更新侧边栏、单文件规范页面表和正文链接。旧地址由 Netlify 自动跳到小写，落到新页面。冻结的 `dist-standard/uink-v10/spec.md` 存档不改。
2. **版本列表页**：`/version/`、`/zh-tw/version/`、`/en-us/version/` 由 Plume 生成，SEO 插件不处理，没有 canonical。`/version/` 补自引用 canonical；繁中、英文列表页列的是简体更新日志的镜像，按镜像页规则处理：canonical 指向 `/version/`、`noindex, follow`、不进 sitemap。
3. **`.md` 副本不收录**：页面的 `.md` 副本加 `X-Robots-Tag: noindex`（Netlify `_headers`）。例外：`/dist-standard/**/spec.md` 单文件规范保持可收录；`llms.txt` 等 `.txt` 保持可收录、可访问。
4. **旧 UInk 发布文件地址**：`/standard/uink-v10/*`、`/standard/uink-v11/*` 在 public 目录改名后 404，301 到 `/dist-standard/` 下的同名文件（Netlify `_redirects`）。
5. `/wiki/*` 三个已下线页面保持 404，不处理。

## 验收

- 构建通过；产物中 `standard/blocks/headerextension.html` 存在，canonical、sitemap、侧边栏均为小写地址。
- 三个版本列表页的 head 符合第 2 条；sitemap 不含 `/zh-tw/version/`、`/en-us/version/`。
- 产物根目录有 `_headers`，覆盖所有页面 `.md` 副本，不含 `dist-standard` 下的文件与 `.txt`。
- 产物根目录有 `_redirects`，含第 4 条两条规则。
- 上线后（用户部署）用 curl 复核响应头与跳转。
