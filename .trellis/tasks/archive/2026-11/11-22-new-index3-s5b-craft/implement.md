# 实施与验收

1. 在 media/nh3-craft 下用隔离的原生适配与构建目录，固定源码、状态、字体及渲染来源。优先先验证简中浅色，再导出其他五组。settings 与 toolbar 由独立实现单元负责。
2. 导入两张生成母图并导出展示用壁纸及模糊派生。网页资源统一位于 docs/.vuepress/public/new-index3/craft，使用 wallpaper-{light,dark}.webp、wallpaper-{light,dark}-blur.webp、settings-{locale}-{theme}.png 和 toolbar-{locale}-{theme}.png。
3. 调整现有 SectionCraft 的 S5-B 素材和 S5-A 背景，保持原有文案，处理主题、语言与窄屏及同坐标回退。
4. 使用原生无窗口验证、Web 无头截图、pnpm docs:build，检查六组内容与主题、边缘光、山脊对齐、三档与断点布局、最终引用和 diff。保留实际采集与检查证据。

## 最终验收

- 设置采集使用原方案 Debug|ARM64 的 InkeysHeadlessTests 目标。六次无窗口渲染均为 failures=0。公开 PNG 均为 1440×1050（产品默认 960×700 DIP，露出版权行），从原生主题获取窗底与首页横幅材质。构建、字体、语言包和 PNG 的 SHA-256 见 media/nh3-craft/settings/capture-manifest.json。
- 主栏来自与本任务状态一致的六次既有原生采集。各组成功日志及图层哈希已复核，三倍图统一裁切到 2431×361。桌面上主栏实体压住设置窗口下沿四成实体高，并向左错出窗口宽度的 10%，透明阴影完整。
- pnpm docs:build 退出 0，生成 51 页，17 个站点素材与 dist 文件逐字节一致。运行 node .trellis/tasks/11-22-new-index3-s5b-craft/verify-site.cjs，三种语言 × 两种主题 × 七档宽度及两种无滤镜回退共 44 项通过。代表性截图保存在 previews/。
- 独立无头检查确认清晰山景与窗口模糊的取景连续。无滤镜模式截取相同位置的预模糊壁纸。手机正文收窄至 25em 后，560px 浅色三语正文抽样最低对比度为 6.74:1。
- 原生窗底为 Alpha 204、横幅为 179。网页按用户要求比软件更通透：`media/nh3-craft/glass.py` 只把设置窗底和主栏底板换成同色的 60% 不透明底板，横幅等卡片、文字、图标和光影保持原生像素。实测窗底与主栏底板均透出 0.40，横幅 0.059，字标 0。窗口与主栏两块底板后面的实时模糊半径均为 18px，回退壁纸在原始尺寸以 24px 模糊。DWM 合成链调查见 codex-dwm-result.md。
- S5-A 山路背景采用 1536 × 1024 的静态 WebP，两个主题共用。三个视口宽度（390、768、1440px）、三语和两个主题的 18 组实页截图均经校验，标题、导语、演示占位的最低实际笔画对比度分别为 4.97:1、4.63:1、5.21:1。
