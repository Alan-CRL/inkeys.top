# Implement

1. 新建 `docs/.vuepress/cdn/bases.ts`（地址列表、探测路径）。
2. 新建 `docs/.vuepress/cdn/runtime.ts`（head 内联脚本：探测、标记、`<img>` 回退、DOM 改写、MutationObserver、订阅）。
3. 新建 `docs/.vuepress/cdn/useAssetUrl.ts`。
4. 修改 `docs/.vuepress/config.ts`：删除旧 `imageCdnBase` / `imageFallbackScript`；生产构建才插入新脚本和启用 `replaceAssets.rules`。
5. 修改 `SectionAbilities.vue`（GIF）与 `SectionCraft.vue`（原生截图、壁纸、森林背景）改用 `asset()`。
6. 验证：
   - `pnpm docs:build`；在 `dist` 中统计 CDN 地址数量，确认 public 中不存在的路径没有被改写，favicon 仍为本地。
   - 用 Playwright headless Edge 打开 `dist`（本地静态服务），分别在正常、屏蔽 `.com`、同时屏蔽 `.com`/`.cn`、只让一个文件 403 四种情况下记录实际请求的地址和图片是否显示。
   - 开发模式构建产物中不出现 CDN 地址（检查 `docs:dev` 下的模块响应或用 `NODE_ENV` 判断逻辑代码审查）。
7. 更新 `.trellis/spec/frontend/directory-structure.md`（public 资源与地址列表的关系、新文件只需上传到云盘即可，缺失时自动退回）。
