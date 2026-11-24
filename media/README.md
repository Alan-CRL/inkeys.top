# Inkeys3 功能媒体本地保留说明

2026-10-26：`/new-index3` 暂停视频介绍，先使用已有静态封面和文字。页面保留场景切换、暂停和入场效果，图片分别适配桌面与手机。

## 本地归档

`media/video-archive/2026-10-26/` 仅在本机保存，不随 Git 提交或网站发布：

- `feature-media/`：切换前的完整公开素材，包括 16 个 MP4、16 张 WebP、8 个 GIF、原始 manifest、来源及验证记录。
- `components/`：切换前的 `FeatureSections.vue`、`FeatureMedia.vue`、`featureMedia.ts`，保留视频播放和场景联动实现。
- `sha256.json`：48 个归档文件的大小和 SHA256；归档后逐个与原文件核对一致，才移除公开目录内的视频、GIF 和视频清单。

现有制作工程及本机输出继续保留原处：

- `media/inkeys3-features/`：Python/FFmpeg 分镜、原生导出输入、合成器和 `build/` 中的预览及中间产物。
- `media/inkeys3-remotion/`：Remotion 源码、依赖配置、`out/` 成片及 `build/previous-public/` 等输出与回滚备份。

`media/archive/2026-11-24-gallery-overview-tools.7z`：画廊两张宣传图（overview / tools）的制作归档，包含原 `inkeys3-theme-promo/`、`inkeys3-hero/`、`inkeys3-showcase-assets/`、网页图层与成品、`scripts/build-showcase-layers.py`、旧图层拆解组件和任务副本；目录对照见压缩包内 `README.md`。打包后已逐文件核对 SHA-256，原目录随后移除。

## 当前网页素材

2026-11-24 起 `docs/.vuepress/public/feature-media/` 已删除（八幕 16 张 WebP 的副本在上面的 `video-archive` 里，画廊图在上面的 7z 里）。`/new-index3` 现在使用 `public/new-index3/` 下的 S1 动图与 S5-B 素材，S5-A 视频走 123 云盘 HLS。

恢复视频时先查看本地归档及各制作工程 README；不要直接运行旧发布脚本覆盖当前图片。归档中的视频 manifest 与播放器需要一起恢复。归档不在 Git 中，迁移电脑前请另行复制整个 `media/` 目录。
